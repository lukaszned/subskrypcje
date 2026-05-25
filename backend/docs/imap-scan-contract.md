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
