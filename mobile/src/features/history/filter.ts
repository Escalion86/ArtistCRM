import type { HistoryFilters, HistoryItem } from './types'

export const filterHistoryItems = <T extends HistoryItem>(
  items: T[],
  filters: HistoryFilters
) =>
  items
    .filter((item) => !filters.entityType || item.entityType === filters.entityType)
    .filter((item) => !filters.entityId || item.entityId === filters.entityId)
    .filter((item) => !filters.operation || item.operation === filters.operation)
    .filter((item) => !filters.source || item.source === filters.source)
    .filter((item) => !filters.actorId || item.actorId === filters.actorId)
    .filter((item) => {
      const search = filters.search?.trim().toLowerCase()
      return (
        !search ||
        `${item.summary} ${item.entityLabel} ${item.actorLabel || ''}`
          .toLowerCase()
          .includes(search)
      )
    })
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
    )
