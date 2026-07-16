import * as BackgroundTask from 'expo-background-task'
import * as TaskManager from 'expo-task-manager'
import { getAuthSession } from '../auth/tokenStore'
import { runSync } from './syncEngine'

const BACKGROUND_SYNC_TASK = 'artistcrm-background-sync'

if (!TaskManager.isTaskDefined(BACKGROUND_SYNC_TASK)) {
  TaskManager.defineTask(BACKGROUND_SYNC_TASK, async () => {
    try {
      const session = await getAuthSession()
      if (!session) return BackgroundTask.BackgroundTaskResult.Success
      await runSync()
      return BackgroundTask.BackgroundTaskResult.Success
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed
    }
  })
}

export const registerBackgroundSync = async () => {
  const status = await BackgroundTask.getStatusAsync()
  if (status !== BackgroundTask.BackgroundTaskStatus.Available) return false
  const registered =
    await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK)
  if (!registered) {
    await BackgroundTask.registerTaskAsync(BACKGROUND_SYNC_TASK, {
      minimumInterval: 15,
    })
  }
  return true
}

export const unregisterBackgroundSync = async () => {
  const registered =
    await TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK)
  if (!registered) return false
  await BackgroundTask.unregisterTaskAsync(BACKGROUND_SYNC_TASK)
  return true
}

export type BackgroundSyncInfo = {
  available: boolean
  registered: boolean
}

export const getBackgroundSyncInfo = async (): Promise<BackgroundSyncInfo> => {
  const [status, registered] = await Promise.all([
    BackgroundTask.getStatusAsync(),
    TaskManager.isTaskRegisteredAsync(BACKGROUND_SYNC_TASK),
  ])
  return {
    available: status === BackgroundTask.BackgroundTaskStatus.Available,
    registered,
  }
}
