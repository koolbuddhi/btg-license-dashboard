import { LicenseTier } from './license-tiers';
import { analyzeUserLicenses, LicenseAnalysis, BundleTier } from './license-sku-map';
import {
  evaluateCoverage,
  CoverageResult,
  CapabilityRequirement,
  DEFAULT_REQUIREMENT,
  AssignedPlan,
  CAPABILITY_LABELS,
} from './capability-coverage';

export type UserType = 'real-user' | 'mailbox-only' | 'service-account' | 'guest' | 'shared' | 'unknown';
export type ActionFlag =
  | 'dormant'
  | 'over-licensed'
  | 'under-licensed'
  | 'missing-department'
  | 'missing-title'
  | 'no-license'
  | 'redundant-sku'
  | 'missing-capability'
  | 'disabled-but-licensed';

/** Whether a real user has the capabilities the org policy requires. */
export type ComplianceVerdict = 'compliant' | 'gap' | 'exception';
/** Sign-in based activity status. 'unknown' = sign-in data unavailable (don't penalize). */
export type DormancyStatus = 'active' | 'dormant' | 'unknown';

export interface UserContext {
  userId: string;
  displayName: string;
  userPrincipalName: string;
  department?: string;
  jobTitle?: string;
  userTypeFromGraph?: string;
  assignedLicenseSkus: string[];
  licenseSkuNames: string[];
  assignedPlans: AssignedPlan[];
  lastSignInDateTime?: string;
  usageLocation?: string;
  accountEnabled?: boolean;
}

export interface ClassifyOptions {
  /** False when the tenant did not return signInActivity — dormancy becomes 'unknown'. */
  signInDataAvailable?: boolean;
  /** Required capability profile (segment-aware; defaults to the org-wide baseline). */
  requirement?: CapabilityRequirement;
}

export interface UserClassification {
  type: UserType;
  primaryTier: LicenseTier;
  hasTiers: LicenseTier[];
  actionFlags: ActionFlag[];
  reasonSummary: string;
  isDormant: boolean;
  dormancyStatus: DormancyStatus;
  complianceVerdict: ComplianceVerdict;
  coverage: CoverageResult;
  monthlyCostEstimate: number;
  licenseAnalysis: LicenseAnalysis;
}

const DORMANT_DAYS = 30;

function detectServiceAccount(upn: string, dept?: string, title?: string): boolean {
  const lowerUpn = upn.toLowerCase();
  const lowerDept = (dept || '').toLowerCase();
  const lowerTitle = (title || '').toLowerCase();
  return (
    /^(svc|sv|sa|service|admin|sys|bot|noreply|alert|automation|backup|monitor|sharepoint|intune|jamf)/i.test(lowerUpn) ||
    lowerUpn.includes('admin@') ||
    lowerDept.includes('service account') ||
    lowerDept.includes('system') ||
    lowerTitle.includes('service') ||
    lowerTitle.includes('automation') ||
    lowerTitle.includes('system')
  );
}

function detectGuest(upn: string, userTypeFromGraph?: string): boolean {
  if (userTypeFromGraph === 'Guest') return true;
  return /#ext#@/i.test(upn);
}

function detectShared(upn: string, dept?: string, title?: string): boolean {
  const lowerUpn = upn.toLowerCase();
  return (
    /^(shared|room|equipment|resource|meeting|conf|front-desk|reception)/i.test(lowerUpn) ||
    (dept || '').toLowerCase().includes('shared') ||
    (title || '').toLowerCase().includes('shared mailbox')
  );
}

