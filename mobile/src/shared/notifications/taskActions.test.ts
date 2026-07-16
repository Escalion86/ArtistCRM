import type { Event } from '../domain/types'

jest.mock('../api/client', () => ({ api: { post: jest.fn() } }))
jest.mock('../storage/cache', () => ({ getCachedEntity: jest.fn() }))
jest.mock('../storage/mutations', () => ({ saveLocalEntity: jest.fn() }))

import { performNotificationTaskAction } from './taskActions'

const event: Event = {
  _id: 'event-1',
  syncVersion: 3,
  status: 'active',
  additionalEvents: [
    { _id: 'task-1', title: 'Позвонить', done: false, doneAt: null },
  ],
}

describe('performNotificationTaskAction', () => {
  it('сохраняет действие в локальный outbox без сетевого запроса', async () => {
    const saveEvent = jest.fn(async () => undefined)
    const sendRemote = jest.fn(async () => undefined)

    await expect(
      performNotificationTaskAction(
        { eventId: 'event-1', taskId: 'task-1', action: 'complete' },
        { loadEvent: async () => event, saveEvent, sendRemote }
      )
    ).resolves.toBe('local-outbox')

    expect(saveEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        additionalEvents: [expect.objectContaining({ _id: 'task-1', done: true })],
      })
    )
    expect(sendRemote).not.toHaveBeenCalled()
  })

  it('использует online endpoint, если события или задачи нет в кэше', async () => {
    const sendRemote = jest.fn(async () => undefined)

    await expect(
      performNotificationTaskAction(
        { eventId: 'event-1', taskId: 'missing', action: 'postpone_1' },
        { loadEvent: async () => event, saveEvent: async () => undefined, sendRemote }
      )
    ).resolves.toBe('remote')

    expect(sendRemote).toHaveBeenCalledWith({
      eventId: 'event-1',
      taskId: 'missing',
      action: 'postpone_1',
    })
  })

  it('переходит к серверному fallback при ошибке локальной базы', async () => {
    const sendRemote = jest.fn(async () => undefined)

    await expect(
      performNotificationTaskAction(
        { eventId: 'event-1', taskId: 'task-1', action: 'complete' },
        {
          loadEvent: async () => { throw new Error('database unavailable') },
          saveEvent: async () => undefined,
          sendRemote,
        }
      )
    ).resolves.toBe('remote')

    expect(sendRemote).toHaveBeenCalledTimes(1)
  })
})
