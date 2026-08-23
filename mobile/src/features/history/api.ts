import { api } from '../../shared/api/client'
import { listCachedEntities, upsertEntities } from '../../shared/storage/cache'
import type { HistoryFilters, HistoryItem } from './types'
import { filterHistoryItems } from './filter'

type HistoryResponse = {
  success: true
  data: HistoryItem[]
  meta: { hasMore: boolean; nextCursor?: string | null }
}

const buildPath = (filters: HistoryFilters, cursor?: string | null) => {
  const search = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    if (value) search.set(key, value)
  })
  if (cursor) search.set('cursor', cursor)
  search.set('limit', '30')
  return `/histories?${search.toString()}`
}

export const loadHistoryPage = async (filters: HistoryFilters, cursor?: string | null) => {
  const response = await api.get<HistoryResponse>(buildPath(filters, cursor))
  await upsertEntities(
    'activityHistory',
    response.data.map((item) => ({
      ...item,
      _id: item.id,
      updatedAt: item.occurredAt,
    }))
  )
  return response
}

export const loadCachedHistory = async (filters: HistoryFilters) => {
  const items = await listCachedEntities<HistoryItem & { _id: string }>('activityHistory')
  return filterHistoryItems(items, filters)
}
