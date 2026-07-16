jest.mock('expo-background-task', () => ({
  BackgroundTaskStatus: { Available: 'available', Restricted: 'restricted' },
  BackgroundTaskResult: { Success: 'success', Failed: 'failed' },
  getStatusAsync: jest.fn(),
  registerTaskAsync: jest.fn(),
  unregisterTaskAsync: jest.fn(),
}))

jest.mock('expo-task-manager', () => ({
  isTaskDefined: jest.fn(() => false),
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn(),
}))

jest.mock('../auth/tokenStore', () => ({ getAuthSession: jest.fn() }))
jest.mock('./syncEngine', () => ({ runSync: jest.fn() }))

import * as BackgroundTask from 'expo-background-task'
import * as TaskManager from 'expo-task-manager'
import { getAuthSession } from '../auth/tokenStore'
import { runSync } from './syncEngine'
import {
  getBackgroundSyncInfo,
  registerBackgroundSync,
  unregisterBackgroundSync,
} from './backgroundSync'

const background = BackgroundTask as jest.Mocked<typeof BackgroundTask>
const tasks = TaskManager as jest.Mocked<typeof TaskManager>
const getSession = getAuthSession as jest.MockedFunction<typeof getAuthSession>
const sync = runSync as jest.MockedFunction<typeof runSync>
const backgroundExecutor = (tasks.defineTask as jest.Mock).mock.calls[0][1]

describe('backgroundSync', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('регистрирует доступную задачу с интервалом 15 минут', async () => {
    background.getStatusAsync.mockResolvedValue(
      BackgroundTask.BackgroundTaskStatus.Available
    )
    tasks.isTaskRegisteredAsync.mockResolvedValue(false)

    await expect(registerBackgroundSync()).resolves.toBe(true)
    expect(background.registerTaskAsync).toHaveBeenCalledWith(
      'artistcrm-background-sync',
      { minimumInterval: 15 }
    )
  })

  it('снимает только зарегистрированную задачу после logout', async () => {
    tasks.isTaskRegisteredAsync.mockResolvedValue(true)

    await expect(unregisterBackgroundSync()).resolves.toBe(true)
    expect(background.unregisterTaskAsync).toHaveBeenCalledWith(
      'artistcrm-background-sync'
    )
  })

  it('не запускает синхронизацию без сохранённой сессии', async () => {
    getSession.mockResolvedValue(null)

    await expect(backgroundExecutor()).resolves.toBe(
      BackgroundTask.BackgroundTaskResult.Success
    )
    expect(sync).not.toHaveBeenCalled()
  })

  it('возвращает безопасный пользовательский статус фоновой работы', async () => {
    background.getStatusAsync.mockResolvedValue(
      BackgroundTask.BackgroundTaskStatus.Restricted
    )
    tasks.isTaskRegisteredAsync.mockResolvedValue(false)

    await expect(getBackgroundSyncInfo()).resolves.toEqual({
      available: false,
      registered: false,
    })
  })
})
