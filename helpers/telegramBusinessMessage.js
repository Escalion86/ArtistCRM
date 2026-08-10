export const getTelegramBusinessMessageDirection = ({
  message,
  businessAccountUserId,
}) => {
  if (message?.sender_business_bot) return 'outgoing'

  const senderId = String(message?.from?.id || '')
  const chatId = String(message?.chat?.id || '')
  const accountUserId = String(businessAccountUserId || '')

  if (accountUserId && senderId === accountUserId) return 'outgoing'

  // В личном Business-чате chat.id принадлежит собеседнику. Поэтому сообщение
  // владельца бизнес-аккаунта имеет другой from.id даже без сохранённого ID аккаунта.
  if (senderId && chatId && senderId !== chatId) return 'outgoing'

  return 'incoming'
}
