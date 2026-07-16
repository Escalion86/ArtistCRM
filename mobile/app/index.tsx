import { Redirect } from 'expo-router'
import { useAuth } from '../src/shared/auth/AuthProvider'

export default function IndexScreen() {
  const { authenticated } = useAuth()
  return <Redirect href={authenticated ? '/(tabs)' : '/(auth)/login'} />
}
