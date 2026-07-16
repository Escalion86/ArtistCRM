import test from 'node:test'
import assert from 'node:assert/strict'
import {
  findMobileSessionByRefreshHash,
  normalizeMobileDevice,
} from './sessionStore.js'

test('normalizeMobileDevice ограничивает длину и не принимает произвольные поля', () => {
  assert.deepEqual(normalizeMobileDevice({
    deviceId: 'x'.repeat(250),
    deviceName: 'Pixel',
    platform: 'android',
    appVersion: '1.0.0',
    secret: 'не должно сохраниться',
  }), {
    deviceId: 'x'.repeat(200),
    deviceName: 'Pixel',
    platform: 'android',
    appVersion: '1.0.0',
  })
})

test('logout lookup использует только hash refresh-токена и безопасную выборку', async () => {
  const calls = []
  const record = { tenantId: 'tenant-a', deviceId: 'device-a' }
  const model = {
    findOne: (query) => {
      calls.push(['findOne', query])
      return {
        select: (fields) => {
          calls.push(['select', fields])
          return { lean: async () => record }
        },
      }
    },
  }

  assert.equal(
    await findMobileSessionByRefreshHash({
      model,
      refreshTokenHash: 'refresh-hash',
    }),
    record
  )
  assert.deepEqual(calls, [
    ['findOne', { refreshTokenHash: 'refresh-hash' }],
    ['select', 'userId tenantId deviceId revokedAt expiresAt'],
  ])
  assert.equal(
    findMobileSessionByRefreshHash({ model, refreshTokenHash: '' }),
    null
  )
})
