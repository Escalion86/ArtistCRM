import test from 'node:test'
import assert from 'node:assert/strict'

import { recommendClientMergeTargetId } from './clientMergeDirection.js'

test('recommends keeping the selected client when it has more linked events', () => {
  assert.equal(
    recommendClientMergeTargetId({
      currentClientId: 'current',
      selectedClientId: 'selected',
      currentPreview: { events: 0 },
      selectedPreview: { events: 2 },
    }),
    'selected'
  )
})

test('recommends keeping the current client when it has linked events', () => {
  assert.equal(
    recommendClientMergeTargetId({
      currentClientId: 'current',
      selectedClientId: 'selected',
      currentPreview: { events: 3 },
      selectedPreview: { events: 0 },
    }),
    'current'
  )
})

test('keeps the current client by default when event counts are equal', () => {
  assert.equal(
    recommendClientMergeTargetId({
      currentClientId: 'current',
      selectedClientId: 'selected',
      currentPreview: { events: 1 },
      selectedPreview: { events: 1 },
    }),
    'current'
  )
})
