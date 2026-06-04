# MVP Final QA Checklist

Use this checklist before handing the MVP to final frontend QA. Do not use real scan JSON artifacts in commits, screenshots, or issue reports unless they have been sanitized.

## Backend Setup

- `npm.cmd run build` passes in `backend/`.
- `npx.cmd tsc --noEmit` passes in `backend/`.
- `npm.cmd run test:email-detection` passes in `backend/`.
- `.env` is present locally and not committed.
- Local artifacts such as `imap-*.json`, `gmail-*.json`, `import-preview-*.json`, `confirm-debug-body.json`, tunnel logs, and Expo web logs are ignored.

## Required Backend Environment

- `DATABASE_URL` is set.
- `SUPABASE_URL` is set.
- `SUPABASE_ANON_KEY` is set.
- `EMAIL_TOKEN_ENCRYPTION_KEY` is set before using Gmail OAuth token storage.
- `PORT` is optional and defaults to `3000`.

## Optional Gmail Environment

- `GOOGLE_CLIENT_ID` is set for Gmail.
- `GOOGLE_CLIENT_SECRET` is set for Gmail.
- `GMAIL_REDIRECT_BASE_URL` is set for mobile dev or production.
- `GOOGLE_REDIRECT_URI` is supported as a legacy fallback.
- For physical phone dev, do not use a localhost redirect. Use LAN IP or a Cloudflare/ngrok tunnel and register the exact callback URL in Google Cloud Console.

Callback path:

```text
/email-scan/gmail/callback
```

## Smoke Commands

Run these without real email credentials.

Public health:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

Expected: `200` with `{ "status": "ok" }`.

Authenticated Email Scan status:

```powershell
$token = "<Bearer token without the Bearer prefix>"
Invoke-RestMethod `
  -Headers @{ Authorization = "Bearer $token" } `
  http://localhost:3000/email-scan/status
```

Expected: `200` when authenticated, `401 AUTH_REQUIRED` without a token.

IMAP validation smoke:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } `
  -Body "{}" `
  http://localhost:3000/email-scan/imap/scan
```

Expected: `400 VALIDATION_ERROR` with a safe `userMessage`.

Import-preview validation smoke:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Headers @{ Authorization = "Bearer $token"; "Content-Type" = "application/json" } `
  -Body "{}" `
  http://localhost:3000/email-scan/import-preview
```

Expected: `400 VALIDATION_ERROR`.

Gmail OAuth diagnostics:

```powershell
Invoke-RestMethod `
  -Headers @{ Authorization = "Bearer $token" } `
  http://localhost:3000/email-scan/gmail/oauth-diagnostics
```

Expected: `200` with safe redirect/config diagnostics, no secrets.

## Auth QA

- Login works.
- Expired token redirects or asks user to log in again.
- Missing Bearer token returns `401 AUTH_REQUIRED`.
- Temporary database auth failure returns `503 AUTH_DATABASE_UNAVAILABLE`.

## Dashboard QA

- Dashboard loads after login.
- Empty state is readable.
- Totals make sense after manual subscription creation.
- Totals are not inflated by skipped duplicate imports.
- Backend down/offline state is handled by frontend.

## Subscription CRUD QA

- Add subscription manually.
- Edit subscription.
- Mark paid if UI supports it.
- Cancel/delete according to current UI behavior.
- Recurring bill records created from import-confirm appear in list/dashboard without crashes.

## Email Scan QA

- Interia IMAP scan returns safe buckets.
- Onet IMAP scan returns safe buckets.
- Wrong IMAP password returns `IMAP_AUTH_FAILED`.
- Timeout returns `IMAP_CONNECTION_TIMEOUT`.
- Empty IMAP body returns `VALIDATION_ERROR`.
- Scan itself does not save data.
- Import-preview does not save data.
- Import-confirm saves only user-confirmed drafts.
- Duplicate import-confirm request skips duplicate items.
- UI does not show technical enum values as primary copy.

## Gmail QA

- Gmail auth-url works only when OAuth env is configured.
- Gmail mobile OAuth uses `GMAIL_REDIRECT_BASE_URL` with LAN IP or tunnel.
- Gmail scan can be dry-run tested after reconnect.
- Gmail remains on the legacy detected-subscriptions flow for MVP.

## Import QA

- Selected IMAP product item -> import-preview draft.
- Draft with amount/date -> `canConfirm=true`.
- Missing amount -> `canConfirm=false` and frontend asks user to fill amount.
- Price-change item is not auto-created.
- Bill item creates `isRecurringBill=true` only after confirm.
- Created items appear in subscriptions list.
- Repeated confirm skips duplicates.

Manual post-import visibility check:

1. Run an IMAP scan or use a previously sanitized productResult item.
2. Call `POST /email-scan/import-preview` with `{ "items": [fullProductResultItem] }`.
3. Choose a draft with `canConfirm=true`.
4. Call `POST /email-scan/import-confirm` with `{ "drafts": [draftFromPreview] }`.
5. Confirm the response contains `created[].subscriptionId`, list-ready fields, and `refreshHints.createdSubscriptionIds`.
6. Call `GET /subscriptions` with the same Bearer token.
7. Confirm the created `subscriptionId` appears in the list response.
8. Call dashboard endpoints such as `GET /dashboard/summary` and `GET /dashboard/health-score`.
9. Confirm dashboard responses do not crash.
10. Repeat the same import-confirm request and confirm it is skipped with `reason: "duplicate"` and `existingSubscriptionId`.

## Security QA

- Do not log IMAP passwords.
- Do not log Authorization tokens.
- Do not log Gmail access/refresh tokens.
- Do not expose raw email bodies in normal responses.
- Do not enable `includeDebug=true` in production UI.
- Do not store IMAP credentials in localStorage.
- Real scan JSON files are never committed.

## Release-Handoff Notes

- Gmail, Onet, and Interia are the MVP provider scope.
- Other IMAP providers remain architecturally possible but untested.
- Production Gmail OAuth should use an HTTPS backend domain.
- Frontend still needs final phone E2E testing.
