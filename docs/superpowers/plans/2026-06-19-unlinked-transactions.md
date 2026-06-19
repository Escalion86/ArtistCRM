# Unlinked Transactions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow ArtistCRM transactions without event or client links and include them in monthly profit statistics by transaction date.

**Architecture:** Keep the existing `Transactions` model and API. Make relation fields nullable, add focused helper behavior in statistics chart/month detail functions, and update the existing transaction modal/list/card UI without adding a new domain model.

**Tech Stack:** Next.js App Router, Mongoose, React, TanStack Query, Node test runner.

---

## File Structure

- Modify `schemas/transactionsSchema.js`: make `eventId` and `clientId` optional nullable references.
- Modify `app/api/transactions/route.js`: allow create without event/client and validate optional relations.
- Modify `app/api/transactions/[id]/route.js`: allow update and clearing of event/client links.
- Modify `layouts/modals/modalsFunc/transactionFunc.js`: make event/client optional and clearable.
- Modify `components/IconToggleButtons/TransactionRelationToggleButtons.js`: create relation filter toggle matching transaction type toggle behavior.
- Modify `layouts/content/TransactionsContent.js`: apply relation filter and render the new toggle.
- Modify `layouts/cards/TransactionCard.js`: show neutral fallbacks for missing client/event.
- Modify `helpers/buildStatisticsChartData.js` and test: include unlinked transactions by `date`.
- Modify `helpers/getStatisticsMonthDetails.js` and test: include unlinked transactions by `date`.
- Modify `layouts/content/StatisticsContent.js`: keep unlinked transactions in the statistics filter when no town is selected and export/display them.
- Modify `app/api/statistics/route.js`: fetch unlinked transactions for the selected year.

### Task 1: Statistics Chart Behavior

**Files:**
- Modify: `helpers/buildStatisticsChartData.test.js`
- Modify: `helpers/buildStatisticsChartData.js`

- [ ] **Step 1: Write the failing test**

Append this test to `helpers/buildStatisticsChartData.test.js`:

```js
test('adds unlinked transactions to profit by transaction date month', () => {
  const result = buildStatisticsChartData({
    selectedYear: 2026,
    filteredEvents: [],
    filteredTransactions: [
      {
        _id: 'tx-fuel',
        eventId: null,
        type: 'expense',
        amount: 2500,
        date: '2026-03-15T10:00:00.000Z',
      },
      {
        _id: 'tx-extra',
        eventId: '',
        type: 'income',
        amount: 7000,
        date: '2026-03-20T10:00:00.000Z',
      },
    ],
    eventsMap: new Map(),
    eventFinanceMap: new Map(),
  })

  const march = result.find((item) => item.monthKey === '2026-03')
  assert.equal(march.income, 7000)
  assert.equal(march.expense, 2500)
  assert.equal(march.profit, 4500)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- helpers/buildStatisticsChartData.test.js`

Expected: FAIL because unlinked transactions are skipped.

- [ ] **Step 3: Implement minimal chart support**

