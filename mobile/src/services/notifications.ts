import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'

interface NotificationData {
  type?: string
  url?: string
  mobileUrl?: string
}

/**
 * Handle notification tap - navigate based on notification data
 */
export function handleNotificationTap(
  response: Notifications.NotificationResponse
): void {
  const data = response.notification.request.content.data as
    | NotificationData
    | undefined
  const target = resolveNotificationUrl(data)
  if (!target) return

  router.push(target as any)
}

export const resolveNotificationUrl = (data?: NotificationData) =>
  data?.mobileUrl || data?.url || ''

/**
 * Set up notification listeners (call once in app root)
 */
export function setupNotificationListeners(): () => void {
  const foregroundSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log('Notification received in foreground:', notification)
    }
  )

  const responseSubscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationTap(response)
    })

  return () => {
    foregroundSubscription.remove()
    responseSubscription.remove()
  }
}
