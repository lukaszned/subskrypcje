# Sub-Sentry MVP Release Checklist

This checklist prepares the first installable MVP build. It is intentionally focused on build readiness and QA, not new features.

## Release Scope

MVP email scan providers:

- Gmail through the existing OAuth/Gmail scan flow.
- Onet through manual IMAP.
- Interia through manual IMAP.

Known app flow:

- Email scan works for Onet and Interia.
- Review, preview, and import-confirm work.
- Imported subscriptions and recurring bills appear in the app.
- Dashboard monthly totals update after import.
- IMAP scan uses the stable hidden `mvp_standard` profile.

## Configuration Audit

Frontend app config:

- App name: `Sub-Sentry`.
- Expo slug: `sub-sentry`.
- Version: `1.0.0`.
- Android package: `app.subsentry.mobile`.
- Android versionCode: `1`.
- iOS bundle identifier: `app.subsentry.mobile`.
- iOS buildNumber: `1`.
- Orientation: portrait.
- Icons and splash assets are configured in `frontend/assets`.
- No custom app scheme is currently required by the implemented flow.

Frontend environment:

- `EXPO_PUBLIC_API_BASE_URL` must point to the public HTTPS backend URL for release.
- Do not build release APK/AAB with a LAN, localhost, `10.0.2.2`, Cloudflare temporary, or ngrok URL.
- Supabase values in the frontend must be the public project URL and anon key only.
- No service-role keys, database URLs, OAuth secrets, IMAP passwords, or backend secrets belong in frontend env.

Backend environment:

- Backend must be deployed behind a stable public HTTPS URL.
- `/health` must return `200`.
- `GMAIL_REDIRECT_BASE_URL` must use the stable production backend origin.
- The exact Gmail callback URL must be registered in Google Cloud Console:
  `https://YOUR_BACKEND_DOMAIN/email-scan/gmail/callback`
- Do not use temporary Cloudflare/ngrok URLs for production OAuth.
- Set `EMAIL_SCAN_DEBUG=false` in production unless diagnosing a specific issue.

## EAS Build Profiles

`frontend/eas.json` contains:

- `development`: internal development client APK.
- `preview`: internal installable APK for QA.
- `production`: Android App Bundle for store upload.

Before the first EAS build, run:

```bash
cd frontend
npx eas login
npx eas build:configure
```

If EAS asks to create or link a project, choose the project intended for Sub-Sentry. After linking, Expo may add an EAS project id to app config.

## Android Preview Build

Use the preview profile for installable QA builds:

```bash
cd frontend
npx expo install --check
npx eas build --platform android --profile preview
```

Expected output:

- EAS uploads the project.
- EAS produces an internal Android APK link.
- Install the APK on a physical Android phone and run the QA checklist below.

Do not run store submission commands for MVP QA builds.

## Production Build

Only after preview QA passes:

```bash
cd frontend
npx expo install --check
npx eas build --platform android --profile production
```

The production profile creates an Android App Bundle (`.aab`) suitable for Google Play Console upload.

## Google Play Internal Testing Checklist

Before uploading:

- Confirm package name is final: `app.subsentry.mobile`.
- Confirm version and versionCode are correct.
- Confirm app name and icon render correctly.
- Confirm production API URL is HTTPS and stable.
- Confirm Supabase production/project env is intended.
- Confirm backend `/health` is reachable from mobile data and Wi-Fi.
- Confirm Google OAuth redirect URI is registered for the production backend URL.
- Confirm no debug build banner or debug payload is visible in the UI.
- Confirm privacy policy/store listing requirements are ready.

After upload to Internal testing:

- Add tester email accounts.
- Install from Play testing link.
- Test fresh install and login.
- Test app after force close/reopen.
- Test on Wi-Fi and mobile data.

## Final QA Scenarios

Authentication:

- Create or sign in as a test user.
- Confirm invalid login errors are readable.
- Confirm session survives app restart.

Dashboard:

- Empty dashboard state is readable.
- Monthly total is correct before import.
- Monthly total updates after importing subscriptions and recurring bills.

Manual subscription flow:

- Add a monthly subscription.
- Add a yearly subscription.
- Edit and delete a subscription.
- Confirm totals update.

Email scan:

- Open Email Scan screen.
- Confirm no technical scan mode selector is visible.
- Confirm no raw debug JSON is visible.
- Onet manual IMAP scan returns a safe result or actionable error.
- Interia manual IMAP scan returns product buckets.
- Gmail connect flow opens OAuth and returns to backend callback.
- Gmail dry-run scan works after reconnect.
- Review scan results before import.
- Preview selected items.
- Confirm import.
- Imported items appear in subscriptions and dashboard.

Email scan buckets:

- `currentSubscriptions` are shown as high-confidence active items.
- `needsReviewSubscriptions` are not presented as confirmed active.
- `priceChanges` are displayed separately and not auto-created.
- `billsOrUtilities` are displayed separately from normal subscriptions.
- `historicalSubscriptions` are lower priority or collapsed.

Error states:

- Missing IMAP fields show validation errors.
- Wrong IMAP password shows an auth/app-password error.
- Timeout shows a retry-friendly message.
- Gmail reconnect-required errors ask the user to reconnect Gmail.
- Backend unavailable shows a readable network error.

Security/privacy:

- IMAP password is not persisted in frontend storage.
- IMAP password is not logged.
- OAuth tokens are not logged.
- Raw email bodies are not shown in UI.
- `includeDebug` is not used in production UI.

## Release Blockers To Resolve Manually

- Choose and deploy the final public HTTPS backend URL.
- Set `EXPO_PUBLIC_API_BASE_URL` to that HTTPS URL for release builds.
- Set backend production env, including `GMAIL_REDIRECT_BASE_URL`.
- Add the production Gmail callback URL in Google Cloud Console.
- Run EAS project linking/configuration if it has not been done yet.
- Confirm Supabase production/project environment.
- Complete Google Play Console store metadata, data safety, and privacy policy.

## Verification Commands

Run before each release candidate:

```bash
cd backend
npm.cmd run build
npx.cmd tsc --noEmit
npm.cmd run test:email-detection
```

```bash
cd frontend
npx.cmd tsc --noEmit
npx.cmd expo install --check
```

From repo root:

```bash
git diff --check
```
