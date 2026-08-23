'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { apiJson } from '@helpers/apiClient'
import { queryKeys } from '@helpers/queryKeys'

const buildUrl = (filters, cursor) => {
  const search = new URLSearchParams()
  Object.entries(filters || {}).forEach(([key, value]) => {
    if (value) search.set(key, String(value))
  })
  if (cursor) search.set('cursor', cursor)
  search.set('limit', String(filters?.limit || 30))
  return `/api/histories?${search.toString()}`
}

export const useHistoriesQuery = (filters = {}, options = {}) =>
  useInfiniteQuery({
    queryKey: queryKeys.histories(filters),
    queryFn: ({ pageParam }) => apiJson(buildUrl(filters, pageParam)),
    initialPageParam: null,
    getNextPageParam: (lastPage) =>
      lastPage?.meta?.hasMore ? lastPage.meta.nextCursor : undefined,
    staleTime: 0,
    refetchOnMount: 'always',
    ...options,
  })
