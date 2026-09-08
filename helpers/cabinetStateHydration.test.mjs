import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildEventsQueryPayload,
  resolveCabinetEventsScope,
} from './cabinetStateHydration.mjs'

test('cabinet hydration resolves event scope from paging first', () => {
  assert.equal(
    resolveCabinetEventsScope({
      page: 'eventsUpcoming',
      eventsPaging: { scope: 'past' },
    }),
    'past'
  )
})

test('cabinet hydration falls back to page scope', () => {
  assert.equal(
    resolveCabinetEventsScope({ page: 'eventsUpcoming' }),
    'upcoming'
  )
  assert.equal(resolveCabinetEventsScope({ page: 'eventsPast' }), 'past')
  assert.equal(resolveCabinetEventsScope({ page: 'attention' }), 'upcoming')
  assert.equal(resolveCabinetEventsScope({ page: 'settings' }), 'all')
})

test('cabinet hydration normalizes event query payload', () => {
  assert.deepEqual(
    buildEventsQueryPayload({ events: null, eventsPaging: null }),
    { data: [], meta: {} }
  )
})
