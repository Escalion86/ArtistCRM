jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}))
jest.mock('../api/client', () => ({ api: { post: jest.fn() } }))

import * as SecureStore from 'expo-secure-store'
import { api } from '../api/client'
import {
  flushPendingLogout,
  getPendingLogout,
  queuePendingLogout,
} from './pendingLogout'

const secureStore = SecureStore as jest.Mocked<typeof SecureStore>
const apiMock = api as jest.Mocked<typeof api>

beforeEach(() => jest.clearAllMocks())

describe('pending logout', () => {
  it('хранит refresh-токен только в защищённом хранилище устройства', async () => {
    await expect(queuePendingLogout(' refresh-secret ')).resolves.toBe(true)
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(
      'artistcrm.auth.pending-logout',
      expect.stringContaining('refresh-secret'),
      { keychainAccessible: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY' }
    )
  })

  it('удаляет pending logout только после подтверждения API без access token', async () => {
    secureStore.getItemAsync.mockResolvedValue(JSON.stringify({
      refreshToken: 'refresh-secret',
      createdAt: '2026-07-15T00:00:00.000Z',
    }))
    apiMock.post.mockResolvedValue({ success: true } as never)

    await expect(flushPendingLogout()).resolves.toBe(true)
    expect(apiMock.post).toHaveBeenCalledWith(
      '/mobile/v1/auth/logout',
      { refreshToken: 'refresh-secret' },
      { skipAuth: true, skipRefresh: true }
    )
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(
      'artistcrm.auth.pending-logout'
    )
  })

  it('сохраняет pending logout при сетевой ошибке для следующего retry', async () => {
    secureStore.getItemAsync.mockResolvedValue(JSON.stringify({
      refreshToken: 'refresh-secret',
      createdAt: '2026-07-15T00:00:00.000Z',
    }))
    apiMock.post.mockRejectedValue(new Error('offline'))

    await expect(flushPendingLogout()).rejects.toThrow('offline')
    expect(secureStore.deleteItemAsync).not.toHaveBeenCalled()
  })

  it('очищает повреждённую запись без сетевого запроса', async () => {
    secureStore.getItemAsync.mockResolvedValue('{bad-json')
    await expect(getPendingLogout()).resolves.toBeNull()
    expect(secureStore.deleteItemAsync).toHaveBeenCalled()
    expect(apiMock.post).not.toHaveBeenCalled()
  })
})
