import test from 'node:test'
import assert from 'node:assert/strict'

process.env.NEXTAUTH_SECRET = 'mobile-token-test-secret'

const {
  createMobileAccessToken,
  createRefreshToken,
  hashRefreshToken,
  verifyMobileAccessToken,
} = await import('./tokens.js')

test('mobile access token roundtrip keeps tenant and session claims', () => {
  const { token, expiresIn } = createMobileAccessToken({
    user: { _id: 'user-1', role: 'user' },
    tenantId: 'tenant-1',
    sessionId: 'session-1',
  })
  const payload = verifyMobileAccessToken(token)
  assert.equal(payload.sub, 'user-1')
  assert.equal(payload.tenantId, 'tenant-1')
  assert.equal(payload.sid, 'session-1')
  assert.equal(expiresIn, 15 * 60)
})

test('mobile access token rejects a modified signature', () => {
  const { token } = createMobileAccessToken({
    user: { _id: 'user-1', role: 'user' },
    tenantId: 'tenant-1',
    sessionId: 'session-1',
  })
  assert.equal(verifyMobileAccessToken(`${token}broken`), null)
})

test('refresh tokens are random and stored as hashes', () => {
  const first = createRefreshToken()
  const second = createRefreshToken()
  assert.notEqual(first, second)
  assert.notEqual(hashRefreshToken(first), first)
  assert.equal(hashRefreshToken(first), hashRefreshToken(first))
})
