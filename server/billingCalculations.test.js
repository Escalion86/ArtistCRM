import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateBalanceRunway,
  calculateTariffChangeQuote,
  calculateTariffCredit,
} from './billingCalculations.js'

const now = new Date('2026-07-25T00:00:00.000Z')

test('billing forecast учитывает оплаченный период и полные месяцы баланса', () => {
  const result = calculateBalanceRunway({
    balance: 800,
    tariffPrice: 300,
    tariffActiveUntil: '2026-08-25T00:00:00.000Z',
    now,
  })
  assert.equal(result.fundedMonths, 2)
  assert.equal(result.fundedUntil, '2026-10-25T00:00:00.000Z')
  assert.equal(result.unlimited, false)
})

test('billing forecast отмечает бесплатный тариф без ограничения', () => {
  const result = calculateBalanceRunway({
    balance: 0,
    tariffPrice: 0,
    tariffActiveUntil: null,
    now,
  })
  assert.deepEqual(result, {
    fundedMonths: null,
    fundedUntil: null,
    unlimited: true,
  })
})

test('смена тарифа учитывает компенсацию и недостающую сумму', () => {
  const currentTariff = { _id: 'current', price: 300 }
  const creditAmount = calculateTariffCredit({
    currentTariff,
    tariffActiveUntil: '2026-08-25T00:00:00.000Z',
    now,
  })
  const quote = calculateTariffChangeQuote({
    balance: 100,
    currentTariff,
    tariffActiveUntil: '2026-08-25T00:00:00.000Z',
    targetTariff: { _id: 'target', price: 500 },
    now,
  })
  assert.equal(quote.creditAmount, creditAmount)
  assert.equal(quote.missingAmount, Math.max(500 - 100 - creditAmount, 0))
  assert.equal(quote.current, false)
})
