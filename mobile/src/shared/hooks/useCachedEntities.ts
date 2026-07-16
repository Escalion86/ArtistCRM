import { useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { listCachedEntities } from '../storage/cache'
import { runSync } from '../sync/syncEngine'

export const useCachedEntities = <T extends object>(entityType: string) => {
  const queryClient = useQueryClient()
  const queryKey = ['cached-entities', entityType]
  const query = useQuery({
    queryKey,
    queryFn: () => listCachedEntities<T>(entityType),
  })

  const refresh = useCallback(async () => {
    await runSync()
    await queryClient.invalidateQueries({ queryKey })
  }, [queryClient, entityType])

  return { ...query, refresh }
}
