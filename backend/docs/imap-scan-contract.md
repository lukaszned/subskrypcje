# IMAP Scan Contract

Frontend integration target for:

`POST /email-scan/imap/scan`

The route requires the same `Authorization: Bearer <token>` auth as the other backend routes. Do not send IMAP credentials to any frontend logging or analytics sink.

## MVP Email Provider Scope

MVP supported/tested email providers:

- Gmail through the existing Gmail OAuth flow.
- Onet through manual IMAP.
- Interia through manual IMAP.

Other IMAP providers are not blocked architecturally, but they are not officially marked ready for MVP until we have real test accounts or user-provided validation. They can be added later as provider presets or app updates.

### Provider Readiness Matrix

| Provider | Flow type | Endpoint | Tested | Reliability | Notes |
| --- | --- | --- | --- | --- | --- |
| Gmail | OAuth / Gmail API | `POST /email-scan/gmail/scan` | Existing flow; contract audited in Phase 63 | Depends on Gmail API path | Does not require IMAP password. Current response is legacy detection-oriented, not `productResult` bucket-oriented yet. |
| Onet | Manual IMAP | `POST /email-scan/imap/scan` | Yes | Medium | Server-side BODY/HEADER targeted search was not useful; adaptive scan uses metadata prepass plus time-bucket fallback. |
| Interia | Manual IMAP | `POST /email-scan/imap/scan` | Yes | High | BODY targeted search is useful; payment-processor bill dedupe is handled globally. |
| Other IMAP | Manual IMAP later | `POST /email-scan/imap/scan` | No | Unknown | Future provider preset/update after real testing. Manual endpoint may work, but frontend should mark it experimental if exposed. |

### Gmail Contract Audit

`POST /email-scan/gmail/scan` is currently a legacy Gmail detection flow:

- Uses OAuth/Gmail API, not IMAP credentials.
- Searches Gmail with query variants.
- Analyzes message metadata/snippets.
- Saves candidate detections to `DetectedSubscription` unless `dryRun=true`.
- `dryRun=true` analyzes messages and returns counts without creating detections or updating `lastScanAt`.
- Non-dry-run scans create detections once per `userId + gmail + sourceMessageId`; repeated scans skip existing detections.
- Duplicate Gmail query matches are deduped before candidate persistence.
- Returns legacy fields such as:
  - `connection`
  - `scannedMessages`
  - `uniqueMessagesAnalyzed`
  - `duplicateQueryMatchesSuppressed`
  - `candidatesFound`
  - `createdDetections`
  - `skippedExisting`
  - `rejectedMessages`
  - `querySummaries`
  - `created`
  - `dryRun`
  - optional `debugMessages` when `debug=true`

Current Gmail response does **not** return:

- `productResult`
- `productResult.currentSubscriptions`
- `productResult.needsReviewSubscriptions`
- `productResult.priceChanges`
- `productResult.billsOrUtilities`
- IMAP-style `scanSummary`

Frontend implication:

- IMAP Onet/Interia can use the new bucket UI directly.
- Gmail should use the existing Gmail connect/scan/detected-subscriptions flow for MVP unless/until a Gmail `productResult` adapter is added.
- Do not send Gmail legacy `created` detections directly to `POST /email-scan/import-preview`; import-preview expects product bucket items from the IMAP `productResult` contract.

Backend TODO, post-MVP or before unified UI:

- Add a backward-compatible Gmail adapter that preserves existing Gmail response fields and adds `productResult` using the same bucket contract.
- Add import-preview compatibility for Gmail product bucket items after that adapter exists.

### Gmail Legacy Scan Error Codes

`POST /email-scan/gmail/scan` uses safe, frontend-friendly error codes. Responses do not include access tokens, refresh tokens, decrypted credentials, raw Gmail payloads, or raw email bodies.

| HTTP | Code | Frontend behavior |
| --- | --- | --- |
| 404 | `GMAIL_CONNECTION_NOT_FOUND` | Ask the user to connect Gmail first. |
| 409 | `GMAIL_REAUTH_REQUIRED` | Ask the user to reconnect Gmail. |
| 409 | `GMAIL_TOKEN_DECRYPT_FAILED` | Ask the user to reconnect Gmail; stored token data could not be read. |
| 409 | `GMAIL_REFRESH_FAILED` | Ask the user to reconnect Gmail; token refresh failed or was revoked. |
| 500 | `GMAIL_OAUTH_CONFIG_MISSING` | Internal/server setup problem; Gmail OAuth env config is missing. |
| 502 | `GMAIL_API_FAILED` | Show a safe retry message; Gmail API/network/quota issue. |
| 500 | `GMAIL_SCAN_FAILED` | Show a generic safe error and report to backend logs. |

