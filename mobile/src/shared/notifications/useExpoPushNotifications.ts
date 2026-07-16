import { useEffect, useRef, useCallback } from 'react'
import * as Notifications from 'expo-notifications'
import { Platform, AppState } from 'react-native'
import { router } from 'expo-router'
import * as Application from 'expo-application'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { useQueryClient } from '@tanstack/react-query'
import NetInfo from '@react-native-community/netinfo'
import { api } from '../api/client'
import { performNotificationTaskAction } from './taskActions'
import { createNotificationResponseProcessor } from './responseProcessor'
import { activateExpoPushToken } from './tokenLifecycle'
import {
  flushPendingPushUnsubscribe,
  queuePendingPushUnsubscribe,
} from './pendingUnsubscribe'
import {
  getPushEnabledPreference,
  getStoredPushToken,
  setPushEnabledPreference,
  setStoredPushToken,
} from './preferences'

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.MAX,
  }),
})

const registerPushTokenOnServer = async (token: string) => {
  try {
    await api.post('/push/expo/subscribe', {
      pushToken: token,
      deviceId: Platform.OS === 'android' ? Application.getAndroidId() : '',
      platform: Platform.OS,
      deviceName: Device.modelName || 'Android',
      appVersion: Application.nativeApplicationVersion || '',
    })
    return true
  } catch (error) {
    console.log('Failed to register push token', error)
    return false
  }
}

const TASK_ACTIONS: Record<string, 'complete' | 'postpone_1' | 'postpone_3'> = {
  TASK_COMPLETE: 'complete',
  TASK_TOMORROW: 'postpone_1',
  TASK_3_DAYS: 'postpone_3',
}

const registerNotificationCategories = async () => {
  await Notifications.setNotificationCategoryAsync('task-actions', [
    {
      identifier: 'TASK_COMPLETE',
      buttonTitle: 'Выполнено',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'TASK_TOMORROW',
      buttonTitle: 'На завтра',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'TASK_3_DAYS',
      buttonTitle: 'Через 3 дня',
      options: { opensAppToForeground: true },
    },
  ])
}

const configureAndroidChannel = async () => {
  if (Platform.OS !== 'android') return
  await Notifications.setNotificationChannelAsync('default', {
    name: 'ArtistCRM',
    description: 'Заявки, задачи, звонки и ежедневные напоминания',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF231F7C',
  })
}

const getExpoToken = async (requestPermission: boolean) => {
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus
  if (requestPermission && existingStatus !== 'granted') {
    const result = await Notifications.requestPermissionsAsync()
    finalStatus = result.status
  }
  if (finalStatus !== 'granted') return { token: null, permission: finalStatus }

  await configureAndroidChannel()
  const projectId = Constants.expoConfig?.extra?.eas?.projectId
  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId })
  return { token: tokenData.data, permission: finalStatus }
}

export const getExpoPushDeviceState = async () => {
  const [{ status }, enabled, token] = await Promise.all([
    Notifications.getPermissionsAsync(),
    getPushEnabledPreference(),
    getStoredPushToken(),
  ])
  return { permission: status, enabled, subscribed: Boolean(token) }
}

export const enableExpoPushNotifications = async () => {
  await flushPendingPushUnsubscribe()
  await registerNotificationCategories()
  const { token, permission } = await getExpoToken(true)
  if (!token) return { ok: false, permission, error: 'Разрешение на уведомления не выдано' }
  const registered = await registerPushTokenOnServer(token)
  if (!registered) return { ok: false, permission, error: 'Не удалось зарегистрировать устройство' }
  await Promise.all([setStoredPushToken(token), setPushEnabledPreference(true)])
  return { ok: true, permission, token }
}

export const disableExpoPushNotifications = async () => {
  const token = await getStoredPushToken()
  await setPushEnabledPreference(false)
  if (!token) return { ok: true, pending: false }
  await queuePendingPushUnsubscribe(token)
  try {
    await flushPendingPushUnsubscribe()
    return { ok: true, pending: false }
  } catch {
    return { ok: true, pending: true }
  }
}

