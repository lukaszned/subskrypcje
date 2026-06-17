# Sub-Sentry Privacy Policy Draft

Draft status: this document is a working draft for the Android MVP and requires owner/legal review before publication.

## App

App name: Sub-Sentry

Sub-Sentry helps users track subscriptions, recurring bills, upcoming payments, and manually reviewed email scan results. The Android MVP focuses on manual subscription management, dashboard summaries, and Email Scan for supported IMAP mailboxes: Onet and Interia.

## Data We Collect Or Process

Account and authentication data:

- Users create or sign in to an account using Supabase Auth.
- Supabase may process login identifiers such as email address, authentication tokens, and account metadata needed to provide authentication.

Subscription and bill data entered by the user:

- Subscription or recurring bill name.
- Provider or merchant name.
- Amount, currency, billing cycle, payment dates, category, status, notes, and related settings.
- User-selected imported scan results after review/preview.

Email Scan data for Onet and Interia:

- Users may provide mailbox credentials to scan supported mailboxes.
- The Android MVP supports Onet and Interia Email Scan only.
- The scan looks for likely subscription, recurring bill, invoice, renewal, trial, payment, and price-change evidence.
- Scan results are shown to the user for review before anything is imported.
- Users choose which detected items to preview and confirm before saving.

IMAP credentials:

- IMAP passwords or app passwords are used only to perform the scan.
- IMAP passwords are not intentionally stored by the app.
- Users should use app passwords where their email provider supports them.

Email message contents:

- Raw email bodies are not intentionally stored.
- The scan response is designed to return structured findings and safe summaries rather than full raw messages.
- Imported records contain user-reviewed subscription or bill details, not raw mailbox contents.

Gmail:

- Gmail scan code may exist in backend/dev tooling, but Gmail is experimental/dev-only and is not active in the first Android MVP release.
- Gmail should not be treated as a user-facing MVP feature unless explicitly enabled in a future release after OAuth, privacy, and verification work is completed.

## How We Use Data

We use data to:

- Authenticate users.
- Store and display subscriptions and recurring bills.
- Calculate dashboard totals and upcoming payments.
- Run supported mailbox scans when a user provides credentials and starts a scan.
- Let users review, preview, and import selected scan findings.
- Provide app diagnostics and safe error handling.

## Third-Party Service Providers

Sub-Sentry may use:

- Supabase for authentication and database services.
- Render for backend hosting.
- Expo/EAS for app build and distribution workflows.
- Google Play for Android app distribution, internal testing, crash/store metadata, and related platform services.

These providers process data according to their own terms and privacy policies. Confirm the final provider list before publication.

## Security Practices

- Data is sent over HTTPS/TLS in production.
- The app should use a public HTTPS backend URL for release builds.
- IMAP passwords are not intentionally stored.
- Raw email bodies are not intentionally stored.
- Debug logging should be disabled in production.
- Secrets such as service keys, database URLs, OAuth client secrets, and IMAP passwords must not be included in frontend builds.

## Data Sharing

Data may be processed by service providers listed above to operate the app. Sub-Sentry should not sell user data. Confirm final data-sharing claims before Google Play submission.

## Data Retention And Deletion

Users should be able to request deletion of their account and app data.

Deletion request process placeholder:

- Contact: [INSERT SUPPORT EMAIL OR FORM URL]
- Include the account email used in Sub-Sentry.
- The owner should define expected deletion timing and scope before publication.

## Contact

Privacy/contact placeholder:

- [INSERT LEGAL OWNER NAME]
- [INSERT SUPPORT EMAIL]
- [INSERT BUSINESS ADDRESS IF REQUIRED]

## Disclaimer

This is not legal advice. This draft must be reviewed and adapted by the app owner or legal counsel before publishing to Google Play or exposing it to users.
