import type { SQLiteDatabase } from 'expo-sqlite'
import { getDatabase, getStartupRecoverySummary } from './database'
import { getLocalDatabaseDiagnostics } from './databaseDiagnostics'

jest.mock('./database', () => ({
  getDatabase: jest.fn(),
  getStartupRecoverySummary: jest.fn(),
}))

const mockedGetDatabase = jest.mocked(getDatabase)
const mockedGetStartupRecoverySummary = jest.mocked(getStartupRecoverySummary)

describe('local database diagnostics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('возвращает только безопасные агрегаты базы и результат восстановления', async () => {
    const database = {
      getFirstAsync: jest.fn(async (sql: string) => {
        if (sql === 'PRAGMA cipher_version') {
          return { cipher_version: '4.6.1 community' }
        }
        if (sql === 'PRAGMA user_version') return { user_version: 3 }
        if (sql.includes('entity_cache')) return { count: 18 }
        if (sql.includes('sync_conflicts')) return { count: 3 }
        return null
      }),
      getAllAsync: jest.fn(async (sql: string) => {
        if (sql.includes('FROM outbox')) {
          return [
            { status: 'pending', count: 4 },
            { status: 'failed', count: 1 },
          ]
        }
        return [
          { status: 'pending', count: 2 },
          { status: 'synced', count: 7 },
        ]
      }),
    } as unknown as SQLiteDatabase
    mockedGetDatabase.mockResolvedValue(database)
    mockedGetStartupRecoverySummary.mockReturnValue({
      outboxOperations: 2,
      files: 1,
    })

    await expect(getLocalDatabaseDiagnostics()).resolves.toEqual({
      sqlCipherActive: true,
      schemaVersion: 3,
      supportedSchemaVersion: 3,
      cachedEntities: 18,
      conflicts: 3,
      outboxByStatus: { pending: 4, failed: 1 },
      filesByStatus: { pending: 2, synced: 7 },
      recoveredAtStartup: { outboxOperations: 2, files: 1 },
    })

    const serialized = JSON.stringify(await getLocalDatabaseDiagnostics())
    expect(serialized).not.toContain('4.6.1 community')
    expect(serialized).not.toContain('local_uri')
    expect(serialized).not.toContain('payload')
  })

  it('нормализует пустую базу без ложного статуса шифрования', async () => {
    const database = {
      getFirstAsync: jest.fn(async () => null),
      getAllAsync: jest.fn(async () => [
        { status: '', count: 10 },
        { status: 'pending', count: undefined },
      ]),
    } as unknown as SQLiteDatabase
    mockedGetDatabase.mockResolvedValue(database)
    mockedGetStartupRecoverySummary.mockReturnValue({
      outboxOperations: 0,
      files: 0,
    })

    const diagnostics = await getLocalDatabaseDiagnostics()
    expect(diagnostics.sqlCipherActive).toBe(false)
    expect(diagnostics.schemaVersion).toBe(0)
    expect(diagnostics.outboxByStatus).toEqual({ pending: 0 })
    expect(diagnostics.filesByStatus).toEqual({ pending: 0 })
  })
})
