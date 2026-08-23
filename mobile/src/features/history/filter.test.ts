import { filterHistoryItems } from './filter'
import type { HistoryItem } from './types'

const rows: HistoryItem[] = [
  {
    id: '1', entityType: 'client', entityId: 'client-1', operation: 'update',
    entityLabel: 'Анна Иванова', summary: 'Изменён клиент', changes: [],
    source: 'android', actorId: 'actor-1', actorLabel: 'Анна', occurredAt: '2026-08-23T10:00:00.000Z',
  },
  {
    id: '2', entityType: 'event', entityId: 'event-1', operation: 'create',
    entityLabel: 'Заявка: Свадьба', summary: 'Добавлена заявка', changes: [],
    source: 'web', actorId: 'actor-2', actorLabel: 'Иван', occurredAt: '2026-08-23T11:00:00.000Z',
  },
]

test('offline history filters by entity, source and search', () => {
  expect(filterHistoryItems(rows, { entityType: 'client', source: 'android', search: 'анна' }))
    .toEqual([rows[0]])
})

test('offline history is sorted newest first', () => {
  expect(filterHistoryItems(rows, {}).map((item) => item.id)).toEqual(['2', '1'])
})

test('offline history filters by actor', () => {
  expect(filterHistoryItems(rows, { actorId: 'actor-2' })).toEqual([rows[1]])
})
