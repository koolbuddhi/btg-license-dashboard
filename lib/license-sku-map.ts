/**
 * Microsoft 365 License Intelligence
 *
 * Maps SKU GUIDs to product names and tier groups, and detects
 * over-licensing (user has high-tier bundle + component SKUs that
 * are already included in the bundle).
 *
 * Source: Microsoft licensing service plan reference
 * https://learn.microsoft.com/en-us/entra/identity/users/licensing-service-plan-reference
 */

export const SKU_GUIDS = {
  // Microsoft 365 Enterprise (the big bundles)
  M365_E5: '06ebc4ee-1bb5-47dd-8120-11324bc54e06',           // Microsoft 365 E5
  M365_E3: '05e9a617-0261-4cee-bb44-138d3ef5d965',           // Microsoft 365 E3
  O365_E5: 'c7df2760-2c81-4ef7-b578-5b5392b571df',           // Office 365 E5 (legacy name)
  O365_E3: '6fd2c87f-b296-42f0-b197-1e91e994b900',           // Office 365 E3
  O365_E1: '18181a46-0d4e-45cd-891e-60aabd171b4e',           // Office 365 E1

  // Microsoft 365 Frontline (F-series)
  M365_F3: '66b55226-6b4f-492c-910c-a3b7a3c9d993',           // Microsoft 365 F3
  M365_F1: '44575883-256e-4a79-9da4-ebe9acabe2b2',           // Microsoft 365 F1
  O365_F3: '4b585984-651b-448a-9e53-3b10f069cf7f',           // Office 365 F3 (= Deskless Pack)

  // Enterprise Mobility + Security (EMS)
  EMS_E5: 'b05e124f-c7cc-45a0-a6aa-8cf78c946968',            // EMS E5
  EMS_E3: 'efccb6f7-5641-4e0e-bd10-b4976e1bf68e',            // EMS E3

  // Microsoft 365 Business (SMB)
  M365_BUSINESS_PREMIUM: 'cbdc14ab-d96c-4c30-b9f4-6ada7cdc1d46',   // M365 Business Premium (SPB)
  M365_BUSINESS_STANDARD: 'f245ecc8-75af-4f8e-b61f-27d8114de5f3',  // M365 Business Standard (O365_BUSINESS_PREMIUM)
  M365_BUSINESS_STANDARD_LEGACY: 'ac5cef5d-921b-4f97-9ef3-c99076e5470f', // Business Standard - Prepaid Legacy
  M365_BUSINESS_BASIC: 'dab7782a-93b1-4074-8bb1-0e61318bea0b',    // M365 Business Basic

  // Security & Identity add-ons
  AAD_PREMIUM_P2: '84a661c4-e949-4bd2-a560-ed7766fcaf2b',     // Entra ID P2 (standalone)
  AAD_PREMIUM_P1: '078d2b04-f1bd-4111-bbd4-b4b1b354cef4',     // Entra ID P1
  AAD_BASIC: '2b9c8e7c-319c-43a2-a2a0-48c5c6161de7',
  IDENTITY_THREAT_PROTECTION: '26124093-3d78-432b-b5dc-48bf992543d5',  // M365 E5 Security
  INTUNE_A: '061f9ace-7d42-4136-88ac-31dc755f143f',

  // Exchange
  EXCHANGE_P1: '4b9405b0-7788-4568-add1-99614e613b69',         // Exchange Online Plan 1
  EXCHANGE_P2: '19ec0d23-8335-4cbd-94ac-6050e30712fa',         // Exchange Online Plan 2
  EXCHANGE_KIOSK: '80b2d799-d2ba-4d2a-8842-fb0d0f3a4b82',      // Exchange Online Kiosk

  // Teams & Communication
  TEAMS_ESSENTIALS: 'fde42873-30b6-436b-b361-21af5a6b84ae',     // Microsoft Teams Essentials (standalone)
  TEAMS_PHONE_SYSTEM: 'e43b5b99-8dfb-405f-9987-dc307f34bcbd',  // M365 Phone System
  TEAMS_PHONE_CALLING: '1f2f344a-700d-42c9-9fb2-1e0f0e569590',  // Teams Phone with Calling Plan
  TEAMS_AUDIO_CONF: '0c266dff-15dd-4b49-8397-2bb16070ed52',     // Audio Conferencing
  TEAMS_EXPLORATORY: '3af49299-2e94-4e22-b2d4-939168ed21f0',     // Teams Exploratory

  // Power Platform & BI
  POWER_BI_PRO: 'f8a1db68-be16-40ed-86d5-cb42ce701560',          // Power BI Pro
  POWER_BI_FREE: 'a403ebcc-fae0-4ca2-8c8c-7a907fd6c235',
  POWER_APPS_PER_USER: 'b30411f5-fea1-4a59-9ad9-3db7c7ead579',
  FLOW_FREE: 'f30db892-07e9-47e9-837c-80727f46fd3d',

  // Visio & Project
  VISIO_PLAN2: 'c5928f49-12ba-48f7-ada3-0d743a3601d5',
  VISIO_PLAN1: '4b244418-9658-4451-a2b8-b5e2b364e9bd',
  PROJECT_PLAN1: '48225b45-d62f-406e-9a9f-638082681480',
  PROJECT_PLAN3: '663a8744-9d0a-4d42-be43-1b9fef7ea928',
  PROJECT_PLAN5: 'b737dad2-2f6c-4c65-90e3-ca563267e8b9',

  // Windows
  WINDOWS_E3: 'cb10e6cd-9da4-4992-867b-67546b1db821',
  WINDOWS_E5: '488ba24a-39a9-4473-8ee5-19291e71b002',

  // Defender
  DEFENDER_ENDPOINT: '111046dd-295b-4d6d-9724-d52ac90bd1f2', // MDATP
  DEFENDER_OFFICE_P1: '4ef96642-f096-40de-a3e9-d83fb2f90211', // ATP Enterprise

  // Dynamics
  DYN365_CE: 'ea126fc5-a19e-42e2-a731-da9d437bffcf',

  // Copilot & AI
  COPILOT_M365: 'd9451686-5913-4c2d-9927-75350e99663e',         // M365 Copilot
  COPILOT_STUDIO: '94763226-9b3c-4e7e-a928-0c995366a341',

  // Information Protection
  AIP_PLAN1: 'c52ea49f-fe5d-4e95-93ba-1de91d380f89',
  E5_COMPLIANCE: '184efa21-98c3-4e5d-95ab-d07053a96e67',
} as const;

