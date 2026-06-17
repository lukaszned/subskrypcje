# Android Release Runbook

This runbook covers Android MVP preview and Google Play readiness for Sub-Sentry.

## Current Backend

Public backend URL:

```text
https://subsentry-api-ovl7.onrender.com
```

Health check:

```bash
curl https://subsentry-api-ovl7.onrender.com/health
```

Expected response:

```json
{ "status": "ok" }
```

## Environment Reminders

Frontend preview/production should use:

```text
EXPO_PUBLIC_API_BASE_URL=https://subsentry-api-ovl7.onrender.com/
EXPO_PUBLIC_ENABLE_GMAIL_SCAN=false
```

Supabase:

- Supabase Auth is used for accounts.
- Supabase project must remain active.
- Supabase anon key is public frontend config.
- Do not put service-role keys in frontend env.

Backend:

- Keep Render service deployed and awake enough for testing expectations.
- Set production env on Render, not in frontend files.
- Keep `EMAIL_SCAN_DEBUG=false` unless diagnosing a specific issue.

## Build Commands

Preview APK:

```bash
cd frontend
npx expo install --check
npx eas build --platform android --profile preview
```

Production AAB:

```bash
cd frontend
npx expo install --check
npx eas build --platform android --profile production
```

Do not run store submission commands until the owner explicitly decides to submit.

## Version Reminder

Before each Play upload:

- Check `frontend/app.json`.
- Increment Android `versionCode` for every new Play upload.
- Update user-facing `version` when appropriate.
- Confirm package name remains final: `app.subsentry.mobile`.

## APK Manual Test Checklist

Install preview APK on a physical Android device and test:

- App starts without Expo Go.
- Login/sign-up through Supabase works.
- Session survives app restart.
- Dashboard loads.
- Manual subscription creation works.
- Manual recurring bill creation works if exposed through the app flow.
- Dashboard monthly total updates after creating/importing items.
- Email Scan shows only Onet and Interia.
- Gmail connect/scan is not visible.
- Other/custom mailbox scan is not visible to normal users.
- Onet scan returns results or a safe actionable error.
- Interia scan returns results or a safe actionable error.
- Review, preview, and import-confirm work.
- Imported items appear in subscriptions and dashboard.
- Wrong IMAP password shows a readable auth/app-password message.
- Backend offline state shows a readable error.
- No raw debug JSON is visible.
- No raw email body is visible.

## Google Play Internal Testing Checklist

Before upload:

- Confirm production backend URL is stable and healthy.
- Confirm Supabase project is active.
- Confirm `EXPO_PUBLIC_ENABLE_GMAIL_SCAN=false`.
- Confirm Google Play listing does not claim Gmail scan support.
- Confirm privacy policy draft is reviewed and hosted if required.
- Confirm data safety form is reviewed and completed.
- Confirm reviewer test account is ready.
- Confirm any test Onet/Interia mailbox credentials are dedicated test credentials.

After upload:

- Add internal testers.
- Install from Play internal testing link.
- Repeat APK manual test checklist.
- Test over Wi-Fi and mobile data.
- Test app restart and session persistence.
- Verify dashboard totals after import.

## Rollback Notes

If a build is bad:

- Stop rollout or deactivate the internal testing release in Google Play Console.
- Rebuild with a higher `versionCode`.
- Keep the previous known-good APK/AAB link for comparison.
- Check Render logs and Supabase status before assuming the mobile build is broken.
- Do not change backend contracts during rollback unless a backend incident requires it.

## Known MVP Limitations

- iOS release is postponed.
- Gmail scan is experimental/dev-only and hidden in Android MVP.
- Email Scan officially supports Onet and Interia only.
- Other mailbox providers are future work.
- Scan findings require user review before saving.
- Gmail production release would require separate OAuth redirect, privacy, restricted-scope, and Google verification review.
