# Referral System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a referral system where users share a link/QR code and receive the configured percent from each referred user's successful balance topup.

**Architecture:** Store `referrerId` on referred users, store global referral percent in the `SiteSettings` document with `tenantId: null`, and create idempotent system `Payments` rows for referral rewards. UI adds one developer-only settings page and one user-facing referral page in the existing cabinet routing.

**Tech Stack:** Next.js App Router, React client components, Jotai/React Query state bridge, Mongoose models, Node `node:test`, targeted ESLint.

---

### Task 1: Referral Reward Server Helper

**Files:**
- Create: `server/referralRewards.js`
- Create: `server/referralRewards.test.mjs`
- Modify: `schemas/paymentsSchema.js`
- Modify: `models/Payments.js`

- [ ] **Step 1: Write the failing test**

Create `server/referralRewards.test.mjs` with fake in-memory models and tests for:

```js
import test from 'node:test'
import assert from 'node:assert/strict'

import {
  DEFAULT_REFERRAL_PERCENT,
  calculateReferralRewardAmount,
  createReferralRewardForBalanceTopup,
  normalizeReferralPercent,
} from './referralRewards.js'
```

The tests must assert default percent `5`, non-positive percent produces no reward, a referred user's balance topup credits the referrer, duplicate `sourcePaymentId` is idempotent, and non-balance payments are ignored.

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test server/referralRewards.test.mjs
```

Expected: FAIL because `server/referralRewards.js` does not exist.

- [ ] **Step 3: Implement minimal helper**

Create `server/referralRewards.js` exporting:

```js
export const DEFAULT_REFERRAL_PERCENT = 5
export const normalizeReferralPercent = (value) => { ... }
export const calculateReferralRewardAmount = ({ amount, percent }) => { ... }
export const getGlobalReferralPercent = async ({ SiteSettingsModel }) => { ... }
export const createReferralRewardForBalanceTopup = async ({ payment, UsersModel, PaymentsModel, SiteSettingsModel }) => { ... }
```

`createReferralRewardForBalanceTopup` must:

- require `payment.purpose === 'balance'`;
- require `payment.type === 'topup'`;
- ignore `payment.source === 'system'`;
- require a source payment id;
- find referred user by `payment.userId`;
- require `referredUser.referrerId`;
- reject self-referrals;
- lookup existing reward by `referralReward.sourcePaymentId` and `rewardFor: 'balance_topup'`;
- read global percent from `SiteSettings` with `tenantId: null`;
- `Math.floor(amount * percent / 100)`;
- increment referrer balance;
- create a system `Payments` row with referral metadata.

- [ ] **Step 4: Add schema metadata**

In `schemas/paymentsSchema.js`, add optional `referralReward` object with:

```js
referralUserId, referrerId, sourcePaymentId, percent, rewardFor
```

In `models/Payments.js`, add an index:

```js
PaymentsSchema.index({
  'referralReward.sourcePaymentId': 1,
  'referralReward.rewardFor': 1,
})
```

- [ ] **Step 5: Run helper tests**

Run:

```powershell
node --test server/referralRewards.test.mjs
```

Expected: PASS.

### Task 2: Wire Rewards Into Topups

**Files:**
- Modify: `app/api/payments/route.js`
- Modify: `server/yookassaPaymentProcessing.js`
- Modify: `server/tochkaPaymentProcessing.js`

- [ ] **Step 1: Add reward calls after successful balance topups**

Import `createReferralRewardForBalanceTopup` and call it after the original topup `Payments` row is saved or marked succeeded.

Manual admin topup passes the created payment.

YooKassa and Tochka pass the locked succeeded payment only when `payment.purpose === 'balance'`.

- [ ] **Step 2: Keep topups successful if reward fails**

Wrap reward calls in `try/catch` and log:

```js
console.error('[referralRewards] failed to create reward', { paymentId, error: { name, message } })
```

No provider webhook should fail solely because referral reward creation failed.

### Task 3: Registration Attribution

**Files:**
- Modify: `schemas/usersSchema.js`
- Modify: `models/Users.js`
- Modify: `app/api/phone/verify/finalize/route.js`
- Modify: `server/ensureVkUser.js`
- Modify: `app/api/vk-id/auth/route.js`
- Modify: `app/login/page.js`
- Modify: `app/login/loginInputs.js`

- [ ] **Step 1: Add user field and index**

Add `referrerId` to `usersSchema` as `Schema.Types.ObjectId`, `ref: 'Users'`, default `null`.

Add `UsersSchema.index({ referrerId: 1, createdAt: -1 })`.

- [ ] **Step 2: Accept safe referral params in login**

`app/login/page.js` should pass sanitized `mode` and `ref` search params to `LoginInputs`.

`LoginInputs` should initialize `mode` from `initialMode === 'register' ? 'register' : 'login'`, keep `initialReferrerId`, and include `referrerId` in `/api/phone/verify/finalize` only for register flow.

The same `referrerId` should be included in `/api/vk-id/auth` because registration mode can use VK ID One Tap.

- [ ] **Step 3: Persist valid referrer during phone registration**

In finalize route:

- normalize `body.referrerId`;
- validate ObjectId shape before querying;
- find referrer user;
- pass a valid `referrerId` into `createRegisterUser`;
- for existing passwordless placeholder users, set `referrerId` only if empty.

Ignore invalid, missing, unknown, or self referral ids without failing registration.

Apply the same rules inside `ensureVkUser` for newly created VK users and existing users without `referrerId`.

### Task 4: Global Referral Settings API

**Files:**
- Create: `app/api/site/referral/route.js`
- Modify: `schemas/siteSettingsSchema.js`
- Modify: `helpers/constants.js`

- [ ] **Step 1: Add settings schema/default**

Add `referralProgram.percent` to `siteSettingsSchema`, default `5`.

Add the same default to `DEFAULT_SITE_SETTINGS`.

- [ ] **Step 2: Create protected endpoint**

`GET /api/site/referral`:

- requires authenticated user;
- returns `{ percent }`;
- reads `SiteSettings.findOne({ tenantId: null })`;
- falls back to default percent.

`POST /api/site/referral`:

- requires authenticated user with `role === 'dev'`;
- normalizes percent to a finite number between `0` and `100`;
- writes only `referralProgram.percent` into `SiteSettings.findOneAndUpdate({ tenantId: null }, ...)`.

### Task 5: Cabinet Navigation And Content Pages

**Files:**
- Modify: `helpers/constants.js`
- Modify: `layouts/content/contentsMap.js`
- Create: `layouts/content/SiteReferralSettingsContent.js`
- Create: `layouts/content/ReferralsContent.js`

- [ ] **Step 1: Update sidebar structure**

In `helpers/constants.js`:

- import a suitable icon for QR/share or reuse `faMoneyBill`;
- add group `Настройки сайта`;
- move `tariffs` to the new group and restrict to `['dev']`;
- add `site-referrals` to new group with `accessRoles: ['dev']`;
- add user-facing `referrals` to existing `Настройки` group.

- [ ] **Step 2: Register content components**

Add both new components to `CONTENTS` with names:

- `Реферальная система`
- `Настройки сайта / Реферальная система`

- [ ] **Step 3: Build developer settings page**

`SiteReferralSettingsContent` loads `/api/site/referral`, shows an `Input` with percent, saves on button click via POST, and shows concise success/error state.

- [ ] **Step 4: Build user referral page**

`ReferralsContent` uses `loggedUserAtom`, builds `/login?mode=register&ref=<id>`, copies link, and renders QR by POSTing to `NEXT_PUBLIC_QR_SERVICE_URL || 'https://qr.escalion.ru'` `/api/v1/qr/generate`.

The page must keep the text link available if QR generation fails.

### Task 6: Verification

**Files:**
- All changed JS files

- [ ] **Step 1: Run unit test**

Run:

```powershell
node --test server/referralRewards.test.mjs
```

Expected: PASS.

- [ ] **Step 2: Run targeted ESLint**

Run:

```powershell
npx eslint server/referralRewards.js server/referralRewards.test.mjs schemas/paymentsSchema.js models/Payments.js app/api/payments/route.js server/yookassaPaymentProcessing.js server/tochkaPaymentProcessing.js schemas/usersSchema.js models/Users.js app/api/phone/verify/finalize/route.js app/login/page.js app/login/loginInputs.js app/api/site/referral/route.js schemas/siteSettingsSchema.js helpers/constants.js layouts/content/contentsMap.js layouts/content/SiteReferralSettingsContent.js layouts/content/ReferralsContent.js
```

Expected: PASS.

- [ ] **Step 3: Check git diff**

Run:

```powershell
git diff --stat
git status --short
```

Expected: only referral-system files are changed.