export const SKU_FRIENDLY: Record<string, string> = {
  [SKU_GUIDS.M365_E5]: 'Microsoft 365 E5',
  [SKU_GUIDS.M365_E3]: 'Microsoft 365 E3',
  [SKU_GUIDS.O365_E5]: 'Office 365 E5',
  [SKU_GUIDS.O365_E3]: 'Office 365 E3',
  [SKU_GUIDS.O365_E1]: 'Office 365 E1',
  [SKU_GUIDS.M365_F3]: 'Microsoft 365 F3',
  [SKU_GUIDS.M365_F1]: 'Microsoft 365 F1',
  [SKU_GUIDS.O365_F3]: 'Office 365 F3',
  [SKU_GUIDS.EMS_E5]: 'EMS E5',
  [SKU_GUIDS.EMS_E3]: 'EMS E3',
  [SKU_GUIDS.M365_BUSINESS_PREMIUM]: 'M365 Business Premium',
  [SKU_GUIDS.M365_BUSINESS_STANDARD]: 'M365 Business Standard',
  [SKU_GUIDS.M365_BUSINESS_STANDARD_LEGACY]: 'M365 Business Standard (Legacy)',
  [SKU_GUIDS.M365_BUSINESS_BASIC]: 'M365 Business Basic',
  [SKU_GUIDS.TEAMS_ESSENTIALS]: 'Teams Essentials',
  [SKU_GUIDS.AAD_PREMIUM_P2]: 'Entra ID P2',
  [SKU_GUIDS.AAD_PREMIUM_P1]: 'Entra ID P1',
  [SKU_GUIDS.AAD_BASIC]: 'Entra ID Basic',
  [SKU_GUIDS.IDENTITY_THREAT_PROTECTION]: 'M365 E5 Security',
  [SKU_GUIDS.INTUNE_A]: 'Intune',
  [SKU_GUIDS.EXCHANGE_P1]: 'Exchange Online P1',
  [SKU_GUIDS.EXCHANGE_P2]: 'Exchange Online P2',
  [SKU_GUIDS.EXCHANGE_KIOSK]: 'Exchange Kiosk',
  [SKU_GUIDS.TEAMS_PHONE_SYSTEM]: 'Teams Phone System',
  [SKU_GUIDS.TEAMS_PHONE_CALLING]: 'Teams Phone w/ Calling',
  [SKU_GUIDS.TEAMS_AUDIO_CONF]: 'Audio Conferencing',
  [SKU_GUIDS.TEAMS_EXPLORATORY]: 'Teams Exploratory',
  [SKU_GUIDS.POWER_BI_PRO]: 'Power BI Pro',
  [SKU_GUIDS.POWER_BI_FREE]: 'Power BI (Free)',
  [SKU_GUIDS.POWER_APPS_PER_USER]: 'Power Apps per User',
  [SKU_GUIDS.FLOW_FREE]: 'Power Automate Free',
  [SKU_GUIDS.VISIO_PLAN2]: 'Visio Plan 2',
  [SKU_GUIDS.VISIO_PLAN1]: 'Visio Plan 1',
  [SKU_GUIDS.PROJECT_PLAN1]: 'Project Plan 1',
  [SKU_GUIDS.PROJECT_PLAN3]: 'Project Plan 3',
  [SKU_GUIDS.PROJECT_PLAN5]: 'Project Plan 5',
  [SKU_GUIDS.WINDOWS_E3]: 'Windows E3',
  [SKU_GUIDS.WINDOWS_E5]: 'Windows E5',
  [SKU_GUIDS.DEFENDER_ENDPOINT]: 'Defender for Endpoint',
  [SKU_GUIDS.DEFENDER_OFFICE_P1]: 'Defender for Office P1',
  [SKU_GUIDS.DYN365_CE]: 'Dynamics 365 CE',
  [SKU_GUIDS.COPILOT_M365]: 'Copilot for M365',
  [SKU_GUIDS.COPILOT_STUDIO]: 'Copilot Studio',
  [SKU_GUIDS.AIP_PLAN1]: 'AIP Plan 1',
  [SKU_GUIDS.E5_COMPLIANCE]: 'M365 E5 Compliance',
};

