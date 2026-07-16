type TokenLifecycleDependencies = {
  register: (token: string) => Promise<boolean>
  store: (token: string) => Promise<void>
}

export const activateExpoPushToken = async (
  nextToken: string,
  previousToken: string | null,
  dependencies: TokenLifecycleDependencies
) => {
  const normalized = String(nextToken || '').trim()
  if (!normalized) throw new Error('Expo push token не получен')

  const registered = await dependencies.register(normalized)
  if (!registered) throw new Error('Не удалось зарегистрировать устройство')
  if (normalized !== previousToken) await dependencies.store(normalized)
  return normalized
}

