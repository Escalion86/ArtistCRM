import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildGoogleCalendarStatusIconsPrefix,
  shouldSkipGoogleCalendarEventSync,
} from './googleCalendarStatusIcons.js'

test('shows only green payment icon when event is fully paid', () => {
  const result = buildGoogleCalendarStatusIconsPrefix(
    { contractSum: 10000, isTransferred: false },
    [
      { type: 'income', amount: 4000, category: 'deposit' },
      { type: 'income', amount: 6000, category: 'final_payment' },
    ]
  )

  assert.equal(result, '✅ ')
})

test('shows gray payment icon for any partial income payment', () => {
  const result = buildGoogleCalendarStatusIconsPrefix(
    { contractSum: 10000, isTransferred: false },
    [{ type: 'income', amount: 5000, category: 'final_payment' }]
  )

  assert.equal(result, '☑️ ')
})

test('shows either gray or green payment icon, never both', () => {
  const result = buildGoogleCalendarStatusIconsPrefix(
    { contractSum: 10000, isTransferred: true },
    [
      { type: 'income', amount: 3000, category: 'deposit' },
      { type: 'income', amount: 7000, category: 'final_payment' },
    ]
  )

  assert.equal(result, '✅➡️ ')
  assert.equal(result.includes('☑️'), false)
})

test('shows contract icon for event by contract', () => {
  const result = buildGoogleCalendarStatusIconsPrefix(
    { contractSum: 0, isByContract: true, isTransferred: false },
    []
  )

  assert.equal(result, '📄 ')
})

test('keeps payment, contract and transferred icons in stable order', () => {
  const result = buildGoogleCalendarStatusIconsPrefix(
    { contractSum: 10000, isByContract: true, isTransferred: true },
    [{ type: 'income', amount: 10000, category: 'final_payment' }]
  )

  assert.equal(result, '✅📄➡️ ')
})

test('skips canceled event when canceled sync is disabled', () => {
  assert.equal(
    shouldSkipGoogleCalendarEventSync(
      { status: 'canceled', isTransferred: false },
      {
        deleteCanceledFromCalendar: true,
        skipTransferredFromCalendar: false,
      }
    ),
    true
  )
})

test('skips transferred event when transferred sync is disabled', () => {
  assert.equal(
    shouldSkipGoogleCalendarEventSync(
      { status: 'active', isTransferred: true },
      {
        deleteCanceledFromCalendar: false,
        skipTransferredFromCalendar: true,
      }
    ),
    true
  )
})

test('does not skip regular active event', () => {
  assert.equal(
    shouldSkipGoogleCalendarEventSync(
      { status: 'active', isTransferred: false },
      {
        deleteCanceledFromCalendar: true,
        skipTransferredFromCalendar: true,
      }
    ),
    false
  )
})
