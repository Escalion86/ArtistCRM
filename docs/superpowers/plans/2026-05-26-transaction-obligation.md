# Transaction Obligation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить в ArtistCRM метод оплаты транзакции `obligation`, который учитывается в финансах как обычная транзакция, но блокирует закрытие мероприятия до перевода в обычный метод оплаты с фактической датой.

**Architecture:** Расширить допустимые методы оплаты на уровне констант, схемы и API, чтобы новый метод жил в существующей модели транзакций без отдельной логики для расчётов. Блокировку закрытия и часть UI-подсказок вынести в небольшие helper-функции, чтобы их можно было покрыть `node:test` и использовать и на клиенте, и на сервере.

**Tech Stack:** Next.js App Router, React 19, Mongoose, Jotai, Node `test`, ESLint.

---

### Task 1: Вынести правила обязательств в helper и покрыть их тестами

**Files:**
- Create: `helpers/transactionObligation.js`
- Create: `helpers/transactionObligation.test.js`

- [ ] **Step 1: Write the failing test**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  hasObligationPaymentMethod,
  getTransactionDateLabel,
  getTransactionDateHint,
  getCloseBlockedByObligationsMessage,
} from './transactionObligation.js'

test('detects obligation transactions inside event list', () => {
  assert.equal(
    hasObligationPaymentMethod([
      { paymentMethod: 'cash' },
      { paymentMethod: 'obligation' },
    ]),
    true
  )
})

test('returns planned date label and hint for obligation', () => {
  assert.equal(getTransactionDateLabel('obligation'), 'Плановая дата')
  assert.match(getTransactionDateHint('obligation'), /плановая дата/i)
})

test('returns factual date label for regular payment method', () => {
  assert.equal(getTransactionDateLabel('cash'), 'Дата')
  assert.equal(getTransactionDateHint('cash'), '')
})

