export const MESSENGER_EXPO_PUSH_WINDOW_MS = 2 * 60 * 1000

export const shouldSendExpoPushForConversation = ({
  lastPushAt,
  now = Date.now(),
  windowMs = MESSENGER_EXPO_PUSH_WINDOW_MS,
} = {}) => {
  if (!lastPushAt) return true
  const timestamp = new Date(lastPushAt).getTime()
  if (Number.isNaN(timestamp)) return true
  return now - timestamp >= windowMs
}