## Request

```json
{
  "host": "imap.example.com",
  "port": 993,
  "secure": true,
  "username": "user@example.com",
  "password": "app-password-or-imap-password",
  "mailbox": "INBOX",
  "profile": "adaptive",
  "includeDebug": false
}
```

`profile` values:

- `fast`: recent window only, intended for quick first-run feedback.
- `balanced`: recent scan plus conservative metadata retrieval.
- `adaptive`: recommended default; chooses capability-based fallbacks.
- `deep`: recall-oriented scan for older, yearly, or marketplace-billed evidence.

## Response

Top-level shape:

```json
{
  "message": "IMAP scan completed.",
  "productResult": {
    "currentSubscriptions": [],
    "needsReviewSubscriptions": [],
    "historicalSubscriptions": [],
    "priceChanges": [],
    "billsOrUtilities": [],
    "scanSummary": {}
  },
  "scanSummary": {},
  "debug": {}
}
```

`debug` is returned only when `includeDebug=true`. It is for development only. The service truncates snippets and does not return credentials.

## Product Buckets

- `currentSubscriptions`: recent active subscription or membership evidence.
- `needsReviewSubscriptions`: subscription-like evidence that should be confirmed before showing as active.
- `priceChanges`: active customer price-change notices.
- `billsOrUtilities`: recurring bills, utilities, telecom, ISP, or formal invoice evidence.
- `historicalSubscriptions`: lower-priority historical evidence.

Recommended frontend order:

1. If `productResult.scanSummary.recommendedDefaultMode === "review"`, show the review screen first.
2. Show `priceChanges` as a separate alert section.
3. Show `billsOrUtilities` separately from subscriptions.
4. Do not claim active subscriptions when `hasCurrentSubscriptions=false` and `hasOnlyHistoricalEvidence=true`.

## Item Fields

Bucket items use stable field names. Fields are omitted when not applicable.

Common fields:

- `id`
- `displayName`
- `provider`
- `billingChannel`
- `category`
- `status`
- `confidence`
- `confidenceLevel`
- `productBucket`
- `primaryAction`
- `userFacingReason`
- `billingCycle`
- `firstSeen`
- `lastSeen`
- `lastEvidenceDate`
- `evidenceAgeDays`
- `sourceMessagesCount`

Amount fields:

- `amount`
- `displayAmount`
- `amountKind`
- `currentAmount`
- `regularAmount`
- `futureAmount`
- `promoAmount`
- `trialThenAmount`
- `dueAmount`
- `latestAmount`
- `amounts`
- `allAmounts`

Date/source fields:

- `nextRenewalDateText`
- `dueDateText`
- `selectedAmountSourceDate`
- `selectedAmountSourceSubject`

`amountKind` values currently used:

- `charged`
- `due`
- `current_price`
- `new_price`
- `future_price`
- `promo_price`
- `regular_price`
- `trial_then_price`
- `unknown`

## Status And Actions

Common `status` values:

- `active`: recent active evidence.
- `stale_needs_review`: historical evidence; user confirmation needed.
- `price_change`: price-change notice for an existing customer or plan.
- `invoice_due`: bill or invoice due evidence when applicable.
- `trial`: trial evidence when no later active charge is known.
- `unknown`: fallback for weak but retained evidence.

Common `primaryAction` values:

- `show_as_active`: can be shown as current evidence.
- `confirm_still_active`: ask user to confirm.
- `review_price_change`: show price-change review.
- `review_old_bill`: show bill review.
- `ignore_or_archive`: low-priority historical/archive item.

## Scan Summary

Useful frontend fields:

- `scanProfile`
- `effectiveScanMode`
- `effectiveWindowDays`
- `scanReliabilityLevel`
- `scanReliabilityReasons`
- `userFacingCoverageNote`
- `deepScanRecommended`
- `quickScanLikelyIncomplete`
- `recommendedScanModeForProvider`
- `recommendedFallbackStrategy`
- `bodySearchSupported`
- `headerSearchSupported`
- `metadataPrepassSupported`
- `deepFallbackSupported`

