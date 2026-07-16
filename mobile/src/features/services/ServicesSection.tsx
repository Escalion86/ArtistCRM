import { useMemo } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { router } from 'expo-router'
import type { Service, ServiceGroup } from '../../shared/domain/types'
import { useCachedEntities } from '../../shared/hooks/useCachedEntities'
import { Button, EmptyState, SectionTitle, StatusChip, Surface } from '../../shared/ui/components'
import { colors, spacing } from '../../shared/ui/theme'

const price = (value?: number) => `${new Intl.NumberFormat('ru-RU').format(Number(value || 0))} ₽`

export const ServicesSection = () => {
  const servicesQuery = useCachedEntities<Service>('services')
  const groupsQuery = useCachedEntities<ServiceGroup>('serviceGroups')
  const services = useMemo(() => (servicesQuery.data || []).filter((service) => !service.archive), [servicesQuery.data])
  const groups = useMemo(() => [...(groupsQuery.data || [])].sort((a, b) => Number(a.order || 0) - Number(b.order || 0) || String(a.title || '').localeCompare(String(b.title || ''), 'ru')), [groupsQuery.data])
  const knownGroupIds = useMemo(() => new Set(groups.map((group) => group._id)), [groups])
  const ungrouped = services.filter((service) => !service.groupId || !knownGroupIds.has(service.groupId))

  if (!services.length && !groups.length) return (
    <>
      <EmptyState title="Прайс пока пуст" description="Добавьте группы и услуги — они будут доступны при заполнении мероприятия офлайн." />
      <View style={styles.buttons}><Button title="Добавить услугу" onPress={() => router.push('/services/edit/new' as never)} /><Button title="Добавить группу" variant="secondary" onPress={() => router.push('/service-groups/edit/new' as never)} /></View>
    </>
  )

  return (
    <>
      {groups.map((group) => {
        const items = services.filter((service) => service.groupId === group._id)
        return (
          <Surface key={group._id}>
            <Pressable accessibilityRole="button" style={styles.groupHeader} onPress={() => router.push(`/service-groups/edit/${group._id}` as never)}>
              <View style={styles.grow}><SectionTitle>{group.title || 'Группа'}</SectionTitle><Text style={styles.muted}>Услуг: {items.length}</Text></View>
              {group.syncStatus && group.syncStatus !== 'synced' ? <StatusChip label="Офлайн" tone="warning" /> : null}
              <MaterialCommunityIcons name="pencil-outline" size={21} color={colors.primary} />
            </Pressable>
            {items.length ? items.map((service) => <ServiceRow key={service._id} service={service} />) : <Text style={styles.empty}>В этой группе пока нет услуг.</Text>}
          </Surface>
        )
      })}
      {ungrouped.length ? <Surface><SectionTitle>Без группы</SectionTitle>{ungrouped.map((service) => <ServiceRow key={service._id} service={service} />)}</Surface> : null}
      <View style={styles.buttons}><Button title="Добавить услугу" onPress={() => router.push('/services/edit/new' as never)} /><Button title="Добавить группу" variant="secondary" onPress={() => router.push('/service-groups/edit/new' as never)} /></View>
    </>
  )
}

const ServiceRow = ({ service }: { service: Service }) => (
  <Pressable accessibilityRole="button" style={styles.service} onPress={() => router.push(`/services/edit/${service._id}` as never)}>
    <View style={styles.grow}><Text style={styles.title}>{service.title || 'Услуга'}</Text><Text style={styles.muted}>{service.description || (service.duration ? `${service.duration} мин.` : 'Без описания')}</Text></View>
    <Text style={styles.price}>{price(service.price)}</Text>
    {service.syncStatus && service.syncStatus !== 'synced' ? <StatusChip label="Офлайн" tone="warning" /> : null}
    <MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} />
  </Pressable>
)

const styles = StyleSheet.create({
  buttons: { gap: spacing.sm }, grow: { flex: 1 },
  groupHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  service: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  title: { color: colors.text, fontSize: 14, fontWeight: '700' }, muted: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  price: { color: colors.text, fontSize: 13, fontWeight: '800' }, empty: { color: colors.textMuted, fontSize: 13, paddingVertical: spacing.sm },
})
