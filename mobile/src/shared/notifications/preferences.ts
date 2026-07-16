import * as SecureStore from 'expo-secure-store'

const PUSH_ENABLED_KEY = 'artistcrm.push.enabled'
const PUSH_TOKEN_KEY = 'artistcrm.push.token'

export const getPushEnabledPreference = async () =>
  (await SecureStore.getItemAsync(PUSH_ENABLED_KEY)) === 'true'

export const setPushEnabledPreference = async (enabled: boolean) => {
  await SecureStore.setItemAsync(PUSH_ENABLED_KEY, enabled ? 'true' : 'false')
}

export const getStoredPushToken = () => SecureStore.getItemAsync(PUSH_TOKEN_KEY)

export const setStoredPushToken = async (token: string | null) => {
  if (token) {
    await SecureStore.setItemAsync(PUSH_TOKEN_KEY, token)
  } else {
    await SecureStore.deleteItemAsync(PUSH_TOKEN_KEY)
  }
}
