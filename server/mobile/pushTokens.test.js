import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildStalePushTokenFilter,
  buildPushTokenDeactivationFilter,
  normalizePushDeviceId,
  persistDevicePushToken,
} from './pushTokens.js'

test('push token rotation деактивирует только старые токены устройства в tenant', () => {
  assert.deepEqual(
    buildStalePushTokenFilter({
      tenantId: 'tenant-a',
      deviceId: ' android-device ',
      pushToken: 'ExpoPushToken[new]',
    }),
    {
      tenantId: 'tenant-a',
      deviceId: 'android-device',
      isActive: true,
      pushToken: { $ne: 'ExpoPushToken[new]' },
    }
  )
})

test('явная отписка ограничивается tenant, token и текущим устройством', () => {
  assert.deepEqual(
    buildPushTokenDeactivationFilter({
      tenantId: 'tenant-a',
      pushToken: 'ExpoPushToken[current]',
      deviceId: ' device-a ',
    }),
    {
      tenantId: 'tenant-a',
      pushToken: 'ExpoPushToken[current]',
      deviceId: 'device-a',
    }
  )
  assert.equal(
    buildPushTokenDeactivationFilter({
      tenantId: '',
      pushToken: 'ExpoPushToken[current]',
      deviceId: 'device-a',
    }),
    null
  )
})

test('push token cleanup запрещён без tenant или device id', () => {
  assert.equal(
    buildStalePushTokenFilter({
      tenantId: '',
      deviceId: 'device',
      pushToken: 'ExpoPushToken[new]',
    }),
    null
  )
  assert.equal(
    buildStalePushTokenFilter({
      tenantId: 'tenant-a',
      deviceId: '   ',
      pushToken: 'ExpoPushToken[new]',
    }),
    null
  )
  assert.equal(normalizePushDeviceId(` ${'x'.repeat(220)} `).length, 200)
})

test('новый token активируется до tenant/device-scoped очистки старых', async () => {
  const calls = []
  const saved = { _id: 'token-new' }
  const model = {
    findOneAndUpdate: async (...args) => {
      calls.push(['save', ...args])
      return saved
    },
    updateMany: async (...args) => {
      calls.push(['cleanup', ...args])
      return { modifiedCount: 1 }
    },
  }

  assert.equal(
    await persistDevicePushToken({
      model,
      tenantId: 'tenant-a',
      pushToken: 'ExpoPushToken[new]',
      deviceId: 'device-a',
      platform: 'android',
      appVersion: '1.0.0',
    }),
    saved
  )
  assert.equal(calls[0][0], 'save')
  assert.deepEqual(calls[0][1], {
    tenantId: 'tenant-a',
    pushToken: 'ExpoPushToken[new]',
  })
  assert.equal(calls[1][0], 'cleanup')
  assert.deepEqual(calls[1][1], {
    tenantId: 'tenant-a',
    deviceId: 'device-a',
    isActive: true,
    pushToken: { $ne: 'ExpoPushToken[new]' },
  })
})
