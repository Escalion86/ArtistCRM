# Month Events Statistics Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a visual status composition summary to the monthly "Мероприятий" statistics card.

**Architecture:** Keep status grouping in `helpers/getStatisticsMonthDetails.js` so the UI only renders already prepared counts. Extend the existing month-details helper with `summary.eventStatusCounts`, then update `layouts/content/StatisticsContent.js` to render the approved text summary, stacked bar, and legend inside the current `SurfaceCard`.

**Tech Stack:** Next.js App Router, React client components, Tailwind CSS utility classes, Node built-in test runner.

---

## File Structure

- Modify: `helpers/getStatisticsMonthDetails.js`
  - Responsibility: filter month events/transactions, calculate financial summary, and calculate month event status counts.
  - New internal helpers: `createEmptyEventStatusCounts`, `getEventStatusCountKey`, `getEventStatusCounts`.
- Modify: `helpers/getStatisticsMonthDetails.test.js`
  - Responsibility: cover the new mutually exclusive event status grouping and keep existing summary shape assertions current.
- Modify: `layouts/content/StatisticsContent.js`
  - Responsibility: render the approved card UI from `details.summary.eventStatusCounts`.
  - New local constants/helpers: `MONTH_EVENT_STATUS_ITEMS`, `getMonthEventStatusSummaryText`.

No API route, schema, roadmap, or package version change is required for this implementation.

---

### Task 1: Add Month Event Status Counts

**Files:**
- Modify: `helpers/getStatisticsMonthDetails.test.js`
- Modify: `helpers/getStatisticsMonthDetails.js`

- [ ] **Step 1: Write the failing tests**

In `helpers/getStatisticsMonthDetails.test.js`, update the first test's summary assertion to include the new field:

```js
assert.deepEqual(result.summary.eventStatusCounts, {
  draft: 0,
  confirmed: 1,
  finished: 0,
  canceled: 0,
})
```

In the `returns empty details for unknown month` test, update the expected `result.summary` object to:

```js
{
  totalIncome: 0,
  totalExpense: 0,
  profit: 0,
  paymentLeft: 0,
  depositPaid: 0,
  eventStatusCounts: {
    draft: 0,
    confirmed: 0,
    finished: 0,
    canceled: 0,
  },
}
```

Append this new test to `helpers/getStatisticsMonthDetails.test.js`:

```js
test('returns month event status counts by status and date', () => {
  const now = new Date('2026-06-19T12:00:00.000Z').getTime()

  const result = getStatisticsMonthDetails({
    monthKey: '2026-06',
    now,
    filteredEvents: [
      {
        _id: 'draft-past',
        status: 'draft',
        eventDate: '2026-06-01T10:00:00.000Z',
      },
      {
        _id: 'canceled-future',
        status: 'canceled',
        eventDate: '2026-06-25T10:00:00.000Z',
      },
      {
        _id: 'active-past',
        status: 'active',
        eventDate: '2026-06-05T10:00:00.000Z',
      },
      {
        _id: 'closed-past',
        status: 'closed',
        dateEnd: '2026-06-06T12:00:00.000Z',
        eventDate: '2026-06-06T10:00:00.000Z',
      },
      {
        _id: 'active-future',
        status: 'active',
        eventDate: '2026-06-25T10:00:00.000Z',
      },
      {
        _id: 'active-without-date',
        status: 'active',
        eventDate: '2026-06-15T10:00:00.000Z',
        dateEnd: 'not-a-date',
      },
    ],
    filteredTransactions: [],
    eventFinanceMap: new Map(),
  })

  assert.deepEqual(result.summary.eventStatusCounts, {
    draft: 1,
    confirmed: 2,
    finished: 2,
    canceled: 1,
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run from `ArtistCRM`:

```bash
node --test helpers/getStatisticsMonthDetails.test.js
```

Expected: FAIL because `summary.eventStatusCounts` does not exist yet.

- [ ] **Step 3: Implement status counts in the helper**

In `helpers/getStatisticsMonthDetails.js`, add these helper functions after `getMonthKeyFromValue`:

```js
const createEmptyEventStatusCounts = () => ({
  draft: 0,
  confirmed: 0,
  finished: 0,
  canceled: 0,
})

const getEventStatusCountKey = (event, now) => {
  if (event?.status === 'draft') return 'draft'
  if (event?.status === 'canceled') return 'canceled'

  const dateRaw = event?.dateEnd ?? event?.eventDate
  if (isValidDate(dateRaw) && new Date(dateRaw).getTime() < now) {
    return 'finished'
  }

  return 'confirmed'
}

const getEventStatusCounts = (events, now) =>
  events.reduce((counts, event) => {
    counts[getEventStatusCountKey(event, now)] += 1
    return counts
  }, createEmptyEventStatusCounts())
