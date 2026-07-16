import * as SecureStore from 'expo-secure-store'
import { api } from '../api/client'
import { getStoredPushToken, setStoredPushToken } from './preferences'

const PENDING_UNSUBSCRIBE_KEY = 'artistcrm.push.pending-unsubscribe'

type PendingPushUnsubscribe = {
  pushToken: string
  createdAt: string
}

const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
}

export const getPendingPushUnsubscribe = async (): Promise<PendingPushUnsubscribe | null> => {
  const raw = await SecureStore.getItemAsync(PENDING_UNSUBSCRIBE_KEY)
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as PendingPushUnsubscribe
    return value.pushToken ? value : null
  } catch {
    await SecureStore.deleteItemAsync(PENDING_UNSUBSCRIBE_KEY)
    return null
  }
}

export const queuePendingPushUnsubscribe = async (pushToken: string) => {
  const normalized = String(pushToken || '').trim()
  if (!normalized) return false
  await SecureStore.setItemAsync(
    PENDING_UNSUBSCRIBE_KEY,
    JSON.stringify({ pushToken: normalized, createdAt: new Date().toISOString() }),
    secureOptions
  )
  return true
}

export const clearPendingPushUnsubscribe = () =>
  SecureStore.deleteItemAsync(PENDING_UNSUBSCRIBE_KEY)

export const flushPendingPushUnsubscribe = async () => {
  const pending = await getPendingPushUnsubscribe()
  if (!pending) return false
  await api.post('/push/expo/unsubscribe', { pushToken: pending.pushToken })
  const currentToken = await getStoredPushToken()
  if (currentToken === pending.pushToken) await setStoredPushToken(null)
  await clearPendingPushUnsubscribe()
  return true
}