Diagnostics for scan stability:

- `preservedHighSignalCandidates`
- `preservedSubscriptionLikeCandidates`
- `preservedBillLikeCandidates`
- `sampledLowSignalCandidates`
- `candidatesDroppedByCap`
- `candidatePreservationCap`
- `metadataPrepassCandidatesBeforeCap`
- `deepFallbackCandidatesBeforeCap`
- `deepFallbackCandidatesAfterPriorityPreserve`
- `billLikeMetadataMatches`
- `billLikeCandidatesFound`
- `billLikeCanonicalCount`
- `billLikeMessagesMerged`

Reliability notes:

- `fast` can miss yearly, older, and marketplace-billed subscriptions.
- `medium` reliability usually means capability-based fallback was used. It does not mean detections are bad.
- If `deepScanRecommended=true`, offer a deeper scan CTA.
- If `quickScanLikelyIncomplete=true`, avoid wording that implies complete mailbox coverage.

## Error Responses

Validation errors return `400`:

```json
{
  "message": "Validation error",
  "code": "VALIDATION_ERROR",
  "errors": [
    { "field": "host", "message": "host is required" }
  ]
}
```

IMAP errors are credential-safe and do not include raw server internals:

- `401 IMAP_AUTH_FAILED`
- `404 IMAP_MAILBOX_NOT_FOUND`
- `422 IMAP_UNSUPPORTED`
- `502 IMAP_CONNECTION_FAILED`
- `504 IMAP_CONNECTION_TIMEOUT`
- `500 IMAP_SCAN_FAILED`

## Current Known Limitations

- The endpoint does not persist IMAP results to the database yet.
- User confirmation/ignore/accept flows for IMAP product buckets are frontend/product work still to be wired.
- Some providers have weak server-side IMAP search; adaptive/deep scans use metadata prepass and time-bucket fallback.
- The scan intentionally avoids returning raw email bodies.

## Import / Confirmation Flow

Frontend should not create subscriptions directly from the scan response without user confirmation.

Recommended flow:

1. Call `POST /email-scan/imap/scan`.
2. Render `productResult` buckets.
3. User selects items to confirm/import.
4. Call `POST /email-scan/import-preview` with selected product items.
5. Show normalized drafts and warnings.
6. Later, after explicit user confirmation, frontend can call the existing subscription creation endpoint with an edited draft.

`POST /email-scan/import-preview` requires auth and does not write to the database.

Request:

```json
{
  "items": [
    {
      "id": "skyshowtime|prime_video|streaming_video",
      "displayName": "SkyShowtime on Prime Video",
      "provider": "SkyShowtime",
      "billingChannel": "Prime Video",
      "category": "streaming_video",
      "status": "stale_needs_review",
      "productBucket": "needsReviewSubscriptions",
      "primaryAction": "confirm_still_active",
      "displayAmount": "4,00 zł miesięcznie",
      "promoAmount": "4,00 zł miesięcznie",
      "futureAmount": "24,99 zł miesięcznie",
      "regularAmount": "24,99 zł miesięcznie",
      "billingCycle": "monthly",
      "lastEvidenceDate": "2025-01-13T10:00:00.000Z"
    }
  ]
}
```

Response:

```json
{
  "drafts": [
    {
      "sourceItemId": "skyshowtime|prime_video|streaming_video",
      "recommendedAction": "create_subscription",
      "draft": {
        "name": "SkyShowtime on Prime Video",
        "provider": "SkyShowtime",
        "amount": 24.99,
        "currency": "PLN",
        "category": "entertainment",
        "billingCycle": "monthly",
        "status": "pending",
        "notes": "Imported from IMAP scan preview..."
      },
      "warnings": [
        "User should confirm this historical subscription is still active."
      ]
    }
  ]
}
```

`recommendedAction` values:

- `create_subscription`: can become a normal subscription draft after user confirmation.
- `review_price_change`: do not create a new subscription automatically; user should apply the change to an existing record if relevant.
- `review_bill`: bill-like item. It can be represented by the current subscription model using `isRecurringBill=true`, but should be reviewed first.
- `skip`: historical or unsupported item.

Mapping notes:

