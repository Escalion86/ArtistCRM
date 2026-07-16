import type { SQLiteDatabase } from 'expo-sqlite'
import { getDatabase } from './database'
import { markSyncPending } from '../sync/syncState'
import { listFileQueueDisplayItems, retryFileQueueNow } from './encryptedFiles'
import {
  enqueueOperation,
  listOutboxDisplayItems,
  retryOutboxOperationNow,
} from './outbox'

jest.mock('./database', () => ({
  getDatabase: jest.fn(),
}))
jest.mock('../api/client', () => ({ api: {} }))
jest.mock('../sync/syncState', () => ({
  markSyncPending: jest.fn(async () => undefined),
  refreshSyncStateFromQueue: jest.fn(async () => undefined),
}))
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'new-operation'),
}))

const mockedGetDatabase = jest.mocked(getDatabase)

describe('sync queue storage projection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('помечает sync-state как pending сразу после записи новой операции', async () => {
    const database = {
      runAsync: jest.fn(async () => ({ changes: 1, lastInsertRowId: 0 })),
    } as unknown as SQLiteDatabase
    mockedGetDatabase.mockResolvedValue(database)

    await expect(
      enqueueOperation({
        entityType: 'clients',
        entityId: 'client-1',
        method: 'update',
        payload: { firstName: 'Иван' },
      })
    ).resolves.toBe('new-operation')
    expect(database.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO outbox'),
      'new-operation',
      'clients',
      'client-1',
      'update',
      JSON.stringify({ firstName: 'Иван' }),
      null,
      null,
      '[]',
      expect.any(String),
      expect.any(String)
    )
    expect(markSyncPending).toHaveBeenCalledTimes(1)
  })

  it('не читает payload из outbox и повторяет только выбранную failed-операцию', async () => {
    const database = {
      getAllAsync: jest.fn(async () => [
        {
          operation_id: 'operation-1',
          entity_type: 'clients',
          entity_id: 'client-1',
          method: 'update',
          status: 'failed',
          attempts: 3,
          next_retry_at: '2026-07-15T10:00:00.000Z',
          last_error: 'Network request failed',
          updated_at: '2026-07-15T09:00:00.000Z',
        },
      ]),
      runAsync: jest.fn(async () => ({ changes: 1, lastInsertRowId: 0 })),
    } as unknown as SQLiteDatabase
    mockedGetDatabase.mockResolvedValue(database)

    await expect(listOutboxDisplayItems()).resolves.toEqual([
      expect.objectContaining({
        operationId: 'operation-1',
        entityType: 'clients',
        status: 'failed',
        attempts: 3,
      }),
    ])
    const selectSql = String(
      jest.mocked(database.getAllAsync).mock.calls[0]?.[0]
    )
    expect(selectSql).not.toMatch(/\bpayload\b/i)
    expect(selectSql).not.toMatch(/\bbase_values\b/i)
    expect(selectSql).not.toMatch(/\battachments\b/i)

    await expect(retryOutboxOperationNow('operation-1')).resolves.toBe(true)
    const retryCall = jest.mocked(database.runAsync).mock.calls[0]
    expect(String(retryCall?.[0])).toContain("status = 'failed'")
    expect(retryCall?.at(-1)).toBe('operation-1')
    expect(markSyncPending).toHaveBeenCalledTimes(1)
  })

  it('не читает локальный URI файла и сбрасывает retry строго по file id', async () => {
    const database = {
      getAllAsync: jest.fn(async () => [
        {
          id: 'file-1',
          display_name: 'Договор.docx',
          status: 'failed',
          attempts: 8,
          last_error: 'Отправка прервана',
          entity_type: 'events',
          entity_id: 'event-1',
          updated_at: '2026-07-15T09:00:00.000Z',
        },
      ]),
      runAsync: jest.fn(async () => ({ changes: 1, lastInsertRowId: 0 })),
    } as unknown as SQLiteDatabase
    mockedGetDatabase.mockResolvedValue(database)

    await expect(listFileQueueDisplayItems()).resolves.toEqual([
      expect.objectContaining({
        id: 'file-1',
        name: 'Договор.docx',
        status: 'failed',
        entityType: 'events',
      }),
    ])
    const selectSql = String(
      jest.mocked(database.getAllAsync).mock.calls[0]?.[0]
    )
    expect(selectSql).not.toMatch(/\blocal_uri\b/i)
    expect(selectSql).not.toMatch(/\bremote_path\b/i)

    await expect(retryFileQueueNow({ id: 'file-1' })).resolves.toBe(1)
    const retryCall = jest.mocked(database.runAsync).mock.calls[0]
    expect(String(retryCall?.[0])).toContain('id = ?')
    expect(retryCall?.at(-1)).toBe('file-1')
    expect(markSyncPending).toHaveBeenCalledTimes(1)
  })
})
