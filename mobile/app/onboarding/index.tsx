import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { api } from '../../src/shared/api/client'
import { useAuth } from '../../src/shared/auth/AuthProvider'
import { upsertEntities } from '../../src/shared/storage/cache'
import {
  Button,
  ErrorNotice,
  Field,
  PageHeader,
  Screen,
  SectionTitle,
  Surface,
} from '../../src/shared/ui/components'
import { colors, radius, spacing } from '../../src/shared/ui/theme'

type Preset = {
  key: string
  title: string
  description: string
  starterServices: Array<{ title: string; description?: string }>
}

const timeZones = [
  ['Europe/Moscow', 'Москва'],
  ['Asia/Yekaterinburg', 'Екатеринбург'],
  ['Asia/Omsk', 'Омск'],
  ['Asia/Krasnoyarsk', 'Красноярск'],
  ['Asia/Irkutsk', 'Иркутск'],
  ['Asia/Yakutsk', 'Якутск'],
  ['Asia/Vladivostok', 'Владивосток'],
] as const

export default function OnboardingScreen() {
  const { user, refreshUser, completeOnboarding } = useAuth()
  const [step, setStep] = useState(0)
  const [presets, setPresets] = useState<Preset[]>([])
  const [servicesCount, setServicesCount] = useState(0)
  const [profile, setProfile] = useState({
    firstName: user?.firstName || '', secondName: user?.secondName || '',
    thirdName: user?.thirdName || '', whatsapp: '', telegram: '', vk: '', instagram: '',
  })
  const [town, setTown] = useState('')
  const [timeZone, setTimeZone] = useState('Asia/Krasnoyarsk')
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [presetKey, setPresetKey] = useState('events')
  const [createStarterServices, setCreateStarterServices] = useState(true)
  const [showColleagueTransferFields, setShowColleagueTransferFields] = useState(false)
  const [createDemoEvent, setCreateDemoEvent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<{
      success: true
      data: { presets: Preset[]; servicesCount: number; settings?: { defaultTown?: string; timeZone?: string } }
    }>('/mobile/v1/onboarding').then((response) => {
      setPresets(response.data.presets)
      setServicesCount(response.data.servicesCount)
      if (response.data.servicesCount > 0) setCreateStarterServices(false)
      if (response.data.settings?.defaultTown) setTown(response.data.settings.defaultTown)
      if (response.data.settings?.timeZone) setTimeZone(response.data.settings.timeZone)
    }).catch((reason) => setError(reason instanceof Error ? reason.message : 'Не удалось загрузить мастер'))
  }, [])

  const next = () => {
    setError('')
    if (step === 0 && (!profile.firstName.trim() || !profile.secondName.trim())) {
      setError('Укажите имя и фамилию')
      return
    }
    setStep((current) => Math.min(4, current + 1))
  }

  const finish = async () => {
    setLoading(true); setError('')
    try {
      const response = await api.post<{
        success: true
        data: {
          settings?: Record<string, unknown> & { _id: string }
          services?: Array<Record<string, unknown> & { _id: string }>
          event?: Record<string, unknown> & { _id: string }
        }
      }>('/mobile/v1/onboarding', {
        profile, town, timeZone, theme, presetKey,
        createStarterServices: servicesCount === 0 && createStarterServices,
        showColleagueTransferFields, createDemoEvent,
      })
      if (response.data.settings?._id) {
        await upsertEntities('siteSettings', [response.data.settings])
      }
      if (response.data.services?.length) {
        await upsertEntities('services', response.data.services)
      }
      if (response.data.event?._id) {
        await upsertEntities('events', [response.data.event])
      }
      await refreshUser()
      completeOnboarding()
      router.replace('/(tabs)')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось завершить настройку')
    } finally { setLoading(false) }
  }

  const preset = presets.find((item) => item.key === presetKey)
  return (
    <Screen>
      <View style={styles.progress}><View style={[styles.progressFill, { width: `${((step + 1) / 5) * 100}%` }]} /></View>
      <PageHeader
        title={['Ваш профиль', 'Город и время', 'Специализация', 'Работа с коллегами', 'Как устроена CRM'][step]}
        subtitle={`Шаг ${step + 1} из 5`}
      />

      {step === 0 ? <Surface>
        <Text style={styles.explanation}>Эти данные используются в документах и помогают быстрее связываться с клиентами.</Text>
        <Field testID="onboarding-first-name" label="Имя *" value={profile.firstName} onChangeText={(firstName) => setProfile((value) => ({ ...value, firstName }))} />
        <Field testID="onboarding-last-name" label="Фамилия *" value={profile.secondName} onChangeText={(secondName) => setProfile((value) => ({ ...value, secondName }))} />
        <Field label="Отчество" value={profile.thirdName} onChangeText={(thirdName) => setProfile((value) => ({ ...value, thirdName }))} />
        <Field label="WhatsApp" value={profile.whatsapp} onChangeText={(whatsapp) => setProfile((value) => ({ ...value, whatsapp }))} keyboardType="phone-pad" />
        <Field label="Telegram" value={profile.telegram} onChangeText={(telegram) => setProfile((value) => ({ ...value, telegram }))} autoCapitalize="none" />
      </Surface> : null}

      {step === 1 ? <Surface>
        <Text style={styles.explanation}>Город и часовой пояс нужны для правильных напоминаний, календаря и дат документов.</Text>
        <Field label="Основной город" value={town} onChangeText={setTown} />
        <SectionTitle>Часовой пояс</SectionTitle>
        <View style={styles.options}>{timeZones.map(([value, label]) => <Choice key={value} label={label} active={timeZone === value} onPress={() => setTimeZone(value)} />)}</View>
        <SectionTitle>Тема</SectionTitle>
        <View style={styles.options}><Choice label="Светлая" active={theme === 'light'} onPress={() => setTheme('light')} /><Choice label="Тёмная" active={theme === 'dark'} onPress={() => setTheme('dark')} /></View>
      </Surface> : null}

      {step === 2 ? <Surface>
        <Text style={styles.explanation}>Выберите ближайший вид деятельности. Он влияет только на стартовые примеры и услуги.</Text>
        {presets.map((item) => <Pressable key={item.key} onPress={() => setPresetKey(item.key)} style={[styles.preset, presetKey === item.key && styles.presetActive]}><Text style={styles.presetTitle}>{item.title}</Text><Text style={styles.presetDescription}>{item.description}</Text></Pressable>)}
        {servicesCount > 0 ? <Text style={styles.warning}>У вас уже есть услуги, поэтому новые услуги из пресета не будут созданы.</Text> : <Pressable style={styles.checkRow} onPress={() => setCreateStarterServices((value) => !value)}><Check checked={createStarterServices} /><View style={styles.flex}><Text style={styles.checkTitle}>Создать стартовые услуги</Text><Text style={styles.presetDescription}>{preset?.starterServices.map((item) => item.title).join(', ')}</Text></View></Pressable>}
      </Surface> : null}

      {step === 3 ? <Surface>
        <Text style={styles.explanation}>Бывает ли, что вы передаёте подтверждённый заказ коллеге?</Text>
        <View style={styles.options}><Choice label="Да, бывает" active={showColleagueTransferFields} onPress={() => setShowColleagueTransferFields(true)} /><Choice label="Нет" active={!showColleagueTransferFields} onPress={() => setShowColleagueTransferFields(false)} /></View>
        <Text style={styles.presetDescription}>Если включить, в редакторе появятся поля «Передано коллеге». Существующие карточки при выключении не изменятся.</Text>
      </Surface> : null}

      {step === 4 ? <>
        <Surface><Status title="Заявка" tone="warning" text="Клиент заинтересовался, но ещё не подтвердил заказ. Главное — поставить следующий контакт." /><Status title="Подтверждено" tone="success" text="Дата или условия согласованы. Контролируйте оплату, задачи, документы и календарь." /><Status title="Закрыто" text="Работа завершена, оплаты и документы доведены до конца." /><Status title="Отменено" tone="danger" text="Заказ не состоялся и больше не считается активной работой." /></Surface>
        <Surface><Pressable style={styles.checkRow} onPress={() => setCreateDemoEvent((value) => !value)}><Check checked={createDemoEvent} /><View style={styles.flex}><Text style={styles.checkTitle}>Создать учебную заявку</Text><Text style={styles.presetDescription}>В ней уже будет следующий контакт на завтра. Её можно удалить как обычную карточку.</Text></View></Pressable></Surface>
      </> : null}

      {error ? <ErrorNotice message={error} /> : null}
      <View style={styles.actions}>{step > 0 ? <View style={styles.flex}><Button title="Назад" variant="secondary" onPress={() => setStep((value) => value - 1)} disabled={loading} /></View> : null}<View style={styles.flex}><Button testID="onboarding-next" title={step === 4 ? 'Завершить настройку' : 'Продолжить'} onPress={step === 4 ? finish : next} loading={loading} /></View></View>
    </Screen>
  )
}

