import type { SQLiteDatabase } from 'expo-sqlite'

export const DATABASE_SCHEMA_VERSION = 3

type Migration = {
  version: number
  migrate: (database: SQLiteDatabase) => Promise<void>
}

const ensureColumn = async (
  database: SQLiteDatabase,
  table: string,
  column: string,
  definition: string
) => {
  const columns = await database.getAllAsync<{ name: string }>(
    `PRAGMA table_info(${table})`
  )
  if (columns.some((item) => item.name === column)) return
  await database.execAsync(
    `ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`
  )
}

const migrations: Migration[] = [
  {
    version: 1,
    migrate: async (database) => {
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS entity_cache (
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          payload TEXT NOT NULL,
          version TEXT NOT NULL DEFAULT '0',
          updated_at TEXT NOT NULL,
          deleted_at TEXT,
          PRIMARY KEY (entity_type, entity_id)
        );
        CREATE TABLE IF NOT EXISTS outbox (
          operation_id TEXT PRIMARY KEY NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          method TEXT NOT NULL,
          payload TEXT NOT NULL,
          base_version TEXT,
          base_values TEXT,
          attachments TEXT,
          status TEXT NOT NULL DEFAULT 'pending',
          attempts INTEGER NOT NULL DEFAULT 0,
          next_retry_at TEXT,
          last_error TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS outbox_status_retry_idx
          ON outbox(status, next_retry_at, created_at);
        CREATE TABLE IF NOT EXISTS sync_conflicts (
          id TEXT PRIMARY KEY NOT NULL,
          operation_id TEXT NOT NULL,
          entity_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          path TEXT NOT NULL,
          base_value TEXT,
          local_value TEXT,
          remote_value TEXT,
          remote_version TEXT,
          created_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sync_cursors (
          scope TEXT PRIMARY KEY NOT NULL,
          cursor TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS file_queue (
          id TEXT PRIMARY KEY NOT NULL,
          operation_id TEXT NOT NULL,
          local_uri TEXT NOT NULL,
          remote_path TEXT,
          mime_type TEXT,
          size INTEGER,
          status TEXT NOT NULL DEFAULT 'pending',
          attempts INTEGER NOT NULL DEFAULT 0,
          last_error TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `)
    },
  },
  {
    version: 2,
    migrate: async (database) => {
      await ensureColumn(database, 'file_queue', 'display_name', 'TEXT')
      await ensureColumn(database, 'file_queue', 'next_retry_at', 'TEXT')
      await ensureColumn(database, 'file_queue', 'entity_type', 'TEXT')
      await ensureColumn(database, 'file_queue', 'entity_id', 'TEXT')
      await ensureColumn(database, 'file_queue', 'attachment_kind', 'TEXT')
      await database.execAsync(
        'CREATE INDEX IF NOT EXISTS file_queue_entity_idx ON file_queue(entity_type, entity_id, created_at);'
      )
    },
  },
  {
    version: 3,
    migrate: async (database) => {
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS sync_state (
          scope TEXT PRIMARY KEY NOT NULL,
          status TEXT NOT NULL DEFAULT 'never',
          last_attempt_at TEXT,
          last_completed_at TEXT,
          last_success_at TEXT,
          last_failure_at TEXT,
          last_error_code TEXT,
          issue_count INTEGER NOT NULL DEFAULT 0,
          consecutive_failures INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL
        );
      `)
    },
  },
]

export const assertSqlCipherAvailable = (cipherVersion?: string | null) => {
  if (!String(cipherVersion || '').trim()) {
    throw new Error(
      'SQLCipher недоступен. Используйте EAS development или production build.'
    )
  }
}

export const getPendingDatabaseMigrationVersions = (currentVersion: number) => {
  if (!Number.isInteger(currentVersion) || currentVersion < 0) {
    throw new Error('Некорректная версия локальной базы')
  }
  if (currentVersion > DATABASE_SCHEMA_VERSION) {
    throw new Error(
      `Локальная база версии ${currentVersion} новее приложения (${DATABASE_SCHEMA_VERSION})`
    )
  }
  return migrations
    .filter((migration) => migration.version > currentVersion)
    .map((migration) => migration.version)
}

export const runDatabaseMigrations = async (database: SQLiteDatabase) => {
  const row = await database.getFirstAsync<{ user_version?: number }>(
    'PRAGMA user_version'
  )
  const currentVersion = Number(row?.user_version || 0)
  const pendingVersions = getPendingDatabaseMigrationVersions(currentVersion)

  for (const version of pendingVersions) {
    const migration = migrations.find((item) => item.version === version)
    if (!migration) throw new Error(`Не найдена миграция базы ${version}`)
    await database.withTransactionAsync(async () => {
      await migration.migrate(database)
      await database.execAsync(`PRAGMA user_version = ${version};`)
    })
  }
  return DATABASE_SCHEMA_VERSION
}
