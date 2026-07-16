import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { api } from '../../shared/api/client'
import type { MobileSettings } from '../../shared/domain/types'
import { listCachedEntities, upsertEntities } from '../../shared/storage/cache'
import { Button, ErrorNotice, Field, SectionTitle, StatusChip, Surface } from '../../shared/ui/components'
import { colors, radius, spacing } from '../../shared/ui/theme'

const normalize = (items: string[]) => Array.from(new Map(items
  .map((item) => item.trim())
  .filter(Boolean)
  .map((item) => [item.toLocaleLowerCase('ru'), item])).values())
  .sort((a, b) => a.localeCompare(b, 'ru'))

export const ListsSection = () => {
  const [settingsId, setSettingsId] = useState('')
  const [towns, setTowns] = useState<string[]>([])
  const [defaultTown, setDefaultTown] = useState('')
  const [eventTypes, setEventTypes] = useState<string[]>([])
  const [townDraft, setTownDraft] = useState('')
  const [eventTypeDraft, setEventTypeDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const applySettings = (settings?: MobileSettings | null) => {
    if (!settings) return
    setSettingsId(settings._id || '')
    setTowns(normalize(settings.towns || []))
    setDefaultTown(settings.defaultTown || '')
    setEventTypes(normalize(settings.custom?.eventTypes || []))
  }

  useEffect(() => {
    let active = true
    listCachedEntities<MobileSettings>('siteSettings')
      .then((items) => { if (active) applySettings(items[0]) })
      .catch(() => undefined)
    api.get<{ success: true; data: MobileSettings }>('/mobile/v1/lists')
      .then(async (response) => {
        if (!active) return
        applySettings(response.data)
        if (response.data._id) await upsertEntities('siteSettings', [response.data])
      })
      .catch(() => undefined)
    return () => { active = false }
  }, [])

  const addTown = () => {
    const value = townDraft.trim().slice(0, 100)
    if (!value) return
    const next = normalize([...towns, value])
    setTowns(next)
    if (!defaultTown) setDefaultTown(value)
    setTownDraft('')
  }

  const addEventType = () => {
    const value = eventTypeDraft.trim().slice(0, 100)
    if (!value) return
    setEventTypes(normalize([...eventTypes, value]))
    setEventTypeDraft('')
  }

  const save = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.put<{ success: true; data: MobileSettings }>('/mobile/v1/lists', {
        towns,
        defaultTown,
        eventTypes,
      })
      applySettings(response.data)
      if (response.data._id) await upsertEntities('siteSettings', [response.data])
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить списки')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Surface>
        <SectionTitle>Города</SectionTitle>
        <Text style={styles.muted}>Город по умолчанию подставляется в новое мероприятие.</Text>
        {towns.map((town) => (
          <View key={town} style={styles.item}>
            <Pressable accessibilityRole="button" style={styles.grow} onPress={() => setDefaultTown(town)}>
              <Text style={styles.title}>{town}</Text>
              {defaultTown === town ? <Text style={styles.defaultText}>По умолчанию</Text> : null}
            </Pressable>
            {defaultTown === town ? <StatusChip label="Основной" tone="success" /> : null}
            <Pressable accessibilityRole="button" accessibilityLabel={`Удалить ${town}`} style={styles.iconButton} onPress={() => { setTowns((current) => current.filter((item) => item !== town)); if (defaultTown === town) setDefaultTown('') }}><MaterialCommunityIcons name="trash-can-outline" size={20} color={colors.danger} /></Pressable>
          </View>
        ))}
        <View style={styles.addRow}><View style={styles.grow}><Field label="Новый город" value={townDraft} onChangeText={setTownDraft} maxLength={100} /></View><Pressable accessibilityRole="button" accessibilityLabel="Добавить город" style={styles.addIcon} onPress={addTown}><MaterialCommunityIcons name="plus" size={23} color="#fff" /></Pressable></View>
      </Surface>

      <Surface>
        <SectionTitle>Типы мероприятий</SectionTitle>
        <Text style={styles.muted}>Подсказки доступны в offline-редакторе мероприятия.</Text>
        <View style={styles.chips}>{eventTypes.map((eventType) => <View key={eventType} style={styles.chip}><Text style={styles.chipText}>{eventType}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Удалить ${eventType}`} hitSlop={8} onPress={() => setEventTypes((current) => current.filter((item) => item !== eventType))}><MaterialCommunityIcons name="close" size={18} color={colors.danger} /></Pressable></View>)}</View>
        <View style={styles.addRow}><View style={styles.grow}><Field label="Новый тип" value={eventTypeDraft} onChangeText={setEventTypeDraft} maxLength={100} /></View><Pressable accessibilityRole="button" accessibilityLabel="Добавить тип мероприятия" style={styles.addIcon} onPress={addEventType}><MaterialCommunityIcons name="plus" size={23} color="#fff" /></Pressable></View>
      </Surface>

      {error ? <ErrorNotice message={error} /> : null}
      <Button title="Сохранить списки" onPress={save} loading={loading} />
      <Text style={styles.onlineHint}>{settingsId ? 'Последняя сохранённая версия доступна офлайн.' : 'Для первого сохранения требуется сеть.'}</Text>
    </>
  )
}

const styles = StyleSheet.create({
  muted: { color: colors.textMuted, fontSize: 12, lineHeight: 18 }, grow: { flex: 1 },
  item: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  title: { color: colors.text, fontSize: 14, fontWeight: '700' }, defaultText: { color: colors.success, fontSize: 11, marginTop: 2 },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  addRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm }, addIcon: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.primary, marginBottom: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, chip: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted }, chipText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  onlineHint: { color: colors.textMuted, fontSize: 12, textAlign: 'center' },
})
