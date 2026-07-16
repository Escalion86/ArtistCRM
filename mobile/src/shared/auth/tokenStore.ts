import * as SecureStore from 'expo-secure-store'
import type { AuthSession } from './types'

const ACCESS_TOKEN_KEY = 'artistcrm_access_token'
const REFRESH_TOKEN_KEY = 'artistcrm_refresh_token'
const USER_KEY = 'artistcrm_mobile_user'
const LEGACY_TOKEN_KEY = 'artistcrm_auth_token'
const listeners = new Set<(user: AuthSession['user'] | null) => void>()

const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
}

export const getAccessToken = async () => {
  const current = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY)
  if (current) return current
  return SecureStore.getItemAsync(LEGACY_TOKEN_KEY)
}

export const getRefreshToken = () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY)

export const getStoredUser = async (): Promise<AuthSession['user'] | null> => {
  const raw = await SecureStore.getItemAsync(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthSession['user']
  } catch {
    return null
  }
}

export const getAuthSession = async (): Promise<AuthSession | null> => {
  const [accessToken, refreshToken, user] = await Promise.all([
    getAccessToken(),
    getRefreshToken(),
    getStoredUser(),
  ])
  if (!accessToken || !user) return null
  return {
    accessToken,
    refreshToken: refreshToken || '',
    expiresIn: 0,
    tokenType: 'Bearer',
    user,
  }
}

export const setAuthSession = async (session: AuthSession) => {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, session.accessToken, secureOptions),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, session.refreshToken, secureOptions),
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(session.user), secureOptions),
    SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY),
  ])
  listeners.forEach((listener) => listener(session.user))
}

export const clearAuthSession = async () => {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
    SecureStore.deleteItemAsync(USER_KEY),
    SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY),
  ])
  listeners.forEach((listener) => listener(null))
}

export const subscribeAuthSession = (
  listener: (user: AuthSession['user'] | null) => void
) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// Compatibility exports for the initial scaffold.
export const getAuthToken = getAccessToken
export const setAuthToken = (token: string) =>
  SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token, secureOptions)
export const clearAuthToken = clearAuthSession
