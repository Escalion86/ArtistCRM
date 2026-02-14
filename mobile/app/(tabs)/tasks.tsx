import { StyleSheet, Text, View } from 'react-native'

export default function TasksScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Задачи контактов</Text>
      <Text style={styles.text}>
        Здесь будет список: просрочено, сегодня, завтра.
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f6f8',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1c1d1f',
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    color: '#4b5563',
  },
})
