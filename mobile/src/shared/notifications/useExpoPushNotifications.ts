import { useEffect, useRef, useCallback } from 'react'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform, AppState } from 'react-native'
import { router } from 'expo-router'
import { env } from '../config/env'
import { getAuthToken } from '../auth/tokenStore'

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

const registerPushTokenOnServer = async (token) => {
  try {
    const authToken = await getAuthToken()
    if (!authToken) return

    await fetch(`${env.apiBaseUrl.replace(/\/$/, '')}/push/expo/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        pushToken: token,
        deviceId: Device.deviceName || '',
        platform: Platform.OS,
        appVersion: Device.osVersion || '',
      }),
    })
  } catch (error) {
    console.log('Failed to register push token', error)
  }
}

const unregisterPushTokenOnServer = async (token) => {
  try {
    const authToken = await getAuthToken()
    if (!authToken) return

    await fetch(`${env.apiBaseUrl.replace(/\/$/, '')}/push/expo/unsubscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ pushToken: token }),
    })
  } catch (error) {
    console.log('Failed to unregister push token', error)
  }
}

const handleNotificationResponse = (response) => {
  const data = response?.notification?.request?.content?.data
  if (!data?.url) return

  const url = data.url
  if (url.includes('openEvent=')) {
    const eventId = url.split('openEvent=')[1]?.split('&')[0]
    if (eventId) {
      router.push(`/(tabs)/events`)
    }
  } else if (url.includes('/cabinet/')) {
    router.push('/(tabs)/tasks')
  } else {
    router.push('/(tabs)/tasks')
  }
}

export const useExpoPushNotifications = () => {
  const notificationListener = useRef(null)
  const responseListener = useRef(null)
  const appStateRef = useRef(AppState.currentState)
  const pushTokenRef = useRef(null)

  const registerForPushNotifications = useCallback(async () => {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device')
      return null
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied')
      return null
    }

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'your-project-id',
      })
      const token = tokenData.data

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        })
      }

      pushTokenRef.current = token
      await registerPushTokenOnServer(token)
      return token
    } catch (error) {
      console.log('Failed to get push token', error)
      return null
    }
  }, [])

  useEffect(() => {
    registerForPushNotifications()

    // Foreground notification listener
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        // Notification will be shown automatically by the handler
      }
    )

    // Notification tap listener
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        handleNotificationResponse(response)
      }
    )

    // Re-register token when app comes to foreground
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        if (pushTokenRef.current) {
          registerPushTokenOnServer(pushTokenRef.current)
        }
      }
      appStateRef.current = nextAppState
    })

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current)
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current)
      }
      subscription?.remove()
    }
  }, [registerForPushNotifications])

  return {
    registerForPushNotifications,
  }
}
