import { applyTaskActionToEvent } from './taskActions'
import type { Event } from './types'

const event: Event = {
  _id: 'event-1',
  syncVersion: 7,
  status: 'active',
  additionalEvents: [
    {
      _id: 'task-1',
      title: 'Позвонить клиенту',
      date: '2026-07-15T08:45:30.000Z',
      done: false,
      doneAt: null,
    },
    {
      _id: 'task-2',
      title: 'Проверить задаток',
      date: '2026-07-16T10:00:00.000Z',
      done: false,
      doneAt: null,
    },
  ],
}

describe('applyTaskActionToEvent', () => {
  it('завершает только выбранную задачу без мутации исходного события', () => {
    const now = new Date('2026-07-15T04:00:00.000Z')
    const updated = applyTaskActionToEvent(event, 'task-1', 'complete', now)

    expect(updated?.additionalEvents?.[0]).toMatchObject({
      done: true,
      doneAt: now.toISOString(),
    })
    expect(updated?.additionalEvents?.[1]).toEqual(event.additionalEvents?.[1])
    expect(event.additionalEvents?.[0].done).toBe(false)
  })

  it.each([
    ['postpone_1' as const, '2026-07-16T08:45:30.000Z'],
    ['postpone_3' as const, '2026-07-18T08:45:30.000Z'],
  ])('переносит задачу действием %s от текущего дня, сохраняя время', (action, expected) => {
    const updated = applyTaskActionToEvent(
      event,
      'task-1',
      action,
      new Date('2026-07-15T04:00:00.000Z')
    )

    expect(updated?.additionalEvents?.[0]).toMatchObject({
      date: expected,
      done: false,
      doneAt: null,
    })
  })

  it('не создаёт изменение, если задачи нет в локальном событии', () => {
    expect(applyTaskActionToEvent(event, 'missing', 'complete')).toBeNull()
  })
})