export function getSkuFriendlyName(skuId: string): string {
  if (SKU_FRIENDLY[skuId]) return SKU_FRIENDLY[skuId];
  // Unknown SKU — show truncated GUID as fallback
  return `Unknown (${skuId.slice(0, 8)}…)`;
}

/**
 * License Bundle Hierarchy
 * Higher tier = better. A user with E5 doesn't need E3, AAD P2, etc. separately.
 * The "effective" license is the highest bundle the user has.
 */
export type BundleTier =
  | 'e5'        // Microsoft 365 E5 (full premium — includes EMS: Intune + Entra P2)
  | 'e3'        // Microsoft 365 E3 (standard enterprise — includes Intune + Entra P1)
  | 'o365-e5'   // Office 365 E5 (productivity + Teams; NO Intune/Entra)
  | 'o365-e3'   // Office 365 E3 (productivity + Teams; NO Intune/Entra)
  | 'e1'        // Office 365 E1 (basic enterprise; NO Intune/Entra)
  | 'f3'        // Frontline F3 (desk worker)
  | 'f1'        // Frontline F1 (limited)
  | 'business-premium'
  | 'business-standard'
  | 'business-basic'
  | 'ems-e5'
  | 'ems-e3'
  | 'unknown-bundle';

const BUNDLE_RANK: Record<BundleTier, number> = {
  'e5': 100,
  'o365-e5': 90,
  'e3': 80,
  'o365-e3': 68,
  'f3': 70,
  'business-premium': 75,
  'business-standard': 55,
  'e1': 50,
  'ems-e5': 60,
  'ems-e3': 45,
  'f1': 40,
  'business-basic': 30,
  'unknown-bundle': 0,
};

