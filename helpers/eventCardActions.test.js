import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldShowAdditionalEventsAction } from './eventCardActions.js'

test('shows additional events action for active event card', () => {
  const result = shouldShowAdditionalEventsAction({
    typeOfItem: 'event',
    status: 'active',
  })

  assert.equal(result, true)
})

test('hides additional events action for closed event card', () => {
  const result = shouldShowAdditionalEventsAction({
    typeOfItem: 'event',
    status: 'closed',
  })

  assert.equal(result, false)
})

test('hides additional events action for non-event card', () => {
  const result = shouldShowAdditionalEventsAction({
    typeOfItem: 'client',
    status: 'active',
  })

  assert.equal(result, false)
})
