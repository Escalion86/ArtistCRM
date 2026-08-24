import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getMongoTopologyType,
  supportsMongoTransactions,
} from './mongoCapabilities.js'

const connection = (type) => ({
  getClient: () => ({ topology: { description: { type } } }),
})

test('standalone MongoDB does not support transactions', () => {
  assert.equal(getMongoTopologyType(connection('Single')), 'Single')
  assert.equal(supportsMongoTransactions(connection('Single')), false)
})

test('replica sets and sharded clusters support transactions', () => {
  assert.equal(
    supportsMongoTransactions(connection('ReplicaSetWithPrimary')),
    true
  )
  assert.equal(supportsMongoTransactions(connection('Sharded')), true)
  assert.equal(supportsMongoTransactions(connection('LoadBalanced')), true)
})

test('unknown topology safely falls back without transactions', () => {
  assert.equal(getMongoTopologyType(null), '')
  assert.equal(supportsMongoTransactions(null), false)
})

