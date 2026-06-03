# Microsoft License Checker

A web dashboard to audit and monitor Microsoft 365 license assignments using Microsoft Graph API.

## Features

- License overview with SKU breakdown
- User license assignment tracking
- Unused license identification
- CSV export for reporting
- Dark-themed dashboard UI

## Setup

1. Copy `.env.example` to `.env.local` and fill in your Azure credentials:
```bash
cp .env.example .env.local
```

2. Register an application in Azure AD:
   - Go to [Azure Portal](https://portal.azure.com) → App registrations → New registration
   - Set Redirect URI: **SPA** → `http://localhost:3000`
   - Add API permissions:
     - `Organization.Read.All`
     - `Directory.Read.All`
   - Grant admin consent for your organization

3. Install dependencies and run:
```bash
npm install
npm run dev
```

4. Open `http://localhost:3000` and sign in with your Microsoft 365 account.

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- MSAL Browser (Azure AD authentication)
- Microsoft Graph API
