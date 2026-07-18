import assert from 'node:assert/strict'
import test from 'node:test'
import { serializeMobileBilling } from './billing.js'

test('mobile billing возвращает безопасные тарифы и прогноз', () => {
  const currentTariff = {
    _id: 'dev',
    title: 'DEV',
    price: 300,
    hidden: true,
    internalNote: 'secret',
  }
  const result = serializeMobileBilling({
    user: {
      balance: 800,
      billingStatus: 'active',
      tariffActiveUntil: '2026-08-25T00:00:00.000Z',
    },
    currentTariff,
    tariffs: [
      currentTariff,
      { _id: 'pro', title: 'Профи', price: 500, allowDocuments: true },
    ],
    now: new Date('2026-07-25T00:00:00.000Z'),
  })
  assert.equal(result.currentTariff.title, 'DEV')
  assert.equal(result.account.balance, 800)
  assert.equal(result.account.fundedUntil, '2026-10-25T00:00:00.000Z')
  assert.equal(result.tariffs[1].allowDocuments, true)
  assert.equal('internalNote' in result.currentTariff, false)
  assert.equal('hidden' in result.currentTariff, false)
})
