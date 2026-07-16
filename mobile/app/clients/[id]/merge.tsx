import { useMemo, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { api } from '../../../src/shared/api/client'
import type { Client } from '../../../src/shared/domain/types'
import { useCachedEntities } from '../../../src/shared/hooks/useCachedEntities'
import { removeCachedEntity, upsertEntities } from '../../../src/shared/storage/cache'
import { runSync } from '../../../src/shared/sync/syncEngine'
import { Button, ErrorNotice, PageHeader, Screen, SectionTitle, Surface } from '../../../src/shared/ui/components'
import { colors, radius, spacing } from '../../../src/shared/ui/theme'

type MergeCounts = {
  events: number
  eventsOtherContacts: number
  eventsColleague: number
  transactions: number
  avitoConversations: number
  avitoMessages: number
  vkConversations: number
  vkMessages: number
  calls: number
  total: number
}

type MergePreview = {
  targetClient: Client
  duplicateClient: Client
  preview: MergeCounts
}

const name = (client?: Client | null) => client
  ? [client.firstName, client.secondName, client.thirdName].filter(Boolean).join(' ') || String(client.phone || 'Без имени')
  : 'Клиент'

export default function ClientMergeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const queryClient = useQueryClient()
  const clientsQuery = useCachedEntities<Client>('clients')
  const [search, setSearch] = useState('')
  const [duplicateId, setDuplicateId] = useState('')
  const [preview, setPreview] = useState<MergePreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [merging, setMerging] = useState(false)
  const [error, setError] = useState('')

  const target = useMemo(() => (clientsQuery.data || []).find((client) => client._id === id), [clientsQuery.data, id])
  const candidates = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('ru')
    return (clientsQuery.data || []).filter((client) => {
      if (client._id === id || client._id.startsWith('local-')) return false
      if (client.syncStatus && client.syncStatus !== 'synced') return false
      return !needle || `${name(client)} ${client.phone || ''} ${client.email || ''}`.toLocaleLowerCase('ru').includes(needle)
    }).sort((a, b) => name(a).localeCompare(name(b), 'ru'))
  }, [clientsQuery.data, id, search])

  const loadPreview = async () => {
    if (!duplicateId) {
      setError('Выберите клиента-дубль')
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await api.get<{ success: true; data: MergePreview }>(
        `/mobile/v1/clients/${id}/merge?duplicateClientId=${encodeURIComponent(duplicateId)}`
      )
      setPreview(response.data)
    } catch (reason) {
      setPreview(null)
      setError(reason instanceof Error ? reason.message : 'Не удалось проверить связи')
    } finally {
      setLoading(false)
    }
  }

  const merge = () => {
    if (!preview) return
    Alert.alert(
      'Объединить клиентов?',
      `«${name(preview.duplicateClient)}» будет удалён, а его данные и ${preview.preview.total} связей перейдут к «${name(preview.targetClient)}». Отменить это действие нельзя.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Объединить',
          style: 'destructive',
          onPress: async () => {
            setMerging(true)
            setError('')
            try {
              const response = await api.post<{
                success: true
                data: { client: Client; deletedClientId: string; moved: MergeCounts }
              }>(`/mobile/v1/clients/${id}/merge`, { duplicateClientId: duplicateId })
              await removeCachedEntity('clients', response.data.deletedClientId)
              if (response.data.client?._id) await upsertEntities('clients', [response.data.client])
              await runSync()
              await Promise.all(['clients', 'events', 'transactions'].map((entityType) =>
                queryClient.invalidateQueries({ queryKey: ['cached-entities', entityType] })))
              router.replace(`/clients/${id}` as never)
            } catch (reason) {
              setError(reason instanceof Error ? reason.message : 'Не удалось объединить клиентов')
            } finally {
              setMerging(false)
            }
          },
        },
      ],
    )
  }

  if (!target || target._id.startsWith('local-') || (target.syncStatus && target.syncStatus !== 'synced')) {
    return <Screen><PageHeader title="Объединение клиентов" /><ErrorNotice message="Сначала синхронизируйте основного клиента." /><Button title="Назад" variant="secondary" onPress={() => router.back()} /></Screen>
  }

  return (
    <Screen>
      <PageHeader title="Объединение клиентов" subtitle={`Основной: ${name(target)}`} />
      <Surface>
        <SectionTitle>Выберите дубликат</SectionTitle>
        <View style={styles.search}>
          <MaterialCommunityIcons name="magnify" size={21} color={colors.textMuted} />
          <TextInput value={search} onChangeText={setSearch} style={styles.searchInput} placeholder="Имя, телефон или email" placeholderTextColor={colors.textMuted} />
        </View>
        {candidates.map((client) => (
          <Pressable
            accessibilityRole="button"
            key={client._id}
            style={[styles.candidate, duplicateId === client._id && styles.candidateActive]}
            onPress={() => { setDuplicateId(client._id); setPreview(null); setError('') }}
          >
            <View style={styles.grow}><Text style={styles.candidateName}>{name(client)}</Text><Text style={styles.muted}>{client.phone || client.email || 'Контакты не указаны'}</Text></View>
            <MaterialCommunityIcons name={duplicateId === client._id ? 'radiobox-marked' : 'radiobox-blank'} size={23} color={duplicateId === client._id ? colors.primary : colors.textMuted} />
          </Pressable>
        ))}
        {!candidates.length ? <Text style={styles.muted}>Синхронизированных кандидатов не найдено.</Text> : null}
        <Button title="Проверить связи" variant="secondary" disabled={!duplicateId} loading={loading} onPress={loadPreview} />
      </Surface>

      {preview ? (
        <Surface>
          <SectionTitle>Что будет перенесено</SectionTitle>
          <Count label="Основные мероприятия" value={preview.preview.events} />
          <Count label="Дополнительные контакты в мероприятиях" value={preview.preview.eventsOtherContacts} />
          <Count label="Транзакции" value={preview.preview.transactions} />
          <Count label="Переписки Avito/VK" value={preview.preview.avitoConversations + preview.preview.vkConversations} />
          <Count label="Сообщения" value={preview.preview.avitoMessages + preview.preview.vkMessages} />
          <Count label="Звонки" value={preview.preview.calls} />
          <View style={styles.total}><Text style={styles.totalLabel}>Всего связей</Text><Text style={styles.totalValue}>{preview.preview.total}</Text></View>
          <Text style={styles.warning}>Пустые поля основного клиента будут дополнены данными дубля. Комментарии и уникальные значимые даты сохранятся.</Text>
        </Surface>
      ) : null}

      {error ? <ErrorNotice message={error} /> : null}
      <Button title="Объединить и удалить дубликат" variant="danger" disabled={!preview} loading={merging} onPress={merge} />
    </Screen>
  )
}

const Count = ({ label, value }: { label: string; value: number }) => (
  <View style={styles.count}><Text style={styles.countLabel}>{label}</Text><Text style={styles.countValue}>{value}</Text></View>
)

const styles = StyleSheet.create({
  search: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.md },
  searchInput: { flex: 1, color: colors.text, fontSize: 15 },
  candidate: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md },
  candidateActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  grow: { flex: 1 }, candidateName: { color: colors.text, fontSize: 14, fontWeight: '700' }, muted: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  count: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  countLabel: { flex: 1, color: colors.textMuted, fontSize: 13 }, countValue: { color: colors.text, fontSize: 14, fontWeight: '800' },
  total: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  totalLabel: { color: colors.text, fontSize: 14, fontWeight: '700' }, totalValue: { color: colors.primary, fontSize: 18, fontWeight: '800' },
  warning: { color: colors.warning, fontSize: 12, lineHeight: 18, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.warningSoft },
})