- `displayName/provider` become `name/provider`.
- `regularAmount` is preferred for subscription drafts when available.
- `dueAmount` is preferred for bill drafts.
- `billingChannel`, amount semantics, evidence dates, and source message count are preserved in `notes`.
- The endpoint never stores raw email bodies, IMAP credentials, or debug message payloads.

## Frontend Implementation Checklist

This is the suggested end-to-end frontend flow for the first IMAP scan UI. Frontend code is expected to stay responsible for UX, confirmation, editing, and final save decisions.

For MVP provider selection, show:

- Gmail
- Onet
- Interia

Recommended MVP behavior:

- Gmail starts the existing OAuth/connect flow and uses the existing Gmail scan/detected-subscriptions UI path.
- Onet and Interia use manual or preset IMAP fields and the `productResult` bucket UI documented below.
- Hide "Other provider" for MVP, or mark it experimental/future if product wants an escape hatch.

1. Show an entry point such as "Scan email for subscriptions".
2. Let the user choose provider:
   - Gmail: OAuth, no IMAP password.
   - Onet: manual/preset IMAP.
   - Interia: manual/preset IMAP.
3. For Onet/Interia, collect IMAP setup:
   - `host`
   - `port`
   - `secure`
   - `username`
   - `password` or app password
   - `mailbox`, default `INBOX`
   - `profile`, default `adaptive`
4. Call `POST /email-scan/imap/scan` with `includeDebug=false`.
5. Show scan coverage before results:
   - `scanReliabilityLevel`
   - `userFacingCoverageNote`
   - `recommendedDefaultMode`
   - `deepScanRecommended`
   - `quickScanLikelyIncomplete`
6. Render product buckets:
   - `currentSubscriptions`
   - `needsReviewSubscriptions`
   - `priceChanges`
   - `billsOrUtilities`
   - `historicalSubscriptions`
7. Let the user select items to review/import.
8. Call `POST /email-scan/import-preview` with selected product bucket items.
9. Show import preview:
   - `create_subscription` drafts
   - `review_price_change` items
   - `review_bill` items
   - `skip` items
   - warnings
10. Do not assume `import-preview` writes to the database. Final save is a later confirmation step using existing or future subscription save flows.

### Frontend Should Not

- Do not treat `needsReviewSubscriptions` as confirmed active subscriptions.
- Do not auto-create records from `priceChanges`.
- Do not mix `billsOrUtilities` into normal subscriptions without user review.
- Do not display `debug` as user-facing content.
- Do not store IMAP passwords in `localStorage`, analytics, crash logs, or long-lived frontend state.
- Do not send `includeDebug=true` in normal production UI.
- Do not infer amount semantics manually when backend provides `amountKind`, `promoAmount`, `futureAmount`, `dueAmount`, or `currentAmount`.
- Do not show "active subscriptions found" when `recommendedDefaultMode` is `review` and `hasCurrentSubscriptions=false`.
- Do not reuse the IMAP bucket UI for Gmail until Gmail returns `productResult` or a frontend adapter is explicitly built.

## Recommended UI Copy

Review mode:

> We found historical subscription evidence. Please confirm which services are still active.

Empty fast scan:

> No current subscriptions were found in the quick scan. A deeper scan may find older, yearly, or marketplace-billed subscriptions.

Price changes:

> We found a price-change notice. Review it before updating an existing subscription.

Bills and utilities:

> We found recurring bills or utility invoices. Review them separately before adding them as recurring bills.

## Bucket Display Policy

`currentSubscriptions`

- Show as high-confidence active subscriptions.
- Primary CTA: add or confirm.

`needsReviewSubscriptions`

- Show as "Needs confirmation".
- Primary CTA: confirm still active.
- Secondary CTA: ignore or mark inactive.

`priceChanges`

- Show as a separate alert section.
- Primary CTA: review price change.
- Do not create a new subscription automatically.

`billsOrUtilities`

- Show in a separate "Bills and utilities" section.
- Primary CTA: review as recurring bill.
- Use `isRecurringBill=true` from the import-preview draft.

`historicalSubscriptions`

- Show lower priority or collapsed.
- Default action should be skip unless the user explicitly reviews it.

## Short Frontend Examples

### A. IMAP Scan Request

```json
{
  "host": "imap.example.com",
  "port": 993,
  "secure": true,
  "username": "user@example.com",
  "password": "app-password",
  "mailbox": "INBOX",
  "profile": "adaptive",
  "includeDebug": false
}
```

