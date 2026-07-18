import { useCallback, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import * as WebBrowser from 'expo-web-browser'
import { api } from '../../src/shared/api/client'
import { useAuth } from '../../src/shared/auth/AuthProvider'
import {
  formatBalanceRunway,
  formatBillingDate,
  formatRubles,
  getTariffFeatures,
} from '../../src/features/billing/format'
import type {
  MobileBilling,
  MobileTariff,
} from '../../src/features/billing/types'
import {
  Button,
  ErrorNotice,
  Field,
  PageHeader,
  SectionTitle,
  StatusChip,
  Surface,
  Screen,
} from '../../src/shared/ui/components'
import { colors, radius, spacing } from '../../src/shared/ui/theme'

const quickAmounts = [500, 1000, 3000]

export default function BillingScreen() {
  const { refreshUser } = useAuth()
  const [billing, setBilling] = useState<MobileBilling | null>(null)
  const [amount, setAmount] = useState('1000')
  const [pendingPaymentId, setPendingPaymentId] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get<{ success: true; data: MobileBilling }>(
        '/mobile/v1/billing'
      )
      setBilling(response.data)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Не удалось загрузить тариф и баланс'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load])
  )

  const syncPayment = async (paymentId = pendingPaymentId) => {
    if (!paymentId) return
    setBusy(true)
    setError('')
    try {
      const response = await api.post<{
        success: true
        data: { billing: MobileBilling; paymentStatus: string }
      }>(`/mobile/v1/billing/topup/${paymentId}/sync`)
      setBilling(response.data.billing)
      if (response.data.paymentStatus === 'succeeded') {
        setPendingPaymentId('')
        setMessage('Баланс пополнен')
      } else {
        setMessage('Платёж ещё обрабатывается. Проверьте его немного позже.')
      }
      await refreshUser().catch(() => undefined)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Не удалось проверить платёж'
      )
    } finally {
      setBusy(false)
    }
  }

  const topUp = async () => {
    const normalizedAmount = Number(String(amount).replace(',', '.'))
    if (!Number.isFinite(normalizedAmount) || normalizedAmount < 100) {
      setError('Минимальная сумма пополнения — 100 ₽')
      return
    }
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await api.post<{
        success: true
        data: { paymentId: string; confirmationUrl: string }
      }>('/mobile/v1/billing/topup', { amount: normalizedAmount })
      setPendingPaymentId(response.data.paymentId)
      await WebBrowser.openBrowserAsync(response.data.confirmationUrl)
      await syncPayment(response.data.paymentId)
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Не удалось создать платёж'
      )
    } finally {
      setBusy(false)
    }
  }

  const selectTariff = (tariff: MobileTariff) => {
    const quote = tariff.change
    if (!quote || quote.current || quote.blockedReason) return
    if (quote.missingAmount > 0) {
      const missing = Math.ceil(quote.missingAmount)
      setAmount(String(Math.max(missing, 100)))
      setMessage(`Для тарифа «${tariff.title}» пополните баланс минимум на ${formatRubles(missing)}.`)
      return
    }
    const details = [
      quote.creditAmount > 0
        ? `Компенсация за текущий тариф: ${formatRubles(quote.creditAmount)}.`
        : '',
      tariff.price > 0
        ? `Будет списано ${formatRubles(tariff.price)}.`
        : 'Переход бесплатный.',
      `После смены останется ${formatRubles(quote.balanceAfter)}.`,
    ]
      .filter(Boolean)
      .join(' ')
    Alert.alert(`Перейти на «${tariff.title}»?`, details, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Сменить тариф',
        onPress: async () => {
          setBusy(true)
          setError('')
          try {
            const response = await api.post<{
              success: true
              data: MobileBilling
            }>('/mobile/v1/billing', { tariffId: tariff._id })
            setBilling(response.data)
            setMessage(`Тариф «${tariff.title}» подключён`)
            await refreshUser().catch(() => undefined)
          } catch (reason) {
            setError(
              reason instanceof Error
                ? reason.message
                : 'Не удалось сменить тариф'
            )
          } finally {
            setBusy(false)
          }
        },
      },
    ])
  }

  return (
    <Screen>
      <PageHeader
        title="Тариф и баланс"
        subtitle="Пополнение, прогноз и доступные тарифы"
      />
      {error ? <ErrorNotice message={error} /> : null}
      {message ? <Surface style={styles.message}><Text style={styles.messageText}>{message}</Text></Surface> : null}
      {loading && !billing ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : billing ? (
        <>
          <Surface style={styles.balanceCard}>
            <View style={styles.titleRow}>
              <View>
                <Text style={styles.eyebrow}>ТЕКУЩИЙ БАЛАНС</Text>
                <Text style={styles.balance}>{formatRubles(billing.account.balance)}</Text>
              </View>
              <View style={styles.balanceIcon}><MaterialCommunityIcons name="wallet-outline" size={25} color={colors.primary} /></View>
            </View>
            <Text style={styles.runway}>{formatBalanceRunway(billing)}</Text>
            {billing.account.tariffActiveUntil ? <Text style={styles.muted}>Текущий период оплачен до {formatBillingDate(billing.account.tariffActiveUntil)}</Text> : null}
          </Surface>

          <Surface>
            <SectionTitle>Пополнить баланс</SectionTitle>
            <View style={styles.quickAmounts}>
              {quickAmounts.map((value) => <Pressable key={value} style={[styles.quickAmount, amount === String(value) && styles.quickAmountActive]} onPress={() => setAmount(String(value))}><Text style={[styles.quickAmountText, amount === String(value) && styles.quickAmountTextActive]}>{formatRubles(value)}</Text></Pressable>)}
            </View>
            <Field label="Сумма, ₽" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
            <Button title="Перейти к оплате" onPress={topUp} loading={busy} />
            {pendingPaymentId ? <Button title="Проверить последний платёж" variant="secondary" onPress={() => syncPayment()} loading={busy} /> : null}
            <Text style={styles.muted}>Оплата проходит на защищённой странице ЮKassa. После подтверждения вернитесь в приложение.</Text>
          </Surface>

          <Surface>
            <View style={styles.titleRow}>
              <View style={styles.grow}>
                <Text style={styles.eyebrow}>ТЕКУЩИЙ ТАРИФ</Text>
                <Text style={styles.currentTariff}>{billing.currentTariff?.title || 'Не выбран'}</Text>
              </View>
              <StatusChip label="Подключён" tone="success" />
            </View>
            {billing.currentTariff ? <Text style={styles.muted}>{billing.currentTariff.price > 0 ? `${formatRubles(billing.currentTariff.price)} в месяц` : 'Бесплатный тариф'}{billing.currentTariff.eventsPerMonth > 0 ? ` · до ${billing.currentTariff.eventsPerMonth} мероприятий` : ' · без лимита мероприятий'}</Text> : null}
          </Surface>

          <View style={styles.tariffsSection}>
            <SectionTitle>Сменить тариф</SectionTitle>
            {billing.tariffs.map((tariff) => {
              const quote = tariff.change
              const features = getTariffFeatures(tariff)
              const disabled = busy || Boolean(quote?.current || quote?.blockedReason)
              const buttonTitle = quote?.current
                ? 'Текущий тариф'
                : quote?.missingAmount
                  ? `Пополнить на ${formatRubles(Math.ceil(quote.missingAmount))}`
                  : 'Выбрать тариф'
              return (
                <Surface key={tariff._id} style={quote?.current ? styles.currentCard : undefined}>
                  <View style={styles.titleRow}><View style={styles.grow}><Text style={styles.tariffTitle}>{tariff.title}</Text><Text style={styles.tariffPrice}>{tariff.price > 0 ? `${formatRubles(tariff.price)}/мес` : 'Бесплатно'}</Text></View>{quote?.current ? <StatusChip label="Текущий" tone="success" /> : null}</View>
                  <Text style={styles.muted}>{tariff.eventsPerMonth > 0 ? `До ${tariff.eventsPerMonth} мероприятий в месяц` : 'Без ограничений по мероприятиям'}</Text>
                  {features.length ? <Text style={styles.features}>{features.join(' · ')}</Text> : null}
                  {quote?.creditAmount ? <Text style={styles.credit}>Компенсация за текущий тариф: {formatRubles(quote.creditAmount)}</Text> : null}
                  {quote?.blockedReason ? <Text style={styles.warning}>{quote.blockedReason}</Text> : null}
                  <Button title={buttonTitle} variant={quote?.current ? 'secondary' : 'primary'} disabled={disabled} onPress={() => selectTariff(tariff)} />
                </Surface>
              )
            })}
          </View>
        </>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  eyebrow: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  balanceCard: { backgroundColor: colors.primarySoft },
  balance: { color: colors.text, fontSize: 32, fontWeight: '800', marginTop: spacing.xs },
  balanceIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  runway: { color: colors.text, fontSize: 14, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  message: { backgroundColor: colors.successSoft },
  messageText: { color: colors.success, fontSize: 13, fontWeight: '700' },
  quickAmounts: { flexDirection: 'row', gap: spacing.sm },
  quickAmount: { flex: 1, minHeight: 40, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
  quickAmountActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  quickAmountText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  quickAmountTextActive: { color: colors.primary },
  currentTariff: { color: colors.text, fontSize: 22, fontWeight: '800', marginTop: spacing.xs },
  tariffsSection: { gap: spacing.md },
  currentCard: { borderColor: colors.success },
  tariffTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  tariffPrice: { color: colors.primary, fontSize: 16, fontWeight: '700', marginTop: spacing.xs },
  features: { color: colors.text, fontSize: 13, lineHeight: 20 },
  credit: { color: colors.success, fontSize: 13, fontWeight: '700' },
  warning: { color: colors.warning, fontSize: 13, fontWeight: '700' },
})
