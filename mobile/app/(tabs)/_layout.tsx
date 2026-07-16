import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Tabs } from 'expo-router'
import { colors } from '../../src/shared/ui/theme'

const icon = (name: keyof typeof MaterialCommunityIcons.glyphMap) =>
  ({ color, size }: { color: string; size: number }) => (
    <MaterialCommunityIcons name={name} color={color} size={size} />
  )

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { height: 66, paddingTop: 7, paddingBottom: 8, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Главная', tabBarIcon: icon('view-dashboard-outline') }} />
      <Tabs.Screen name="events" options={{ title: 'Мероприятия', tabBarIcon: icon('calendar-blank-outline') }} />
      <Tabs.Screen name="clients" options={{ title: 'Клиенты', tabBarIcon: icon('account-group-outline') }} />
      <Tabs.Screen name="finance" options={{ title: 'Финансы', tabBarIcon: icon('wallet-outline') }} />
      <Tabs.Screen name="more" options={{ title: 'Ещё', tabBarIcon: icon('dots-horizontal-circle-outline') }} />
      <Tabs.Screen name="tasks" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  )
}