### B. IMAP Scan Response, Shortened

```json
{
  "message": "IMAP scan completed.",
  "productResult": {
    "currentSubscriptions": [],
    "needsReviewSubscriptions": [
      {
        "id": "streaming-service|marketplace|streaming_video",
        "displayName": "Streaming Service on Marketplace",
        "provider": "Streaming Service",
        "billingChannel": "Marketplace",
        "category": "streaming_video",
        "status": "stale_needs_review",
        "confidenceLevel": "high",
        "productBucket": "needsReviewSubscriptions",
        "primaryAction": "confirm_still_active",
        "userFacingReason": "Historical subscription evidence found. Please confirm whether it is still active.",
        "displayAmount": "24.99 PLN monthly",
        "amountKind": "promo_price",
        "promoAmount": "4.00 PLN monthly",
        "futureAmount": "24.99 PLN monthly",
        "regularAmount": "24.99 PLN monthly",
        "billingCycle": "monthly",
        "lastEvidenceDate": "2025-01-13T10:00:00.000Z",
        "evidenceAgeDays": 484,
        "sourceMessagesCount": 2
      }
    ],
    "priceChanges": [
      {
        "id": "membership|ecommerce_membership",
        "displayName": "Membership",
        "provider": "Membership",
        "category": "ecommerce_membership",
        "status": "price_change",
        "productBucket": "priceChanges",
        "primaryAction": "review_price_change",
        "userFacingReason": "Price-change evidence found. Review before updating an existing record.",
        "currentAmount": "49.00 PLN/year",
        "futureAmount": "69.00 PLN/year",
        "amountKind": "new_price"
      }
    ],
    "billsOrUtilities": [
      {
        "id": "utility-provider|utilities_energy",
        "displayName": "Utility Provider",
        "provider": "Utility Provider",
        "category": "utilities_energy",
        "status": "stale_needs_review",
        "productBucket": "billsOrUtilities",
        "primaryAction": "review_old_bill",
        "userFacingReason": "Recurring bill evidence found. Review before adding as a recurring bill.",
        "dueAmount": "216.39 PLN",
        "dueDateText": "12.12.2024",
        "amountKind": "due",
        "sourceMessagesCount": 5
      }
    ],
    "historicalSubscriptions": [],
    "scanSummary": {
      "recommendedDefaultMode": "review",
      "hasCurrentSubscriptions": false,
      "hasOnlyHistoricalEvidence": true,
      "hasPriceChanges": true,
      "hasBillsOrUtilities": true,
      "totalCanonicalSubscriptions": 6
    }
  },
  "scanSummary": {
    "scanProfile": "adaptive",
    "effectiveScanMode": "deep",
    "scanReliabilityLevel": "medium",
    "recommendedFallbackStrategy": "metadata_prepass_plus_time_buckets",
    "deepScanRecommended": false,
    "quickScanLikelyIncomplete": false,
    "userFacingCoverageNote": "Historical subscription evidence was found. Please confirm which subscriptions are still active."
  }
}
```

### C. Import Preview Request

Send the selected product items as returned by the scan response:

```json
{
  "items": [
    {
      "id": "streaming-service|marketplace|streaming_video",
      "displayName": "Streaming Service on Marketplace",
      "provider": "Streaming Service",
      "billingChannel": "Marketplace",
      "category": "streaming_video",
      "status": "stale_needs_review",
      "productBucket": "needsReviewSubscriptions",
      "primaryAction": "confirm_still_active",
      "regularAmount": "24.99 PLN monthly",
      "futureAmount": "24.99 PLN monthly",
      "promoAmount": "4.00 PLN monthly",
      "billingCycle": "monthly"
    }
  ]
}
```

### D. Import Preview Response, Shortened

