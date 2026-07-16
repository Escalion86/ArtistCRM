import { useEffect, useMemo, useState } from 'react'
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { api } from '../../src/shared/api/client'
import type { Call, Client, Event } from '../../src/shared/domain/types'
import { listCachedEntities } from '../../src/shared/storage/cache'
import { runSync } from '../../src/shared/sync/syncEngine'
import {
  Button,
  EmptyState,
  ErrorNotice,
  Field,
  PageHeader,
  Screen,
  SectionTitle,
  StatusChip,
  Surface,
} from '../../src/shared/ui/components'
import { colors, radius, spacing } from '../../src/shared/ui/theme'

type CallResult = NonNullable<Call['callResult']>

const statusLabels: Record<string, string> = {
  new: 'Новый', processing: 'Обработка', ready: 'Готов', linked: 'Связан', ignored: 'Игнорируется', failed: 'Ошибка',
}
const resultLabels: Record<string, string> = {
  answered: 'Ответил', no_answer: 'Не ответил', callback: 'Перезвонить', follow_up: 'Создана задача',
}
const normalizedPhone = (value?: string | number | null) => {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`
  return digits.length === 10 ? `7${digits}` : digits
}
const tomorrowAtTen = () => {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(10, 0, 0, 0)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
const parseLocalDate = (value: string) => {
  const date = new Date(value.trim().replace(' ', 'T'))
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export default function CallDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [call, setCall] = useState<Call | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [note, setNote] = useState('')
  const [nextContactAt, setNextContactAt] = useState(tomorrowAtTen)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    if (!id) return
    setLoading(true); setError('')
    try {
      const [response, clientItems, eventItems] = await Promise.all([
        api.get<{ success: true; data: Call }>(`/mobile/v1/calls/${id}`),
        listCachedEntities<Client>('clients'),
        listCachedEntities<Event>('events'),
      ])
      setCall(response.data); setClients(clientItems); setEvents(eventItems)
      setNote(response.data.callResultNote || '')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось загрузить звонок')
    } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [id])

  const matchedClient = useMemo(() => {
    if (!call) return null
    return clients.find((item) => item._id === call.linkedClientId)
      || clients.find((item) => normalizedPhone(item.phone) === normalizedPhone(call.phone))
      || null
  }, [call, clients])
  const linkedEvent = useMemo(() => events.find((item) => item._id === call?.linkedEventId) || null, [call?.linkedEventId, events])
  const eventCandidates = useMemo(() => events.filter((item) => !matchedClient || item.clientId === matchedClient._id).sort((a, b) => new Date(b.eventDate || 0).getTime() - new Date(a.eventDate || 0).getTime()).slice(0, 5), [events, matchedClient])

  const runAction = async (action: string, body: unknown = {}) => {
    if (!call) return null
    setLoading(true); setError('')
    try {
      const response = await api.post<{ success: true; data: Call | { call: Call; event?: { _id: string } | null } }>(`/mobile/v1/calls/${call._id}/${action}`, body)
      const nextCall = 'call' in response.data ? response.data.call : response.data
      setCall(nextCall)
      return response.data
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось выполнить действие')
      return null
    } finally { setLoading(false) }
  }

  const linkClient = async () => {
    if (!matchedClient || !call) return
    const response = await runAction('link', { clientId: matchedClient._id })
    if (response) setCall((current) => current ? { ...current, linkedClientId: matchedClient._id, status: 'linked' } : current)
  }
  const linkEvent = async (event: Event) => {
    const response = await runAction('link', { eventId: event._id, clientId: event.clientId || undefined })
    if (response) setCall((current) => current ? { ...current, linkedEventId: event._id, linkedClientId: event.clientId || current.linkedClientId, status: 'linked' } : current)
  }
  const createRequest = async () => {
    const response = await runAction('decision', { decision: 'create_event' })
    if (!response || !('call' in response)) return
    await runSync().catch(() => undefined)
    if (response.event?._id) router.push(`/events/${response.event._id}` as never)
  }
  const saveResult = async (result: Exclude<CallResult, ''>, schedule = false) => {
    const date = schedule ? parseLocalDate(nextContactAt) : null
    if (schedule && !date) { setError('Введите дату в формате ГГГГ-ММ-ДД ЧЧ:ММ'); return }
    const response = await runAction('result', { result, note, nextContactAt: date })
    if (response && schedule) await runSync().catch(() => undefined)
  }

  if (!call && !loading) return <Screen><PageHeader title="Звонок" />{error ? <ErrorNotice message={error} /> : <EmptyState title="Звонок не найден" description="Обновите журнал звонков и попробуйте снова." />}</Screen>
  if (!call) return <Screen><PageHeader title="Звонок" /><Text style={styles.muted}>Загрузка…</Text></Screen>

  const phone = normalizedPhone(call.phone)
  const fields = call.aiExtractedFields || {}
  return <Screen>
    <PageHeader title={matchedClient ? [matchedClient.firstName, matchedClient.secondName].filter(Boolean).join(' ') : fields.clientName || call.phone || 'Звонок'} subtitle={call.startedAt ? new Date(call.startedAt).toLocaleString('ru-RU') : 'Время не указано'} action={<StatusChip label={statusLabels[call.status || 'new'] || 'Новый'} tone={call.status === 'ready' || call.status === 'linked' ? 'success' : call.status === 'failed' ? 'danger' : 'neutral'} />} />
    {error ? <ErrorNotice message={error} /> : null}
    <View style={styles.actions}><Action icon="phone-outline" label="Позвонить" disabled={!phone} onPress={() => phone && Linking.openURL(`tel:${phone}`)} /><Action icon="refresh" label="Обновить" disabled={loading} onPress={load} />{call.recordingUrl ? <Action icon="play-circle-outline" label="Запись" disabled={false} onPress={() => Linking.openURL(call.recordingUrl || '')} /> : null}</View>
    <Surface><SectionTitle>Информация</SectionTitle><Info label="Направление" value={call.direction === 'incoming' ? 'Входящий' : call.direction === 'outgoing' ? 'Исходящий' : 'Не определено'} /><Info label="Длительность" value={`${call.durationSec || 0} сек.`} /><Info label="Источник" value={call.provider || 'Телефония'} />{call.callResult ? <Info label="Результат" value={resultLabels[call.callResult] || call.callResult} /> : null}</Surface>
    {matchedClient ? <Surface><SectionTitle>Клиент</SectionTitle><Pressable style={styles.linkRow} onPress={() => router.push(`/clients/${matchedClient._id}` as never)}><MaterialCommunityIcons name="account-outline" size={22} color={colors.primary} /><Text style={styles.growText}>{[matchedClient.firstName, matchedClient.secondName].filter(Boolean).join(' ') || 'Клиент'}</Text><MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} /></Pressable>{!call.linkedClientId ? <Button title="Привязать найденного клиента" variant="secondary" onPress={linkClient} loading={loading} /> : null}</Surface> : null}
    {linkedEvent ? <Surface><SectionTitle>Связанное мероприятие</SectionTitle><Pressable style={styles.linkRow} onPress={() => router.push(`/events/${linkedEvent._id}` as never)}><MaterialCommunityIcons name="calendar-outline" size={22} color={colors.primary} /><View style={styles.grow}><Text style={styles.title}>{linkedEvent.eventType || 'Мероприятие'}</Text><Text style={styles.muted}>{linkedEvent.eventDate ? new Date(linkedEvent.eventDate).toLocaleString('ru-RU') : 'Дата не назначена'}</Text></View><MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} /></Pressable></Surface> : eventCandidates.length ? <Surface><SectionTitle>Привязать к мероприятию</SectionTitle>{eventCandidates.map((event) => <Pressable key={event._id} style={styles.linkRow} onPress={() => linkEvent(event)} disabled={loading}><MaterialCommunityIcons name="calendar-plus" size={21} color={colors.primary} /><View style={styles.grow}><Text style={styles.title}>{event.eventType || 'Мероприятие'}</Text><Text style={styles.muted}>{event.eventDate ? new Date(event.eventDate).toLocaleDateString('ru-RU') : 'Дата не назначена'}</Text></View></Pressable>)}</Surface> : null}
    {call.aiSummary ? <Surface><SectionTitle>Кратко по разговору</SectionTitle><Text style={styles.body}>{call.aiSummary}</Text></Surface> : null}
    {(fields.eventDate || fields.budget || fields.nextContactAt || fields.eventCity) ? <Surface><SectionTitle>Распознано</SectionTitle><Info label="Дата мероприятия" value={fields.eventDate ? new Date(fields.eventDate).toLocaleString('ru-RU') : ''} /><Info label="Город" value={fields.eventCity} /><Info label="Бюджет" value={fields.budget ? `${new Intl.NumberFormat('ru-RU').format(fields.budget)} ₽` : ''} /><Info label="Следующий контакт" value={fields.nextContactAt ? new Date(fields.nextContactAt).toLocaleString('ru-RU') : ''} />{fields.objections?.length ? <Info label="Возражения" value={fields.objections.join(', ')} /> : null}</Surface> : null}
    {call.transcript ? <Surface><SectionTitle>Расшифровка</SectionTitle><Text style={styles.body}>{call.transcript}</Text></Surface> : null}
    {call.processingError ? <ErrorNotice message={call.processingError} /> : null}
    {call.recordingUrl && !call.transcript ? <Button title="Распознать запись" onPress={() => runAction('process-recording')} loading={loading} /> : null}
    {call.transcript && !call.aiSummary ? <Button title="Сделать AI-разбор" onPress={() => runAction('analyze')} loading={loading} /> : null}
    {!call.linkedEventId ? <Button title="Создать заявку из звонка" onPress={createRequest} loading={loading} disabled={call.status === 'processing'} /> : null}
    <Surface><SectionTitle>Результат звонка</SectionTitle><Field label="Комментарий" value={note} onChangeText={setNote} multiline maxLength={1000} placeholder="Краткий итог разговора" /><View style={styles.resultGrid}><SmallButton title="Ответил" onPress={() => saveResult('answered')} disabled={loading} /><SmallButton title="Не ответил" onPress={() => saveResult('no_answer')} disabled={loading} /></View><Field label="Следующий контакт" value={nextContactAt} onChangeText={setNextContactAt} placeholder="ГГГГ-ММ-ДД ЧЧ:ММ" /><View style={styles.resultGrid}><SmallButton title="Перезвонить" onPress={() => saveResult('callback', true)} disabled={loading || !call.linkedEventId} /><SmallButton title="Создать задачу" onPress={() => saveResult('follow_up', true)} disabled={loading || !call.linkedEventId} /></View>{!call.linkedEventId ? <Text style={styles.hint}>Для следующего контакта сначала привяжите или создайте заявку.</Text> : null}</Surface>
    <Button title="Игнорировать звонок" variant="secondary" onPress={() => runAction('ignore')} disabled={loading} />
  </Screen>
}

const Info = ({ label, value }: { label: string; value?: string }) => value ? <View style={styles.info}><Text style={styles.label}>{label}</Text><Text style={styles.value}>{value}</Text></View> : null
const Action = ({ icon, label, onPress, disabled }: { icon: keyof typeof MaterialCommunityIcons.glyphMap; label: string; onPress: () => void; disabled: boolean }) => <Pressable style={[styles.action, disabled && styles.disabled]} onPress={onPress} disabled={disabled}><View style={styles.actionIcon}><MaterialCommunityIcons name={icon} size={23} color={colors.primary} /></View><Text style={styles.actionLabel}>{label}</Text></Pressable>
const SmallButton = ({ title, onPress, disabled }: { title: string; onPress: () => void; disabled: boolean }) => <Pressable style={[styles.smallButton, disabled && styles.disabled]} onPress={onPress} disabled={disabled}><Text style={styles.smallButtonText}>{title}</Text></Pressable>
const styles = StyleSheet.create({ actions: { flexDirection: 'row', gap: spacing.sm }, action: { flex: 1, alignItems: 'center', gap: 6 }, actionIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, actionLabel: { color: colors.text, fontSize: 11, fontWeight: '700' }, disabled: { opacity: 0.45 }, info: { gap: 3, paddingVertical: 4 }, label: { color: colors.textMuted, fontSize: 11 }, value: { color: colors.text, fontSize: 14 }, linkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm }, grow: { flex: 1 }, growText: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '700' }, title: { color: colors.text, fontSize: 14, fontWeight: '700' }, muted: { color: colors.textMuted, fontSize: 12, marginTop: 3 }, body: { color: colors.text, fontSize: 14, lineHeight: 21 }, resultGrid: { flexDirection: 'row', gap: spacing.sm }, smallButton: { flex: 1, minHeight: 44, borderRadius: radius.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.sm }, smallButtonText: { color: colors.primary, fontSize: 13, fontWeight: '700' }, hint: { color: colors.textMuted, fontSize: 12, lineHeight: 18 } })
