import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useExpoPushNotifications } from '../src/shared/notifications/useExpoPushNotifications'

export default function RootLayout() {
  useExpoPushNotifications()

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  )
}
