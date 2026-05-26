import test from 'node:test'
import assert from 'node:assert/strict'
import {
  hasObligationPaymentMethod,
  getTransactionDateLabel,
  getTransactionDateHint,
  getCloseBlockedByObligationsMessage,
} from './transactionObligation.js'
import { TRANSACTION_PAYMENT_METHODS } from './constants.js'

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

test('exports obligation payment method for UI lists', () => {
  assert.equal(
    TRANSACTION_PAYMENT_METHODS.some((item) => item.value === 'obligation'),
    true
  )
})
