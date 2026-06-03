import { LicenseTier, classifyLicenseTier } from './license-tiers';

export type UserType = 'real-user' | 'mailbox-only' | 'service-account' | 'guest' | 'shared' | 'unknown';
export type ActionFlag = 'dormant' | 'over-licensed' | 'under-licensed' | 'missing-department' | 'missing-title' | 'no-license';

export interface UserContext {
  userId: string;
  displayName: string;
  userPrincipalName: string;
  department?: string;
  jobTitle?: string;
  userTypeFromGraph?: string; // 'Member' | 'Guest'
  assignedLicenseSkus: string[];
  licenseSkuNames: string[];
  lastSignInDateTime?: string;
  usageLocation?: string;
  accountEnabled?: boolean;
}

export interface UserClassification {
  type: UserType;
  primaryTier: LicenseTier;
  hasTiers: LicenseTier[];
  actionFlags: ActionFlag[];
  reasonSummary: string;
  isDormant: boolean;
  monthlyCostEstimate: number;
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

export function classifyUser(user: UserContext, licenseTiersBySkuId: Record<string, LicenseTier>): UserClassification {
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
    reasonParts.push('Service account (by UPN/department/title)');
  }

  // 2. Analyze license tiers
  const hasTiers: LicenseTier[] = user.assignedLicenseSkus
    .map((skuId) => licenseTiersBySkuId[skuId])
    .filter((t): t is LicenseTier => Boolean(t));

  const hasPremium = hasTiers.includes('premium');
  const hasBasic = hasTiers.includes('basic');
  const hasMailbox = hasTiers.includes('mailbox');
  const hasTeams = hasTiers.includes('teams');
  const hasUtility = hasTiers.includes('utility');

  let primaryTier: LicenseTier = 'unknown';
  if (hasPremium) primaryTier = 'premium';
  else if (hasTeams) primaryTier = 'teams';
  else if (hasBasic) primaryTier = 'basic';
  else if (hasMailbox) primaryTier = 'mailbox';
  else if (hasUtility) primaryTier = 'utility';

  // 3. Mailbox-only detection (only mailbox/utility tiers, no real user tier)
  if (type !== 'guest' && type !== 'shared' && type !== 'service-account') {
    if (hasMailbox && !hasPremium && !hasBasic && !hasTeams) {
      type = 'mailbox-only';
      reasonParts.push('Only mailbox/Exchange license');
    } else if (user.assignedLicenseSkus.length === 0) {
      type = 'real-user';
      actionFlags.push('no-license');
      reasonParts.push('No license assigned');
    } else {
      type = 'real-user';
    }
  }

  // 4. Detect over-licensing (premium with low usage indicators)
  if (type === 'real-user' && hasPremium) {
    const utilityCount = hasTiers.filter((t) => t === 'utility').length;
    if (utilityCount >= 3) {
      actionFlags.push('over-licensed');
      reasonParts.push(`Premium + ${utilityCount} utility add-ons`);
    }
  }

  // 5. Missing data flags (CTO can demand IT to fix)
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

  // 6. Dormancy check (both criteria)
  const isDormant = checkDormant(user.lastSignInDateTime, user.assignedLicenseSkus.length, type);
  if (isDormant) {
    actionFlags.push('dormant');
    reasonParts.push('Dormant: no sign-in >30d or unused');
  }

  // 7. Cost estimate
  const costMap: Record<LicenseTier, number> = {
    premium: 57,
    basic: 12.5,
    teams: 15,
    mailbox: 4,
    utility: 8,
    unknown: 0,
  };
  const monthlyCostEstimate = hasTiers.reduce((sum, t) => sum + costMap[t], 0);

  return {
    type,
    primaryTier,
    hasTiers: Array.from(new Set(hasTiers)),
    actionFlags,
    reasonSummary: reasonParts.join(' • '),
    isDormant,
    monthlyCostEstimate,
  };
}

function checkDormant(lastSignInDateTime: string | undefined, licenseCount: number, type: UserType): boolean {
  if (type === 'guest' || type === 'service-account' || type === 'shared') return false;
  if (licenseCount === 0) return true;
  if (!lastSignInDateTime) return true; // No sign-in record at all
  const lastSignIn = new Date(lastSignInDateTime);
  const now = new Date();
  const daysSince = (now.getTime() - lastSignIn.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince > DORMANT_DAYS;
}

export interface DepartmentMetrics {
  department: string;
  headcount: number;
  byType: Record<UserType, number>;
  byTier: Record<LicenseTier, number>;
  actionFlagCounts: Record<ActionFlag, number>;
  totalMonthlyCostEstimate: number;
  utilizationRate: number; // % of users with sign-in in last 30 days
  costOptimalScore: number; // 0-100 score
}

export function aggregateByDepartment(
  users: { classification: UserClassification; user: UserContext }[]
): DepartmentMetrics[] {
  const byDept = new Map<string, { users: { classification: UserClassification; user: UserContext }[] }>();

  for (const item of users) {
    const dept = item.user.department?.trim() || '⚠ Unassigned';
    if (!byDept.has(dept)) byDept.set(dept, { users: [] });
    byDept.get(dept)!.users.push(item);
  }

  const results: DepartmentMetrics[] = [];
  for (const [dept, { users }] of byDept) {
    const byType: Record<UserType, number> = {
      'real-user': 0, 'mailbox-only': 0, 'service-account': 0, 'guest': 0, 'shared': 0, 'unknown': 0,
    };
    const byTier: Record<LicenseTier, number> = {
      premium: 0, basic: 0, teams: 0, mailbox: 0, utility: 0, unknown: 0,
    };
    const actionFlagCounts: Record<ActionFlag, number> = {
      dormant: 0, 'over-licensed': 0, 'under-licensed': 0, 'missing-department': 0, 'missing-title': 0, 'no-license': 0,
    };
    let totalCost = 0;
    let activeUsers = 0;

    for (const { classification, user } of users) {
      byType[classification.type]++;
      byTier[classification.primaryTier]++;
      totalCost += classification.monthlyCostEstimate;
      for (const flag of classification.actionFlags) {
        actionFlagCounts[flag]++;
      }
      if (!classification.isDormant && user.assignedLicenseSkus.length > 0) activeUsers++;
    }

    const utilizationRate = users.length > 0 ? activeUsers / users.length : 0;
    const issues = actionFlagCounts['over-licensed'] + actionFlagCounts['missing-department'] + actionFlagCounts['missing-title'];
    const costOptimalScore = Math.max(0, 100 - issues * 10 - (1 - utilizationRate) * 50);

    results.push({
      department: dept,
      headcount: users.length,
      byType,
      byTier,
      actionFlagCounts,
      totalMonthlyCostEstimate: totalCost,
      utilizationRate,
      costOptimalScore: Math.round(costOptimalScore),
    });
  }

  return results.sort((a, b) => b.totalMonthlyCostEstimate - a.totalMonthlyCostEstimate);
}
