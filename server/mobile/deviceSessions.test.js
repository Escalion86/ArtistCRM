import test from 'node:test'
import assert from 'node:assert/strict'
import { serializeMobileDeviceSession } from './deviceSessions.js'

test('mobile session serializer отдаёт только данные управления устройством', () => {
  const result = serializeMobileDeviceSession(
    {
      _id: 'session-a',
      deviceId: 'android-secret-id',
      deviceName: 'Pixel 9',
      platform: 'android',
      appVersion: '1.0.0',
      refreshTokenHash: 'secret-hash',
      tenantId: 'tenant-secret',
      lastUsedAt: '2026-07-15T10:00:00.000Z',
      createdAt: '2026-07-01T10:00:00.000Z',
      expiresAt: '2026-08-01T10:00:00.000Z',
    },
    'session-a'
  )

  assert.deepEqual(result, {
    _id: 'session-a',
    deviceName: 'Pixel 9',
    platform: 'android',
    appVersion: '1.0.0',
    lastUsedAt: '2026-07-15T10:00:00.000Z',
    createdAt: '2026-07-01T10:00:00.000Z',
    expiresAt: '2026-08-01T10:00:00.000Z',
    current: true,
  })
  assert.equal('deviceId' in result, false)
  assert.equal('refreshTokenHash' in result, false)
  assert.equal('tenantId' in result, false)
})