```json
{
  "drafts": [
    {
      "sourceItemId": "streaming-service|marketplace|streaming_video",
      "recommendedAction": "create_subscription",
      "draft": {
        "name": "Streaming Service on Marketplace",
        "provider": "Streaming Service",
        "amount": 24.99,
        "currency": "PLN",
        "category": "entertainment",
        "billingCycle": "monthly",
        "status": "pending",
        "notes": "Imported from IMAP scan preview..."
      },
      "warnings": [
        "User should confirm this historical subscription is still active."
      ]
    },
    {
      "sourceItemId": "membership|ecommerce_membership",
      "recommendedAction": "review_price_change",
      "warnings": [
        "Price-change notices should be applied to an existing subscription after user review."
      ]
    },
    {
      "sourceItemId": "utility-provider|utilities_energy",
      "recommendedAction": "review_bill",
      "draft": {
        "name": "Utility Provider",
        "provider": "Utility Provider",
        "amount": 216.39,
        "currency": "PLN",
        "category": "utilities",
        "billingCycle": "monthly",
        "isRecurringBill": true,
        "status": "pending"
      },
      "warnings": [
        "Bill-like items should be reviewed separately before adding as recurring bills."
      ]
    }
  ]
}
```

## Endpoint Error Handling For Frontend

| HTTP | Code | Frontend behavior |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Show field-level validation messages. |
| 401 | app auth / missing Bearer token | Redirect to login or refresh app auth. |
| 401 | `IMAP_AUTH_FAILED` | Ask user to check email address, password, or app password. |
| 404 | `IMAP_MAILBOX_NOT_FOUND` | Let user edit mailbox, usually `INBOX`. |
| 422 | `IMAP_UNSUPPORTED` | Explain that this mailbox/server capability is unsupported. |
| 502 | `IMAP_CONNECTION_FAILED` | Show connection error and retry option. |
| 504 | `IMAP_CONNECTION_TIMEOUT` | Show timeout state and retry option. |
| 500 | `IMAP_SCAN_FAILED` | Show a generic safe failure message. |

## Security And Privacy Notes

- IMAP password or app password is sent only to the backend scan endpoint.
- Gmail OAuth does not require an IMAP password.
- Onet and Interia may require an app password or external mail client / IMAP access enabled in provider settings.
- Backend normal responses do not include raw email bodies.
- `debug` should stay disabled in production UI.
- Do not log scan request bodies because they include credentials.
- Do not persist IMAP credentials in `localStorage`.
- Prefer app-password guidance for providers that support it.
- Browser network tools can still show the submitted password to the user on their own machine; avoid extra frontend logging.

## Backend Current Limitations / Next Steps

- `POST /email-scan/import-preview` does not write to the database.
- Final save/confirm endpoint is not implemented yet.
- Frontend can later use existing subscription creation after user edits/confirms a draft, but this is not automatic.
- Provider preset UI is not implemented yet.
- OAuth/non-password IMAP provider flows are not implemented yet.
- Gmail scan endpoint remains separate and unchanged.
- Gmail scan does not yet return the IMAP `productResult` bucket contract.
- Current IMAP scan works with manual credentials or app password.

## Message To Frontend Developer

Backend IMAP scan is ready for frontend integration at contract level.

Ready endpoints:

- `POST /email-scan/imap/scan`
- `POST /email-scan/import-preview`
- `POST /email-scan/gmail/scan`

All require the normal Bearer token. The IMAP scan endpoint accepts manual IMAP credentials and returns `productResult` buckets plus `scanSummary`. The import-preview endpoint accepts selected IMAP product bucket items and returns normalized drafts/warnings; it does not write to the database.

MVP provider scope:

- Gmail: use existing OAuth/Gmail scan flow. It is not bucket-compatible yet.
- Onet: use manual/preset IMAP and the bucket UI.
- Interia: use manual/preset IMAP and the bucket UI.
- Other providers: future/experimental until tested.

Recommended implementation:

1. Build a provider choice screen: Gmail, Onet, Interia.
2. Gmail starts the existing OAuth/connect flow and uses the existing Gmail scan/detections path.
3. Onet/Interia show IMAP fields or presets.
4. Call IMAP scan with `profile="adaptive"` and `includeDebug=false`.
5. Show reliability/coverage note first.
6. Render IMAP buckets separately: current subscriptions, needs review, price changes, bills/utilities, historical.
7. Let the user select IMAP bucket items.
8. Call import-preview.
9. Show drafts and warnings before any real save action.

Important product behavior:

- `needsReviewSubscriptions` are not confirmed active subscriptions.
- `priceChanges` are review alerts, not new subscriptions.
- `billsOrUtilities` should be a separate section and can use `isRecurringBill=true` from preview drafts.
- Do not store or log IMAP credentials.
- Do not enable debug mode in production UI.
- Do not assume Gmail has the same `productResult` shape as IMAP yet.

Docs live in `backend/docs/imap-scan-contract.md`.
