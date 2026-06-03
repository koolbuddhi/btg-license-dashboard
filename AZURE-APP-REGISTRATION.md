# Azure App Registration Guide

This guide walks you through registering an application in Microsoft Entra ID (formerly Azure AD) to enable the Microsoft License Checker to authenticate and read license data from your organization.

---

## Prerequisites

- Access to the [Azure Portal](https://portal.azure.com)
- One of these roles: **Global Administrator**, **Application Administrator**, or **Cloud Application Administrator**
- A Microsoft 365 tenant with active licenses

---

## Step 1: Register the Application

1. Navigate to [Azure Portal](https://portal.azure.com)
2. In the left sidebar, select **Microsoft Entra ID** (search for it if not visible)
3. In the Entra ID menu, go to **App registrations** under **Applications**
4. Click **+ New registration**
5. Fill in the registration form:

   | Field | Value |
   |---|---|
   | **Name** | `Microsoft License Checker` (or any name you prefer) |
   | **Supported account types** | Select **Accounts in this organizational directory only** (Single tenant) |
   | **Redirect URI** | Type: **Single-page application (SPA)**<br>URL: `http://localhost:3000` |

6. Click **Register**

7. After registration, copy and save these values from the **Overview** page:
   - **Application (client) ID** — this is your `NEXT_PUBLIC_AZURE_CLIENT_ID`
   - **Directory (tenant) ID** — this is your `NEXT_PUBLIC_AZURE_TENANT_ID`

---

## Step 2: Configure API Permissions

1. In your app registration, go to **API permissions** in the left menu
2. Click **+ Add a permission**
3. Select **Microsoft Graph**
4. Choose **Application permissions** (recommended for org-wide access) or **Delegated permissions** (for user-specific access)

### Required Permissions

| Permission | Type | Description |
|---|---|---|
| `Organization.Read.All` | Delegated or Application | Read organization info |
| `Directory.Read.All` | Delegated or Application | Read directory data |
| `User.Read.All` | Delegated or Application | Read all user profiles (for user assignments) |
| `Directory.AccessAsUser.All` | Delegated | Access directory as user (optional) |

5. After adding permissions, click **Grant admin consent for [Your Organization]**
6. Confirm the consent prompt. A green checkmark should appear next to each permission.

---

## Step 3: Configure Authentication Settings

1. Go to **Authentication** in the left menu
2. Under **Single-page application**, verify `http://localhost:3000` is listed
3. If you plan to deploy, add your production URL (e.g., `https://your-domain.com`)
4. Under **Implicit grant and hybrid flows**, ensure:
   - **Access tokens** is **unchecked** (not needed for SPA flow)
   - **ID tokens** is **unchecked** (not needed for SPA flow)
5. Set **Allow public client flows** to **No** (SPA uses MSAL browser, not public client)
6. Click **Save**

---

## Step 4: Configure Token Settings (Optional but Recommended)

1. Go to **Token configuration** in the left menu
2. Click **+ Add optional claim**
3. Select **ID** token type
4. Add `email` and `preferred_username` if not already present
5. Click **Add**

---

## Step 5: Set Up Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_AZURE_CLIENT_ID=your-application-client-id-here
NEXT_PUBLIC_AZURE_TENANT_ID=your-directory-tenant-id-here
```

Replace the placeholder values with the IDs you copied in Step 1.

---

## Step 6: Verify the Setup

1. Start the application: `npm run dev`
2. Open `http://localhost:3000`
3. Click **Sign in with Microsoft**
4. Sign in with your organizational account
5. If successful, you should see the license dashboard with your organization's data

---

## Troubleshooting

### "AADSTS50011: The reply URL specified in the request does not match"
- Ensure the Redirect URI in Azure Portal exactly matches `http://localhost:3000`
- Check for trailing slashes — they must match exactly

### "Insufficient privileges to complete the operation"
- Verify admin consent was granted for all API permissions
- Confirm your account has the required role (Global Admin, Application Admin, etc.)

### "No accounts found" after login
- Clear browser cache and localStorage
- Ensure the app is registered as **SPA** (not Web) for the MSAL browser flow

### "Invalid client" or "Unauthorized"
- Double-check the Client ID and Tenant ID in `.env.local`
- Ensure there are no extra spaces or characters in the values

---

## Security Notes

- **Never commit `.env.local`** — it is already in `.gitignore`
- For production deployments, use Azure Key Vault or your hosting provider's secret management
- Consider using **Managed Identities** if deploying to Azure services
- Review assigned permissions periodically and remove any that are no longer needed
