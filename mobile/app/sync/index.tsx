import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useQueryClient } from '@tanstack/react-query'
import {
  formatConflictValue,
  getConflictEntityLabel,
  getConflictFieldLabel,
} from '../../src/shared/domain/conflictPresentation'
import {
  getFileStatusPresentation,
  getOutboxMethodLabel,
  getOutboxStatusPresentation,
  getQueueEntityTitle,
  getSafeSyncErrorMessage,
} from '../../src/shared/domain/syncQueuePresentation'
import { getSyncStatePresentation } from '../../src/shared/domain/syncStatePresentation'
import type {
  Client,
  Event,
  Service,
  ServiceGroup,
  Transaction,
} from '../../src/shared/domain/types'
import { listCachedEntities } from '../../src/shared/storage/cache'
import {
  getOutboxSummary,
  listOutboxDisplayItems,
  retryOutboxOperationNow,
  type OutboxDisplayItem,
} from '../../src/shared/storage/outbox'
import {
  listFileQueueDisplayItems,
  retryFileQueueNow,
  type FileQueueDisplayItem,
} from '../../src/shared/storage/encryptedFiles'
import {
  getLocalDatabaseDiagnostics,
  type LocalDatabaseDiagnostics,
} from '../../src/shared/storage/databaseDiagnostics'
import {
  listConflicts,
  resolveConflict,
  type SyncConflict,
} from '../../src/shared/storage/conflicts'
import { runSync } from '../../src/shared/sync/syncEngine'
import { useSyncRunState } from '../../src/shared/hooks/useSyncRunState'
import {
  getBackgroundSyncInfo,
  type BackgroundSyncInfo,
} from '../../src/shared/sync/backgroundSync'
import {
  Button,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Screen,
  SectionTitle,
  StatusChip,
  Surface,
} from '../../src/shared/ui/components'
import { colors, spacing } from '../../src/shared/ui/theme'

