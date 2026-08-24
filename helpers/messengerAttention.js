const toTimestamp = (value) => {
  const timestamp = value ? new Date(value).getTime() : 0
  return Number.isFinite(timestamp) ? timestamp : 0
}

export const mergeUnreadConversations = (providerGroups = []) => {
  const byKey = new Map()

  for (const group of providerGroups) {
    const provider = String(group?.provider || '')
    for (const conversation of group?.items || []) {
      const unreadCount = Math.max(0, Number(conversation?.unreadCount || 0))
      if (!provider || unreadCount === 0) continue
      const clientId = String(conversation?.clientId || '')
      const conversationId = String(conversation?._id || '')
      const key = clientId || `${provider}:${conversationId}`
      if (!key) continue

      const current = byKey.get(key) || {
        key,
        clientId,
        clientName: '',
        unreadCount: 0,
        providers: [],
        eventIds: [],
        lastMessageText: '',
        lastMessageAt: null,
      }
      current.unreadCount += unreadCount
      if (!current.providers.includes(provider)) current.providers.push(provider)

      const eventId = String(conversation?.eventId || '')
      if (eventId && !current.eventIds.includes(eventId)) {
        current.eventIds.push(eventId)
      }

      const isLatest =
        toTimestamp(conversation?.lastMessageAt) >=
        toTimestamp(current.lastMessageAt)
      if (isLatest) {
        current.clientName = String(conversation?.clientName || '').trim()
        current.lastMessageText = String(
          conversation?.lastMessageText || ''
        ).trim()
        current.lastMessageAt = conversation?.lastMessageAt || null
      }
      byKey.set(key, current)
    }
  }

  return Array.from(byKey.values()).sort(
    (a, b) => toTimestamp(b.lastMessageAt) - toTimestamp(a.lastMessageAt)
  )
}