```

Update the exported function signature to accept a deterministic time for tests:

```js
export const getStatisticsMonthDetails = ({
  monthKey,
  filteredEvents = [],
  filteredTransactions = [],
  eventFinanceMap = new Map(),
  now = Date.now(),
}) => {
```

Before the `return`, add:

```js
const eventStatusCounts = getEventStatusCounts(events, now)
```

Add `eventStatusCounts` to the returned `summary`:

```js
summary: {
  totalIncome,
  totalExpense,
  profit: totalIncome - totalExpense,
  paymentLeft,
  depositPaid,
  eventStatusCounts,
},
```

- [ ] **Step 4: Run helper tests**

Run from `ArtistCRM`:

```bash
node --test helpers/getStatisticsMonthDetails.test.js
```

Expected: PASS for all tests in `helpers/getStatisticsMonthDetails.test.js`.

- [ ] **Step 5: Commit helper changes**

```bash
git add helpers/getStatisticsMonthDetails.js helpers/getStatisticsMonthDetails.test.js
git commit -m "feat: count monthly event statuses"
```

---

### Task 2: Render the Approved Event Composition Card

**Files:**
- Modify: `layouts/content/StatisticsContent.js`

- [ ] **Step 1: Add render constants and summary helper**

In `layouts/content/StatisticsContent.js`, add this block after `formatCurrency`:

```js
const MONTH_EVENT_STATUS_ITEMS = [
  {
    key: 'draft',
    shortLabel: 'Заявки',
    summaryLabel: 'заявок',
    colorClassName: 'bg-amber-500',
    textClassName: 'text-amber-700',
  },
  {
    key: 'confirmed',
    shortLabel: 'Подтв.',
    summaryLabel: 'подтверждены',
    colorClassName: 'bg-blue-600',
    textClassName: 'text-blue-700',
  },
  {
    key: 'finished',
    shortLabel: 'Заверш.',
    summaryLabel: 'завершены',
    colorClassName: 'bg-green-600',
    textClassName: 'text-green-700',
  },
  {
    key: 'canceled',
    shortLabel: 'Отмен.',
    summaryLabel: 'отменены',
    colorClassName: 'bg-red-600',
    textClassName: 'text-red-700',
  },
]

const getMonthEventStatusSummaryText = (counts) => {
  const safeCounts = counts || {}
  return MONTH_EVENT_STATUS_ITEMS.map(
    (item) => `${Number(safeCounts[item.key] ?? 0)} ${item.summaryLabel}`
  ).join(', ')
}
```

- [ ] **Step 2: Replace the simple "Мероприятий" card**

In `MonthDetailsModal`, replace the current `SurfaceCard` that only renders `details.events.length`:

```jsx
<SurfaceCard className="rounded" paddingClassName="p-3">
  <div className="text-xs text-gray-500">Мероприятий</div>
  <div className="text-base font-semibold text-gray-800">
    {details.events.length}
  </div>
</SurfaceCard>
```

with:

```jsx
<SurfaceCard className="rounded" paddingClassName="p-3">
  <div className="text-xs text-gray-500">Мероприятий</div>
  <div className="text-base font-semibold text-gray-800">
    {details.events.length}
  </div>
  {details.events.length === 0 ? (
    <div className="mt-1 text-xs text-gray-500">Нет мероприятий</div>
  ) : (
    <div className="mt-2 space-y-2">
      <div className="text-[11px] leading-snug text-gray-500">
        {getMonthEventStatusSummaryText(details.summary.eventStatusCounts)}
      </div>
      <div
        className="flex h-2 overflow-hidden rounded-full bg-gray-100"
        aria-hidden="true"
      >
        {MONTH_EVENT_STATUS_ITEMS.map((item) => {
          const count = Number(
            details.summary.eventStatusCounts?.[item.key] ?? 0
          )
          if (count <= 0) return null
          return (
            <div
              key={item.key}
              className={item.colorClassName}
              style={{ width: `${(count / details.events.length) * 100}%` }}
            />
          )
        })}
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] leading-tight">
        {MONTH_EVENT_STATUS_ITEMS.map((item) => {
          const count = Number(
            details.summary.eventStatusCounts?.[item.key] ?? 0
          )
          return (
            <div
              key={item.key}
              className="flex min-w-0 items-center gap-1 text-gray-500"
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${item.colorClassName}`}
              />
              <span className="truncate">{item.shortLabel}</span>
              <span className={`font-semibold ${item.textClassName}`}>
                {count}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )}
</SurfaceCard>
```

- [ ] **Step 3: Run targeted lint**

Run from `ArtistCRM`:

```bash
npx eslint helpers/getStatisticsMonthDetails.js helpers/getStatisticsMonthDetails.test.js layouts/content/StatisticsContent.js
```

Expected: PASS with no lint errors in the three touched files.

- [ ] **Step 4: Run helper tests again**

Run from `ArtistCRM`:

```bash
node --test helpers/getStatisticsMonthDetails.test.js
```

Expected: PASS.

- [ ] **Step 5: Commit UI changes**

```bash
git add layouts/content/StatisticsContent.js
git commit -m "feat: show monthly event status composition"
```

---

### Task 3: Final Verification

**Files:**
- Verify: `helpers/getStatisticsMonthDetails.js`
- Verify: `helpers/getStatisticsMonthDetails.test.js`
- Verify: `layouts/content/StatisticsContent.js`

- [ ] **Step 1: Inspect the final diff**

Run from `ArtistCRM`:

```bash
git diff HEAD~2..HEAD -- helpers/getStatisticsMonthDetails.js helpers/getStatisticsMonthDetails.test.js layouts/content/StatisticsContent.js
```

Expected: diff only contains the helper status counts, tests, and the monthly event card UI.

- [ ] **Step 2: Re-run all targeted checks**

Run from `ArtistCRM`:

```bash
node --test helpers/getStatisticsMonthDetails.test.js
npx eslint helpers/getStatisticsMonthDetails.js helpers/getStatisticsMonthDetails.test.js layouts/content/StatisticsContent.js
```

Expected: both commands PASS.

- [ ] **Step 3: Manual UI check**

Run from `ArtistCRM`:

```bash
npm run dev
```

Open the statistics page, open a month details modal, and check:

- the "Мероприятий" card still appears in the same summary grid;
- non-empty months show the status sentence, stacked bar, and four legend values;
- zero-event months show `0` and "Нет мероприятий";
- the card remains readable on a narrow/mobile viewport.

- [ ] **Step 4: Report result**

Summarize:

- helper tests result;
- eslint result;
- whether manual UI check was completed;
- any existing unrelated dirty worktree changes that were left untouched.