test('returns close-blocking message', () => {
  assert.match(
    getCloseBlockedByObligationsMessage(),
    /Переведите их на другой метод оплаты/i
  )
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test helpers/transactionObligation.test.js`
Expected: FAIL with module not found or missing export errors for `transactionObligation.js`.

- [ ] **Step 3: Write minimal implementation**

```js
const OBLIGATION_PAYMENT_METHOD = 'obligation'

export const hasObligationPaymentMethod = (transactions = []) =>
  Array.isArray(transactions)
    ? transactions.some(
        (item) => String(item?.paymentMethod || '').trim() === OBLIGATION_PAYMENT_METHOD
      )
    : false

export const getTransactionDateLabel = (paymentMethod) =>
  paymentMethod === OBLIGATION_PAYMENT_METHOD ? 'Плановая дата' : 'Дата'

export const getTransactionDateHint = (paymentMethod) =>
  paymentMethod === OBLIGATION_PAYMENT_METHOD
    ? 'Для обязательства это плановая дата исполнения.'
    : ''

export const getCloseBlockedByObligationsMessage = () =>
  'Нельзя закрыть мероприятие: есть транзакции с обязательствами. Переведите их на другой метод оплаты и укажите фактическую дату совершения.'
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test helpers/transactionObligation.test.js`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add helpers/transactionObligation.js helpers/transactionObligation.test.js
git commit -m "test: add transaction obligation helper coverage"
```

### Task 2: Разрешить новый метод оплаты в модели и API

**Files:**
- Modify: `helpers/constants.js`
- Modify: `schemas/transactionsSchema.js`
- Modify: `app/api/transactions/route.js`
- Modify: `app/api/transactions/[id]/route.js`
- Test: `helpers/transactionObligation.test.js`

- [ ] **Step 1: Write the failing test**

Добавить в `helpers/transactionObligation.test.js` проверки:

```js
import { TRANSACTION_PAYMENT_METHODS } from './constants.js'

test('exports obligation payment method for UI lists', () => {
  assert.equal(
    TRANSACTION_PAYMENT_METHODS.some((item) => item.value === 'obligation'),
    true
  )
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test helpers/transactionObligation.test.js`
Expected: FAIL because `obligation` is missing from `TRANSACTION_PAYMENT_METHODS`.

- [ ] **Step 3: Write minimal implementation**

```js
export const TRANSACTION_PAYMENT_METHODS = Object.freeze([
  { value: 'transfer', name: 'Перевод' },
  { value: 'account', name: 'Расчетный счет' },
  { value: 'cash', name: 'Наличка' },
  { value: 'barter', name: 'Бартер' },
  { value: 'obligation', name: 'Обязательство' },
])
```

И в API/схеме расширить допустимые значения:

```js
enum: ['transfer', 'account', 'cash', 'barter', 'obligation']
```

```js
const TRANSACTION_PAYMENT_METHODS = new Set([
  'transfer',
  'account',
  'cash',
  'barter',
  'obligation',
])
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test helpers/transactionObligation.test.js`
Expected: PASS, включая новый тест на экспорт метода.

- [ ] **Step 5: Commit**

```bash
git add helpers/constants.js schemas/transactionsSchema.js app/api/transactions/route.js app/api/transactions/[id]/route.js helpers/transactionObligation.test.js
git commit -m "feat: allow obligation transaction payment method"
```

### Task 3: Заблокировать закрытие мероприятия при обязательствах

**Files:**
- Modify: `app/api/events/[id]/route.js`
- Modify: `helpers/eventCloseSuggestion.js`
- Modify: `helpers/eventCloseSuggestion.test.js`
- Modify: `state/itemsFuncGenerator.js`
- Reuse: `helpers/transactionObligation.js`

- [ ] **Step 1: Write the failing test**

Добавить в `helpers/eventCloseSuggestion.test.js` проверку:

```js
test('does not allow closing when event has obligation transactions', () => {
  const result = getEventCloseSuggestionState(
    {
      status: 'active',
      contractSum: 10000,
      isByContract: false,
      eventDate: '2026-05-20T18:00:00.000Z',
      dateEnd: '2026-05-20T20:00:00.000Z',
    },
    [
      { type: 'income', amount: 10000, category: 'final_payment' },
      { type: 'expense', amount: 1000, paymentMethod: 'obligation' },
    ],
    finishedNow
  )

  assert.equal(result.hasObligations, true)
  assert.equal(result.canClose, false)
  assert.equal(result.shouldSuggestClosing, false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test helpers/eventCloseSuggestion.test.js`
Expected: FAIL because `hasObligations` is absent and `canClose` still returns `true`.

- [ ] **Step 3: Write minimal implementation**

В `helpers/eventCloseSuggestion.js`:

```js
import { hasObligationPaymentMethod } from './transactionObligation.js'

const hasObligations = hasObligationPaymentMethod(transactions)
const canClose =
  contractSum <= incomeTotal &&
  (!event?.isByContract || hasTaxes) &&
  !hasObligations

return {
  incomeTotal,
  hasTaxes,
  hasObligations,
  canClose,
  isEventFinished,
  shouldSuggestClosing: !blockedStatus && isEventFinished && canClose,
}
```

В `app/api/events/[id]/route.js` перед `update.status = body.status`:

```js
if (nextStatus === 'closed') {
  const obligationsCount = await Transactions.countDocuments({
    tenantId,
    eventId: id,
    paymentMethod: 'obligation',
  })

  if (obligationsCount > 0) {
    return NextResponse.json(
      {
        success: false,
        error: getCloseBlockedByObligationsMessage(),
      },
      { status: 409 }
    )
  }
}
```

В `state/itemsFuncGenerator.js` оставить обработку ошибки через уже существующий `buildErrorToast`, чтобы snackbar показал текст с сервера без технички.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test helpers/eventCloseSuggestion.test.js`
Expected: PASS, включая новый сценарий с обязательством.

- [ ] **Step 5: Commit**

```bash
git add app/api/events/[id]/route.js helpers/eventCloseSuggestion.js helpers/eventCloseSuggestion.test.js state/itemsFuncGenerator.js
git commit -m "feat: block event closing when obligations exist"
```

### Task 4: Обновить форму и карточки транзакций

**Files:**
- Modify: `layouts/modals/modalsFunc/transactionFunc.js`
- Modify: `layouts/cards/TransactionCard.js`
- Modify: `layouts/modals/modalsFunc/eventViewFunc.js`
- Reuse: `helpers/transactionObligation.js`

- [ ] **Step 1: Write the failing test**

Для UI в этом проекте нет готового компонентного раннера, поэтому вместо unit-теста сначала зафиксировать чистую логику в helper-тесте:

```js
test('returns planned date label for obligation card rendering', () => {
  assert.equal(getTransactionDateLabel('obligation'), 'Плановая дата')
})
```

Если этот тест уже добавлен в Task 1, повторно не создавать.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test helpers/transactionObligation.test.js`
Expected: Если Task 1 ещё не выполнен, FAIL. Если выполнен, этот red-step уже подтвержден и второй раз не нужен.

- [ ] **Step 3: Write minimal implementation**

В `transactionFunc.js`:

```js
const initialPaymentMethod = useMemo(
  () => transaction?.paymentMethod ?? 'transfer',
  [transaction?.paymentMethod]
)
const wasObligation = initialPaymentMethod === 'obligation'
const isObligation = paymentMethod === 'obligation'
const dateLabel = getTransactionDateLabel(paymentMethod)
const dateHint = getTransactionDateHint(paymentMethod)
const showDateReconfirmNote = transactionId && wasObligation && !isObligation
```

Рядом с `DateTimePicker`:

```jsx
<DateTimePicker
  value={date}
  onChange={(value) => setDate(value ?? new Date().toISOString())}
  label={dateLabel}
  disabled={loading || isReadOnly}
/>
{dateHint ? <Note noMargin>{dateHint}</Note> : null}
{showDateReconfirmNote ? (
  <Note noMargin>
    После смены метода оплаты укажите фактическую дату совершения транзакции.
  </Note>
) : null}
```

В `TransactionCard.js` добавить бейдж и подпись:

```jsx
const isObligation = transaction.paymentMethod === 'obligation'
const dateLabel = isObligation ? 'Плановая дата' : 'Дата'
```

```jsx
<div className="card-muted text-[11px] font-medium">
  {dateLabel}
</div>
{isObligation && (
  <div className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
    Обязательство
  </div>
)}
```

В `eventViewFunc.js` показать предупреждение, если у события есть обязательства в связанных транзакциях.

- [ ] **Step 4: Run targeted verification**

Run: `node --test helpers/transactionObligation.test.js helpers/eventCloseSuggestion.test.js`
Expected: PASS for both helper suites.

- [ ] **Step 5: Commit**

```bash
git add layouts/modals/modalsFunc/transactionFunc.js layouts/cards/TransactionCard.js layouts/modals/modalsFunc/eventViewFunc.js
git commit -m "feat: show obligation transaction warnings in ui"
```

### Task 5: Финальная проверка

**Files:**
- Verify only: текущие изменённые файлы задачи

- [ ] **Step 1: Run focused tests**

Run: `node --test helpers/transactionObligation.test.js helpers/eventCloseSuggestion.test.js helpers/eventTransactionAction.test.js`
Expected: PASS, 0 failures.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: exit code 0.

- [ ] **Step 3: Review diff**

Run:

```bash
git diff -- helpers/constants.js schemas/transactionsSchema.js app/api/transactions/route.js app/api/transactions/[id]/route.js app/api/events/[id]/route.js helpers/transactionObligation.js helpers/transactionObligation.test.js helpers/eventCloseSuggestion.js helpers/eventCloseSuggestion.test.js layouts/modals/modalsFunc/transactionFunc.js layouts/cards/TransactionCard.js layouts/modals/modalsFunc/eventViewFunc.js state/itemsFuncGenerator.js
```

Expected: diff содержит только изменения для `obligation`, UI-предупреждений и блокировки закрытия.

- [ ] **Step 4: Commit final integration**

```bash
git add helpers/constants.js schemas/transactionsSchema.js app/api/transactions/route.js app/api/transactions/[id]/route.js app/api/events/[id]/route.js helpers/transactionObligation.js helpers/transactionObligation.test.js helpers/eventCloseSuggestion.js helpers/eventCloseSuggestion.test.js layouts/modals/modalsFunc/transactionFunc.js layouts/cards/TransactionCard.js layouts/modals/modalsFunc/eventViewFunc.js state/itemsFuncGenerator.js
git commit -m "feat: add obligation transactions for event finance"
```