In `helpers/buildStatisticsChartData.js`, keep linked transactions tied to event month and add a fallback for transactions without `eventId` that buckets by `transaction.date`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- helpers/buildStatisticsChartData.test.js`

Expected: PASS.

### Task 2: Month Details Behavior

**Files:**
- Modify: `helpers/getStatisticsMonthDetails.test.js`
- Modify: `helpers/getStatisticsMonthDetails.js`

- [ ] **Step 1: Write the failing test**

Append this test to `helpers/getStatisticsMonthDetails.test.js`:

```js
test('includes unlinked transactions in selected month by transaction date', () => {
  const result = getStatisticsMonthDetails({
    monthKey: '2026-05',
    filteredEvents: [],
    filteredTransactions: [
      {
        _id: 'tx-props',
        eventId: null,
        type: 'expense',
        amount: 3000,
        date: '2026-05-12T10:00:00.000Z',
      },
      {
        _id: 'tx-other-month',
        eventId: null,
        type: 'expense',
        amount: 1000,
        date: '2026-06-12T10:00:00.000Z',
      },
    ],
    eventFinanceMap: new Map(),
  })

  assert.deepEqual(
    result.transactions.map((transaction) => transaction._id),
    ['tx-props']
  )
  assert.equal(result.summary.totalExpense, 3000)
  assert.equal(result.summary.profit, -3000)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- helpers/getStatisticsMonthDetails.test.js`

Expected: FAIL because unlinked transactions are skipped.

- [ ] **Step 3: Implement minimal month detail support**

In `helpers/getStatisticsMonthDetails.js`, include transactions linked to events in the selected month and transactions with no `eventId` whose `date` is in the selected month.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- helpers/getStatisticsMonthDetails.test.js`

Expected: PASS.

### Task 3: API And Schema

**Files:**
- Modify: `schemas/transactionsSchema.js`
- Modify: `app/api/transactions/route.js`
- Modify: `app/api/transactions/[id]/route.js`
- Test manually through existing routes if no route unit harness exists.

- [ ] **Step 1: Make relation schema nullable**

Set `eventId` and `clientId` to `default: null` and remove `required: true`.

- [ ] **Step 2: Update create route**

Add small local helpers:

```js
const normalizeOptionalId = (value) => {
  const text = String(value ?? '').trim()
  return text || null
}
```

Use `nextEventId = normalizeOptionalId(body.eventId)` and `bodyClientId = normalizeOptionalId(body.clientId)`.

If `nextEventId` exists, load and validate the event as before. Otherwise skip event validation.

If a client id exists after event fallback, validate it. Otherwise store `clientId: null`.

- [ ] **Step 3: Update edit route**

For `PUT`, distinguish absent fields from fields explicitly set to empty/null:

```js
const hasEventIdField = Object.hasOwn(body, 'eventId')
const hasClientIdField = Object.hasOwn(body, 'clientId')
const nextEventId = hasEventIdField
  ? normalizeOptionalId(body.eventId)
  : existing.eventId
    ? String(existing.eventId)
    : null
```

Apply the same optional relation validation as create.

- [ ] **Step 4: Check syntax**

Run: `npm run lint -- --file app/api/transactions/route.js --file app/api/transactions/[id]/route.js`

Expected: no syntax/lint errors. If the project lint command does not support `--file`, run `npm run lint`.

### Task 4: Transactions UI

**Files:**
- Create: `components/IconToggleButtons/TransactionRelationToggleButtons.js`
- Modify: `layouts/modals/modalsFunc/transactionFunc.js`
- Modify: `layouts/content/TransactionsContent.js`
- Modify: `layouts/cards/TransactionCard.js`

- [ ] **Step 1: Create relation toggle component**

Implement a two-button MUI `ButtonGroup` matching `TransactionTypeToggleButtons` behavior with keys `linked` and `unlinked`.

- [ ] **Step 2: Add relation filter state**

In `TransactionsContent`, add:

```js
const [relationFilter, setRelationFilter] = useState({
  linked: true,
  unlinked: true,
})
```

Filter after type filtering:

```js
const hasRelation = Boolean(item.eventId || item.clientId)
```

- [ ] **Step 3: Make transaction modal relations optional**

Remove hard validation that requires both selected event and selected client. Disable confirm only for read-only/loading/unchanged edit. Add clear buttons beside relation pickers when a relation is selected.

- [ ] **Step 4: Update card fallbacks**

Use `Без клиента` when `client` is missing and `Без мероприятия` when `event` is missing.

### Task 5: Statistics Integration

**Files:**
- Modify: `app/api/statistics/route.js`
- Modify: `layouts/content/StatisticsContent.js`

- [ ] **Step 1: Fetch unlinked transactions**

In the statistics API, query transactions that are either linked to filtered event ids or have no `eventId`. Apply year range to unlinked transactions by `date`.

- [ ] **Step 2: Keep unlinked transactions in client filtering**

In `StatisticsContent`, include transactions without `eventId` when `selectedTown` is empty and their `date` matches `selectedYear`.

- [ ] **Step 3: Export unlinked transactions**

In CSV export, allow `event` to be null and output `Без мероприятия` in the transaction event column.

### Task 6: Final Verification

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run focused tests**

Run:

```bash
npm test -- helpers/buildStatisticsChartData.test.js
npm test -- helpers/getStatisticsMonthDetails.test.js
```

Expected: both pass.

- [ ] **Step 2: Run lint or available project check**

Run: `npm run lint`

Expected: pass or report only pre-existing unrelated warnings/errors.

- [ ] **Step 3: Inspect git diff**

Run: `git diff --stat` and `git diff --check`

Expected: scoped changes, no whitespace errors.

