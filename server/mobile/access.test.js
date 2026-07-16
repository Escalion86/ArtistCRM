import test from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeMobileAccess } from './access.js'

test('mobile access содержит только тарифные флаги и безопасный лимит', () => {
  const result = sanitizeMobileAccess({
    trialActive: false,
    hasTariff: true,
    allowDocuments: true,
    allowTelephony: true,
    eventsPerMonth: 120,
    user: { password: 'secret', googleCalendar: { refreshToken: 'token' } },
    tariff: { title: 'Внутренний тариф', price: 1000 },
  })

  assert.equal(result.hasTariff, true)
  assert.equal(result.allowDocuments, true)
  assert.equal(result.eventsPerMonth, 120)
  assert.equal('user' in result, false)
  assert.equal('tariff' in result, false)
  assert.equal(JSON.stringify(result).includes('secret'), false)
})

test('безлимитный trial сериализуется как null вместо невалидного Infinity', () => {
  assert.equal(sanitizeMobileAccess({ eventsPerMonth: Infinity }).eventsPerMonth, null)
})
