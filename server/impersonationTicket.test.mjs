import assert from 'node:assert/strict'
import test from 'node:test'
import {
  createImpersonationTicket,
  verifyImpersonationTicket,
} from './impersonationTicket.js'

const secret = 'test-secret'

test('пропуск подмены содержит только ожидаемые идентификаторы и действие', () => {
  const ticket = createImpersonationTicket(
    {
      action: 'start',
      originalUserId: 'developer-id',
      targetUserId: 'user-id',
    },
    secret
  )

  const payload = verifyImpersonationTicket(ticket, secret)
  assert.equal(payload?.action, 'start')
  assert.equal(payload?.originalUserId, 'developer-id')
  assert.equal(payload?.targetUserId, 'user-id')
})

test('изменённый или просроченный пропуск отклоняется', () => {
  const ticket = createImpersonationTicket(
    {
      action: 'restore',
      originalUserId: 'developer-id',
      targetUserId: 'developer-id',
    },
    secret,
    -1
  )

  assert.equal(verifyImpersonationTicket(ticket, secret), null)
  assert.equal(verifyImpersonationTicket(`${ticket}changed`, secret), null)
  assert.equal(verifyImpersonationTicket(ticket, 'another-secret'), null)
})