export const BUNDLE_INFO: Record<BundleTier, { label: string; description: string; monthlyCost: number; includes: string[] }> = {
  'e5': {
    label: 'Microsoft 365 E5',
    description: 'Microsoft 365 E5 — full premium (includes E3, Intune, Entra P2, Defender P2, Phone System, Audio, Compliance)',
    monthlyCost: 57,
    includes: ['E3', 'Intune', 'Entra ID P2', 'Defender for Endpoint P2', 'Defender for Office P2', 'Teams Phone System', 'Audio Conferencing', 'E5 Compliance', 'Power BI Pro'],
  },
  'e3': {
    label: 'Microsoft 365 E3',
    description: 'Microsoft 365 E3 — standard enterprise (includes E1, Exchange P2, Teams, Intune, Entra P1, AIP P1)',
    monthlyCost: 36,
    includes: ['Office Apps', 'Exchange P2', 'Teams', 'SharePoint', 'OneDrive', 'Intune', 'Entra ID P1', 'AIP P1', 'Defender for Endpoint P1'],
  },
  'o365-e5': {
    label: 'Office 365 E5',
    description: 'Office 365 E5 — productivity + Teams + Phone/Audio. NO Intune or Entra ID (no EMS).',
    monthlyCost: 38,
    includes: ['Office Apps', 'Exchange P2', 'Teams', 'SharePoint', 'OneDrive', 'Teams Phone System', 'Audio Conferencing', 'Power BI Pro'],
  },
  'o365-e3': {
    label: 'Office 365 E3',
    description: 'Office 365 E3 — productivity + Teams. NO Intune or Entra ID (no EMS).',
    monthlyCost: 20,
    includes: ['Office Apps', 'Exchange P2', 'Teams', 'SharePoint', 'OneDrive'],
  },
  'e1': {
    label: 'E1 Bundle',
    description: 'Office 365 E1 — basic enterprise (web apps only, no desktop Office)',
    monthlyCost: 8,
    includes: ['Web Office Apps', 'Exchange P1', 'Teams', 'SharePoint', 'OneDrive'],
  },
  'f3': {
    label: 'F3 Bundle',
    description: 'Microsoft 365 F3 — frontline worker (shared device, basic apps)',
    monthlyCost: 10,
    includes: ['Web/Mobile Office', 'Exchange Kiosk', 'Teams', 'SharePoint Kiosk', 'Intune'],
  },
  'f1': {
    label: 'F1 Bundle',
    description: 'Microsoft 365 F1 — limited frontline (email + Teams only)',
    monthlyCost: 2.25,
    includes: ['Exchange Kiosk', 'Teams'],
  },
  'business-premium': {
    label: 'Business Premium',
    description: 'M365 Business Premium — SMB (includes E3-lite + Defender + Intune + Azure AD P1)',
    monthlyCost: 22,
    includes: ['Desktop Office', 'Exchange P1', 'Teams', 'SharePoint', 'OneDrive', 'Defender for Business', 'Intune', 'Entra ID P1'],
  },
  'business-standard': {
    label: 'Business Standard',
    description: 'M365 Business Standard — SMB (no security add-ons)',
    monthlyCost: 12.5,
    includes: ['Desktop Office', 'Exchange P1', 'Teams', 'SharePoint', 'OneDrive'],
  },
  'business-basic': {
    label: 'Business Basic',
    description: 'M365 Business Basic — web-only SMB',
    monthlyCost: 6,
    includes: ['Web Office', 'Exchange P1', 'Teams', 'SharePoint', 'OneDrive'],
  },
  'ems-e5': {
    label: 'EMS E5',
    description: 'Enterprise Mobility + Security E5 (security-only bundle)',
    monthlyCost: 16.50,
    includes: ['Intune', 'Entra ID P2', 'Defender for Endpoint P2', 'AIP P2'],
  },
  'ems-e3': {
    label: 'EMS E3',
    description: 'Enterprise Mobility + Security E3 (security-only bundle)',
    monthlyCost: 10.05,
    includes: ['Intune', 'Entra ID P1', 'Defender for Endpoint P1', 'AIP P1'],
  },
  'unknown-bundle': {
    label: 'No bundle',
    description: 'Component SKUs only — not part of a known bundle',
    monthlyCost: 0,
    includes: [],
  },
};

