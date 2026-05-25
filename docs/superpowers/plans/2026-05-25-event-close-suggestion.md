# Event Close Suggestion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить post-save вопрос о закрытии мероприятия, если оно завершено, полностью оплачено и не отменено.

**Architecture:** Вынести вычисление условий закрытия в чистый helper без UI-зависимостей, покрыть его unit-тестом и затем подключить helper в `eventFunc.js` для повторного использования в текущей логике `closed` и в новом confirm после сохранения. UI-поток останется локальным для модалки мероприятия и не потребует изменений API.

**Tech Stack:** Next.js, React, Jotai, TanStack Query, Node test runner, ESLint

---

### Task 1: Helper условий закрытия мероприятия

**Files:**
- Create: `helpers/eventCloseSuggestion.js`
- Create: `helpers/eventCloseSuggestion.test.js`

- [ ] **Step 1: Write the failing test**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { getEventCloseSuggestionState } from './eventCloseSuggestion.js'

test('suggests closing for finished fully paid active event', () => {
  const result = getEventCloseSuggestionState(
    {
      status: 'active',
      contractSum: 10000,
      isByContract: false,
      eventDate: '2026-05-20T18:00:00.000Z',
      dateEnd: '2026-05-20T20:00:00.000Z',
    },
    [{ type: 'income', amount: 10000, category: 'final_payment' }],
    new Date('2026-05-21T00:00:00.000Z')
  )

  assert.equal(result.canClose, true)
  assert.equal(result.isEventFinished, true)
  assert.equal(result.shouldSuggestClosing, true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --experimental-default-type=module --test helpers/eventCloseSuggestion.test.js`
Expected: FAIL with module-not-found or missing export for `getEventCloseSuggestionState`

- [ ] **Step 3: Write minimal implementation**

```js
export const getEventCloseSuggestionState = (event, transactions = [], now = new Date()) => {
  const incomeTotal = (Array.isArray(transactions) ? transactions : [])
    .filter((item) => item?.type === 'income')
    .reduce((sum, item) => sum + Number(item?.amount ?? 0), 0)

  const hasTaxes = (Array.isArray(transactions) ? transactions : []).some(
    (item) => item?.category === 'taxes'
  )

  const endValue = event?.dateEnd ?? event?.eventDate ?? null
  const endDate = endValue ? new Date(endValue) : null
  const isEventFinished = Boolean(
    endDate && !Number.isNaN(endDate.getTime()) && endDate.getTime() < now.getTime()
  )

  const canClose =
    Number(event?.contractSum ?? 0) <= incomeTotal &&
    (!event?.isByContract || hasTaxes)

  const blockedStatus = ['draft', 'canceled', 'closed'].includes(String(event?.status ?? ''))

  return {
    incomeTotal,
    hasTaxes,
    canClose,
    isEventFinished,
    shouldSuggestClosing: !blockedStatus && isEventFinished && canClose,
  }
}
```

- [ ] **Step 4: Expand test coverage**

```js
test('does not suggest closing for canceled event', () => {
  const result = getEventCloseSuggestionState(
    {
      status: 'canceled',
      contractSum: 10000,
      isByContract: false,
      eventDate: '2026-05-20T18:00:00.000Z',
    },
    [{ type: 'income', amount: 10000, category: 'final_payment' }],
    new Date('2026-05-21T00:00:00.000Z')
  )

  assert.equal(result.shouldSuggestClosing, false)
})
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --experimental-default-type=module --test helpers/eventCloseSuggestion.test.js`
Expected: PASS, all helper scenarios green

### Task 2: Подключение helper в модалке мероприятия

**Files:**
- Modify: `layouts/modals/modalsFunc/eventFunc.js`
- Test: `helpers/eventCloseSuggestion.test.js`

- [ ] **Step 1: Replace inline close-state calculations with helper**

```js
const closeState = useMemo(
  () =>
    getEventCloseSuggestionState(
      {
        status,
        contractSum,
        isByContract,
        eventDate,
        dateEnd,
      },
      eventTransactions
    ),
  [status, contractSum, isByContract, eventDate, dateEnd, eventTransactions]
)

const canClose = closeState.canClose
const isEventFinished = closeState.isEventFinished
```

- [ ] **Step 2: Add post-save suggestion dialog**

```js
if (savedEvent && shouldSuggestClosingAfterSave(savedEvent)) {
  modalsFunc.add({
    title: 'Закрыть мероприятие?',
    text: 'Мероприятие полностью оплачено и завершено. Возможно, стоит закрыть мероприятие?',
    confirmButtonName: 'Закрыть мероприятие',
    declineButtonName: 'Оставить открытым',
    showDecline: true,
    onConfirm: async () => {
      await setEvent({ _id: savedEvent._id, status: 'closed' }, false)
      closeModalRef.current()
    },
    onDecline: () => closeModalRef.current(),
  })
  return
}
```

- [ ] **Step 3: Preserve existing additional-event prompt ordering**

```js
// First handle the existing draft-without-follow-up reminder flow.
// Only after that branch is skipped, evaluate the close suggestion flow.
```

- [ ] **Step 4: Run targeted verification**

Run:
- `node --experimental-default-type=module --test helpers/eventCloseSuggestion.test.js`
- `npx eslint helpers/eventCloseSuggestion.js helpers/eventCloseSuggestion.test.js layouts/modals/modalsFunc/eventFunc.js`

Expected:
- test runner reports all helper tests passing
- eslint exits with code 0 for touched files
