import test from 'node:test'
import assert from 'node:assert/strict'

import { getUserTariffAccess } from './tariffAccess.js'

test('getUserTariffAccess exposes Avito and VK integration flags from tariff', () => {
  const user = { tariffId: 'paid' }
  const access = getUserTariffAccess(user, [
    {
      _id: 'paid',
      allowAvitoIntegration: true,
      allowVkIntegration: false,
    },
  ])

  assert.equal(access.allowAvitoIntegration, true)
  assert.equal(access.allowVkIntegration, false)
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
    },
  ])

  assert.equal(access.allowAvitoIntegration, true)
  assert.equal(access.allowVkIntegration, true)
})