export function getBundleTier(skuId: string): BundleTier {
  switch (skuId) {
    case SKU_GUIDS.M365_E5:
      return 'e5';
    case SKU_GUIDS.O365_E5:
      return 'o365-e5';
    case SKU_GUIDS.M365_E3:
      return 'e3';
    case SKU_GUIDS.O365_E3:
      return 'o365-e3';
    case SKU_GUIDS.O365_E1:
      return 'e1';
    case SKU_GUIDS.M365_F3:
    case SKU_GUIDS.O365_F3:
      return 'f3';
    case SKU_GUIDS.M365_F1:
      return 'f1';
    case SKU_GUIDS.M365_BUSINESS_PREMIUM:
      return 'business-premium';
    case SKU_GUIDS.M365_BUSINESS_STANDARD:
    case SKU_GUIDS.M365_BUSINESS_STANDARD_LEGACY:
      return 'business-standard';
    case SKU_GUIDS.M365_BUSINESS_BASIC:
      return 'business-basic';
    case SKU_GUIDS.EMS_E5:
      return 'ems-e5';
    case SKU_GUIDS.EMS_E3:
      return 'ems-e3';
    default:
      return 'unknown-bundle';
  }
}

/**
 * Given a list of SKU IDs assigned to a user, determine:
 *  - the "effective bundle" (highest bundle)
 *  - which SKUs are REDUNDANT (already included in the bundle, paying twice)
 *  - which SKUs are ADD-ONS (legitimately extend functionality)
 */
export interface LicenseAnalysis {
  effectiveBundle: BundleTier;
  bundleSkuId?: string;
  bundleLabel: string;
  redundantSkus: string[];      // SKUs that are already in the bundle
  addOnSkus: string[];           // SKUs that legitimately extend (Power BI, Visio, etc.)
  redundantMonthlyCost: number;  // money wasted on redundant SKUs
  addOnMonthlyCost: number;      // cost of legitimate add-ons
  totalMonthlyCost: number;
}

/**
 * Map: SKU -> SKUs it already includes
 * E5 includes E3 which includes E1, etc.
 */
const BUNDLE_INCLUDES: Record<BundleTier, string[]> = {
  'e5': [
    SKU_GUIDS.M365_E3, SKU_GUIDS.O365_E5, SKU_GUIDS.O365_E3, SKU_GUIDS.O365_E1,
    SKU_GUIDS.EMS_E5, SKU_GUIDS.EMS_E3,
    SKU_GUIDS.AAD_PREMIUM_P2, SKU_GUIDS.AAD_PREMIUM_P1, SKU_GUIDS.AAD_BASIC,
    SKU_GUIDS.IDENTITY_THREAT_PROTECTION, SKU_GUIDS.INTUNE_A,
    SKU_GUIDS.EXCHANGE_P1, SKU_GUIDS.EXCHANGE_P2,
    SKU_GUIDS.TEAMS_PHONE_SYSTEM, SKU_GUIDS.TEAMS_AUDIO_CONF, SKU_GUIDS.TEAMS_ESSENTIALS,
    SKU_GUIDS.POWER_BI_PRO, SKU_GUIDS.AIP_PLAN1, SKU_GUIDS.E5_COMPLIANCE,
  ],
  'e3': [
    SKU_GUIDS.O365_E3, SKU_GUIDS.O365_E1, SKU_GUIDS.EMS_E3, SKU_GUIDS.EMS_E5,
    SKU_GUIDS.AAD_PREMIUM_P1, SKU_GUIDS.AAD_BASIC,
    SKU_GUIDS.INTUNE_A, SKU_GUIDS.EXCHANGE_P1, SKU_GUIDS.EXCHANGE_P2,
    SKU_GUIDS.TEAMS_ESSENTIALS, SKU_GUIDS.AIP_PLAN1,
  ],
  // Office 365 E5/E3 — productivity + Teams ONLY. Deliberately NO Intune/Entra (no EMS component).
  'o365-e5': [
    SKU_GUIDS.O365_E3, SKU_GUIDS.O365_E1, SKU_GUIDS.EXCHANGE_P1, SKU_GUIDS.EXCHANGE_P2,
    SKU_GUIDS.TEAMS_PHONE_SYSTEM, SKU_GUIDS.TEAMS_AUDIO_CONF, SKU_GUIDS.TEAMS_ESSENTIALS,
    SKU_GUIDS.POWER_BI_PRO,
  ],
  'o365-e3': [
    SKU_GUIDS.O365_E1, SKU_GUIDS.EXCHANGE_P1, SKU_GUIDS.EXCHANGE_P2, SKU_GUIDS.TEAMS_ESSENTIALS,
  ],
  'e1': [
    SKU_GUIDS.EXCHANGE_P1, SKU_GUIDS.AAD_BASIC,
  ],
  'f3': [
    SKU_GUIDS.EXCHANGE_KIOSK, SKU_GUIDS.INTUNE_A,
  ],
  'f1': [
    SKU_GUIDS.EXCHANGE_KIOSK,
  ],
  'business-premium': [
    SKU_GUIDS.M365_BUSINESS_STANDARD, SKU_GUIDS.M365_BUSINESS_BASIC,
    SKU_GUIDS.AAD_PREMIUM_P1, SKU_GUIDS.INTUNE_A, SKU_GUIDS.EXCHANGE_P1,
  ],
  'business-standard': [
    SKU_GUIDS.M365_BUSINESS_BASIC, SKU_GUIDS.EXCHANGE_P1,
  ],
  'business-basic': [
    SKU_GUIDS.EXCHANGE_P1,
  ],
  'ems-e5': [
    SKU_GUIDS.EMS_E3, SKU_GUIDS.AAD_PREMIUM_P2, SKU_GUIDS.AAD_PREMIUM_P1,
    SKU_GUIDS.INTUNE_A, SKU_GUIDS.AIP_PLAN1,
  ],
  'ems-e3': [
    SKU_GUIDS.AAD_PREMIUM_P1, SKU_GUIDS.INTUNE_A, SKU_GUIDS.AIP_PLAN1,
  ],
  'unknown-bundle': [],
};