export function classifyUser(user: UserContext, opts: ClassifyOptions = {}): UserClassification {
  const { signInDataAvailable = false, requirement = DEFAULT_REQUIREMENT } = opts;
  const actionFlags: ActionFlag[] = [];
  const reasonParts: string[] = [];

  // 1. Detect account type
  let type: UserType = 'unknown';
  if (detectGuest(user.userPrincipalName, user.userTypeFromGraph)) {
    type = 'guest';
    reasonParts.push('External/guest account');
  } else if (detectShared(user.userPrincipalName, user.department, user.jobTitle)) {
    type = 'shared';
    reasonParts.push('Shared mailbox/resource');
  } else if (detectServiceAccount(user.userPrincipalName, user.department, user.jobTitle)) {
    type = 'service-account';
    reasonParts.push('Service account');
  }

  // 2. Run license analysis (uses SKU GUIDs to detect bundle + redundancy)
  const licenseAnalysis = analyzeUserLicenses(user.assignedLicenseSkus);
  const hasBundle = licenseAnalysis.effectiveBundle !== 'unknown-bundle';
  const hasAddOns = licenseAnalysis.addOnSkus.length > 0;
  const hasRedundant = licenseAnalysis.redundantSkus.length > 0;

  // 3. Determine user type based on licenses
  if (type !== 'guest' && type !== 'shared' && type !== 'service-account') {
    if (!hasBundle && hasAddOns) {
      type = 'mailbox-only';
      reasonParts.push('Only component SKUs (no main bundle)');
    } else if (user.assignedLicenseSkus.length === 0) {
      type = 'real-user';
      // 'no-license' flag + reason are added in the compliance-verdict step below.
    } else {
      type = 'real-user';
    }
  }

  // 4. Map bundle to tier (for the column display)
  const bundleToTier: Record<BundleTier, LicenseTier> = {
    'e5': 'premium',
    'e3': 'premium',
    'o365-e5': 'premium',
    'o365-e3': 'premium',
    'e1': 'basic',
    'f3': 'basic',
    'f1': 'mailbox',
    'business-premium': 'premium',
    'business-standard': 'basic',
    'business-basic': 'basic',
    'ems-e5': 'utility',
    'ems-e3': 'utility',
    'unknown-bundle': 'unknown',
  };
  const primaryTier = bundleToTier[licenseAnalysis.effectiveBundle];

  // 5. Capability coverage — detected from actual enabled service plans (suite OR à-la-carte)
  const coverage = evaluateCoverage(user.assignedPlans, requirement);

  // 6. Compliance verdict. Real users are held to the capability policy; non-user
  //    accounts (mailbox/service/shared/guest) are expected exceptions to review.
  let complianceVerdict: ComplianceVerdict;
  if (type === 'real-user') {
    if (user.assignedLicenseSkus.length === 0) {
      complianceVerdict = 'gap';
      actionFlags.push('no-license');
      reasonParts.push('No license assigned');
    } else if (coverage.satisfied) {
      complianceVerdict = 'compliant';
    } else {
      complianceVerdict = 'gap';
      actionFlags.push('missing-capability');
      reasonParts.push(
        `Missing: ${coverage.missing.map((c) => CAPABILITY_LABELS[c]).join(', ')}`
      );
    }
  } else {
    complianceVerdict = 'exception';
  }

  // 7. Disabled-but-licensed — paying for a disabled account is almost always an
  //    offboarding miss (accidental). Flag it regardless of account type.
  if (user.accountEnabled === false && user.assignedLicenseSkus.length > 0) {
    actionFlags.push('disabled-but-licensed');
    reasonParts.push('Account disabled but still holds paid licenses');
  }

  // 8. Detect over-licensing (bundle + redundant SKUs already in the bundle) — secondary/cost signal
  if (type === 'real-user' && hasRedundant) {
    actionFlags.push('redundant-sku');
    actionFlags.push('over-licensed');
    reasonParts.push(
      `${licenseAnalysis.bundleLabel} already includes: ${licenseAnalysis.redundantSkus.length} redundant SKU(s) ($${licenseAnalysis.redundantMonthlyCost.toFixed(0)}/mo wasted)`
    );
  }

  // 9. Missing data flags
  if (!user.department || user.department.trim() === '') {
    actionFlags.push('missing-department');
    reasonParts.push('Missing department');
  }
  if (!user.jobTitle || user.jobTitle.trim() === '') {
    actionFlags.push('missing-title');
    reasonParts.push('Missing job title');
  }
  if (!user.usageLocation) {
    reasonParts.push('No usage location set');
  }

  // 10. Dormancy — distinguish confirmed-dormant from unknown (no sign-in data / permission)
  const dormancyStatus = checkDormancy(user.lastSignInDateTime, type, signInDataAvailable);
  const isDormant = dormancyStatus === 'dormant';
  if (isDormant) {
    actionFlags.push('dormant');
    reasonParts.push('Dormant: no sign-in >30d');
  }

  return {
    type,
    primaryTier,
    hasTiers: [primaryTier, ...licenseAnalysis.addOnSkus.map(() => 'utility' as LicenseTier)].filter((t, i, a) => a.indexOf(t) === i),
    actionFlags,
    reasonSummary: reasonParts.join(' • '),
    isDormant,
    dormancyStatus,
    complianceVerdict,
    coverage,
    monthlyCostEstimate: licenseAnalysis.totalMonthlyCost,
    licenseAnalysis,
  };
}

