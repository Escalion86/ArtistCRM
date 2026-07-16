import { useEffect, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { api } from '../../../src/shared/api/client'
import type {
  Conversation,
  ConversationMessage,
  ConversationProvider,
} from '../../../src/shared/domain/types'
import {
  Button,
  EmptyState,
  ErrorNotice,
  Field,
  PageHeader,
  Screen,
  StatusChip,
  Surface,
} from '../../../src/shared/ui/components'
import { colors, radius, spacing } from '../../../src/shared/ui/theme'

export default function ConversationScreen() {
  const params = useLocalSearchParams<{ provider: ConversationProvider; id: string }>()
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const path = `/mobile/v1/conversations/${params.provider}/${params.id}`
  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const response = await api.get<{
        success: true
        data: { conversation: Omit<Conversation, 'provider'>; messages: ConversationMessage[] }
      }>(`${path}/messages`)
      setConversation({ ...response.data.conversation, provider: params.provider })
      setMessages(response.data.messages)
      await api.patch(path, { markRead: true }).catch(() => undefined)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось загрузить переписку')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { void load() }, [params.id, params.provider])

  const send = async () => {
    if (!text.trim()) return
    setLoading(true)
    setError('')
    try {
      const response = await api.post<{
        success: true
        data: { message: ConversationMessage }
      }>(`${path}/messages`, { text: text.trim() })
      setMessages((items) => [...items, response.data.message])
      setText('')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось отправить сообщение')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (status: NonNullable<Conversation['status']>) => {
    setLoading(true)
    setError('')
    try {
      const response = await api.patch<{
        success: true
        data: Omit<Conversation, 'provider'>
      }>(path, { status })
      setConversation({ ...response.data, provider: params.provider })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось изменить статус диалога')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Screen>
      <PageHeader
        title={conversation?.clientName || (params.provider === 'avito' ? 'Диалог Avito' : 'Диалог VK')}
        subtitle={params.provider === 'avito' ? conversation?.avitoItemTitle || 'Avito' : 'Сообщество VK'}
        action={conversation?.status ? (
          <StatusChip
            label={conversation.status === 'open' ? 'В работе' : conversation.status === 'closed' ? 'Закрыт' : 'Игнорируется'}
            tone={conversation.status === 'open' ? 'success' : 'neutral'}
          />
        ) : null}
      />
      {conversation?.clientId || conversation?.eventId ? (
        <View style={styles.links}>
          {conversation.clientId ? (
            <Pressable style={styles.link} onPress={() => router.push(`/clients/${conversation.clientId}` as never)}>
              <MaterialCommunityIcons name="account-outline" size={18} color={colors.primary} />
              <Text style={styles.linkText}>Клиент</Text>
            </Pressable>
          ) : null}
          {conversation.eventId ? (
            <Pressable style={styles.link} onPress={() => router.push(`/events/${conversation.eventId}` as never)}>
              <MaterialCommunityIcons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={styles.linkText}>Мероприятие</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {error ? <ErrorNotice message={error} /> : null}
      {messages.length ? messages.map((message) => (
        <View
          key={message._id}
          style={[
            styles.bubble,
            message.direction === 'outgoing' ? styles.outgoing : styles.incoming,
          ]}
        >
          <Text style={styles.messageText}>{message.text || 'Вложение'}</Text>
          <Text style={styles.messageMeta}>
            {message.sentAt ? new Date(message.sentAt).toLocaleString('ru-RU') : ''}
            {message.status === 'failed' ? ' · ошибка отправки' : ''}
          </Text>
        </View>
      )) : <EmptyState title="Сообщений нет" description="История появится после синхронизации канала." />}
      <Surface>
        <Field
          label="Сообщение"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={4000}
          placeholder="Введите ответ клиенту"
        />
        <Button title="Отправить" onPress={send} loading={loading} disabled={!text.trim()} />
        <Button title="Обновить переписку" variant="secondary" onPress={load} disabled={loading} />
      </Surface>
      {conversation ? (
        <Surface>
          <Text style={styles.sectionTitle}>Статус диалога</Text>
          {conversation.status === 'open' ? (
            <>
              <Button title="Закрыть диалог" variant="secondary" onPress={() => updateStatus('closed')} disabled={loading} />
              <Button title="Игнорировать" variant="secondary" onPress={() => updateStatus('ignored')} disabled={loading} />
            </>
          ) : (
            <Button title="Вернуть в работу" variant="secondary" onPress={() => updateStatus('open')} disabled={loading} />
          )}
        </Surface>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  links: { flexDirection: 'row', gap: spacing.sm },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: colors.primarySoft, borderRadius: radius.pill },
  linkText: { color: colors.primary, fontSize: 12, fontWeight: '700' },
  bubble: { maxWidth: '88%', padding: spacing.md, borderRadius: radius.lg, gap: 5 },
  incoming: { alignSelf: 'flex-start', backgroundColor: colors.surface },
  outgoing: { alignSelf: 'flex-end', backgroundColor: colors.primarySoft },
  messageText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  messageMeta: { color: colors.textMuted, fontSize: 10 },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
})
