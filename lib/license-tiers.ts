export type LicenseTier = 'premium' | 'basic' | 'teams' | 'mailbox' | 'utility' | 'unknown';

export interface TierConfig {
  tier: LicenseTier;
  label: string;
  description: string;
  color: string;
  monthlyCostEstimate: number;
}

export const TIER_CONFIGS: Record<LicenseTier, TierConfig> = {
  premium: {
    tier: 'premium',
    label: 'Premium',
    description: 'Full productivity suite (E3/E5, F3)',
    color: 'blue',
    monthlyCostEstimate: 57,
  },
  basic: {
    tier: 'basic',
    label: 'Basic',
    description: 'Essential productivity (E1, Business)',
    color: 'gray',
    monthlyCostEstimate: 12.5,
  },
  teams: {
    tier: 'teams',
    label: 'Teams Only',
    description: 'Teams communication/phone only',
    color: 'purple',
    monthlyCostEstimate: 15,
  },
  mailbox: {
    tier: 'mailbox',
    label: 'Mailbox',
    description: 'Exchange/Kiosk mailbox',
    color: 'cyan',
    monthlyCostEstimate: 4,
  },
  utility: {
    tier: 'utility',
    label: 'Utility',
    description: 'Service/security add-on (Defender, AAD P)',
    color: 'amber',
    monthlyCostEstimate: 8,
  },
  unknown: {
    tier: 'unknown',
    label: 'Other',
    description: 'Specialty license (Visio, Project, Power BI)',
    color: 'gray',
    monthlyCostEstimate: 0,
  },
};

const PREMIUM_PATTERNS = [
  /microsoft 365 e3/i,
  /microsoft 365 e5/i,
  /office 365 e3/i,
  /office 365 e5/i,
  /microsoft 365 f3/i,
  /microsoft 365 f1/i,
  /spe_e3/i,
  /spe_e5/i,
];

const BASIC_PATTERNS = [
  /microsoft 365 e1/i,
  /office 365 e1/i,
  /exchange online plan 1/i,
  /microsoft 365 apps for business/i,
  /business basic/i,
  /business standard/i,
];

const TEAMS_PATTERNS = [
  /teams (?!exploratory)/i,
  /teams phone/i,
  /teams audio/i,
  /microsoft teams essentials/i,
];

const MAILBOX_PATTERNS = [
  /exchange online kiosk/i,
  /exchange online plan 1$/i,
  /exchange online \(kiosk\)/i,
  /^kiosk/i,
];

const UTILITY_PATTERNS = [
  /defender for /i,
  /azure ad premium/i,
  /aad premium/i,
  /intune/i,
  /entra id/i,
  /power bi pro/i,
];

export function classifyLicenseTier(skuPartNumber: string, skuName?: string): LicenseTier {
  const candidates = [skuPartNumber, skuName].filter(Boolean) as string[];
  for (const text of candidates) {
    if (PREMIUM_PATTERNS.some((p) => p.test(text))) return 'premium';
    if (TEAMS_PATTERNS.some((p) => p.test(text))) return 'teams';
    if (MAILBOX_PATTERNS.some((p) => p.test(text))) return 'mailbox';
    if (BASIC_PATTERNS.some((p) => p.test(text))) return 'basic';
    if (UTILITY_PATTERNS.some((p) => p.test(text))) return 'utility';
  }
  return 'unknown';
}

export function getTierConfig(tier: LicenseTier): TierConfig {
  return TIER_CONFIGS[tier];
}
