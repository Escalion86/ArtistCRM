import type { SQLiteDatabase } from 'expo-sqlite'
import { getDatabase } from '../storage/database'
import {
  classifySyncError,
  getSyncQueueCounts,
  getSyncRunState,
  markSyncCompleted,
  markSyncFailed,
  markSyncOffline,
  markSyncPending,
  markSyncStarted,
  subscribeSyncRunState,
} from './syncState'

jest.mock('../storage/database', () => ({
  getDatabase: jest.fn(),
}))

const mockedGetDatabase = jest.mocked(getDatabase)

const createDatabase = () =>
  ({
    getFirstAsync: jest.fn(async () => null),
    runAsync: jest.fn(async () => ({ changes: 1, lastInsertRowId: 0 })),
  }) as unknown as SQLiteDatabase

describe('persistent sync state', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('возвращает never для новой базы', async () => {
    const database = createDatabase()
    mockedGetDatabase.mockResolvedValue(database)

    await expect(getSyncRunState()).resolves.toEqual(
      expect.objectContaining({
        status: 'never',
        issueCount: 0,
        consecutiveFailures: 0,
      })
    )
  })

  it('фиксирует started/offline/completed без сырого текста ошибки', async () => {
    const database = createDatabase()
    mockedGetDatabase.mockResolvedValue(database)

    await markSyncStarted()
    await markSyncPending()
    await markSyncOffline()
    await markSyncCompleted()
    await markSyncFailed('server')

    const calls = jest.mocked(database.runAsync).mock.calls
    expect(String(calls[0]?.[0])).toContain("'syncing'")
    expect(String(calls[1]?.[0])).toContain("'pending'")
    expect(String(calls[1]?.[0])).toContain("status = 'syncing'")
    expect(String(calls[2]?.[0])).toContain("status = 'offline'")
    expect(String(calls[3]?.[0])).toContain("THEN 'attention'")
    expect(String(calls[3]?.[0])).toContain("THEN 'pending'")
    expect(String(calls[3]?.[0])).toContain("ELSE 'success'")
    expect(String(calls[4]?.[0])).toContain("status = 'failed'")
    expect(calls[4]).toContain('server')
    expect(JSON.stringify(calls)).not.toContain('stack trace')
  })

  it('считает failed/conflict операции и failed-файлы', async () => {
    const database = createDatabase()
    jest
      .mocked(database.getFirstAsync)
      .mockResolvedValueOnce({ issues: 3, pending: 4 })
      .mockResolvedValueOnce({ issues: 2, pending: 1 })
    mockedGetDatabase.mockResolvedValue(database)

    await expect(getSyncQueueCounts()).resolves.toEqual({
      issueCount: 5,
      pendingCount: 5,
    })
  })

  it('оповещает активный UI после записи', async () => {
    const database = createDatabase()
    jest.mocked(database.getFirstAsync).mockResolvedValue({
      status: 'syncing',
      last_attempt_at: '2026-07-15T10:00:00.000Z',
      issue_count: 0,
      consecutive_failures: 0,
    })
    mockedGetDatabase.mockResolvedValue(database)
    const listener = jest.fn()
    const unsubscribe = subscribeSyncRunState(listener)

    await markSyncStarted()
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'syncing' })
    )
    unsubscribe()
  })

  it('классифицирует ошибку без сохранения message', () => {
    expect(classifySyncError({ status: 401 })).toBe('auth')
    expect(classifySyncError({ status: 429 })).toBe('rate_limit')
    expect(classifySyncError({ status: 503 })).toBe('server')
    expect(classifySyncError(new Error('Network request failed'))).toBe(
      'network'
    )
    expect(classifySyncError(new Error('secret stack trace'))).toBe('unknown')
  })
})
