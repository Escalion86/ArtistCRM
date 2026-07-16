import { getDatabase, getStartupRecoverySummary } from './database'
import { DATABASE_SCHEMA_VERSION } from './databaseMigrations'

type CountRow = { count?: number }
type StatusCountRow = { status?: string; count?: number }

export type LocalDatabaseDiagnostics = {
  sqlCipherActive: boolean
  schemaVersion: number
  supportedSchemaVersion: number
  cachedEntities: number
  conflicts: number
  outboxByStatus: Record<string, number>
  filesByStatus: Record<string, number>
  recoveredAtStartup: {
    outboxOperations: number
    files: number
  }
}

const toStatusCounts = (rows: StatusCountRow[]) =>
  Object.fromEntries(
    rows
      .filter((row) => typeof row.status === 'string' && row.status.length > 0)
      .map((row) => [String(row.status), Number(row.count || 0)])
  )

export const getLocalDatabaseDiagnostics =
  async (): Promise<LocalDatabaseDiagnostics> => {
    const database = await getDatabase()
    const [cipher, schema, cache, conflicts, outbox, files] = await Promise.all(
      [
        database.getFirstAsync<{ cipher_version?: string }>(
          'PRAGMA cipher_version'
        ),
        database.getFirstAsync<{ user_version?: number }>(
          'PRAGMA user_version'
        ),
        database.getFirstAsync<CountRow>(
          'SELECT COUNT(*) AS count FROM entity_cache'
        ),
        database.getFirstAsync<CountRow>(
          'SELECT COUNT(*) AS count FROM sync_conflicts'
        ),
        database.getAllAsync<StatusCountRow>(
          'SELECT status, COUNT(*) AS count FROM outbox GROUP BY status'
        ),
        database.getAllAsync<StatusCountRow>(
          'SELECT status, COUNT(*) AS count FROM file_queue GROUP BY status'
        ),
      ]
    )

    return {
      sqlCipherActive: Boolean(String(cipher?.cipher_version || '').trim()),
      schemaVersion: Number(schema?.user_version || 0),
      supportedSchemaVersion: DATABASE_SCHEMA_VERSION,
      cachedEntities: Number(cache?.count || 0),
      conflicts: Number(conflicts?.count || 0),
      outboxByStatus: toStatusCounts(outbox),
      filesByStatus: toStatusCounts(files),
      recoveredAtStartup: getStartupRecoverySummary(),
    }
  }
