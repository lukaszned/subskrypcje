# Sub-Sentry

Sub-Sentry is a subscription and recurring-bill management MVP. It helps users track manual subscriptions, recurring utility bills, upcoming payments, and email-detected subscription evidence.

The repository contains a TypeScript/Express backend and a React Native/Expo frontend.

## Current MVP Scope

Main product areas:

- Dashboard summaries for subscription cost and upcoming payments.
- Manual subscription and recurring bill management.
- Gmail legacy email scan through OAuth/Gmail API.
- Manual IMAP scan for MVP providers Onet and Interia.
- Email scan review buckets for IMAP results.
- Import preview and import confirm for selected scan findings.
- Regression tests for email detection, scan planning, product buckets, import preview, and import confirm.

MVP email provider scope:

| Provider | Flow | Status |
| --- | --- | --- |
| Gmail | OAuth / Gmail API | MVP legacy flow after OAuth reconnect. Uses detected-subscriptions path, not IMAP product buckets yet. |
| Onet | Manual IMAP | Tested for MVP. Backend normalizes mobile scans to a hidden bounded standard profile. |
| Interia | Manual IMAP | Tested for MVP. Backend normalizes mobile scans to a hidden bounded standard profile. |
| Other IMAP | Manual IMAP later | Architecturally possible but not officially marked ready until tested. |

## Backend Stack

- Node.js
- TypeScript
- Express
- Prisma with PostgreSQL
- Supabase Auth
- Zod validation
- Gmail API / Google OAuth
- IMAP via `imapflow`

## Frontend Stack

- React Native / Expo
- Supabase Auth client
- Backend API over LAN/tunnel during development

## Important Backend Endpoints

Public:

- `GET /health`

Authenticated:

- `GET /email-scan/status`
- `GET /email-scan/gmail/auth-url`
- `GET /email-scan/gmail/oauth-diagnostics`
- `POST /email-scan/gmail/scan`
- `POST /email-scan/imap/scan`
- `POST /email-scan/import-preview`
- `POST /email-scan/import-confirm`
- `GET /email-scan/detections`
- `PATCH /email-scan/detections/:id/accept`
- `PATCH /email-scan/detections/:id/ignore`

IMAP scan does not save data. It returns `productResult` buckets. Import-preview also does not save data. Import-confirm is the final explicit write step and creates supported `Subscription` records for confirmed drafts.

## Local Backend Setup

```powershell
cd backend
npm install
npm.cmd run build
npm.cmd run dev
```

Required backend environment:

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Required for Gmail OAuth/token storage:

- `EMAIL_TOKEN_ENCRYPTION_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Gmail redirect configuration:

- `GMAIL_REDIRECT_BASE_URL` is preferred.
- `GOOGLE_REDIRECT_URI` is supported as a legacy fallback.
- If neither is set, backend falls back to `http://localhost:3000/email-scan/gmail/callback`.

Examples:

```env
GMAIL_REDIRECT_BASE_URL=http://localhost:3000
GMAIL_REDIRECT_BASE_URL=http://192.168.18.5:3000
GMAIL_REDIRECT_BASE_URL=https://your-tunnel.example.com
```

For physical phone Gmail OAuth, use a LAN IP or public tunnel such as Cloudflare Tunnel/ngrok and register the exact callback URL in Google Cloud Console:

```text
{GMAIL_REDIRECT_BASE_URL}/email-scan/gmail/callback
```

## Frontend Setup

```powershell
cd frontend
npm install
npm start
```

Frontend environment should point to the reachable backend base URL, for example:

```env
EXPO_PUBLIC_API_BASE_URL=http://192.168.18.5:3000/
```

Use Android emulator fallback (`10.0.2.2`) only for emulator runs. Physical phones need the LAN IP or a tunnel.

## Verification Commands

Backend:

```powershell
cd backend
npm.cmd run build
npx.cmd tsc --noEmit
npm.cmd run test:email-detection
```

Safe smoke checks:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

With a Bearer token:

```powershell
$token = "<token>"
Invoke-RestMethod -Headers @{ Authorization = "Bearer $token" } http://localhost:3000/email-scan/status
Invoke-RestMethod -Headers @{ Authorization = "Bearer $token" } http://localhost:3000/email-scan/gmail/oauth-diagnostics
Invoke-RestMethod -Method Post -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } -Body "{}" http://localhost:3000/email-scan/imap/scan
Invoke-RestMethod -Method Post -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } -Body "{}" http://localhost:3000/email-scan/import-preview
```

Expected:

- `/health` -> `200`
- `/email-scan/status` without token -> `401 AUTH_REQUIRED`
- empty IMAP scan body -> `400 VALIDATION_ERROR`
- empty import-preview body -> `400 VALIDATION_ERROR`
- Gmail diagnostics -> safe config/redirect metadata, no secrets

## Documentation

- Backend Email Scan contract: `backend/docs/imap-scan-contract.md`
- Final QA checklist: `backend/docs/mvp-final-qa-checklist.md`

## Safety Rules

- Do not commit `.env` files.
- Do not commit real scan output JSON.
- Do not log IMAP passwords.
- Do not log Authorization headers or Gmail tokens.
- Do not expose raw email bodies in normal API responses.
- Do not enable `includeDebug=true` in production UI.

Ignored local artifacts include:

- `imap-*.json`
- `gmail-*.json`
- `import-preview-*.json`
- `confirm-debug-body.json`
- local tunnel/debug logs

## Known MVP Caveats

- Gmail mobile OAuth needs a reachable redirect URL; localhost is desktop-only.
- Production Gmail OAuth should use the stable HTTPS backend domain.
- Gmail scan is still the legacy detected-subscriptions path, not unified IMAP `productResult`.
- IMAP MVP provider scope is Gmail/Onet/Interia only.
- Supabase/Postgres can temporarily timeout; auth should return `503 AUTH_DATABASE_UNAVAILABLE`.
- Frontend still needs final phone E2E testing before release.
