import { PublicClientApplication, EventType } from '@azure/msal-browser';
import { MS_CONFIG, GRAPH_SCOPES } from './msal-config';
import type { LicenseSku, UserLicenseAssignment, LicenseOverview, LicenseAssignmentDetail, SubscriptionInfo, ConsolidatedProduct } from '@/types/license';

let msalInstance: PublicClientApplication | null = null;
let initPromise: Promise<PublicClientApplication> | null = null;

export async function getMsalInstance(): Promise<PublicClientApplication> {
  if (msalInstance) return msalInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const instance = new PublicClientApplication(MS_CONFIG);
    await instance.initialize();

    instance.addEventCallback((event) => {
      if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
        const payload = event.payload as any;
        if (payload.account) {
          instance.setActiveAccount(payload.account);
        }
      }
    });

    const accounts = instance.getAllAccounts();
    if (accounts.length > 0) {
      instance.setActiveAccount(accounts[0]);
    }

    msalInstance = instance;
    return instance;
  })();

  return initPromise;
}

export async function login(): Promise<void> {
  const instance = await getMsalInstance();
  await instance.loginRedirect({
    scopes: GRAPH_SCOPES,
  });
}

export async function logout(): Promise<void> {
  const instance = await getMsalInstance();
  await instance.logoutRedirect();
}

export async function handleRedirectPromise(): Promise<void> {
  const instance = await getMsalInstance();
  await instance.handleRedirectPromise();
}

export async function getAccessToken(): Promise<string | null> {
  const instance = await getMsalInstance();
  const account = instance.getActiveAccount() || instance.getAllAccounts()[0];
  if (!account) return null;

  try {
    const response = await instance.acquireTokenSilent({
      scopes: GRAPH_SCOPES,
      account,
    });
    return response.accessToken;
  } catch {
    return null;
  }
}

export async function fetchLicenseSkus(token: string): Promise<LicenseSku[]> {
  const response = await fetch(
    'https://graph.microsoft.com/v1.0/subscribedSkus',
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) throw new Error('Failed to fetch license SKUs');
  const data = await response.json();
  return data.value.map((sku: any) => ({
    skuId: sku.skuId,
    skuPartNumber: sku.skuPartNumber,
    consumedUnits: sku.consumedUnits || 0,
    enabledUnits: sku.prepaidUnits?.enabled || 0,
    warningUnits: sku.prepaidUnits?.warning || 0,
    prepaidUnits: sku.prepaidUnits?.enabled || 0,
    lockedOutUnits: sku.prepaidUnits?.lockedOut || 0,
    validFrom: sku.validFrom || undefined,
    validTo: sku.validTo || undefined,
  }));
}

export async function fetchUserAssignments(
  token: string,
  top: number = 999
): Promise<UserLicenseAssignment[]> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users?$top=${top}&$select=id,displayName,userPrincipalName,department,jobTitle,usageLocation,userType,accountEnabled,assignedLicenses`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) throw new Error('Failed to fetch user assignments');
  const data = await response.json();
  return data.value.map((user: any) => ({
    userId: user.id,
    displayName: user.displayName,
    userPrincipalName: user.userPrincipalName,
    department: user.department || undefined,
    jobTitle: user.jobTitle || undefined,
    usageLocation: user.usageLocation || undefined,
    userTypeFromGraph: user.userType || undefined,
    accountEnabled: user.accountEnabled !== false,
    assignedLicenses: (user.assignedLicenses || []).map((l: any) => l.skuId),
    licenseDetails: [],
  }));
}

export interface SignInActivity {
  userId: string;
  userPrincipalName: string;
  lastSignInDateTime?: string;
}

export async function fetchUserSignInActivity(
  token: string,
  top: number = 999
): Promise<SignInActivity[]> {
  const response = await fetch(
    `https://graph.microsoft.com/beta/users?$top=${top}&$select=id,userPrincipalName,signInActivity`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) {
    console.warn('signInActivity not available (requires beta or audit log access)');
    return [];
  }
  const data = await response.json();
  return data.value.map((user: any) => ({
    userId: user.id,
    userPrincipalName: user.userPrincipalName,
    lastSignInDateTime: user.signInActivity?.lastSignInDateTime,
  }));
}

