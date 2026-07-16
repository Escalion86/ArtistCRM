import type { SQLiteDatabase } from 'expo-sqlite'
import {
  assertSqlCipherAvailable,
  DATABASE_SCHEMA_VERSION,
  getPendingDatabaseMigrationVersions,
  runDatabaseMigrations,
} from './databaseMigrations'

const createDatabase = (userVersion: number, initialColumns: string[] = []) => {
  const columns = new Set(initialColumns)
  const statements: string[] = []
  let transactions = 0
  const database = {
    getFirstAsync: jest.fn(async () => ({ user_version: userVersion })),
    getAllAsync: jest.fn(async () =>
      Array.from(columns).map((name) => ({ name }))
    ),
    execAsync: jest.fn(async (sql: string) => {
      statements.push(sql)
      const addedColumn = sql.match(
        /ALTER TABLE file_queue ADD COLUMN (\w+)/
      )?.[1]
      if (addedColumn) columns.add(addedColumn)
    }),
    withTransactionAsync: jest.fn(async (callback: () => Promise<void>) => {
      transactions += 1
      await callback()
    }),
  } as unknown as SQLiteDatabase
  return {
    database,
    statements,
    get transactions() {
      return transactions
    },
  }
}

describe('database migrations', () => {
  it('планирует только отсутствующие версии и отклоняет более новую базу', () => {
    expect(getPendingDatabaseMigrationVersions(0)).toEqual([1, 2, 3])
    expect(getPendingDatabaseMigrationVersions(1)).toEqual([2, 3])
    expect(getPendingDatabaseMigrationVersions(2)).toEqual([3])
    expect(getPendingDatabaseMigrationVersions(3)).toEqual([])
    expect(() => getPendingDatabaseMigrationVersions(4)).toThrow(
      'новее приложения'
    )
    expect(() => getPendingDatabaseMigrationVersions(-1)).toThrow(
      'Некорректная'
    )
  })

  it('выполняет каждую версию в отдельной транзакции и фиксирует user_version последним', async () => {
    const context = createDatabase(0)
    await expect(runDatabaseMigrations(context.database)).resolves.toBe(
      DATABASE_SCHEMA_VERSION
    )
    expect(context.transactions).toBe(3)
    expect(context.statements).toEqual(
      expect.arrayContaining([
        expect.stringContaining('CREATE TABLE IF NOT EXISTS outbox'),
        'PRAGMA user_version = 1;',
        'PRAGMA user_version = 2;',
        expect.stringContaining('CREATE TABLE IF NOT EXISTS sync_state'),
        'PRAGMA user_version = 3;',
      ])
    )
    expect(context.statements.at(-1)).toBe('PRAGMA user_version = 3;')
  })

  it('legacy-база версии 1 получает только недостающие file_queue колонки', async () => {
    const context = createDatabase(1, ['display_name', 'entity_type'])
    await runDatabaseMigrations(context.database)
    expect(context.transactions).toBe(2)
    expect(
      context.statements.some((sql) => sql.includes('ADD COLUMN display_name'))
    ).toBe(false)
    expect(
      context.statements.some((sql) => sql.includes('ADD COLUMN entity_type'))
    ).toBe(false)
    expect(
      context.statements.some((sql) => sql.includes('ADD COLUMN next_retry_at'))
    ).toBe(true)
    expect(context.statements.at(-1)).toBe('PRAGMA user_version = 3;')
  })

  it('база версии 2 получает только состояние sync-run', async () => {
    const context = createDatabase(2)
    await runDatabaseMigrations(context.database)
    expect(context.transactions).toBe(1)
    expect(context.statements).toEqual([
      expect.stringContaining('CREATE TABLE IF NOT EXISTS sync_state'),
      'PRAGMA user_version = 3;',
    ])
  })

  it('останавливает запуск, если нативная сборка не содержит SQLCipher', () => {
    expect(() => assertSqlCipherAvailable('4.6.1 community')).not.toThrow()
    expect(() => assertSqlCipherAvailable('')).toThrow('SQLCipher недоступен')
  })
})
