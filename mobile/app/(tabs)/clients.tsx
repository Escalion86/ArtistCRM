import { useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { Client } from '../../src/shared/domain/types'
import { useCachedEntities } from '../../src/shared/hooks/useCachedEntities'
import { EmptyState, PageHeader, Screen, StatusChip } from '../../src/shared/ui/components'
import { colors, radius, spacing } from '../../src/shared/ui/theme'

const clientName = (client: Client) => [client.firstName, client.secondName, client.thirdName].filter(Boolean).join(' ') || 'Без имени'

export default function ClientsScreen() {
  const [search, setSearch] = useState('')
  const query = useCachedEntities<Client>('clients')
  const clients = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('ru')
    return (query.data || []).filter((client) => !needle || `${clientName(client)} ${client.phone || ''} ${client.email || ''}`.toLocaleLowerCase('ru').includes(needle)).sort((a, b) => clientName(a).localeCompare(clientName(b), 'ru'))
  }, [query.data, search])

  return (
    <Screen scroll={false}>
      <PageHeader title="Клиенты" subtitle={`${clients.length} в адресной книге`} action={<Pressable testID="add-client" accessibilityLabel="Добавить клиента" style={styles.add} onPress={() => router.push('/clients/edit/new' as never)}><MaterialCommunityIcons name="account-plus-outline" size={23} color="#fff" /></Pressable>} />
      <View style={styles.search}><MaterialCommunityIcons name="magnify" size={21} color={colors.textMuted} /><TextInput value={search} onChangeText={setSearch} style={styles.searchInput} placeholder="Имя, телефон или email" placeholderTextColor={colors.textMuted} /></View>
      <FlatList
        data={clients}
        keyExtractor={(item) => item._id}
        refreshing={query.isFetching}
        onRefresh={query.refresh}
        contentContainerStyle={clients.length ? styles.list : styles.emptyList}
        ListEmptyComponent={<EmptyState title={search ? 'Ничего не найдено' : 'Нет клиентов'} description={search ? 'Попробуйте изменить запрос.' : 'Добавьте первого клиента — запись будет доступна офлайн.'} />}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/clients/${item._id}` as never)}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{(item.firstName || item.secondName || '?').slice(0, 1).toUpperCase()}</Text></View>
            <View style={styles.info}><Text style={styles.name} numberOfLines={1}>{clientName(item)}</Text><Text style={styles.detail} numberOfLines={1}>{item.phone || item.email || item.town || 'Контакты не указаны'}</Text></View>
            {item.syncStatus && item.syncStatus !== 'synced' ? <StatusChip label="Офлайн" tone="warning" /> : <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />}
          </Pressable>
        )}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  add: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  search: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: spacing.md }, searchInput: { flex: 1, color: colors.text, fontSize: 15 },
  list: { gap: spacing.sm, paddingBottom: 110 }, emptyList: { flexGrow: 1, justifyContent: 'center' },
  card: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: radius.lg },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, avatarText: { color: colors.primary, fontSize: 18, fontWeight: '800' },
  info: { flex: 1 }, name: { color: colors.text, fontSize: 15, fontWeight: '700' }, detail: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
})
