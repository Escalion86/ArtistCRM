# Referral System Design

## Context

ArtistCRM needs a referral system where existing users can invite new users by link or QR code. If the invited user registers through that link and subsequently tops up their balance, the referrer receives a configurable percentage of that balance topup.

The selected approach stores the referral relation on the invited user, keeps the global percent in site settings, and records each reward as a payment. This fits the current billing model and keeps reward history auditable.

## Scope

In scope:

- Add a developer-only sidebar group `Настройки сайта`.
- Move `Тарифы` from `Настройки` to `Настройки сайта`.
- Add developer-only page `Настройки сайта -> Реферальная система`.
- Add a percent setting for referral rewards, defaulting to `5`.
- Add user page `Настройки -> Реферальная система`.
- Show the current user's referral link and QR code generated via `qr.escalion.ru`.
- Persist referral attribution during registration.
- Credit the referrer after each successful invited-user balance topup.

Out of scope:

- Cash withdrawals or payout requests.
- Multi-level referrals.
- Referral rewards for direct tariff purchases.
- Referral rewards from internal bonuses, refunds, or other referral rewards.
- Full analytics dashboard beyond enough payment history to audit начисления.

## Navigation And Access

`helpers/constants.js` remains the source of cabinet menu structure.

- Existing `Тарифы` page gets `accessRoles: ['dev']` and moves to a new `Настройки сайта` group.
- New `Настройки сайта` group also has `accessRoles: ['dev']` behavior through its pages; non-dev users will not see its children.
- New developer page `site-referrals` is available only to `dev`.
- New user page `referrals` is available to normal authenticated users under the existing `Настройки` group.

`StateLoader` already enforces page role access through `isPageAllowedForRole`, so route-level redirects will continue to protect direct URL access.

## Data Model

`Users` gets:

- `referrerId: ObjectId | null` pointing to the inviting user.

This field is immutable from normal profile editing and should only be set during registration if the supplied referrer exists and is not the new user.

`SiteSettings` gets:

- `referralProgram.percent: Number`, default `5`.

The setting is global for the product, not tenant-specific in behavior. Existing `/api/site` is tenant-aware and must not be reused for this global setting. The implementation should use a developer-only global endpoint that reads and writes the `SiteSettings` document with `tenantId: null` and only exposes the referral program fields needed for this feature.

`Payments` gets optional metadata:

- `referralReward.referralUserId`: invited user who made the topup.
- `referralReward.referrerId`: user receiving the reward.
- `referralReward.sourcePaymentId`: successful balance topup that caused the reward.
- `referralReward.percent`: percent used at reward time.
- `referralReward.rewardFor`: `balance_topup`.

An index or lookup on `sourcePaymentId + rewardFor` prevents duplicate reward creation if a payment webhook or sync endpoint is processed more than once.

## Referral Link And QR

The user-facing referral page builds a link from the current origin and user id:

`/login?mode=register&ref=<loggedUserId>`

`app/login/loginInputs.js` reads these query params:

- `mode=register` opens registration immediately.
- `ref=<id>` is kept in component state and sent to `/api/phone/verify/finalize` only for `flow: 'register'`.

The QR code is generated on the client by POSTing to:

`NEXT_PUBLIC_QR_SERVICE_URL || 'https://qr.escalion.ru'`

Endpoint:

`POST /api/v1/qr/generate`

Payload:

```json
{
  "type": "url",
  "data": { "url": "<referral-link>" },
  "options": {
    "width": 300,
    "margin": 2,
    "errorCorrectionLevel": "H"
  }
}
```

The response is treated as an image blob and rendered with an object URL.

## Registration Flow

The phone registration endpoint `/api/phone/verify/finalize` accepts an optional `referrerId` when `flow === 'register'`.

Rules:

- Ignore missing or malformed `referrerId`.
- Ignore `referrerId` when the referenced user does not exist.
- Ignore self-referrals.
- If an existing phone-only placeholder user is completed, set `referrerId` only if it is still empty.
- VK ID registration attribution is out of scope for this first implementation; the referral link opens the phone registration flow.

## Reward Flow

A shared server helper handles reward creation after successful balance topups.

Trigger points:

- Manual admin topup in `app/api/payments/route.js`.
- Successful YooKassa balance payment in `server/yookassaPaymentProcessing.js`.
- Successful Tochka balance payment in `server/tochkaPaymentProcessing.js`.

Rules:

- Only `purpose: 'balance'` topups can generate referral rewards.
- Rewards are not generated for direct tariff purchases, tariff charges, refunds, system bonuses, or other referral reward payments.
- Reward amount is `Math.floor(topupAmount * percent / 100)` in rubles, matching current integer-style balance math.
- If the computed reward is `0`, no payment is created.
- The referrer's balance increases by the reward amount.
- A `Payments` row is created with `type: 'topup'`, `source: 'system'`, `purpose: 'balance'`, `status: 'succeeded'`, and `referralReward` metadata.
- The helper must be idempotent by source payment id.

## UI

Developer page `Настройки сайта -> Реферальная система`:

- Shows a numeric percent input.
- Defaults to `5` when unset.
- Saves through a developer-only global referral settings endpoint.
- Only `dev` can access and write it.

User page `Настройки -> Реферальная система`:

- Shows referral link in a copyable text block.
- Shows QR code generated through the QR service.
- Shows a short explanation: referrer receives the configured percent from each invited user's balance topup.
- Reads the global referral percent from a protected read endpoint; if unavailable, falls back to `5` for display only.
- Uses responsive layout suitable for phone screens.

## Error Handling

- If QR service is unavailable, show a non-blocking message and keep the referral link available.
- If the percent setting save fails, keep the local input value but show an error toast or inline message.
- If reward creation fails after a successful topup, the topup remains successful and the server logs the reward error without exposing sensitive data.

## Testing

Add focused tests for pure server referral reward logic:

- no reward without `referrerId`;
- no reward when percent is missing or non-positive;
- reward amount uses the configured percent;
- reward is idempotent for the same source payment;
- tariff purchases and non-balance payments do not produce rewards.

Run targeted ESLint on changed JS files after implementation.

## Roadmap And Versioning

This feature is not currently a checked roadmap item. Add a changelog entry to `docs/ROADMAP.md` only if a new referral-system roadmap item is added or closed in the same implementation. If a roadmap checkbox is closed, bump `package.json` patch version in the same changeset.
