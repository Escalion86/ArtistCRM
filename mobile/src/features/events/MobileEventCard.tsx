import { Pressable, StyleSheet, Text, View } from 'react-native'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import type { Client, Event, Service, Transaction } from '../../shared/domain/types'
import { StatusChip, Surface } from '../../shared/ui/components'
import { colors, radius, spacing } from '../../shared/ui/theme'
import type { EventCalendarOccurrence } from './calendar'
import {
  formatEventCardDate,
  formatEventCardMoney,
  getEventCardAddress,
  getEventCardAttention,
  getEventCardClientName,
  getEventCardFinance,
  getEventCardStatus,
  getEventCardTitle,
  type EventCardTone,
} from './eventCard'

type Props = {
  event: Event
  client?: Client
  services: Service[]
  transactions: Transaction[]
  occurrence?: EventCalendarOccurrence
  testID: string
  onPress: () => void
}

const markerColors = {
  danger: colors.danger,
  success: colors.success,
  warning: colors.warning,
  neutral: '#9A9CA1',
  blue: colors.blue,
} as const

const attentionStyles = {
  neutral: { backgroundColor: colors.surfaceMuted, color: colors.textMuted },
  success: { backgroundColor: colors.successSoft, color: colors.success },
  warning: { backgroundColor: colors.warningSoft, color: colors.warning },
  danger: { backgroundColor: colors.dangerSoft, color: colors.danger },
  blue: { backgroundColor: colors.blueSoft, color: colors.blue },
} as const

