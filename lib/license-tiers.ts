/**
 * Coarse license-tier label used for the bundle column in the dashboard.
 * Capability compliance is computed separately in `lib/capability-coverage.ts`;
 * this type is only a display grouping derived from the effective bundle.
 */
export type LicenseTier = 'premium' | 'basic' | 'teams' | 'mailbox' | 'utility' | 'unknown';
