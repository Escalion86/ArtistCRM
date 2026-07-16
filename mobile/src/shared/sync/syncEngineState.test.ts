import NetInfo from '@react-native-community/netinfo'
import { api } from '../api/client'
import { getOutboxSummary } from '../storage/outbox'
import { runSync } from './syncEngine'
import {
  markSyncCompleted,
  markSyncFailed,
  markSyncOffline,
  markSyncStarted,
} from './syncState'

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(),
}))
jest.mock('../api/client', () => ({
  api: { get: jest.fn(), post: jest.fn() },
}))
jest.mock('../storage/cache', () => ({
  applyTombstones: jest.fn(async () => undefined),
  getSyncCursor: jest.fn(async () => null),
  removeCachedEntity: jest.fn(async () => undefined),
  setSyncCursor: jest.fn(async () => undefined),
  upsertEntities: jest.fn(async () => undefined),
}))
jest.mock('../storage/database', () => ({
  getDatabase: jest.fn(),
}))
jest.mock('../storage/encryptedFiles', () => ({
  syncFileQueue: jest.fn(async () => undefined),
}))
jest.mock('../storage/outbox', () => ({
  getOutboxSummary: jest.fn(async () => ({})),
  listPendingOperations: jest.fn(async () => []),
  replacePendingEntityId: jest.fn(async () => undefined),
  replacePendingLocalReferences: jest.fn(async () => undefined),
  updateOperationStatus: jest.fn(async () => undefined),
}))
jest.mock('./syncState', () => ({
  classifySyncError: jest.fn((error: { status?: number }) =>
    error?.status === 503 ? 'server' : 'unknown'
  ),
  markSyncCompleted: jest.fn(async () => undefined),
  markSyncFailed: jest.fn(async () => undefined),
  markSyncOffline: jest.fn(async () => undefined),
  markSyncStarted: jest.fn(async () => undefined),
}))

const mockedNetInfo = jest.mocked(NetInfo)
const mockedApi = jest.mocked(api)

describe('sync engine state lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(getOutboxSummary).mockResolvedValue({})
  })

  it('отмечает offline-попытку без ложного успеха', async () => {
    mockedNetInfo.fetch.mockResolvedValue({ isConnected: false } as never)

    await runSync()

    expect(markSyncStarted).toHaveBeenCalledTimes(1)
    expect(markSyncOffline).toHaveBeenCalledTimes(1)
    expect(markSyncCompleted).not.toHaveBeenCalled()
  })

  it('после online-цикла сохраняет число проблем очереди', async () => {
    mockedNetInfo.fetch.mockResolvedValue({ isConnected: true } as never)
    mockedApi.get.mockResolvedValue({
      data: { cursor: 'cursor-1', entities: {}, tombstones: [] },
    } as never)
    await runSync()

    expect(markSyncCompleted).toHaveBeenCalledWith()
    expect(markSyncFailed).not.toHaveBeenCalled()
  })

  it('сохраняет безопасную категорию ошибки и возвращает reject вызывающему коду', async () => {
    const error = Object.assign(new Error('private provider response'), {
      status: 503,
    })
    mockedNetInfo.fetch.mockResolvedValue({ isConnected: true } as never)
    mockedApi.get.mockRejectedValue(error)

    await expect(runSync()).rejects.toBe(error)
    expect(markSyncFailed).toHaveBeenCalledWith('server')
    expect(markSyncCompleted).not.toHaveBeenCalled()
  })
})
