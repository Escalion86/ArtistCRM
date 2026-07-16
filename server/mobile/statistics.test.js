import assert from 'node:assert/strict'
import test from 'node:test'
import { sanitizeMobileStatisticsPayload } from './statistics.js'

test('мобильная статистика содержит только поля расчёта и экспорта', () => {
  const result = sanitizeMobileStatisticsPayload({
    success: true,
    data: {
      events: [{
        _id: 'event-1',
        clientId: 'client-1',
        description: 'Свадьба',
        documents: [{ file: { base64: 'secret' } }],
        raw: { secret: true },
      }],
      clients: [{
        _id: 'client-1',
        firstName: 'Анна',
        phone: '79990000000',
        legalDetails: { account: 'secret' },
      }],
      services: [{ _id: 'service-1', title: 'Ведение' }],
      transactions: [{
        _id: 'transaction-1',
        amount: 1000,
        type: 'income',
        raw: { secret: true },
      }],
      filters: { year: 2026, status: 'all' },
    },
  })

  assert.equal('documents' in result.data.events[0], false)
  assert.equal('raw' in result.data.events[0], false)
  assert.equal('phone' in result.data.clients[0], false)
  assert.equal('legalDetails' in result.data.clients[0], false)
  assert.equal('services' in result.data, false)
  assert.equal('raw' in result.data.transactions[0], false)
  assert.deepEqual(result.data.filters, { year: 2026, status: 'all' })
})
