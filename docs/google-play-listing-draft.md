# Google Play Listing Draft

Draft status: working copy for owner review. Do not publish without final product, legal, and store-policy review.

## App Title

Sub-Sentry

## Short Description

Track subscriptions, recurring bills, and upcoming payments in one simple dashboard.

## Long Description

Sub-Sentry helps you keep track of subscriptions and recurring bills before they surprise your budget.

Add your services manually, monitor monthly totals, review upcoming payments, and use the Android MVP Email Scan flow for supported Onet and Interia mailboxes. Email Scan looks for possible subscriptions and recurring bills, then shows results for review before anything is saved.

The MVP is built around user confirmation: scan results are grouped, previewed, and imported only after you decide what should be added.

## Feature Bullets

- Track subscriptions and recurring bills.
- View monthly and yearly cost summaries.
- Add services manually.
- Review upcoming payments.
- Scan supported Onet and Interia mailboxes for possible subscriptions and bills.
- Preview detected items before saving.
- Keep bills and subscriptions organized separately.

## Supported In Android MVP

- Manual subscription management.
- Dashboard totals.
- Onet Email Scan through IMAP.
- Interia Email Scan through IMAP.
- Review, preview, and import-confirm flow.
- Public Render backend: `https://subsentry-api-ovl7.onrender.com`.
- Supabase Auth accounts.

## Not Supported In Android MVP

- Gmail scan as a public user-facing feature.
- Outlook, Yahoo, WP/O2, iCloud, or arbitrary mailbox providers as official supported scan providers.
- iOS release.
- Automatic cancellation of subscriptions.
- Bank account connection.
- Store submission automation.

Gmail exists only as experimental/dev backend functionality and should not be mentioned as an active MVP scan provider in public listing copy.

## Screenshot Checklist

Recommended screenshots:

- Login or welcome screen.
- Dashboard with monthly total.
- Manual add subscription screen.
- Subscriptions list.
- Email Scan provider selection showing Onet and Interia.
- Email Scan review results.
- Import preview confirmation.

Avoid screenshots that show:

- Gmail scan or Gmail connect UI.
- Debug payloads.
- Raw email content.
- Real private user emails, passwords, subscriptions, or tokens.
- Temporary/local backend URLs.

## App Access Instructions For Google Play Reviewers

Reviewer notes placeholder:

- The app requires account login through Supabase Auth.
- Test account email: [INSERT TEST ACCOUNT EMAIL]
- Test account password: [INSERT TEST ACCOUNT PASSWORD]
- Backend health check: `https://subsentry-api-ovl7.onrender.com/health`
- Email Scan MVP supports Onet and Interia only.
- If reviewer cannot use a real Onet/Interia mailbox, provide prepared test credentials or instruct reviewers to use manual subscription features.

Do not include real personal mailbox credentials in this document. Use a dedicated test mailbox if needed.

## First Android MVP Release Notes

Initial Android MVP release:

- Add and manage subscriptions.
- Track recurring bills.
- See dashboard monthly totals.
- Scan supported Onet and Interia mailboxes for possible subscriptions and bills.
- Review scan results before import.

Known limitations:

- Gmail scan is not active in this MVP.
- iOS is postponed.
- Only Onet and Interia are officially supported for Email Scan.
- Some scan results may require manual review and correction.
