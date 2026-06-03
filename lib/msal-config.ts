// Redirect URI = the current origin (no path), so each environment uses its own
// registered SPA redirect URI:
//   - production: https://btg-license.pages.dev
//   - preview:    https://preview.btg-license.pages.dev   (the `preview` branch alias)
// Both origins must be registered as SPA redirect URIs in the Entra app registration.
// NEXT_PUBLIC_REDIRECT_URI can override this if a fixed URI is ever needed.
const redirectUri =
  process.env.NEXT_PUBLIC_REDIRECT_URI ||
  (typeof window !== 'undefined' ? window.location.origin : undefined);

export const MS_CONFIG = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID || 'common'}`,
    redirectUri,
    postLogoutRedirectUri: redirectUri,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
};

export const GRAPH_SCOPES = [
  'User.Read',
  'Organization.Read.All',
  'Directory.Read.All',
];

export const GRAPH_ENDPOINT = 'https://graph.microsoft.com/v1.0';
