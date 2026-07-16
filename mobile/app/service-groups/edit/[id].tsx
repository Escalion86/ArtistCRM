import { useEffect, useState } from 'react'
import { Alert, StyleSheet, Text } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import type { Service, ServiceGroup } from '../../../src/shared/domain/types'
import { deleteLocalEntity, saveLocalEntity } from '../../../src/shared/storage/mutations'
import { getCachedEntity, listCachedEntities } from '../../../src/shared/storage/cache'
import { Button, ErrorNotice, Field, PageHeader, Screen, Surface } from '../../../src/shared/ui/components'
import { colors } from '../../../src/shared/ui/theme'

export default function ServiceGroupEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const isNew = id === 'new'
  const queryClient = useQueryClient()
  const [values, setValues] = useState({ title: '', order: '0' })
  const [serviceCount, setServiceCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      !isNew && id ? getCachedEntity<ServiceGroup>('serviceGroups', id) : null,
      listCachedEntities<Service>('services'),
    ]).then(([group, services]) => {
      if (group) setValues({ title: group.title || '', order: String(group.order || 0) })
      setServiceCount(services.filter((service) => service.groupId === id).length)
    }).catch(() => setError('Не удалось загрузить группу'))
  }, [id, isNew])

  const save = async () => {
    if (!values.title.trim()) {
      setError('Укажите название группы')
      return
    }
    const order = Number(values.order || 0)
    if (!Number.isFinite(order)) {
      setError('Порядок должен быть числом')
      return
    }
    setLoading(true)
    setError('')
    try {
      await saveLocalEntity({
        entityType: 'serviceGroups',
        entityId: isNew ? undefined : id,
        values: { title: values.title.trim(), order: Math.trunc(order) },
      })
      await queryClient.invalidateQueries({ queryKey: ['cached-entities', 'serviceGroups'] })
      router.replace('/more/services')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить группу')
    } finally {
      setLoading(false)
    }
  }

  const remove = () => Alert.alert(
    'Удалить группу?',
    serviceCount ? `${serviceCount} услуг останутся в прайсе без группы.` : 'Группа будет удалена со всех устройств.',
    [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить', style: 'destructive', onPress: async () => {
          setLoading(true)
          setError('')
          try {
            const services = await listCachedEntities<Service>('services')
            for (const service of services.filter((item) => item.groupId === id)) {
              await saveLocalEntity({
                entityType: 'services', entityId: service._id, values: { groupId: null },
              })
            }
            await deleteLocalEntity('serviceGroups', id)
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ['cached-entities', 'serviceGroups'] }),
              queryClient.invalidateQueries({ queryKey: ['cached-entities', 'services'] }),
            ])
            router.replace('/more/services')
          } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Не удалось удалить группу')
          } finally {
            setLoading(false)
          }
        },
      },
    ],
  )

  return (
    <Screen>
      <PageHeader title={isNew ? 'Новая группа' : 'Группа услуг'} subtitle="Группы и услуги синхронизируются офлайн" />
      <Surface>
        <Field label="Название" value={values.title} onChangeText={(title) => setValues((current) => ({ ...current, title }))} />
        <Field label="Порядок" value={values.order} onChangeText={(order) => setValues((current) => ({ ...current, order }))} keyboardType="number-pad" />
        {!isNew ? <Text style={styles.hint}>Услуг в группе: {serviceCount}</Text> : null}
        {error ? <ErrorNotice message={error} /> : null}
        <Button title="Сохранить" onPress={save} loading={loading} />
      </Surface>
      {!isNew ? <Button title="Удалить группу" variant="danger" onPress={remove} loading={loading} /> : null}
    </Screen>
  )
}

const styles = StyleSheet.create({ hint: { color: colors.textMuted, fontSize: 13 } })
