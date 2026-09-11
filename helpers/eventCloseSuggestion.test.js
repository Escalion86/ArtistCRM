import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getEventCloseSuggestionState,
  getEventCloseBlockedReason,
  shouldSuggestEventClosingOnDismiss,
} from './eventCloseSuggestion.js'

const finishedNow = new Date('2026-05-21T00:00:00.000Z')

test('closing requires actual income, taxes for contracts and no obligations', () => {
  const event = { contractSum: 10000, isByContract: false }
  assert.match(getEventCloseBlockedReason(event, []), /сумма поступлений/)
  assert.match(
    getEventCloseBlockedReason(event, [{ type: 'income', amount: 3000 }]),
    /сумма поступлений/
  )
  const paid = [{ type: 'income', amount: 10000 }]
  assert.equal(getEventCloseBlockedReason(event, paid), '')
  assert.match(
    getEventCloseBlockedReason({ ...event, isByContract: true }, paid),
    /Налоги/
  )
  assert.equal(
    getEventCloseBlockedReason({ ...event, isByContract: true }, [
      ...paid,
      { type: 'expense', category: 'taxes', amount: 600 },
    ]),
    ''
  )
  assert.match(
    getEventCloseBlockedReason(event, [
      ...paid,
      { paymentMethod: 'obligation', type: 'expense', amount: 1 },
    ]),
    /обязательствами/
  )
  assert.equal(getEventCloseBlockedReason({ contractSum: 0 }, []), '')
})

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
    finishedNow
  )

  assert.equal(result.canClose, true)
  assert.equal(result.isEventFinished, true)
  assert.equal(result.shouldSuggestClosing, true)
})

test('does not suggest closing when event is not finished yet', () => {
  const result = getEventCloseSuggestionState(
    {
      status: 'active',
      contractSum: 10000,
      isByContract: false,
      eventDate: '2026-05-21T18:00:00.000Z',
      dateEnd: '2026-05-21T20:00:00.000Z',
    },
    [{ type: 'income', amount: 10000, category: 'final_payment' }],
    finishedNow
  )

  assert.equal(result.canClose, true)
  assert.equal(result.isEventFinished, false)
  assert.equal(result.shouldSuggestClosing, false)
})

test('does not suggest closing when payment is incomplete', () => {
  const result = getEventCloseSuggestionState(
    {
      status: 'active',
      contractSum: 10000,
      isByContract: false,
      eventDate: '2026-05-20T18:00:00.000Z',
      dateEnd: '2026-05-20T20:00:00.000Z',
    },
    [{ type: 'income', amount: 5000, category: 'deposit' }],
    finishedNow
  )

  assert.equal(result.canClose, false)
  assert.equal(result.isEventFinished, true)
  assert.equal(result.shouldSuggestClosing, false)
})

test('does not suggest closing for canceled event', () => {
  const result = getEventCloseSuggestionState(
    {
      status: 'canceled',
      contractSum: 10000,
      isByContract: false,
      eventDate: '2026-05-20T18:00:00.000Z',
      dateEnd: '2026-05-20T20:00:00.000Z',
    },
    [{ type: 'income', amount: 10000, category: 'final_payment' }],
    finishedNow
  )

  assert.equal(result.shouldSuggestClosing, false)
})

test('does not suggest closing for already closed event', () => {
  const result = getEventCloseSuggestionState(
    {
      status: 'closed',
      contractSum: 10000,
      isByContract: false,
      eventDate: '2026-05-20T18:00:00.000Z',
      dateEnd: '2026-05-20T20:00:00.000Z',
    },
    [{ type: 'income', amount: 10000, category: 'final_payment' }],
    finishedNow
  )

  assert.equal(result.shouldSuggestClosing, false)
})

test('does not allow closing by contract event without taxes transaction', () => {
  const result = getEventCloseSuggestionState(
    {
      status: 'active',
      contractSum: 10000,
      isByContract: true,
      eventDate: '2026-05-20T18:00:00.000Z',
      dateEnd: '2026-05-20T20:00:00.000Z',
    },
    [{ type: 'income', amount: 10000, category: 'final_payment' }],
    finishedNow
  )

  assert.equal(result.canClose, false)
  assert.equal(result.shouldSuggestClosing, false)
})

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

test('suggests closing persisted event when edit modal is dismissed without saving', () => {
  const result = shouldSuggestEventClosingOnDismiss(
    {
      _id: 'event-1',
      status: 'active',
      contractSum: 10000,
      isByContract: false,
      eventDate: '2026-05-20T18:00:00.000Z',
      dateEnd: '2026-05-20T20:00:00.000Z',
    },
    [{ type: 'income', amount: 10000, category: 'final_payment' }],
    finishedNow
  )

  assert.equal(result, true)
})

test('does not suggest closing dismissed clone modal', () => {
  const result = shouldSuggestEventClosingOnDismiss(
    {
      _id: 'event-1',
      status: 'active',
      contractSum: 10000,
      isByContract: false,
      eventDate: '2026-05-20T18:00:00.000Z',
      dateEnd: '2026-05-20T20:00:00.000Z',
    },
    [{ type: 'income', amount: 10000, category: 'final_payment' }],
    finishedNow,
    { clone: true }
  )

  assert.equal(result, false)
})