export const MobileEventCard = ({
  event,
  client,
  services,
  transactions,
  occurrence,
  testID,
  onPress,
}: Props) => {
  const status = getEventCardStatus(event)
  const finance = getEventCardFinance(event, transactions)
  const attention = getEventCardAttention(event, transactions)
  const address = getEventCardAddress(event)
  const otherContactsCount = (event.otherContacts || []).filter(
    (contact) => contact.clientId
  ).length
  const selectedContact = occurrence?.kind === 'contact'
    ? {
        label: occurrence.title || 'Следующий контакт',
        tone: occurrence.done ? 'success' as EventCardTone : 'blue' as EventCardTone,
        hiddenCount: 0,
      }
    : null
  const displayedAttention = selectedContact || attention
  const isFinished = event.status === 'closed' || event.status === 'canceled'
  const financeLabel =
    isFinished ? 'Итог' : 'Оплачено / договор'
  const toneStyle = displayedAttention
    ? attentionStyles[displayedAttention.tone]
    : attentionStyles.neutral
  const hasIndicators = Boolean(
    event.isTransferred ||
      event.isByContract ||
      event.calendarSyncError ||
      !client ||
      attention?.overdueCount
  )

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${getEventCardTitle(event, services)}, ${status.label}`}
      testID={testID}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed]}
      onPress={onPress}
    >
      <Surface style={styles.card}>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.statusMarker, { backgroundColor: markerColors[status.marker] }]}
        />
        <View style={styles.header}>
          <View style={styles.titleArea}>
            {hasIndicators ? <View style={styles.indicators}>
              {event.isTransferred ? (
                <MaterialCommunityIcons name="share-outline" size={16} color={colors.warning} />
              ) : null}
              {event.isByContract ? (
                <MaterialCommunityIcons name="file-document-check-outline" size={16} color={colors.blue} />
              ) : null}
              {event.calendarSyncError ? (
                <MaterialCommunityIcons name="calendar-alert" size={16} color={colors.danger} />
              ) : null}
              {!client ? (
                <MaterialCommunityIcons name="account-off-outline" size={16} color={colors.danger} />
              ) : null}
              {attention?.overdueCount ? (
                <View style={styles.overdueBadge}>
                  <Text style={styles.overdueBadgeText}>{attention.overdueCount}</Text>
                </View>
              ) : null}
            </View> : null}
            <Text style={styles.title} numberOfLines={2}>
              {getEventCardTitle(event, services)}
            </Text>
          </View>
          <StatusChip label={status.label} tone={status.tone} />
        </View>

        <View style={styles.dateRow}>
          <MaterialCommunityIcons name="calendar-outline" size={18} color={colors.text} />
          <Text style={styles.dateText}>{formatEventCardDate(event.eventDate)}</Text>
        </View>

        {displayedAttention ? (
          <View style={styles.attentionRow}>
            <View style={[styles.attention, { backgroundColor: toneStyle.backgroundColor }]}>
              <MaterialCommunityIcons
                name={selectedContact?.tone === 'success' ? 'check-circle-outline' : 'clock-alert-outline'}
                size={16}
                color={toneStyle.color}
              />
              <Text style={[styles.attentionText, { color: toneStyle.color }]} numberOfLines={1}>
                {displayedAttention.label}
              </Text>
            </View>
            {displayedAttention.hiddenCount > 0 ? (
              <View style={[styles.moreBadge, { backgroundColor: toneStyle.backgroundColor }]}>
                <Text style={[styles.moreBadgeText, { color: toneStyle.color }]}>
                  +{displayedAttention.hiddenCount}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {address ? (
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={17} color={colors.textMuted} />
            <Text style={styles.metaText} numberOfLines={1}>{address}</Text>
          </View>
        ) : null}
        <View style={styles.metaRow}>
          <MaterialCommunityIcons
            name={client ? 'account-outline' : 'account-alert-outline'}
            size={17}
            color={client ? colors.textMuted : colors.danger}
          />
          <Text style={[styles.metaText, !client && styles.missing]} numberOfLines={1}>
            {getEventCardClientName(client)}
          </Text>
          {otherContactsCount > 0 ? (
            <View style={styles.contactsBadge}>
              <Text style={styles.contactsBadgeText}>+{otherContactsCount}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.financeRow}>
          <Text style={styles.financeLabel}>{financeLabel}</Text>
          {isFinished ? (
            <Text style={[styles.financeValue, finance.net > 0 ? styles.financePaid : styles.financeMuted]}>
              {formatEventCardMoney(finance.net)}
            </Text>
          ) : finance.paid > 0 || finance.contractSum > 0 ? (
            <Text style={styles.financeValue}>
              {finance.paid > 0 ? (
                <Text style={styles.financePaid}>{formatEventCardMoney(finance.paid)}</Text>
              ) : null}
              {finance.paid > 0 && finance.contractSum > 0 ? (
                <Text style={styles.financeSeparator}> / </Text>
              ) : null}
              {finance.contractSum > 0 ? (
                <Text style={styles.financeContract}>{formatEventCardMoney(finance.contractSum)}</Text>
              ) : null}
            </Text>
          ) : (
            <Text style={[styles.financeValue, styles.financeMuted]}>—</Text>
          )}
        </View>
      </Surface>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  pressable: { width: '100%' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.995 }] },
  card: {
    position: 'relative',
    overflow: 'hidden',
    gap: 8,
    paddingTop: 13,
    paddingRight: 13,
    paddingBottom: 11,
    paddingLeft: 17,
    borderRadius: radius.md,
  },
  statusMarker: {
    position: 'absolute',
    top: 12,
    bottom: 12,
    left: 0,
    width: 4,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  titleArea: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },
  indicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: 2,
  },
  title: { flex: 1, color: colors.text, fontSize: 16, lineHeight: 21, fontWeight: '800' },
  overdueBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
  },
  overdueBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dateText: { flex: 1, color: colors.text, fontSize: 14, fontWeight: '700' },
  attentionRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  attention: {
    minWidth: 0,
    flex: 1,
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    borderRadius: radius.pill,
  },
  attentionText: { flex: 1, fontSize: 11, fontWeight: '800' },
  moreBadge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  moreBadgeText: { fontSize: 11, fontWeight: '800' },
  metaRow: { minHeight: 22, flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { flex: 1, color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  missing: { color: colors.danger },
  contactsBadge: {
    minWidth: 25,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
  },
  contactsBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  financeRow: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: 2,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  financeLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  financeValue: { color: colors.text, fontSize: 13, fontWeight: '800' },
  financePaid: { color: colors.success },
  financeContract: { color: colors.blue },
  financeSeparator: { color: colors.textMuted },
  financeMuted: { color: colors.textMuted },
})
