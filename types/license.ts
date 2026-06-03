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
  assignedLicenses: string[];
  licenseDetails: LicenseAssignmentDetail[];
}

export interface LicenseOverview {
  totalSkus: number;
  totalLicenses: number;
  totalConsumed: number;
  totalUnused: number;
  skus: LicenseSku[];
}

export const SKU_ID_TO_NAME: Record<string, string> = {
  'c7df2760-2c81-4ef7-b578-5b5392b571df': 'Microsoft 365 E5',
  '6fd2c87f-b296-42f0-b197-1e91e994b900': 'Microsoft 365 E3',
  'efccb6f7-5641-4e0e-bd10-b4976e1bf68e': 'EMS E5',
  'b05e124f-c7cc-45a0-a6aa-8cf78c946968': 'EMS E3',
  'f30db892-07e9-47e9-837c-80727f46fd3d': 'Flow Free',
  '078d2b04-f1bd-4111-bbd4-b4b1b354e4f4': 'AAD Premium P1',
  'eec0eb4f-6444-4f95-aba0-50c24d67f998': 'AAD Premium P2',
  '05e9a617-0261-4f01-be66-d60139f9f493': 'Dynamics 365 Customer Engagement',
  '8c4ce438-32a2-4ac2-83c1-8e4009963101': 'Sway',
  '2612a243-486a-4077-94d0-9a00800f258c': 'Power BI Pro',
  'f8a1db68-be16-40ed-86d5-cb42ce701158': 'Power BI Premium P1',
  '70d33638-9c74-4d01-bfd3-562de28bd4ba': 'Microsoft 365 E3 (no Teams)',
  'cbdc14ab-d96c-4c30-b9f4-6ada779d4991': 'Microsoft 365 E5 (no Audio Conferencing)',
  '06145cfe-01e4-4539-9838-68d5c841dc33': 'Visio Plan 2',
  '663a8744-9d0a-4d42-be43-1b9fef7ea928': 'Project Plan 3',
  'b737dad2-2f6c-4c65-90e3-ca563267e8b9': 'Project Plan 5',
  '48225b45-d62f-406e-9a9f-638082681480': 'Project Plan 1',
  'a4034ccf-2d5b-4267-bf8e-31769e15f090': 'Power Apps per User',
  '18181a46-0d4e-45cd-891e-60aabd171b4e': 'Microsoft 365 F3',
  'b7554364-20a6-4cc2-800a-c0858fe094b5': 'Microsoft 365 F1',
  '531ee2f8-b175-4d6c-84ad-21b0e4d240cb': 'Windows 10/11 Enterprise E3',
  '0577f386-70ee-49e3-a55e-b8eb6338c6cd': 'Windows 10/11 Enterprise E5',
  '2e7c680f-3d7b-4d34-9148-4a9e21f1b5dc': 'Defender for Endpoint P2',
  '3326378a-615f-4d98-9f52-7995859cb2a8': 'Defender for Office 365 Plan 2',
  '8c09742e-7b2e-4b3f-9b1c-7c9b5f5e5e5e': 'Exchange Online Plan 2',
  'efb87545-9638-4167-a2f7-709e1c8108c2': 'Exchange Online Plan 1',
  '9f431833-0334-42de-a7dc-70aa40db4e83': 'Exchange Online Kiosk',
  '3af49299-2e94-4e22-b2d4-939168ed21f0': 'Teams Exploratory',
  '57ff2da0-773e-42df-b2af-ffb7a2317929': 'Teams Phone System',
  '1f2f344a-700d-42c9-9fb2-1e0f0e569590': 'Teams Phone with Calling Plan',
  '4b0600a0-8e74-48a3-a2be27bfe20febd3': 'Common Area Phone',
  '41781fb2-bc02-4b7c-bd55-b576c07bb08d': 'Microsoft 365 Audio Conferencing',
  'd9451686-5913-4c2d-9927-75350e99663e': 'Copilot for Microsoft 365',
  '94763226-9b3c-4e7e-a928-0c995366a341': 'Copilot Studio',
};
