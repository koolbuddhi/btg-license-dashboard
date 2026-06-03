/**
 * Capability-coverage engine
 *
 * The enterprise policy is capability-based, not bundle-based: every standard user
 * must be able to (1) use O365 productivity, (2) chat on Teams, and (3) be managed /
 * monitored via Entra + Intune. That coverage may come from a single suite (M365 E5)
 * OR a combination of à-la-carte licenses (Business Basic + Teams + Entra + Intune).
 *
 * Capabilities are detected from the user's actual SERVICE PLANS (`assignedPlans`),
 * not the suite name. This:
 *   - sidesteps the Office-365-vs-Microsoft-365 trap (O365 E5/E3 carry NO Intune/Entra),
 *   - treats suite vs. standalone identically, and
 *   - honors disabled service plans (E5 with Teams switched off => Teams not covered).
 *
 * All service-plan GUIDs below are verified against the Microsoft licensing
 * service-plan reference:
 * https://learn.microsoft.com/en-us/entra/identity/users/licensing-service-plan-reference
 */

import { BundleTier, BUNDLE_INFO } from './license-sku-map';

export type Capability = 'productivity' | 'teams' | 'intune' | 'entra';

/** A service plan as returned in Graph `user.assignedPlans`. */
export interface AssignedPlan {
  servicePlanId: string;
  /** 'Enabled' | 'Warning' | 'Suspended' | 'Deleted' — only 'Enabled' counts as covered. */
  capabilityStatus: string;
}

/**
 * Service-plan GUIDs (NOT SKU GUIDs — a different namespace) grouped by the
 * capability they grant.
 */
export const SERVICE_PLANS = {
  // Productivity anchors: a mailbox + Office/SharePoint = "has O365 productivity"
  EXCHANGE_S_ENTERPRISE: 'efb87545-963c-4e0d-99df-69c6916d9eb0',
  EXCHANGE_S_STANDARD: '9aaf7827-d63c-4b61-89c3-182f06f82e5c',
  EXCHANGE_S_DESKLESS: '4a82b400-a79f-41a4-b4e2-e94f5787b113',
  OFFICESUBSCRIPTION: '43de0ff5-c92c-492b-9116-175376d08c38',
  SHAREPOINTENTERPRISE: '5dbe027f-2339-4123-9542-606e4d348a72',
  SHAREPOINTSTANDARD: 'c7699d2e-19aa-44de-8edf-1736da088ca1',
  SHAREPOINTWAC: 'e95bec33-7c88-4a70-8e19-b10bd9d0c014',

  // Teams chat (core Teams license)
  TEAMS1: '57ff2da0-773e-42df-b2af-ffb7a2317929',
  MCOSTANDARD: '0feaeb32-d00e-4d66-bd5a-43b5b83db82c',

  // Intune (device management)
  INTUNE_A: 'c1ec4a95-1f05-45b3-a911-aa3fa01094f5',
  INTUNE_SMBIZ: '8e9ff0ff-aa7a-4b20-83c1-2f636b600ac2',

  // Entra ID premium (identity protection / monitoring)
  AAD_PREMIUM: '41781fb2-bc02-4b7c-bd55-b576c07bb09d',      // P1
  AAD_PREMIUM_P2: 'eec0eb4f-6444-4f95-aba0-50c24d67f998',   // P2
} as const;

const PLAN_CAPABILITY: Record<string, Capability> = {
  [SERVICE_PLANS.EXCHANGE_S_ENTERPRISE]: 'productivity',
  [SERVICE_PLANS.EXCHANGE_S_STANDARD]: 'productivity',
  [SERVICE_PLANS.EXCHANGE_S_DESKLESS]: 'productivity',
  [SERVICE_PLANS.OFFICESUBSCRIPTION]: 'productivity',
  [SERVICE_PLANS.SHAREPOINTENTERPRISE]: 'productivity',
  [SERVICE_PLANS.SHAREPOINTSTANDARD]: 'productivity',
  [SERVICE_PLANS.SHAREPOINTWAC]: 'productivity',
  [SERVICE_PLANS.TEAMS1]: 'teams',
  [SERVICE_PLANS.MCOSTANDARD]: 'teams',
  [SERVICE_PLANS.INTUNE_A]: 'intune',
  [SERVICE_PLANS.INTUNE_SMBIZ]: 'intune',
  [SERVICE_PLANS.AAD_PREMIUM]: 'entra',
  [SERVICE_PLANS.AAD_PREMIUM_P2]: 'entra',
};

/**
 * What a given user segment is required to have. The default profile is the
 * org-wide baseline; segments (basic user, developer, management, …) override it.
 * This is the hook the future license-optimization work builds on.
 */
export interface CapabilityRequirement {
  productivity: boolean;
  teams: boolean;
  /** Management = Intune AND Entra both present (full device + identity monitoring). */
  management: boolean;
}

export const DEFAULT_REQUIREMENT: CapabilityRequirement = {
  productivity: true,
  teams: true,
  management: true,
};

export interface CoverageResult {
  covered: Capability[];
  productivityOk: boolean;
  teamsOk: boolean;
  intuneOk: boolean;
  entraOk: boolean;
  /** Intune AND Entra both present. */
  managementOk: boolean;
  /** Required capabilities that are NOT covered — the IT action list. */
  missing: Capability[];
  /** True when every required capability is covered. */
  satisfied: boolean;
}

/**
 * Evaluate which required capabilities a user's enabled service plans cover.
 */
