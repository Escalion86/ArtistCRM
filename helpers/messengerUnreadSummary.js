export const mergeMessengerUnreadGroups = (providerGroups = []) => {
  const byClientId = {}

  for (const groups of providerGroups) {
    for (const item of groups || []) {
      const clientId = String(item?._id || '')
      if (!clientId) continue
      const current = byClientId[clientId] || {
        conversationCount: 0,
        unreadCount: 0,
      }
      current.conversationCount += Math.max(
        0,
        Number(item?.conversationCount || 0)
      )
      current.unreadCount += Math.max(0, Number(item?.unreadCount || 0))
      byClientId[clientId] = current
    }
  }

  return byClientId
}

export const clearMessengerUnreadForClient = (summary, clientId) => {
  if (!summary?.byClientId || !clientId) return summary
  const key = String(clientId)
  const current = summary.byClientId[key]
  if (!current) return summary

  return {
    ...summary,
    byClientId: {
      ...summary.byClientId,
      [key]: { ...current, unreadCount: 0 },
    },
  }
}
