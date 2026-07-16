import { useEffect, useState } from 'react'
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import type { Service, ServiceGroup } from '../../../src/shared/domain/types'
import { getCachedEntity, listCachedEntities } from '../../../src/shared/storage/cache'
import { deleteLocalEntity, saveLocalEntity } from '../../../src/shared/storage/mutations'
import { Button, ErrorNotice, Field, PageHeader, Screen, SectionTitle, Surface } from '../../../src/shared/ui/components'
import { colors, radius, spacing } from '../../../src/shared/ui/theme'

export default function ServiceEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const isNew = id === 'new'
  const queryClient = useQueryClient()
  const [groups, setGroups] = useState<ServiceGroup[]>([])
  const [values, setValues] = useState({ title: '', description: '', price: '', duration: '', groupId: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      listCachedEntities<ServiceGroup>('serviceGroups'),
      !isNew && id ? getCachedEntity<Service>('services', id) : null,
    ]).then(([groupItems, item]) => {
      setGroups(groupItems.sort((a, b) => Number(a.order || 0) - Number(b.order || 0)))
      if (item) setValues({
        title: item.title || '', description: item.description || '',
        price: item.price === undefined ? '' : String(item.price),
        duration: item.duration === undefined ? '' : String(item.duration),
        groupId: item.groupId || '',
      })
    }).catch(() => setError('Не удалось загрузить услугу'))
  }, [id, isNew])

  const save = async () => {
    if (!values.title.trim()) {
      setError('Укажите название услуги')
      return
    }
    const price = values.price.trim() ? Number(values.price.replace(',', '.')) : 0
    const duration = values.duration.trim() ? Number(values.duration) : 0
    if (!Number.isFinite(price) || price < 0 || !Number.isFinite(duration) || duration < 0) {
      setError('Цена и длительность должны быть неотрицательными числами')
      return
    }
    setLoading(true)
    setError('')
    try {
      await saveLocalEntity({
        entityType: 'services',
        entityId: isNew ? undefined : id,
        values: {
          title: values.title.trim(), description: values.description.trim(),
          price, duration, groupId: values.groupId || null,
        },
      })
      await queryClient.invalidateQueries({ queryKey: ['cached-entities', 'services'] })
      router.replace('/more/services')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить')
    } finally {
      setLoading(false)
    }
  }

  const remove = () => Alert.alert('Удалить услугу?', '', [
    { text: 'Отмена', style: 'cancel' },
    { text: 'Удалить', style: 'destructive', onPress: async () => {
      await deleteLocalEntity('services', id)
      await queryClient.invalidateQueries({ queryKey: ['cached-entities', 'services'] })
      router.replace('/more/services')
    } },
  ])

  return (
    <Screen>
      <PageHeader title={isNew ? 'Новая услуга' : 'Редактирование услуги'} subtitle="Прайс доступен офлайн" />
      <Surface>
        <Field label="Название" value={values.title} onChangeText={(title) => setValues((current) => ({ ...current, title }))} />
        <Field label="Описание" value={values.description} onChangeText={(description) => setValues((current) => ({ ...current, description }))} multiline />
        <View style={styles.row}><View style={styles.grow}><Field label="Цена" value={values.price} onChangeText={(price) => setValues((current) => ({ ...current, price }))} keyboardType="decimal-pad" /></View><View style={styles.grow}><Field label="Длительность, минут" value={values.duration} onChangeText={(duration) => setValues((current) => ({ ...current, duration }))} keyboardType="numeric" /></View></View>
        <SectionTitle>Группа</SectionTitle>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.options}>
          <Choice label="Без группы" active={!values.groupId} onPress={() => setValues((current) => ({ ...current, groupId: '' }))} />
          {groups.map((group) => <Choice key={group._id} label={group.title || 'Группа'} active={values.groupId === group._id} onPress={() => setValues((current) => ({ ...current, groupId: group._id }))} />)}
        </ScrollView>
        {error ? <ErrorNotice message={error} /> : null}
        <Button title="Сохранить" onPress={save} loading={loading} />
      </Surface>
      {!isNew ? <Button title="Удалить услугу" variant="danger" onPress={remove} /> : null}
    </Screen>
  )
}

const Choice = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => <Pressable accessibilityRole="button" style={[styles.option, active && styles.optionActive]} onPress={onPress}><Text style={[styles.optionText, active && styles.optionTextActive]}>{label}</Text></Pressable>
const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: spacing.sm }, grow: { flex: 1 }, options: { gap: 6, paddingRight: spacing.md }, option: { minHeight: 42, justifyContent: 'center', paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted }, optionActive: { backgroundColor: colors.primary }, optionText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' }, optionTextActive: { color: '#fff' } })