/**
 * Add-ons are SKUs that legitimately extend a bundle beyond what's included.
 * These should be reported separately as "value add" not "waste".
 */
const ADDON_SKUS = new Set<string>([
  SKU_GUIDS.POWER_BI_PRO,
  SKU_GUIDS.POWER_BI_FREE,
  SKU_GUIDS.POWER_APPS_PER_USER,
  SKU_GUIDS.VISIO_PLAN1,
  SKU_GUIDS.VISIO_PLAN2,
  SKU_GUIDS.PROJECT_PLAN1,
  SKU_GUIDS.PROJECT_PLAN3,
  SKU_GUIDS.PROJECT_PLAN5,
  SKU_GUIDS.DYN365_CE,
  SKU_GUIDS.COPILOT_M365,
  SKU_GUIDS.COPILOT_STUDIO,
  SKU_GUIDS.TEAMS_PHONE_CALLING,
  SKU_GUIDS.EXCHANGE_KIOSK,
  SKU_GUIDS.FLOW_FREE,
]);

const SKU_COST: Record<string, number> = {
  [SKU_GUIDS.M365_E5]: 57,
  [SKU_GUIDS.M365_E3]: 36,
  [SKU_GUIDS.O365_E5]: 38,
  [SKU_GUIDS.O365_E3]: 20,
  [SKU_GUIDS.O365_E1]: 8,
  [SKU_GUIDS.M365_F3]: 10,
  [SKU_GUIDS.M365_F1]: 2.25,
  [SKU_GUIDS.O365_F3]: 8,
  [SKU_GUIDS.EMS_E5]: 16.50,
  [SKU_GUIDS.EMS_E3]: 10.05,
  [SKU_GUIDS.M365_BUSINESS_PREMIUM]: 22,
  [SKU_GUIDS.M365_BUSINESS_STANDARD]: 12.5,
  [SKU_GUIDS.M365_BUSINESS_STANDARD_LEGACY]: 12.5,
  [SKU_GUIDS.M365_BUSINESS_BASIC]: 6,
  [SKU_GUIDS.TEAMS_ESSENTIALS]: 4,
  [SKU_GUIDS.AAD_PREMIUM_P2]: 9,
  [SKU_GUIDS.AAD_PREMIUM_P1]: 6,
  [SKU_GUIDS.AAD_BASIC]: 1,
  [SKU_GUIDS.IDENTITY_THREAT_PROTECTION]: 12,
  [SKU_GUIDS.INTUNE_A]: 8,
  [SKU_GUIDS.EXCHANGE_P1]: 4,
  [SKU_GUIDS.EXCHANGE_P2]: 8,
  [SKU_GUIDS.EXCHANGE_KIOSK]: 2,
  [SKU_GUIDS.TEAMS_PHONE_SYSTEM]: 8,
  [SKU_GUIDS.TEAMS_PHONE_CALLING]: 12,
  [SKU_GUIDS.TEAMS_AUDIO_CONF]: 4,
  [SKU_GUIDS.TEAMS_EXPLORATORY]: 0,
  [SKU_GUIDS.POWER_BI_PRO]: 10,
  [SKU_GUIDS.POWER_BI_FREE]: 0,
  [SKU_GUIDS.POWER_APPS_PER_USER]: 20,
  [SKU_GUIDS.FLOW_FREE]: 0,
  [SKU_GUIDS.VISIO_PLAN2]: 15,
  [SKU_GUIDS.VISIO_PLAN1]: 5,
  [SKU_GUIDS.PROJECT_PLAN1]: 10,
  [SKU_GUIDS.PROJECT_PLAN3]: 30,
  [SKU_GUIDS.PROJECT_PLAN5]: 55,
  [SKU_GUIDS.WINDOWS_E3]: 7,
  [SKU_GUIDS.WINDOWS_E5]: 14,
  [SKU_GUIDS.DEFENDER_ENDPOINT]: 5,
  [SKU_GUIDS.DEFENDER_OFFICE_P1]: 1,
  [SKU_GUIDS.DYN365_CE]: 50,
  [SKU_GUIDS.COPILOT_M365]: 30,
  [SKU_GUIDS.COPILOT_STUDIO]: 200,
  [SKU_GUIDS.AIP_PLAN1]: 2,
  [SKU_GUIDS.E5_COMPLIANCE]: 9,
};