function checkDormancy(
  lastSignInDateTime: string | undefined,
  type: UserType,
  signInDataAvailable: boolean
): DormancyStatus {
  // Non-user accounts are not evaluated for dormancy (sign-in is expected to be absent).
  if (type === 'guest' || type === 'service-account' || type === 'shared') return 'active';
  // Without sign-in data we cannot tell — never auto-flag as dormant.
  if (!signInDataAvailable) return 'unknown';
  if (!lastSignInDateTime) return 'dormant';
  const lastSignIn = new Date(lastSignInDateTime);
  const now = new Date();
  const daysSince = (now.getTime() - lastSignIn.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince > DORMANT_DAYS ? 'dormant' : 'active';
}

export interface DepartmentMetrics {
  department: string;
  headcount: number;
  byType: Record<UserType, number>;
  byBundle: Record<BundleTier, number>;
  compliantCount: number;
  gapCount: number;
  exceptionCount: number;
  redundantSkuCount: number;
  redundantMonthlyCost: number;
  dormantCount: number;
  missingDataCount: number;
  totalMonthlyCost: number;
  utilizationRate: number;
  /** Share of real users that are compliant (0..1). */
  complianceRate: number;
  costOptimalScore: number;
  users: ClassifiedUserForDrill[]; // for drill-down
}

export interface ClassifiedUserForDrill {
  userId: string;
  displayName: string;
  userPrincipalName: string;
  department: string;
  jobTitle?: string;
  type: UserType;
  bundleLabel: string;
  primaryTier: LicenseTier;
  actionFlags: ActionFlag[];
  reasonSummary: string;
  isDormant: boolean;
  dormancyStatus: DormancyStatus;
  complianceVerdict: ComplianceVerdict;
  coverage: CoverageResult;
  accountEnabled: boolean;
  monthlyCost: number;
  lastSignInDateTime?: string;
  skuIds: string[];
}

export function aggregateByDepartment(
  users: { classification: UserClassification; user: UserContext }[]
): DepartmentMetrics[] {
  const byDept = new Map<string, { entries: { classification: UserClassification; user: UserContext }[] }>();

  for (const item of users) {
    const dept = item.user.department?.trim() || '⚠ Unassigned';
    if (!byDept.has(dept)) byDept.set(dept, { entries: [] });
    byDept.get(dept)!.entries.push(item);
  }

  const results: DepartmentMetrics[] = [];
  for (const [dept, { entries }] of byDept) {
    const byType: Record<UserType, number> = {
      'real-user': 0, 'mailbox-only': 0, 'service-account': 0, guest: 0, shared: 0, unknown: 0,
    };
    const byBundle: Record<BundleTier, number> = {
      'e5': 0, 'e3': 0, 'o365-e5': 0, 'o365-e3': 0, 'e1': 0, 'f3': 0, 'f1': 0,
      'business-premium': 0, 'business-standard': 0, 'business-basic': 0,
      'ems-e5': 0, 'ems-e3': 0, 'unknown-bundle': 0,
    };
    let totalCost = 0;
    let activeUsers = 0;
    let redundantSkuCount = 0;
    let redundantMonthlyCost = 0;
    let dormantCount = 0;
    let missingDataCount = 0;
    let compliantCount = 0;
    let gapCount = 0;
    let exceptionCount = 0;
    const drillUsers: ClassifiedUserForDrill[] = [];

    for (const { classification, user } of entries) {
      byType[classification.type]++;
      byBundle[classification.licenseAnalysis.effectiveBundle]++;
      totalCost += classification.monthlyCostEstimate;
      redundantSkuCount += classification.licenseAnalysis.redundantSkus.length;
      redundantMonthlyCost += classification.licenseAnalysis.redundantMonthlyCost;
      if (classification.complianceVerdict === 'compliant') compliantCount++;
      else if (classification.complianceVerdict === 'gap') gapCount++;
      else exceptionCount++;
      if (classification.actionFlags.includes('dormant')) dormantCount++;
      if (classification.actionFlags.includes('missing-department') ||
          classification.actionFlags.includes('missing-title')) {
        missingDataCount++;
      }
      if (!classification.isDormant && user.assignedLicenseSkus.length > 0) activeUsers++;

      drillUsers.push({
        userId: user.userId,
        displayName: user.displayName,
        userPrincipalName: user.userPrincipalName,
        department: dept,
        jobTitle: user.jobTitle,
        type: classification.type,
        bundleLabel: classification.licenseAnalysis.bundleLabel,
        primaryTier: classification.primaryTier,
        actionFlags: classification.actionFlags,
        reasonSummary: classification.reasonSummary,
        isDormant: classification.isDormant,
        dormancyStatus: classification.dormancyStatus,
        complianceVerdict: classification.complianceVerdict,
        coverage: classification.coverage,
        accountEnabled: user.accountEnabled !== false,
        monthlyCost: classification.monthlyCostEstimate,
        lastSignInDateTime: user.lastSignInDateTime,
        skuIds: user.assignedLicenseSkus,
      });
    }

    const utilizationRate = entries.length > 0 ? activeUsers / entries.length : 0;
    const realUserTotal = compliantCount + gapCount;
    const complianceRate = realUserTotal > 0 ? compliantCount / realUserTotal : 1;
    const issues = (redundantSkuCount > 0 ? 1 : 0) + missingDataCount + dormantCount;
    const costOptimalScore = Math.max(0, 100 - issues * 5 - (1 - utilizationRate) * 30 - (redundantMonthlyCost / Math.max(totalCost, 1)) * 20);

    results.push({
      department: dept,
      headcount: entries.length,
      byType,
      byBundle,
      compliantCount,
      gapCount,
      exceptionCount,
      redundantSkuCount,
      redundantMonthlyCost,
      dormantCount,
      missingDataCount,
      totalMonthlyCost: Math.round(totalCost),
      utilizationRate,
      complianceRate,
      costOptimalScore: Math.round(costOptimalScore),
      users: drillUsers,
    });
  }

  return results.sort((a, b) => b.totalMonthlyCost - a.totalMonthlyCost);
}
