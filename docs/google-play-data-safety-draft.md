# Google Play Data Safety Draft

Draft status: conservative working draft for the Android MVP. The app owner must verify every answer in Google Play Console before submission.

## MVP Feature Scope

Active Android MVP features:

- Manual subscription and recurring bill management.
- Dashboard summaries.
- Email Scan for Onet and Interia through user-provided IMAP mailbox credentials.
- Review, preview, and import-confirm before saving detected scan results.

Not active in Android MVP:

- Gmail scan. Gmail is experimental/dev-only and hidden in preview/production MVP builds.
- Arbitrary unsupported mailbox providers as a public feature.

## Data Categories Likely Collected

Personal information:

- Email address or account identifier for login.
- Purpose: account creation, sign-in, account management, user support.
- Shared with service providers: Supabase for authentication and app backend/database operations.

Financial information:

- Subscription and recurring bill amounts, currency, billing cycle, payment dates, categories, and related notes entered or confirmed by the user.
- Purpose: app functionality, dashboard totals, reminders, subscription tracking.
- Shared with service providers: backend/database hosting providers as needed to operate the app.

App activity:

- User-created subscription records, imported scan results, item statuses, and app settings.
- Purpose: app functionality and synchronization across sessions.
- Shared with service providers: Supabase/Render as needed to operate the app.

Email or message-derived data:

- Structured scan findings from supported Onet/Interia mailboxes after a user starts a scan.
- Purpose: detect possible subscriptions, recurring bills, invoices, renewals, trials, and price changes.
- Raw email bodies are not intentionally stored.
- Scan results require user review before import.

Device or other identifiers:

- Google Play, Expo, Supabase, or platform services may process standard device/app identifiers, logs, or diagnostics depending on final build configuration.
- Owner must verify final SDK behavior before submission.

## Data Sharing

Data is processed by third-party service providers needed to operate the app:

- Supabase: authentication and database services.
- Render: backend hosting.
- Expo/EAS: build/distribution tooling.
- Google Play: Android app distribution and platform services.

This draft assumes data is not sold. Confirm in the final Play Console declaration.

## Encryption In Transit

Production app traffic should use HTTPS/TLS:

- Frontend to backend: HTTPS.
- Backend to Supabase/third-party services: HTTPS/TLS where supported.
- IMAP scans should use secure IMAP settings for supported providers.

Confirm final backend URL and provider configuration before submission.

## Account Creation And Login

Users create or access accounts through Supabase Auth. Account creation/login is required for the MVP app experience unless the owner changes this before release.

## User Data Deletion

The app owner must provide a user data deletion request process.

Placeholder:

- Data deletion URL or email: [INSERT]
- Account deletion instructions: [INSERT]
- Expected deletion handling time: [INSERT]

## Email Scan Handling

For Onet and Interia IMAP scan:

- Users provide mailbox credentials at scan time.
- IMAP password/app password is used only to perform the scan.
- IMAP password/app password is not intentionally stored.
- Raw email bodies are not intentionally stored.
- Results are shown for review before import.
- Only user-confirmed subscription or bill records are saved.

For Gmail:

- Gmail is not an active Android MVP feature.
- Do not mark Gmail scanning as a public MVP feature in Play Console.
- If Gmail is enabled in a future release, redo this data safety review for OAuth scopes, Google verification, privacy wording, and any Gmail-derived data handling.

## Conservative Notes To Confirm

Before Google Play submission, confirm:

- Final SDK list and whether any analytics/crash reporting SDKs collect additional data.
- Whether notifications collect or transmit tokens.
- Whether account deletion is available in-app or through a web/email request.
- Whether any logs contain personal data in production.
- Whether all production traffic uses HTTPS.
- Whether IMAP credential handling matches this draft in deployed backend logs and storage.

This document is a draft aid, not a final legal or policy declaration.
