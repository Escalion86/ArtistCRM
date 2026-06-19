import test from 'node:test'
import assert from 'node:assert/strict'

import {
  getOptionalRelationUpdateValue,
  normalizeOptionalRelationId,
} from './transactionsCore.js'

test('normalizeOptionalRelationId returns null for empty relation values', () => {
  assert.equal(normalizeOptionalRelationId(null), null)
  assert.equal(normalizeOptionalRelationId(undefined), null)
  assert.equal(normalizeOptionalRelationId(''), null)
  assert.equal(normalizeOptionalRelationId('   '), null)
})

test('normalizeOptionalRelationId trims non-empty relation ids', () => {
  assert.equal(
    normalizeOptionalRelationId(' 507f1f77bcf86cd799439011 '),
    '507f1f77bcf86cd799439011'
  )
})

test('getOptionalRelationUpdateValue clears relation when field is explicitly empty', () => {
  assert.equal(
    getOptionalRelationUpdateValue({
      body: { eventId: '' },
      existing: { eventId: '507f1f77bcf86cd799439011' },
      field: 'eventId',
    }),
    null
  )
})

test('getOptionalRelationUpdateValue keeps existing relation when field is absent', () => {
  assert.equal(
    getOptionalRelationUpdateValue({
      body: {},
      existing: { eventId: '507f1f77bcf86cd799439011' },
      field: 'eventId',
    }),
    '507f1f77bcf86cd799439011'
  )
})
