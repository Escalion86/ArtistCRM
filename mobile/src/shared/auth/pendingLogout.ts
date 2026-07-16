import * as SecureStore from 'expo-secure-store'
import { api } from '../api/client'

const PENDING_LOGOUT_KEY = 'artistcrm.auth.pending-logout'

type PendingLogout = {
  refreshToken: string
  createdAt: string
}

const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
}

export const getPendingLogout = async (): Promise<PendingLogout | null> => {
  const raw = await SecureStore.getItemAsync(PENDING_LOGOUT_KEY)
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as PendingLogout
    return value.refreshToken ? value : null
  } catch {
    await SecureStore.deleteItemAsync(PENDING_LOGOUT_KEY)
    return null
  }
}

export const queuePendingLogout = async (refreshToken: string) => {
  const normalized = String(refreshToken || '').trim()
  if (!normalized) return false
  await SecureStore.setItemAsync(
    PENDING_LOGOUT_KEY,
    JSON.stringify({ refreshToken: normalized, createdAt: new Date().toISOString() }),
    secureOptions
  )
  return true
}

export const flushPendingLogout = async () => {
  const pending = await getPendingLogout()
  if (!pending) return false
  await api.post(
    '/mobile/v1/auth/logout',
    { refreshToken: pending.refreshToken },
    { skipAuth: true, skipRefresh: true }
  )
  await SecureStore.deleteItemAsync(PENDING_LOGOUT_KEY)
  return true
}