const handleNotificationResponse = async (response: Notifications.NotificationResponse) => {
  const data = response?.notification?.request?.content?.data as Record<string, string> | undefined
  const taskAction = TASK_ACTIONS[response.actionIdentifier]
  if (taskAction && data?.eventId && data?.taskId) {
    try {
      await performNotificationTaskAction({
        eventId: data.eventId,
        taskId: data.taskId,
        action: taskAction,
      })
      return { eventChanged: true }
    } catch (error) {
      console.log('Failed to perform notification action', error)
      throw error
    }
  }
  if (!data?.url) return

  const url = data.url
  if (url.includes('openEvent=')) {
    const eventId = new URL(url, 'https://artistcrm.local').searchParams.get('openEvent')
    router.push(eventId ? (`/events/${eventId}` as never) : '/(tabs)/events')
  } else if (url.startsWith('artistcrm://')) {
    router.push(url.replace('artistcrm://', '/') as never)
  } else if (url.includes('/cabinet/')) {
    router.push('/(tabs)')
  } else {
    router.push('/(tabs)')
  }
}

export const useExpoPushNotifications = (enabled = true) => {
  const queryClient = useQueryClient()
  const notificationListener = useRef<Notifications.EventSubscription | null>(null)
  const responseListener = useRef<Notifications.EventSubscription | null>(null)
  const appStateRef = useRef(AppState.currentState)
  const pushTokenRef = useRef<string | null>(null)
  const pushTokenListenerRef = useRef<Notifications.EventSubscription | null>(null)

  const registerForPushNotifications = useCallback(async (): Promise<string | null> => {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device')
      return null
    }

    try {
      const preferenceEnabled = await getPushEnabledPreference()
      if (!preferenceEnabled) return null
      const { token } = await getExpoToken(false)
      if (!token) return null
      const previousToken = pushTokenRef.current || await getStoredPushToken()
      const activated = await activateExpoPushToken(token, previousToken, {
        register: registerPushTokenOnServer,
        store: setStoredPushToken,
      })
      pushTokenRef.current = activated
      return activated
    } catch (error) {
      console.log('Failed to get push token', error)
      return null
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    const processResponse = createNotificationResponseProcessor<Notifications.NotificationResponse>({
      getKey: (response) =>
        `${response.notification.request.identifier}:${response.actionIdentifier}`,
      handle: handleNotificationResponse,
      afterSuccess: async (result) => {
        if (result?.eventChanged) {
          await queryClient.invalidateQueries({ queryKey: ['cached-entities', 'events'] })
        }
        await Notifications.clearLastNotificationResponseAsync().catch(() => undefined)
      },
    })
    const retryLastResponse = () =>
      Notifications.getLastNotificationResponseAsync()
        .then(processResponse)
        .catch((error) => console.log('Failed to handle pending notification', error))

    registerNotificationCategories().catch((error) => {
      console.log('Failed to register notification categories', error)
    })
    registerForPushNotifications()
    flushPendingPushUnsubscribe().catch(() => undefined)
    void retryLastResponse()

    pushTokenListenerRef.current = Notifications.addPushTokenListener(
      (devicePushToken) => {
        void (async () => {
          const preferenceEnabled = await getPushEnabledPreference()
          if (!preferenceEnabled) return
          const projectId = Constants.expoConfig?.extra?.eas?.projectId
          const tokenData = await Notifications.getExpoPushTokenAsync({
            projectId,
            devicePushToken,
          })
          const previousToken = pushTokenRef.current || await getStoredPushToken()
          const activated = await activateExpoPushToken(
            tokenData.data,
            previousToken,
            {
              register: registerPushTokenOnServer,
              store: setStoredPushToken,
            }
          )
          pushTokenRef.current = activated
        })().catch((error) => console.log('Failed to rotate push token', error))
      }
    )

    notificationListener.current = Notifications.addNotificationReceivedListener(
      () => {
        // Notification will be shown automatically by the handler
      }
    )

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        void processResponse(response).catch((error) => {
          console.log('Failed to handle notification response', error)
        })
      }
    )

    const networkSubscription = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        void retryLastResponse()
        flushPendingPushUnsubscribe().catch(() => undefined)
      }
    })

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        void retryLastResponse()
        flushPendingPushUnsubscribe().catch(() => undefined)
        if (pushTokenRef.current) {
          getPushEnabledPreference().then((preferenceEnabled) => {
            if (!preferenceEnabled || !pushTokenRef.current) return
            registerPushTokenOnServer(pushTokenRef.current)
          })
        }
      }
      appStateRef.current = nextAppState
    })

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove()
      }
      if (responseListener.current) {
        responseListener.current.remove()
      }
      if (pushTokenListenerRef.current) {
        pushTokenListenerRef.current.remove()
      }
      networkSubscription()
      subscription?.remove()
    }
  }, [enabled, queryClient, registerForPushNotifications])

  return {
    registerForPushNotifications,
  }
}
