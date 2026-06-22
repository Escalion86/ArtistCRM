import test from 'node:test'
import assert from 'node:assert/strict'

import { canRunPushReminderCron } from './cronAccess.js'

const buildRequest = ({ token = '', headerToken = '', bearerToken = '' } = {}) =>
  ({
    url: `https://artistcrm.ru/api/push/reminders/additional-events${
      token ? `?token=${encodeURIComponent(token)}` : ''
    }`,
    headers: {
      get: (name) => {
        const lower = String(name).toLowerCase()
        if (lower === 'x-cron-secret') return headerToken
        if (lower === 'authorization') {
          return bearerToken ? `Bearer ${bearerToken}` : ''
        }
        return ''
      },
    },
  })  

test('allows push reminder cron with dedicated secret', () => {
  const access = canRunPushReminderCron(
    buildRequest({ token: 'push-secret' }),
    {
      PUSH_REMINDERS_CRON_SECRET: 'push-secret',
      CRON_SECRET: 'common-secret',
    }
  )

  assert.equal(access.ok, true)
})

test('allows push reminder cron with common secret when dedicated secret exists', () => {
  const access = canRunPushReminderCron(
    buildRequest({ token: 'common-secret' }),
    {
      PUSH_REMINDERS_CRON_SECRET: 'push-secret',
      CRON_SECRET: 'common-secret',
    }
  )

  assert.equal(access.ok, true)
})

test('allows push reminder cron with bearer secret', () => {
  const access = canRunPushReminderCron(
    buildRequest({ bearerToken: 'common-secret' }),
    {
      CRON_SECRET: 'common-secret',
    }
  )

  assert.equal(access.ok, true)
})

test('rejects push reminder cron with unknown token', () => {
  const access = canRunPushReminderCron(
    buildRequest({ token: 'wrong' }),
    {
      PUSH_REMINDERS_CRON_SECRET: 'push-secret',
      CRON_SECRET: 'common-secret',
    }
  )

  assert.equal(access.ok, false)
})
