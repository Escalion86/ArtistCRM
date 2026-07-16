import { useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { api } from '../../src/shared/api/client'
import type { Conversation, ConversationProvider } from '../../src/shared/domain/types'
import {
  Button,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Screen,
  StatusChip,
  Surface,
} from '../../src/shared/ui/components'
import { colors, radius, spacing } from '../../src/shared/ui/theme'

type Filter = 'all' | ConversationProvider

export default function ConversationsScreen() {
  const params = useLocalSearchParams<{ clientId?: string; eventId?: string }>()
  const [filter, setFilter] = useState<Filter>('all')
  const [items, setItems] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    const query = new URLSearchParams()
    if (params.clientId) query.set('clientId', params.clientId)
    if (params.eventId) query.set('eventId', params.eventId)
    const suffix = query.size ? `?${query.toString()}` : ''
    const results = await Promise.allSettled(
      (['avito', 'vk'] as const).map(async (provider) => {
        const response = await api.get<{ success: true; data: Omit<Conversation, 'provider'>[] }>(
          `/mobile/v1/conversations/${provider}${suffix}`
        )
        return response.data.map((item) => ({ ...item, provider }))
      })
    )
    const loaded = results.flatMap((result) =>
      result.status === 'fulfilled' ? result.value : []
    )
    setItems(
      loaded.sort(
        (left, right) =>
          new Date(right.lastMessageAt || 0).getTime() -
          new Date(left.lastMessageAt || 0).getTime()
      )
    )
    if (!loaded.length && results.every((result) => result.status === 'rejected')) {
      const rejected = results.find((result) => result.status === 'rejected')
      setError(
        rejected?.status === 'rejected' && rejected.reason instanceof Error
          ? rejected.reason.message
          : 'Переписки недоступны'
      )
    }
    setLoading(false)
  }

  useEffect(() => { void load() }, [params.clientId, params.eventId])

  const filtered = useMemo(
    () => items.filter((item) => filter === 'all' || item.provider === filter),
    [filter, items]
  )
  return (
    <Screen>
      <PageHeader
        title="Переписки"
        subtitle={params.clientId ? 'Диалоги выбранного клиента' : params.eventId ? 'Диалоги мероприятия' : 'Avito и VK'}
      />
      <View style={styles.filters}>
        {([['all', 'Все'], ['avito', 'Avito'], ['vk', 'VK']] as const).map(
          ([value, label]) => (
            <Pressable
              key={value}
              style={[styles.filter, filter === value && styles.filterActive]}
              onPress={() => setFilter(value)}
            >
              <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>
                {label}
              </Text>
            </Pressable>
          )
        )}
      </View>
      {error ? <ErrorNotice message={error} /> : null}
      {filtered.length ? filtered.map((conversation) => (
        <Pressable
          key={`${conversation.provider}-${conversation._id}`}
          onPress={() => router.push(`/conversations/${conversation.provider}/${conversation._id}` as never)}
        >
          <Surface>
            <View style={styles.row}>
              <View style={styles.icon}>
                <MaterialCommunityIcons
                  name={conversation.provider === 'avito' ? 'storefront-outline' : 'alpha-v-circle-outline'}
                  size={23}
                  color={colors.primary}
                />
              </View>
              <View style={styles.grow}>
                <View style={styles.titleRow}>
                  <Text style={styles.title} numberOfLines={1}>
                    {conversation.clientName || conversation.avitoItemTitle || 'Диалог'}
                  </Text>
                  {conversation.status && conversation.status !== 'open' ? (
                    <StatusChip
                      label={conversation.status === 'closed' ? 'Закрыт' : 'Игнорируется'}
                      tone="neutral"
                    />
                  ) : null}
                  {conversation.unreadCount ? (
                    <StatusChip label={String(conversation.unreadCount)} tone="blue" />
                  ) : null}
                </View>
                <Text style={styles.message} numberOfLines={2}>
                  {conversation.lastMessageText || 'Сообщений пока нет'}
                </Text>
                <Text style={styles.date}>
                  {conversation.provider === 'avito' ? 'Avito' : 'VK'}
                  {conversation.lastMessageAt
                    ? ` · ${new Date(conversation.lastMessageAt).toLocaleString('ru-RU')}`
                    : ''}
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={23} color={colors.textMuted} />
            </View>
          </Surface>
        </Pressable>
      )) : <EmptyState title="Диалогов нет" description="Переписки появятся после подключения интеграции и первого сообщения клиента." />}
      <Button title="Обновить" variant="secondary" onPress={load} loading={loading} />
    </Screen>
  )
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: 7 },
  filter: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted },
  filterActive: { backgroundColor: colors.primary },
  filterText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  grow: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '700' },
  message: { color: colors.text, fontSize: 13, lineHeight: 19, marginTop: 3 },
  date: { color: colors.textMuted, fontSize: 11, marginTop: 5 },
})
