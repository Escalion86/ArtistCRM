import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PUBLIC_LEAD_RAW_LIMITS,
  buildPublicLeadAddress,
  buildPublicLeadInitialContactEvent,
  sanitizeRawPayload,
} from './publicLeadPayload.mjs'

test('public lead creates immediate contact event', () => {
  const requestCreatedAt = new Date('2026-08-19T08:15:30.000Z')
  const event = buildPublicLeadInitialContactEvent(requestCreatedAt)

  assert.equal(event.title, 'Связаться с клиентом')
  assert.equal(event.date, requestCreatedAt)
  assert.equal(event.done, false)
})

test('public lead does not use description as a missing address', () => {
  assert.deepEqual(buildPublicLeadAddress({ town: '', address: '' }), {
    town: '',
    street: '',
    house: '',
    entrance: '',
    floor: '',
    flat: '',
    comment: '',
    latitude: '',
    longitude: '',
    link2Gis: '',
    linkYandexNavigator: '',
    link2GisShow: true,
    linkYandexShow: true,
  })
})

test('public lead raw payload removes secrets and unsafe Mongo keys', () => {
  assert.deepEqual(
    sanitizeRawPayload({
      name: 'Иван',
      apiKey: 'secret-api-key',
      authorization: 'Bearer secret',
      $set: { tenantId: 'other-tenant' },
      'nested.value': 'unsafe path',
      nested: { message: 'Заявка' },
    }),
    {
      name: 'Иван',
      nested: { message: 'Заявка' },
    }
  )
})

test('public lead raw payload stays within the global character budget', () => {
  const result = sanitizeRawPayload({
    first: 'a'.repeat(50_000),
    second: 'b'.repeat(50_000),
    list: Array.from({ length: 100 }, () => 'c'.repeat(1000)),
  })

  assert.ok(JSON.stringify(result).length < 34_000)
  assert.equal(result.first.length, PUBLIC_LEAD_RAW_LIMITS.maxStringLength)
  assert.ok(result.list.length <= PUBLIC_LEAD_RAW_LIMITS.maxArrayItems)
})

test('public lead raw payload limits depth and object width', () => {
  const wide = Object.fromEntries(
    Array.from({ length: 100 }, (_, index) => [`field${index}`, index])
  )
  const result = sanitizeRawPayload({
    wide,
    deep: { one: { two: { three: { four: { five: 'hidden' } } } } },
  })

  assert.equal(
    Object.keys(result.wide).length,
    PUBLIC_LEAD_RAW_LIMITS.maxObjectKeys
  )
  assert.equal(result.deep.one.two.three.four, null)
})