export function getSkuCost(skuId: string): number {
  return SKU_COST[skuId] ?? 0;
}

export function analyzeUserLicenses(skuIds: string[]): LicenseAnalysis {
  // 1. Find the highest bundle
  let bestBundle: BundleTier = 'unknown-bundle';
  let bundleSkuId: string | undefined;
  let bestRank = -1;
  for (const skuId of skuIds) {
    const bundle = getBundleTier(skuId);
    const rank = BUNDLE_RANK[bundle];
    if (rank > bestRank) {
      bestRank = rank;
      bestBundle = bundle;
      bundleSkuId = skuId;
    }
  }

  // 2. Determine which SKUs are redundant vs add-ons
  const includedInBundle = new Set<string>(BUNDLE_INCLUDES[bestBundle] || []);
  if (bundleSkuId) includedInBundle.add(bundleSkuId);

  const redundantSkus: string[] = [];
  const addOnSkus: string[] = [];

  for (const skuId of skuIds) {
    if (skuId === bundleSkuId) continue; // skip the bundle itself
    if (ADDON_SKUS.has(skuId)) {
      addOnSkus.push(skuId);
    } else if (includedInBundle.has(skuId)) {
      redundantSkus.push(skuId);
    } else {
      // Unknown - treat as add-on conservatively
      addOnSkus.push(skuId);
    }
  }

  const bundleCost = bundleSkuId ? getSkuCost(bundleSkuId) : 0;
  const redundantMonthlyCost = redundantSkus.reduce((sum, id) => sum + getSkuCost(id), 0);
  const addOnMonthlyCost = addOnSkus.reduce((sum, id) => sum + getSkuCost(id), 0);

  return {
    effectiveBundle: bestBundle,
    bundleSkuId,
    bundleLabel: BUNDLE_INFO[bestBundle].label,
    redundantSkus,
    addOnSkus,
    redundantMonthlyCost,
    addOnMonthlyCost,
    totalMonthlyCost: bundleCost + redundantMonthlyCost + addOnMonthlyCost,
  };
}
