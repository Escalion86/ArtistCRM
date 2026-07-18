import { useEffect, useState } from 'react'
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { api } from '../../src/shared/api/client'
import { useAuth } from '../../src/shared/auth/AuthProvider'
import { getRefreshToken } from '../../src/shared/auth/tokenStore'
import type { AuthSession } from '../../src/shared/auth/types'
import {
  Button,
  ErrorNotice,
  Field,
  PageHeader,
  Screen,
  SectionTitle,
  Surface,
} from '../../src/shared/ui/components'
import { colors } from '../../src/shared/ui/theme'
import { ArtistRequisitesSection } from '../../src/features/profile/ArtistRequisitesSection'

type DeviceSession = {
  _id: string
  deviceName?: string
  platform?: string
  appVersion?: string
  lastUsedAt?: string
  createdAt?: string
  expiresAt?: string
  current?: boolean
}

const formatSessionDate = (value?: string) =>
  value
    ? new Date(value).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'нет данных'

export default function ProfileScreen() {
  const { user, signOut, refreshUser, completeSignIn } = useAuth()
  const [firstName, setFirstName] = useState(user?.firstName || '')
  const [secondName, setSecondName] = useState(user?.secondName || '')
  const [thirdName, setThirdName] = useState(user?.thirdName || '')
  const [email, setEmail] = useState(user?.email || '')
  const [whatsapp, setWhatsapp] = useState(user?.whatsapp || '')
  const [viber, setViber] = useState(user?.viber || '')
  const [telegram, setTelegram] = useState(user?.telegram || '')
  const [vk, setVk] = useState(user?.vk || '')
  const [instagram, setInstagram] = useState(user?.instagram || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [sessions, setSessions] = useState<DeviceSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sessionsError, setSessionsError] = useState('')
  const [revokingSessionId, setRevokingSessionId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    setFirstName(user?.firstName || '')
    setSecondName(user?.secondName || '')
    setThirdName(user?.thirdName || '')
    setEmail(user?.email || '')
    setWhatsapp(user?.whatsapp || '')
    setViber(user?.viber || '')
    setTelegram(user?.telegram || '')
    setVk(user?.vk || '')
    setInstagram(user?.instagram || '')
  }, [user])

  const loadSessions = async () => {
    setSessionsLoading(true)
    setSessionsError('')
    try {
      const response = await api.get<{ success: true; data: DeviceSession[] }>(
        '/mobile/v1/auth/sessions'
      )
      setSessions(response.data)
    } catch (reason) {
      setSessionsError(
        reason instanceof Error
          ? reason.message
          : 'Не удалось загрузить устройства'
      )
    } finally {
      setSessionsLoading(false)
    }
  }
  useEffect(() => {
    void loadSessions()
  }, [])

  const save = async () => {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      await api.patch('/mobile/v1/auth/me', {
        firstName,
        secondName,
        thirdName,
        email,
        whatsapp,
        viber,
        telegram,
        vk,
        instagram,
      })
      await refreshUser()
      setMessage('Профиль сохранён')
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Не удалось сохранить профиль'
      )
    } finally {
      setLoading(false)
    }
  }
  const changePassword = async () => {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const response = await api.post<{ success: true; data: AuthSession }>(
        '/mobile/v1/auth/change-password',
        { currentPassword, newPassword }
      )
      await completeSignIn(response.data)
      setCurrentPassword('')
      setNewPassword('')
      await loadSessions()
      setMessage('Пароль изменён, остальные устройства отключены')
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Не удалось сменить пароль'
      )
    } finally {
      setLoading(false)
    }
  }
  const revoke = async (sessionId: string) => {
    setError('')
    setMessage('')
    setRevokingSessionId(sessionId)
    try {
      const response = await api.delete<{
        success: true
        data: { revoked: boolean }
      }>('/mobile/v1/auth/sessions', { sessionId })
      if (response.data.revoked) {
        setSessions((items) => items.filter((item) => item._id !== sessionId))
        setMessage(
          'Устройство отключено вместе с push и фоновой синхронизацией'
        )
      } else {
        await loadSessions()
        setMessage('Устройство уже было отключено')
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Не удалось отключить устройство'
      )
    } finally {
      setRevokingSessionId('')
    }
  }
  const confirmRevoke = (session: DeviceSession) =>
    Alert.alert(
      'Отключить устройство?',
      `${session.deviceName || 'Android-устройство'} потеряет доступ к CRM, push-уведомлениям и фоновой синхронизации.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Отключить',
          style: 'destructive',
          onPress: () => void revoke(session._id),
        },
      ]
    )
  const logout = async () => {
    await signOut()
    router.replace('/(auth)/login')
  }
  const requestDeletion = () =>
    Alert.alert(
      'Удаление аккаунта',
      'Будет создан запрос на полное удаление аккаунта и данных. Все мобильные сессии завершатся.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить аккаунт',
          style: 'destructive',
          onPress: async () => {
            try {
              const refreshToken = await getRefreshToken()
              await api.post('/mobile/v1/auth/delete-account', {
                confirmation: 'УДАЛИТЬ',
                refreshToken,
              })
              await logout()
            } catch (reason) {
              setError(
                reason instanceof Error
                  ? reason.message
                  : 'Не удалось отправить запрос'
              )
            }
          },
        },
      ]
    )

  return (
    <Screen contentStyle={styles.screenContent}>
      <PageHeader title="Профиль" subtitle={user?.phone || ''} />
      <Surface>
        <SectionTitle>Личные данные</SectionTitle>
        <Field label="Имя" value={firstName} onChangeText={setFirstName} />
        <Field
          label="Фамилия"
          value={secondName}
          onChangeText={setSecondName}
        />
        <Field label="Отчество" value={thirdName} onChangeText={setThirdName} />
        <Field
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Field
          label="WhatsApp"
          value={whatsapp}
          onChangeText={setWhatsapp}
          keyboardType="phone-pad"
        />
        <Field
          label="Viber"
          value={viber}
          onChangeText={setViber}
          keyboardType="phone-pad"
        />
        <Field
          label="Telegram"
          value={telegram}
          onChangeText={setTelegram}
          autoCapitalize="none"
          placeholder="username"
        />
        <Field
          label="VK"
          value={vk}
          onChangeText={setVk}
          autoCapitalize="none"
          placeholder="vk.com/username"
        />
        <Field
          label="Instagram"
          value={instagram}
          onChangeText={setInstagram}
          autoCapitalize="none"
          placeholder="instagram.com/username"
        />
        <Button title="Сохранить" onPress={save} loading={loading} />
      </Surface>
      <ArtistRequisitesSection />
      <Surface>
        <SectionTitle>Смена пароля</SectionTitle>
        <Field
          label="Текущий пароль"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
        />
        <Field
          label="Новый пароль"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />
        <Button
          title="Сменить пароль"
          variant="secondary"
          onPress={changePassword}
          loading={loading}
        />
      </Surface>
      {error ? <ErrorNotice message={error} /> : null}
      {message ? (
        <Surface>
          <Text style={styles.success}>{message}</Text>
        </Surface>
      ) : null}
      <Surface>
        <SectionTitle>Активные устройства</SectionTitle>
        {sessionsError ? <ErrorNotice message={sessionsError} /> : null}
        {sessionsError ? (
          <Button
            title="Повторить загрузку"
            variant="secondary"
            onPress={loadSessions}
            loading={sessionsLoading}
          />
        ) : null}
        {sessionsLoading && !sessions.length ? (
          <Text style={styles.muted}>Загружаем список устройств…</Text>
        ) : null}
        {sessions.length ? (
          sessions.map((session) => (
            <View key={session._id} style={styles.device}>
              <View style={styles.sessionBody}>
                <Text style={styles.sessionTitle}>
                  {session.deviceName ||
                    (session.platform === 'android'
                      ? 'Android-устройство'
                      : session.platform || 'Устройство')}
                  {session.current ? ' · текущее' : ''}
                </Text>
                <Text style={styles.sessionMeta}>
                  {session.appVersion
                    ? `ArtistCRM ${session.appVersion} · `
                    : ''}
                  активность {formatSessionDate(session.lastUsedAt)}
                </Text>
                <Text style={styles.sessionMeta}>
                  Сессия действует до {formatSessionDate(session.expiresAt)}
                </Text>
              </View>
              {!session.current ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Отключить ${session.deviceName || 'устройство'}`}
                  hitSlop={10}
                  disabled={Boolean(revokingSessionId)}
                  onPress={() => confirmRevoke(session)}
                >
                  <Text style={styles.revoke}>
                    {revokingSessionId === session._id
                      ? 'Отключаем…'
                      : 'Отключить'}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ))
        ) : !sessionsLoading && !sessionsError ? (
          <Text style={styles.muted}>Активных устройств нет.</Text>
        ) : null}
      </Surface>
      <Button title="Выйти" variant="secondary" onPress={logout} />
      <Button
        title="Удалить аккаунт"
        variant="danger"
        onPress={requestDeletion}
      />
      <Text style={styles.disclaimer}>
        Запрос удаления также доступен на публичной странице ArtistCRM без входа
        в приложение.
      </Text>
    </Screen>
  )
}

const styles = StyleSheet.create({
  screenContent: { paddingBottom: 0 },
  device: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  sessionBody: { flex: 1, gap: 2 },
  sessionTitle: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
  },
  sessionMeta: { color: colors.textMuted, fontSize: 11, lineHeight: 17 },
  revoke: { color: colors.danger, fontSize: 12, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: 13 },
  success: { color: colors.success, fontSize: 13, fontWeight: '700' },
  disclaimer: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
})
