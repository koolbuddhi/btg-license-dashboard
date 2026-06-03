export const MS_CONFIG = {
  auth: {
    clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID || 'common'}`,
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
