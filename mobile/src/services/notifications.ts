import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { router } from 'expo-router'
import { getAuthToken } from '../auth/tokenStore'
import { env } from '../config/env'

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

/**
 * Register for push notifications and save token to server
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device')
    return null
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission not granted')
    return null
  }

  const tokenData = await Notifications.getExpoPushTokenAsync()
  const token = tokenData.data

  // Save token to server
  await saveTokenToServer(token)

  // Android channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    })
  }

  return token
}

/**
 * Save push token to server
 */
async function saveTokenToServer(token: string): Promise<void> {
  const authToken = await getAuthToken()
  if (!authToken) return

  try {
    const response = await fetch(`${env.apiBaseUrl}/push/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        subscription: {
          endpoint: `https://exp.host/--/api/v2/push/send`,
          keys: {
            p256dh: token,
            auth: token,
          },
        },
      }),
    })
    if (!response.ok) {
      console.warn('Failed to save push token to server')
    }
  } catch (error) {
    console.warn('Error saving push token:', error)
  }
}

interface NotificationData {
  type?: string
  clientId?: string
  url?: string
}

/**
 * Handle notification tap - navigate based on notification data
 */
export function handleNotificationTap(response: Notifications.NotificationResponse): void {
  const data = response.notification.request.content.data as NotificationData | undefined
  if (!data) return

  const { type, clientId, url } = data

  if (url) {
    router.push(url as any)
    return
  }

  if (type === 'contact_created' || type === 'contact_updated') {
    if (clientId) {
      router.push(`/clients/${clientId}` as any)
    } else {
      router.push('/clients' as any)
    }
  }
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

  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      handleNotificationTap(response)
    }
  )

  return () => {
    foregroundSubscription.remove()
    responseSubscription.remove()
  }
}

/**
 * Get contact push preferences from server
 */
export async function getContactPushPreferences(): Promise<{
  created: boolean
  updated: boolean
} | null> {
  const authToken = await getAuthToken()
  if (!authToken) return null

  try {
    const response = await fetch(`${env.apiBaseUrl}/push/contacts`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
    if (!response.ok) return null
    const data = await response.json()
    return data.data
  } catch (error) {
    console.warn('Error fetching contact push preferences:', error)
    return null
  }
}

/**
 * Update contact push preferences on server
 */
export async function updateContactPushPreferences(preferences: {
  created?: boolean
  updated?: boolean
}): Promise<boolean> {
  const authToken = await getAuthToken()
  if (!authToken) return false

  try {
    const response = await fetch(`${env.apiBaseUrl}/push/contacts`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(preferences),
    })
    return response.ok
  } catch (error) {
    console.warn('Error updating contact push preferences:', error)
    return false
  }
}
