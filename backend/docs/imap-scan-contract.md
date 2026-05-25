# IMAP Scan Contract

Frontend integration target for:

`POST /email-scan/imap/scan`

The route requires the same `Authorization: Bearer <token>` auth as the other backend routes. Do not send IMAP credentials to any frontend logging or analytics sink.

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

1. Show an entry point such as "Scan email for subscriptions".
2. Let the user choose manual IMAP setup first:
   - `host`
   - `port`
   - `secure`
   - `username`
   - `password` or app password
   - `mailbox`, default `INBOX`
   - `profile`, default `adaptive`
3. Call `POST /email-scan/imap/scan` with `includeDebug=false`.
4. Show scan coverage before results:
   - `scanReliabilityLevel`
   - `userFacingCoverageNote`
   - `recommendedDefaultMode`
   - `deepScanRecommended`
   - `quickScanLikelyIncomplete`
5. Render product buckets:
   - `currentSubscriptions`
   - `needsReviewSubscriptions`
   - `priceChanges`
   - `billsOrUtilities`
   - `historicalSubscriptions`
6. Let the user select items to review/import.
7. Call `POST /email-scan/import-preview` with selected product bucket items.
8. Show import preview:
   - `create_subscription` drafts
   - `review_price_change` items
   - `review_bill` items
   - `skip` items
   - warnings
9. Do not assume `import-preview` writes to the database. Final save is a later confirmation step using existing or future subscription save flows.

### Frontend Should Not

- Do not treat `needsReviewSubscriptions` as confirmed active subscriptions.
- Do not auto-create records from `priceChanges`.
- Do not mix `billsOrUtilities` into normal subscriptions without user review.
- Do not display `debug` as user-facing content.
- Do not store IMAP passwords in `localStorage`, analytics, crash logs, or long-lived frontend state.
- Do not send `includeDebug=true` in normal production UI.
- Do not infer amount semantics manually when backend provides `amountKind`, `promoAmount`, `futureAmount`, `dueAmount`, or `currentAmount`.
- Do not show "active subscriptions found" when `recommendedDefaultMode` is `review` and `hasCurrentSubscriptions=false`.

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
- Current IMAP scan works with manual credentials or app password.

## Message To Frontend Developer

Backend IMAP scan is ready for frontend integration at contract level.

Ready endpoints:

- `POST /email-scan/imap/scan`
- `POST /email-scan/import-preview`

Both require the normal Bearer token. The scan endpoint accepts manual IMAP credentials and returns `productResult` buckets plus `scanSummary`. The import-preview endpoint accepts selected product bucket items and returns normalized drafts/warnings; it does not write to the database.

Recommended implementation:

1. Build a manual IMAP scan form.
2. Call scan with `profile="adaptive"` and `includeDebug=false`.
3. Show reliability/coverage note first.
4. Render buckets separately: current subscriptions, needs review, price changes, bills/utilities, historical.
5. Let the user select items.
6. Call import-preview.
7. Show drafts and warnings before any real save action.

Important product behavior:

- `needsReviewSubscriptions` are not confirmed active subscriptions.
- `priceChanges` are review alerts, not new subscriptions.
- `billsOrUtilities` should be a separate section and can use `isRecurringBill=true` from preview drafts.
- Do not store or log IMAP credentials.
- Do not enable debug mode in production UI.

Docs live in `backend/docs/imap-scan-contract.md`.
