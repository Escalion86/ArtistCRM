import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'

interface NotificationData {
  type?: string
  url?: string
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
  if (!data?.url) return

  router.push(data.url as any)
}

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
