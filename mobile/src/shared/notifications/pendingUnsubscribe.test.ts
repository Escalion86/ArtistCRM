jest.mock('expo-secure-store', () => ({
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}))
jest.mock('../api/client', () => ({ api: { post: jest.fn() } }))
jest.mock('./preferences', () => ({
  getStoredPushToken: jest.fn(),
  setStoredPushToken: jest.fn(),
}))

import * as SecureStore from 'expo-secure-store'
import { api } from '../api/client'
import { getStoredPushToken, setStoredPushToken } from './preferences'
import {
  flushPendingPushUnsubscribe,
  queuePendingPushUnsubscribe,
} from './pendingUnsubscribe'

const secureStore = SecureStore as jest.Mocked<typeof SecureStore>
const apiMock = api as jest.Mocked<typeof api>
const getTokenMock = getStoredPushToken as jest.MockedFunction<typeof getStoredPushToken>
const setTokenMock = setStoredPushToken as jest.MockedFunction<typeof setStoredPushToken>

beforeEach(() => jest.clearAllMocks())

describe('pending push unsubscribe', () => {
  it('сохраняет отписку в SecureStore до восстановления сети', async () => {
    await expect(queuePendingPushUnsubscribe(' ExpoPushToken[current] ')).resolves.toBe(true)
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(
      'artistcrm.push.pending-unsubscribe',
      expect.stringContaining('ExpoPushToken[current]'),
      { keychainAccessible: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY' }
    )
  })

  it('очищает текущий token только после подтверждённой серверной отписки', async () => {
    secureStore.getItemAsync.mockResolvedValue(JSON.stringify({
      pushToken: 'ExpoPushToken[current]',
      createdAt: '2026-07-15T00:00:00.000Z',
    }))
    getTokenMock.mockResolvedValue('ExpoPushToken[current]')
    apiMock.post.mockResolvedValue({ success: true } as never)

    await expect(flushPendingPushUnsubscribe()).resolves.toBe(true)
    expect(apiMock.post).toHaveBeenCalledWith('/push/expo/unsubscribe', {
      pushToken: 'ExpoPushToken[current]',
    })
    expect(setTokenMock).toHaveBeenCalledWith(null)
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(
      'artistcrm.push.pending-unsubscribe'
    )
  })

  it('не удаляет более новый token и сохраняет очередь при ошибке API', async () => {
    secureStore.getItemAsync.mockResolvedValue(JSON.stringify({
      pushToken: 'ExpoPushToken[old]',
      createdAt: '2026-07-15T00:00:00.000Z',
    }))
    getTokenMock.mockResolvedValue('ExpoPushToken[new]')
    apiMock.post.mockResolvedValueOnce({ success: true } as never)

    await flushPendingPushUnsubscribe()
    expect(setTokenMock).not.toHaveBeenCalled()

    jest.clearAllMocks()
    secureStore.getItemAsync.mockResolvedValue(JSON.stringify({
      pushToken: 'ExpoPushToken[old]',
      createdAt: '2026-07-15T00:00:00.000Z',
    }))
    apiMock.post.mockRejectedValue(new Error('offline'))
    await expect(flushPendingPushUnsubscribe()).rejects.toThrow('offline')
    expect(secureStore.deleteItemAsync).not.toHaveBeenCalled()
  })
})
