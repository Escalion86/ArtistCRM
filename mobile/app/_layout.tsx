import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { setupNotificationListeners } from '../src/services/notifications'

export default function RootLayout() {
  useEffect(() => {
    const cleanup = setupNotificationListeners()
    return cleanup
  }, [])

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}