const Choice = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => <Pressable style={[styles.choice, active && styles.choiceActive]} onPress={onPress}><Text style={[styles.choiceText, active && styles.choiceTextActive]}>{label}</Text></Pressable>
const Check = ({ checked }: { checked: boolean }) => <View style={[styles.checkbox, checked && styles.checkboxActive]}><Text style={styles.checkmark}>{checked ? '✓' : ''}</Text></View>
const Status = ({ title, text, tone = 'neutral' }: { title: string; text: string; tone?: 'neutral' | 'success' | 'warning' | 'danger' }) => <View style={[styles.status, tone === 'success' && styles.statusSuccess, tone === 'warning' && styles.statusWarning, tone === 'danger' && styles.statusDanger]}><Text style={styles.checkTitle}>{title}</Text><Text style={styles.presetDescription}>{text}</Text></View>
const styles = StyleSheet.create({
  progress: { height: 5, borderRadius: 3, backgroundColor: colors.surfaceMuted, overflow: 'hidden' }, progressFill: { height: 5, backgroundColor: colors.primary }, explanation: { color: colors.text, fontSize: 14, lineHeight: 21 }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, choice: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted }, choiceActive: { backgroundColor: colors.primary }, choiceText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' }, choiceTextActive: { color: '#fff' }, preset: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: 'transparent' }, presetActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft }, presetTitle: { color: colors.text, fontSize: 14, fontWeight: '700' }, presetDescription: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginTop: 3 }, warning: { color: colors.warning, backgroundColor: colors.warningSoft, padding: spacing.md, borderRadius: radius.md, fontSize: 12, lineHeight: 18 }, checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }, checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, checkboxActive: { backgroundColor: colors.primary, borderColor: colors.primary }, checkmark: { color: '#fff', fontWeight: '800' }, checkTitle: { color: colors.text, fontSize: 14, fontWeight: '700' }, flex: { flex: 1 }, actions: { flexDirection: 'row', gap: spacing.sm }, status: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceMuted }, statusSuccess: { backgroundColor: colors.successSoft }, statusWarning: { backgroundColor: colors.warningSoft }, statusDanger: { backgroundColor: colors.dangerSoft },
})
