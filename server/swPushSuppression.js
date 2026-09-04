export const ACTIVE_CONVERSATION_TTL_MS = 45 * 1000

// ВАЖНО: функция инжектируется в service worker через .toString()
// (см. server/serviceWorkerScript.js), поэтому она должна быть
// самодостаточной: без импортов и ссылок на внешние константы.
// TTL продублирован литералом в default-параметре осознанно.
export const shouldSuppressIncomingMessagePush = (
  payload,
  activeConversations,
  now,
  ttlMs = 45 * 1000
) => {
  if (payload?.data?.type !== 'incoming_messenger_message') return false
  const key = String(payload?.data?.conversationKey || '')
  if (!key) return false
  const timestamp = activeConversations?.[key]
  if (!timestamp) return false
  return now - timestamp <= ttlMs
}