export async function fetchLicenseOverview(
  token: string
): Promise<LicenseOverview> {
  const skus = await fetchLicenseSkus(token);
  const totalLicenses = skus.reduce((sum, sku) => sum + sku.enabledUnits, 0);
  const totalConsumed = skus.reduce((sum, sku) => sum + sku.consumedUnits, 0);

  return {
    totalSkus: skus.length,
    totalLicenses,
    totalConsumed,
    totalUnused: totalLicenses - totalConsumed,
    skus,
  };
}

export async function fetchSubscriptions(token: string): Promise<SubscriptionInfo[]> {
  const response = await fetch(
    'https://graph.microsoft.com/beta/directory/subscriptions',
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) return [];
  const data = await response.json();
  return (data.value || []).map((s: any) => ({
    id: s.id,
    commerceSubscriptionId: s.commerceSubscriptionId || '',
    skuId: s.skuId || '',
    skuPartNumber: s.skuPartNumber || '',
    status: s.status || '',
    totalLicenses: s.totalLicenses || 0,
    isTrial: s.isTrial || false,
    createdDateTime: s.createdDateTime || undefined,
    nextLifecycleDateTime: s.nextLifecycleDateTime || undefined,
    serviceStatus: s.serviceStatus || [],
  }));
}

export function consolidateProducts(
  skus: LicenseSku[],
  subscriptions: SubscriptionInfo[]
): ConsolidatedProduct[] {
  const skuMap = new Map<string, LicenseSku>();
  for (const sku of skus) {
    skuMap.set(sku.skuId, sku);
  }

  const productMap = new Map<string, ConsolidatedProduct>();

  for (const sub of subscriptions) {
    const key = sub.skuId;
    const existing = productMap.get(key);
    const sku = skuMap.get(key);

    if (existing) {
      existing.subscriptionCount += 1;
      existing.purchased += sub.totalLicenses;
      if (sub.createdDateTime && (!existing.earliestStart || sub.createdDateTime < existing.earliestStart)) {
        existing.earliestStart = sub.createdDateTime;
      }
      if (sub.nextLifecycleDateTime && (!existing.latestExpiry || sub.nextLifecycleDateTime > existing.latestExpiry)) {
        existing.latestExpiry = sub.nextLifecycleDateTime;
      }
      if (sub.isTrial) existing.isTrial = true;
      existing.subscriptionIds.push(sub.commerceSubscriptionId);
      if (sub.status !== 'Enabled' && existing.status === 'Enabled') {
        existing.status = sub.status;
      }
    } else {
      productMap.set(key, {
        skuId: sub.skuId,
        skuPartNumber: sub.skuPartNumber,
        status: sub.status,
        purchased: sub.totalLicenses,
        assigned: sku?.consumedUnits || 0,
        available: Math.max(0, sub.totalLicenses - (sku?.consumedUnits || 0)),
        subscriptionCount: 1,
        earliestStart: sub.createdDateTime,
        latestExpiry: sub.nextLifecycleDateTime,
        isTrial: sub.isTrial,
        subscriptionIds: [sub.commerceSubscriptionId],
      });
    }
  }

  for (const sku of skus) {
    if (!productMap.has(sku.skuId)) {
      productMap.set(sku.skuId, {
        skuId: sku.skuId,
        skuPartNumber: sku.skuPartNumber,
        status: sku.lockedOutUnits > 0 ? 'LockedOut' : 'Enabled',
        purchased: sku.enabledUnits,
        assigned: sku.consumedUnits,
        available: sku.enabledUnits - sku.consumedUnits,
        subscriptionCount: 0,
        isTrial: false,
        subscriptionIds: [],
      });
    }
  }

  return Array.from(productMap.values()).sort((a, b) =>
    a.skuPartNumber.localeCompare(b.skuPartNumber)
  );
}

export async function fetchLicenseDetail(
  token: string,
  userId: string
): Promise<LicenseAssignmentDetail[]> {
  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${userId}/licenseDetails`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!response.ok) return [];
  const data = await response.json();
  return (data.value || []).map((d: any) => ({
    skuId: d.skuId,
    skuName: d.skuPartNumber,
    disabledPlans: d.disabledPlans || [],
    assignedDateTime: d.assignedDateTime || undefined,
  }));
}
