# Event Transaction Autosave Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Убрать ручной промежуточный save между переводом заявки в мероприятие и добавлением транзакции.

**Architecture:** Добавить маленький чистый helper, который принимает локальное состояние формы события и возвращает решение для кнопки транзакции: запретить, открыть сразу или сначала автосохранить. Затем переиспользовать текущую save-логику события через локальный async helper в `eventFunc.js`, чтобы `Добавить транзакцию` мог сначала сохранить событие, а потом открыть стандартную модалку транзакции.

**Tech Stack:** Next.js, React, Jotai, TanStack Query, Node test runner, ESLint

---

### Task 1: Decision helper для открытия транзакции

**Files:**
- Create: `helpers/eventTransactionAction.test.js`
- Create: `helpers/eventTransactionAction.js`

- [ ] **Step 1: Write the failing test**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { getEventTransactionAction } from './eventTransactionAction.js'

test('returns autosave action when form is active but event id is still missing', () => {
  const result = getEventTransactionAction({
    clone: false,
    status: 'active',
    sourceEventId: null,
    isFormChanged: true,
  })

  assert.deepEqual(result, { type: 'autosave' })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test helpers/eventTransactionAction.test.js`
Expected: FAIL with module-not-found or missing export for `getEventTransactionAction`

- [ ] **Step 3: Write minimal implementation**

```js
export const getEventTransactionAction = ({
  clone = false,
  status = 'draft',
  sourceEventId = null,
  isFormChanged = false,
} = {}) => {
  if (clone) return { type: 'blocked', error: 'В копии транзакции недоступны до сохранения' }
  if (status === 'draft') return { type: 'blocked', error: 'Транзакции недоступны для заявки' }
  if (!sourceEventId) return { type: 'autosave' }
  if (isFormChanged) return { type: 'autosave' }
  return { type: 'open', eventId: sourceEventId }
}
```

- [ ] **Step 4: Expand coverage for blocked and direct-open paths**

```js
test('returns blocked action for draft request', () => {
  const result = getEventTransactionAction({
    clone: false,
    status: 'draft',
    sourceEventId: 'evt-1',
    isFormChanged: true,
  })

  assert.deepEqual(result, {
    type: 'blocked',
    error: 'Транзакции недоступны для заявки',
  })
})

test('returns open action for saved unchanged active event', () => {
  const result = getEventTransactionAction({
    clone: false,
    status: 'active',
    sourceEventId: 'evt-1',
    isFormChanged: false,
  })

  assert.deepEqual(result, {
    type: 'open',
    eventId: 'evt-1',
  })
})
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node --test helpers/eventTransactionAction.test.js`
Expected: PASS, all helper scenarios green

### Task 2: Переиспользуемое сохранение события и автосохранение перед транзакцией

**Files:**
- Modify: `layouts/modals/modalsFunc/eventFunc.js`
- Test: `helpers/eventTransactionAction.test.js`

- [ ] **Step 1: Extract reusable local save helper**

```js
const saveEvent = useCallback(async () => {
  // current payload assembly + setEvent + onSaved
  return {
    savedEvent,
    isCreatingDraftRequest,
    hasAdditionalEvents,
    payload,
  }
}, [/* current save dependencies */])
```

- [ ] **Step 2: Keep normal confirm flow on top of the new helper**

```js
const onClickConfirm = () => {
  // current validation + conflicts dialog
  // call saveEvent() inside proceedSave
}
```

- [ ] **Step 3: Add transaction action decision and autosave branch**

```js
const transactionAction = getEventTransactionAction({
  clone,
  status,
  sourceEventId,
  isFormChanged,
})

if (transactionAction.type === 'autosave') {
  setFinanceLoading(true)
  const { savedEvent } = await saveEvent()
  modalsFunc.transaction?.add(savedEvent._id, {
    contractSum: savedEvent.contractSum,
  })
}
```

- [ ] **Step 4: Surface autosave errors in finance block and prevent double clicks**

```js
try {
  setFinanceError('')
  setFinanceLoading(true)
  // autosave + open
} catch (error) {
  setFinanceError(error?.message || 'Не удалось сохранить мероприятие перед добавлением транзакции')
} finally {
  setFinanceLoading(false)
}
```

- [ ] **Step 5: Run targeted verification**

Run:
- `node --test helpers/eventTransactionAction.test.js`
- `npx eslint helpers/eventTransactionAction.js helpers/eventTransactionAction.test.js layouts/modals/modalsFunc/eventFunc.js`

Expected:
- helper tests pass
- eslint exits with code 0 for changed files
