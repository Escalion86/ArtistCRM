import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { useAuth } from '../../src/shared/auth/AuthProvider'
import { PageHeader, Screen, SectionTitle, Surface } from '../../src/shared/ui/components'
import { colors, spacing } from '../../src/shared/ui/theme'

const sections = [
  { title: 'Работа', items: [
    ['phone-log-outline', 'Звонки', 'Журнал, записи и результаты', '/more/calls'],
    ['chart-box-outline', 'Статистика', 'Динамика заявок и маржинальность', '/more/statistics'],
    ['briefcase-outline', 'Услуги', 'Услуги и группы', '/more/services'],
    ['file-document-outline', 'Документы', 'Шаблоны, договоры и акты', '/more/documents'],
  ] },
  { title: 'Организация', items: [
    ['sync-alert', 'Синхронизация', 'Очередь, ошибки и конфликты', '/sync'],
    ['format-list-bulleted', 'Списки', 'Пользовательские справочники', '/more/lists'],
    ['bell-outline', 'Уведомления', 'Напоминания и push', '/more/notifications'],
    ['connection', 'Интеграции', 'Календарь, Avito, VK и телефония', '/more/integrations'],
    ['account-cash-outline', 'Рефералы', 'Приглашения и статистика', '/more/referrals'],
  ] },
] as const

export default function MoreScreen() {
  const { user } = useAuth()
  return (
    <Screen>
      <PageHeader title="Ещё" subtitle="Рабочие инструменты и личные настройки" />
      <Pressable onPress={() => router.push('/(tabs)/profile')}>
        <Surface>
          <View style={styles.profile}><View style={styles.avatar}><Text style={styles.avatarText}>{(user?.firstName || user?.phone || '?').slice(0, 1).toUpperCase()}</Text></View><View style={styles.profileText}><Text style={styles.profileName}>{[user?.firstName, user?.secondName].filter(Boolean).join(' ') || 'Профиль'}</Text><Text style={styles.profilePhone}>{user?.phone}</Text></View><MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} /></View>
        </Surface>
      </Pressable>
      {sections.map((section) => <View key={section.title} style={styles.section}><SectionTitle>{section.title}</SectionTitle><Surface>{section.items.map(([iconName, title, subtitle, href], index) => <Pressable key={href} style={[styles.row, index > 0 && styles.rowBorder]} onPress={() => router.push(href as never)}><View style={styles.icon}><MaterialCommunityIcons name={iconName} size={22} color={colors.primary} /></View><View style={styles.rowText}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowSubtitle}>{subtitle}</Text></View><MaterialCommunityIcons name="chevron-right" size={22} color={colors.textMuted} /></Pressable>)}</Surface></View>)}
    </Screen>
  )
}

const styles = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft }, avatarText: { color: colors.primary, fontSize: 21, fontWeight: '800' }, profileText: { flex: 1 }, profileName: { color: colors.text, fontSize: 17, fontWeight: '700' }, profilePhone: { color: colors.textMuted, fontSize: 13, marginTop: 3 },
  section: { gap: spacing.sm }, row: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: spacing.md }, rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }, icon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }, rowText: { flex: 1 }, rowTitle: { color: colors.text, fontSize: 14, fontWeight: '700' }, rowSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
})
