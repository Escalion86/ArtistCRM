'use client'

import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@helpers/queryKeys'

export const fetchMessengerSummary = async () => {
  const response = await fetch('/api/clients/messenger-summary')
  const result = await response.json().catch(() => ({}))
  if (!response.ok || result?.success === false) {
    throw new Error(result?.error?.message || 'Не удалось загрузить чаты')
  }
  return result?.data
}

export const useMessengerSummaryQuery = (options = {}) =>
  useQuery({
    queryKey: queryKeys.messengerSummary,
    queryFn: fetchMessengerSummary,
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
    refetchIntervalInBackground: false,
    ...options,
  })
