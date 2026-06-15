import { Pressable, StyleSheet, Text, View } from 'react-native'
import { router } from 'expo-router'
import { clearAuthToken } from '../../src/shared/auth/tokenStore'

export default function ProfileScreen() {
  const onLogout = async () => {
    await clearAuthToken()
    router.replace('/(auth)/login')
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Профиль</Text>

      <Pressable style={styles.button} onPress={onLogout}>
        <Text style={styles.buttonText}>Выйти</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f6f8',
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1c1d1f',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1d1f',
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingLabel: {
    fontSize: 14,
    color: '#374151',
  },
  button: {
    marginTop: 8,
    width: 120,
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 10,
    backgroundColor: '#8a6f3b',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
})
