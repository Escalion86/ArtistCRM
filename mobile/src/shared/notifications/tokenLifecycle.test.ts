import { activateExpoPushToken } from './tokenLifecycle'

describe('activateExpoPushToken', () => {
  it('регистрирует и сохраняет новый токен после успешной ротации', async () => {
    const register = jest.fn(async () => true)
    const store = jest.fn(async () => undefined)

    await expect(
      activateExpoPushToken(' ExpoPushToken[new] ', 'ExpoPushToken[old]', {
        register,
        store,
      })
    ).resolves.toBe('ExpoPushToken[new]')

    expect(register).toHaveBeenCalledWith('ExpoPushToken[new]')
    expect(store).toHaveBeenCalledWith('ExpoPushToken[new]')
  })

  it('повторно подтверждает текущий токен серверу без лишней записи в SecureStore', async () => {
    const register = jest.fn(async () => true)
    const store = jest.fn(async () => undefined)

    await activateExpoPushToken('ExpoPushToken[same]', 'ExpoPushToken[same]', {
      register,
      store,
    })

    expect(register).toHaveBeenCalledTimes(1)
    expect(store).not.toHaveBeenCalled()
  })

  it('не заменяет локальный токен, если сервер не подтвердил новый', async () => {
    const store = jest.fn(async () => undefined)

    await expect(
      activateExpoPushToken('ExpoPushToken[new]', 'ExpoPushToken[old]', {
        register: async () => false,
        store,
      })
    ).rejects.toThrow('Не удалось зарегистрировать устройство')

    expect(store).not.toHaveBeenCalled()
  })
})

