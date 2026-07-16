import test from 'node:test'
import assert from 'node:assert/strict'
import {
  advanceSyncPosition,
  buildSyncPageQuery,
  encodeSyncCursor,
  parseSyncCursor,
  SYNC_STREAMS,
} from './syncCursor.js'

test('legacy ISO cursor создаёт отдельную позицию для каждого потока', () => {
  const now = new Date('2026-07-15T12:00:00.000Z')
  const parsed = parseSyncCursor('2026-07-15T10:00:00.000Z', now)
  assert.equal(parsed.upperBound.toISOString(), now.toISOString())
  for (const stream of SYNC_STREAMS) {
    assert.deepEqual(parsed.positions[stream], {
      at: '2026-07-15T10:00:00.000Z', id: '',
    })
  }
})

test('opaque cursor сохраняет верхнюю границу и позиции потоков', () => {
  const upperBound = new Date('2026-07-15T12:00:00.000Z')
  const positions = Object.fromEntries(SYNC_STREAMS.map((stream) => [
    stream,
    { at: '2026-07-15T11:00:00.000Z', id: `${stream}-42` },
  ]))
  const encoded = encodeSyncCursor({ upperBound, positions })
  const parsed = parseSyncCursor(encoded, new Date('2026-07-15T13:00:00.000Z'))
  assert.equal(parsed.upperBound.toISOString(), upperBound.toISOString())
  assert.deepEqual(parsed.positions, positions)
})

test('tenant и фиксированная верхняя граница входят в page query', () => {
  const upperBound = new Date('2026-07-15T12:00:00.000Z')
  const query = buildSyncPageQuery({
    tenantId: 'tenant-a',
    position: { at: '2026-07-15T11:00:00.000Z', id: 'entity-10' },
    upperBound,
    dateField: 'updatedAt',
  })
  assert.equal(query.tenantId, 'tenant-a')
  assert.deepEqual(query.$and[0], { updatedAt: { $lte: upperBound } })
  assert.deepEqual(query.$and[1].$or[1], {
    updatedAt: new Date('2026-07-15T11:00:00.000Z'),
    _id: { $gt: 'entity-10' },
  })
})

test('позиция продвигается по дате и _id последнего реально возвращённого элемента', () => {
  assert.deepEqual(advanceSyncPosition([
    { _id: 'entity-1', updatedAt: new Date('2026-07-15T11:00:00.000Z') },
    { _id: 'entity-2', updatedAt: new Date('2026-07-15T11:00:00.000Z') },
  ], 'updatedAt', { at: '2026-07-15T10:00:00.000Z', id: '' }), {
    at: '2026-07-15T11:00:00.000Z',
    id: 'entity-2',
  })
})

test('курсор из будущего ограничивается серверным временем', () => {
  const now = new Date('2026-07-15T12:00:00.000Z')
  const parsed = parseSyncCursor('2030-01-01T00:00:00.000Z', now)
  assert.equal(parsed.positions.events.at, now.toISOString())
})
