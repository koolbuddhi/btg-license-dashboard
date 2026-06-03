import type { AssignedPlan } from '@/lib/capability-coverage';

export interface ConsolidatedProduct {
  skuId: string;
  skuPartNumber: string;
  status: string;
  purchased: number;
  assigned: number;
  available: number;
  subscriptionCount: number;
  earliestStart?: string;
  latestExpiry?: string;
  isTrial: boolean;
  subscriptionIds: string[];
}

export interface SubscriptionInfo {
  id: string;
  commerceSubscriptionId: string;
  skuId: string;
  skuPartNumber: string;
  status: string;
  totalLicenses: number;
  isTrial: boolean;
  createdDateTime?: string;
  nextLifecycleDateTime?: string;
  serviceStatus?: { servicePlanId: string; servicePlanName: string; provisioningStatus: string }[];
}

export interface LicenseSku {
  skuId: string;
  skuPartNumber: string;
  consumedUnits: number;
  enabledUnits: number;
  warningUnits: number;
  prepaidUnits: number;
  lockedOutUnits: number;
  validFrom?: string;
  validTo?: string;
}

export interface LicenseAssignmentDetail {
  skuId: string;
  skuName: string;
  name?: string;
  disabledPlans: string[];
  assignedDateTime?: string;
}

export interface UserLicenseAssignment {
  userId: string;
  displayName: string;
  userPrincipalName: string;
  department?: string;
  jobTitle?: string;
  usageLocation?: string;
  userTypeFromGraph?: string;
  accountEnabled?: boolean;
  assignedLicenses: string[];
  /** Service plans across all assigned licenses, with enabled/disabled status. */
  assignedPlans: AssignedPlan[];
  licenseDetails: LicenseAssignmentDetail[];
  lastSignInDateTime?: string;
}

export interface LicenseOverview {
  totalSkus: number;
  totalLicenses: number;
  totalConsumed: number;
  totalUnused: number;
  skus: LicenseSku[];
}

// SKU GUID -> product name. Single source of truth lives in lib/license-sku-map.ts
// (validated against the Microsoft licensing-service-plan reference). Re-exported here
// so the detailed product view in app/page.tsx shares the same verified names.
export { SKU_FRIENDLY as SKU_ID_TO_NAME } from '@/lib/license-sku-map';
