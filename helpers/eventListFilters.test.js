import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createEventListFiltersState,
  getEventListFiltersStorageKey,
  getStatusFilterDefaults,
  readEventListFiltersState,
  serializeEventListFiltersState,
} from './eventListFilters.js'

test('enables transferred status by default on upcoming and past event pages', () => {
  assert.equal(getStatusFilterDefaults('upcoming').transferred, true)
  assert.equal(getStatusFilterDefaults('past').transferred, true)
})

test('restores persisted event list filters for the current page mode', () => {
  const storage = new Map()
  const key = getEventListFiltersStorageKey('past')
  storage.set(
    key,
    serializeEventListFiltersState('past', {
      selectedTown: 'Красноярск',
      checkFilter: { checked: false, unchecked: true },
      statusFilter: {
        finished: false,
        closed: true,
        transferred: false,
        canceled: true,
      },
    })
  )

  assert.deepEqual(
    readEventListFiltersState('past', {
      getItem: (name) => storage.get(name) ?? null,
    }),
    {
      selectedTown: 'Красноярск',
      checkFilter: { checked: false, unchecked: true },
      statusFilter: {
        finished: false,
        closed: true,
        transferred: false,
        canceled: true,
      },
    }
  )
})

test('falls back to defaults when persisted event filters are invalid', () => {
  const storage = {
    getItem: () =>
      JSON.stringify({
        version: 1,
        selectedTown: 100,
        checkFilter: { checked: false, unchecked: false },
        statusFilter: {
          finished: false,
          closed: false,
          transferred: false,
          canceled: false,
        },
      }),
  }

  assert.deepEqual(readEventListFiltersState('past', storage), {
    selectedTown: '',
    checkFilter: { checked: true, unchecked: true },
    statusFilter: getStatusFilterDefaults('past'),
  })
})

test('creates default event list filters when storage is unavailable', () => {
  assert.deepEqual(createEventListFiltersState('upcoming'), {
    selectedTown: '',
    checkFilter: { checked: true, unchecked: true },
    statusFilter: getStatusFilterDefaults('upcoming'),
  })
})