export function evaluateCoverage(
  plans: AssignedPlan[],
  requirement: CapabilityRequirement = DEFAULT_REQUIREMENT
): CoverageResult {
  const covered = new Set<Capability>();
  for (const plan of plans) {
    if (plan.capabilityStatus !== 'Enabled') continue;
    const cap = PLAN_CAPABILITY[plan.servicePlanId];
    if (cap) covered.add(cap);
  }

  const productivityOk = covered.has('productivity');
  const teamsOk = covered.has('teams');
  const intuneOk = covered.has('intune');
  const entraOk = covered.has('entra');
  const managementOk = intuneOk && entraOk;

  const missing: Capability[] = [];
  if (requirement.productivity && !productivityOk) missing.push('productivity');
  if (requirement.teams && !teamsOk) missing.push('teams');
  if (requirement.management && !managementOk) {
    if (!intuneOk) missing.push('intune');
    if (!entraOk) missing.push('entra');
  }

  return {
    covered: [...covered],
    productivityOk,
    teamsOk,
    intuneOk,
    entraOk,
    managementOk,
    missing,
    satisfied: missing.length === 0,
  };
}

export const CAPABILITY_LABELS: Record<Capability, string> = {
  productivity: 'O365 Productivity',
  teams: 'Teams Chat',
  intune: 'Intune',
  entra: 'Entra ID Premium',
};

/**
 * Reference licensing matrix: which capabilities each suite grants, verified against
 * the Microsoft licensing service-plan reference. Drives the /reference page and is
 * the canonical input for future license-mix optimization.
 */
export interface SuiteCapabilityRow {
  bundle: BundleTier;
  label: string;
  productivity: boolean;
  teams: boolean;
  intune: boolean;
  entra: 'none' | 'p1' | 'p2';
  monthlyCost: number;
  /** Satisfies the default all-three baseline on its own? */
  selfSufficient: boolean;
  note?: string;
}

export const SUITE_CAPABILITY_MATRIX: SuiteCapabilityRow[] = [
  { bundle: 'e5', label: BUNDLE_INFO['e5'].label, productivity: true, teams: true, intune: true, entra: 'p2', monthlyCost: BUNDLE_INFO['e5'].monthlyCost, selfSufficient: true, note: 'Full premium — includes EMS (Intune + Entra P2).' },
  { bundle: 'e3', label: BUNDLE_INFO['e3'].label, productivity: true, teams: true, intune: true, entra: 'p1', monthlyCost: BUNDLE_INFO['e3'].monthlyCost, selfSufficient: true, note: 'Includes Intune + Entra P1.' },
  { bundle: 'business-premium', label: BUNDLE_INFO['business-premium'].label, productivity: true, teams: true, intune: true, entra: 'p1', monthlyCost: BUNDLE_INFO['business-premium'].monthlyCost, selfSufficient: true, note: 'SMB suite with Intune + Entra P1.' },
  { bundle: 'o365-e5', label: BUNDLE_INFO['o365-e5'].label, productivity: true, teams: true, intune: false, entra: 'none', monthlyCost: BUNDLE_INFO['o365-e5'].monthlyCost, selfSufficient: false, note: 'No EMS — needs Intune + Entra add-on for management.' },
  { bundle: 'o365-e3', label: BUNDLE_INFO['o365-e3'].label, productivity: true, teams: true, intune: false, entra: 'none', monthlyCost: BUNDLE_INFO['o365-e3'].monthlyCost, selfSufficient: false, note: 'No EMS — needs Intune + Entra add-on for management.' },
  { bundle: 'business-standard', label: BUNDLE_INFO['business-standard'].label, productivity: true, teams: true, intune: false, entra: 'none', monthlyCost: BUNDLE_INFO['business-standard'].monthlyCost, selfSufficient: false, note: 'No management — needs Intune + Entra add-on.' },
  { bundle: 'business-basic', label: BUNDLE_INFO['business-basic'].label, productivity: true, teams: true, intune: false, entra: 'none', monthlyCost: BUNDLE_INFO['business-basic'].monthlyCost, selfSufficient: false, note: 'Web-only productivity; needs Intune + Entra add-on.' },
  { bundle: 'e1', label: BUNDLE_INFO['e1'].label, productivity: true, teams: true, intune: false, entra: 'none', monthlyCost: BUNDLE_INFO['e1'].monthlyCost, selfSufficient: false, note: 'Web apps only; no management.' },
  { bundle: 'f3', label: BUNDLE_INFO['f3'].label, productivity: true, teams: true, intune: true, entra: 'p1', monthlyCost: BUNDLE_INFO['f3'].monthlyCost, selfSufficient: true, note: 'Frontline — includes Intune + Entra P1.' },
  { bundle: 'f1', label: BUNDLE_INFO['f1'].label, productivity: true, teams: true, intune: false, entra: 'none', monthlyCost: BUNDLE_INFO['f1'].monthlyCost, selfSufficient: false, note: 'Email + Teams only.' },
  { bundle: 'ems-e5', label: BUNDLE_INFO['ems-e5'].label, productivity: false, teams: false, intune: true, entra: 'p2', monthlyCost: BUNDLE_INFO['ems-e5'].monthlyCost, selfSufficient: false, note: 'Management add-on only (Intune + Entra P2) — pairs with O365/Business.' },
  { bundle: 'ems-e3', label: BUNDLE_INFO['ems-e3'].label, productivity: false, teams: false, intune: true, entra: 'p1', monthlyCost: BUNDLE_INFO['ems-e3'].monthlyCost, selfSufficient: false, note: 'Management add-on only (Intune + Entra P1) — pairs with O365/Business.' },
];