export default function SyncScreen() {
  const queryClient = useQueryClient()
  const syncRunState = useSyncRunState()
  const syncRunPresentation = getSyncStatePresentation(syncRunState)
  const [conflicts, setConflicts] = useState<SyncConflict[]>([])
  const [summary, setSummary] = useState<Record<string, number>>({})
  const [labelsById, setLabelsById] = useState<Record<string, string>>({})
  const [labelsByEntity, setLabelsByEntity] = useState<Record<string, string>>(
    {}
  )
  const [backgroundInfo, setBackgroundInfo] =
    useState<BackgroundSyncInfo | null>(null)
  const [databaseDiagnostics, setDatabaseDiagnostics] =
    useState<LocalDatabaseDiagnostics | null>(null)
  const [outboxItems, setOutboxItems] = useState<OutboxDisplayItem[]>([])
  const [fileItems, setFileItems] = useState<FileQueueDisplayItem[]>([])
  const [error, setError] = useState('')
  const [retryingId, setRetryingId] = useState('')
  const [loading, setLoading] = useState(false)
  const load = async () => {
    const [
      items,
      counts,
      clients,
      services,
      events,
      transactions,
      serviceGroups,
      background,
      diagnostics,
      queuedOperations,
      queuedFiles,
    ] = await Promise.all([
      listConflicts(),
      getOutboxSummary(),
      listCachedEntities<Client>('clients'),
      listCachedEntities<Service>('services'),
      listCachedEntities<Event>('events'),
      listCachedEntities<Transaction>('transactions'),
      listCachedEntities<ServiceGroup>('serviceGroups'),
      getBackgroundSyncInfo().catch(() => null),
      getLocalDatabaseDiagnostics().catch(() => null),
      listOutboxDisplayItems(),
      listFileQueueDisplayItems(),
    ])
    setConflicts(items)
    setSummary(counts)
    setBackgroundInfo(background)
    setDatabaseDiagnostics(diagnostics)
    setOutboxItems(queuedOperations)
    setFileItems(queuedFiles)
    setLabelsById(
      Object.fromEntries([
        ...clients.map((client) => [
          client._id,
          [client.firstName, client.secondName].filter(Boolean).join(' ') ||
            client.phone ||
            'Клиент',
        ]),
        ...services.map((service) => [service._id, service.title || 'Услуга']),
      ])
    )
    setLabelsByEntity(
      Object.fromEntries([
        ...clients.map((client) => [
          `clients:${client._id}`,
          [client.firstName, client.secondName].filter(Boolean).join(' ') ||
            client.phone ||
            'Клиент',
        ]),
        ...services.map((service) => [
          `services:${service._id}`,
          service.title || 'Услуга',
        ]),
        ...events.map((event) => [
          `events:${event._id}`,
          event.eventType || event.description || 'Мероприятие',
        ]),
        ...transactions.map((transaction) => [
          `transactions:${transaction._id}`,
          transaction.comment ||
            `${transaction.type === 'income' ? 'Доход' : 'Расход'} ${Number(transaction.amount || 0).toLocaleString('ru-RU')} ₽`,
        ]),
        ...serviceGroups.map((group) => [
          `serviceGroups:${group._id}`,
          group.title || 'Группа услуг',
        ]),
      ])
    )
  }
  useEffect(() => {
    void load().catch((reason) => {
      setError(
        getSafeSyncErrorMessage(
          reason instanceof Error ? reason.message : 'Ошибка локальной базы'
        )
      )
    })
  }, [])
  const sync = async () => {
    setLoading(true)
    setError('')
    try {
      await runSync({ fullPull: true })
      await queryClient.invalidateQueries({ queryKey: ['cached-entities'] })
      await load()
    } catch (reason) {
      setError(
        getSafeSyncErrorMessage(
          reason instanceof Error ? reason.message : 'Ошибка синхронизации'
        )
      )
    } finally {
      setLoading(false)
    }
  }
  const retryOperation = async (operationId: string) => {
    setRetryingId(`operation:${operationId}`)
    setError('')
    try {
      await retryOutboxOperationNow(operationId)
      await runSync()
      await queryClient.invalidateQueries({ queryKey: ['cached-entities'] })
      await load()
    } catch (reason) {
      setError(
        getSafeSyncErrorMessage(
          reason instanceof Error ? reason.message : 'Ошибка синхронизации'
        )
      )
      await load().catch(() => undefined)
    } finally {
      setRetryingId('')
    }
  }
  const retryFile = async (fileId: string) => {
    setRetryingId(`file:${fileId}`)
    setError('')
    try {
      await retryFileQueueNow({ id: fileId })
      await runSync()
      await load()
    } catch (reason) {
      setError(
        getSafeSyncErrorMessage(
          reason instanceof Error ? reason.message : 'Ошибка отправки файла',
          'file'
        )
      )
      await load().catch(() => undefined)
    } finally {
      setRetryingId('')
    }
  }
  const decide = async (conflict: SyncConflict, choice: 'local' | 'remote') => {
    setRetryingId(`conflict:${conflict.id}:${choice}`)
    setError('')
    try {
      await resolveConflict(conflict, choice)
      await load()
      await queryClient.invalidateQueries({
        queryKey: ['cached-entities', conflict.entityType],
      })
    } catch (reason) {
      setError(
        getSafeSyncErrorMessage(
          reason instanceof Error
            ? reason.message
            : 'Ошибка разрешения конфликта'
        )
      )
      await load().catch(() => undefined)
    } finally {
      setRetryingId('')
    }
  }
  return (
    <Screen>
      <PageHeader
        title="Синхронизация"
        subtitle="Очередь и конфликты между устройствами"
      />
      <View style={styles.summary}>
        <Count label="Ожидает" value={summary.pending || 0} />
        <Count label="Ошибки" value={summary.failed || 0} />
        <Count label="Конфликты" value={summary.conflict || 0} />
      </View>
      <Button
        testID="sync-now"
        title="Синхронизировать сейчас"
        onPress={sync}
        loading={loading}
      />
      {error ? <ErrorNotice message={error} /> : null}
      <Surface testID="sync-run-state">
        <View style={styles.backgroundRow}>
          <View style={styles.flex}>
            <Text style={styles.entity}>{syncRunPresentation.title}</Text>
            <Text style={styles.base}>{syncRunPresentation.description}</Text>
          </View>
          <StatusChip
            label={
              syncRunState?.status === 'success'
                ? 'Актуально'
                : syncRunState?.status === 'pending'
                  ? 'Ожидает отправки'
                  : syncRunState?.status === 'syncing'
                    ? 'Идёт обмен'
                    : syncRunState?.status === 'attention'
                      ? 'Нужно действие'
                      : 'Не завершено'
            }
            tone={syncRunPresentation.tone}
          />
        </View>
      </Surface>
      <Surface>
        <View style={styles.backgroundRow}>
          <View style={styles.flex}>
            <Text style={styles.entity}>Фоновая синхронизация</Text>
            <Text style={styles.base}>
              Android запускает её по возможности; точное время определяет
              система.
            </Text>
          </View>
          <StatusChip
            label={
              backgroundInfo?.registered
                ? 'Включена'
                : backgroundInfo?.available === false
                  ? 'Ограничена системой'
                  : 'Не активна'
            }
            tone={backgroundInfo?.registered ? 'success' : 'warning'}
          />
        </View>
      </Surface>
      <Surface testID="sync-database-diagnostics">
        <View style={styles.databaseHeader}>
          <View style={styles.flex}>
            <Text style={styles.entity}>Локальная база</Text>
            <Text style={styles.base}>
              Техническое состояние offline-данных без их содержимого.
            </Text>
          </View>
          <StatusChip
            label={
              databaseDiagnostics?.sqlCipherActive
                ? 'SQLCipher активен'
                : 'Нет данных'
            }
            tone={databaseDiagnostics?.sqlCipherActive ? 'success' : 'warning'}
          />
        </View>
        {databaseDiagnostics ? (
          <View style={styles.databaseDetails}>
            <Text style={styles.base}>
              Схема: v{databaseDiagnostics.schemaVersion} из v
              {databaseDiagnostics.supportedSchemaVersion} · в кэше:{' '}
              {databaseDiagnostics.cachedEntities} · конфликтов:{' '}
              {databaseDiagnostics.conflicts}
            </Text>
            <Text style={styles.base}>
              Операций в очереди:{' '}
              {(databaseDiagnostics.outboxByStatus.pending || 0) +
                (databaseDiagnostics.outboxByStatus.failed || 0) +
                (databaseDiagnostics.outboxByStatus.syncing || 0) +
                (databaseDiagnostics.outboxByStatus.conflict || 0)}{' '}
              · файлов:{' '}
              {(databaseDiagnostics.filesByStatus.pending || 0) +
                (databaseDiagnostics.filesByStatus.failed || 0) +
                (databaseDiagnostics.filesByStatus.uploading || 0)}
            </Text>
            <Text style={styles.base}>
              {databaseDiagnostics.recoveredAtStartup.outboxOperations ||
              databaseDiagnostics.recoveredAtStartup.files
                ? `После прерывания восстановлено: ${databaseDiagnostics.recoveredAtStartup.outboxOperations} операций, ${databaseDiagnostics.recoveredAtStartup.files} файлов`
                : 'Прерванных операций при запуске не найдено.'}
            </Text>
          </View>
        ) : (
          <Text style={styles.base}>
            Не удалось прочитать состояние локальной базы.
          </Text>
        )}
      </Surface>
      <SectionTitle>Очередь изменений</SectionTitle>
      {outboxItems.length || fileItems.length ? (
        <Surface testID="sync-queue-items">
          {outboxItems.map((item) => {
            const status = getOutboxStatusPresentation(item.status)
            const itemError = getSafeSyncErrorMessage(item.lastError)
            return (
              <View
                key={item.operationId}
                style={styles.queueItem}
                testID={`sync-operation-${item.status}`}
              >
                <View style={styles.queueHeader}>
                  <View style={styles.flex}>
                    <Text style={styles.entity}>
                      {getQueueEntityTitle(
                        item.entityType,
                        item.entityId,
                        labelsByEntity
                      )}
                    </Text>
                    <Text style={styles.base}>
                      {getOutboxMethodLabel(item.method)} ·{' '}
                      {getConflictEntityLabel(item.entityType)}
                    </Text>
                  </View>
                  <StatusChip label={status.label} tone={status.tone} />
                </View>
                {itemError ? (
                  <Text style={styles.queueError}>{itemError}</Text>
                ) : null}
                {item.status === 'failed' ? (
                  <Button
                    testID="retry-sync-operation"
                    title="Повторить"
                    variant="secondary"
                    loading={retryingId === `operation:${item.operationId}`}
                    disabled={Boolean(retryingId) || loading}
                    onPress={() => retryOperation(item.operationId)}
                  />
                ) : item.status === 'conflict' ? (
                  <Text style={styles.base}>
                    Выберите нужную версию в разделе конфликтов ниже.
                  </Text>
                ) : null}
              </View>
            )
          })}
          {fileItems.map((item) => {
            const status = getFileStatusPresentation(item.status)
            const itemError = getSafeSyncErrorMessage(item.lastError, 'file')
            return (
              <View
                key={item.id}
                style={styles.queueItem}
                testID={`sync-file-${item.status}`}
              >
                <View style={styles.queueHeader}>
                  <View style={styles.flex}>
                    <Text style={styles.entity}>{item.name}</Text>
                    <Text style={styles.base}>
                      {item.entityType
                        ? `Файл · ${getQueueEntityTitle(item.entityType, item.entityId, labelsByEntity)}`
                        : 'Личное вложение'}
                    </Text>
                  </View>
                  <StatusChip label={status.label} tone={status.tone} />
                </View>
                {itemError ? (
                  <Text style={styles.queueError}>{itemError}</Text>
                ) : null}
                {item.status === 'failed' ? (
                  <Button
                    testID="retry-sync-file"
                    title="Повторить файл"
                    variant="secondary"
                    loading={retryingId === `file:${item.id}`}
                    disabled={Boolean(retryingId) || loading}
                    onPress={() => retryFile(item.id)}
                  />
                ) : null}
              </View>
            )
          })}
        </Surface>
      ) : (
        <Surface>
          <Text style={styles.entity}>Всё отправлено</Text>
          <Text style={styles.base}>
            Локальных изменений и файлов в очереди нет.
          </Text>
        </Surface>
      )}
      <SectionTitle>Требуют решения</SectionTitle>
      {conflicts.length ? (
        conflicts.map((conflict) => (
          <Surface key={conflict.id}>
            <Text style={styles.entity}>
              {getConflictEntityLabel(conflict.entityType)} ·{' '}
              {getConflictFieldLabel(conflict.path)}
            </Text>
            <Text style={styles.base}>
              Было:{' '}
              {formatConflictValue(conflict.path, conflict.base, labelsById)}
            </Text>
            <View style={styles.values}>
              <View style={styles.value}>
                <Text style={styles.label}>На телефоне</Text>
                <Text style={styles.content}>
                  {formatConflictValue(
                    conflict.path,
                    conflict.local,
                    labelsById
                  )}
                </Text>
              </View>
              <View style={styles.value}>
                <Text style={styles.label}>На сервере</Text>
                <Text style={styles.content}>
                  {formatConflictValue(
                    conflict.path,
                    conflict.remote,
                    labelsById
                  )}
                </Text>
              </View>
            </View>
            <View style={styles.actions}>
              <View style={styles.flex}>
                <Button
                  testID="keep-local-conflict"
                  title="Оставить моё"
                  onPress={() => decide(conflict, 'local')}
                  loading={retryingId === `conflict:${conflict.id}:local`}
                  disabled={Boolean(retryingId) || loading}
                />
              </View>
              <View style={styles.flex}>
                <Button
                  testID="accept-server-conflict"
                  title="Принять сервер"
                  variant="secondary"
                  onPress={() => decide(conflict, 'remote')}
                  loading={retryingId === `conflict:${conflict.id}:remote`}
                  disabled={Boolean(retryingId) || loading}
                />
              </View>
            </View>
          </Surface>
        ))
      ) : (
        <EmptyState
          title="Конфликтов нет"
          description="Несвязанные изменения объединяются автоматически."
        />
      )}
    </Screen>
  )
}

const Count = ({ label, value }: { label: string; value: number }) => (
  <View style={styles.count}>
    <Text style={styles.countValue}>{value}</Text>
    <Text style={styles.label}>{label}</Text>
  </View>
)
const styles = StyleSheet.create({
  summary: { flexDirection: 'row', gap: spacing.sm },
  count: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 14,
    alignItems: 'center',
  },
  countValue: { color: colors.text, fontSize: 22, fontWeight: '800' },
  label: { color: colors.textMuted, fontSize: 11, fontWeight: '700' },
  entity: { color: colors.text, fontSize: 14, fontWeight: '800' },
  base: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  backgroundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  databaseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  databaseDetails: { gap: spacing.xs },
  queueItem: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  queueError: { color: colors.danger, fontSize: 12, lineHeight: 17 },
  values: { flexDirection: 'row', gap: spacing.sm },
  value: { flex: 1, gap: 4 },
  content: { color: colors.text, fontSize: 12, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
})
