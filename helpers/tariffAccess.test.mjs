import test from 'node:test'
import assert from 'node:assert/strict'

import { getUserTariffAccess } from './tariffAccess.js'

test('getUserTariffAccess exposes integration flags from tariff', () => {
  const user = { tariffId: 'paid' }
  const access = getUserTariffAccess(user, [
    {
      _id: 'paid',
      allowAvitoIntegration: true,
      allowVkIntegration: false,
      allowPublicLeadApi: true,
    },
  ])

  assert.equal(access.allowAvitoIntegration, true)
  assert.equal(access.allowVkIntegration, false)
  assert.equal(access.allowPublicLeadApi, true)
})

test('getUserTariffAccess allows Avito and VK integrations during active trial', () => {
  const user = {
    tariffId: 'free',
    trialEndsAt: new Date(Date.now() + 60_000).toISOString(),
  }
  const access = getUserTariffAccess(user, [
    {
      _id: 'free',
      allowAvitoIntegration: false,
      allowVkIntegration: false,
      allowPublicLeadApi: false,
    },
  ])

  assert.equal(access.allowAvitoIntegration, true)
  assert.equal(access.allowVkIntegration, true)
  assert.equal(access.allowPublicLeadApi, false)
})
