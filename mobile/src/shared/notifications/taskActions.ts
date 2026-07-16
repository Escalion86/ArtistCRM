import { api } from '../api/client'
import { applyTaskActionToEvent, type TaskAction } from '../domain/taskActions'
import type { Event } from '../domain/types'
import { getCachedEntity } from '../storage/cache'
import { saveLocalEntity } from '../storage/mutations'

export type NotificationTaskAction = {
  eventId: string
  taskId: string
  action: TaskAction
}

type TaskActionDependencies = {
  loadEvent: (eventId: string) => Promise<Event | null>
  saveEvent: (event: Event) => Promise<void>
  sendRemote: (payload: NotificationTaskAction) => Promise<void>
}

const defaultDependencies: TaskActionDependencies = {
  loadEvent: (eventId) => getCachedEntity<Event>('events', eventId),
  saveEvent: async (event) => {
    await saveLocalEntity({
      entityType: 'events',
      entityId: event._id,
      values: { additionalEvents: event.additionalEvents || [] },
    })
  },
  sendRemote: async (payload) => {
    await api.post('/mobile/v1/tasks/action', payload)
  },
}

export const performNotificationTaskAction = async (
  payload: NotificationTaskAction,
  dependencies: TaskActionDependencies = defaultDependencies
) => {
  let localError: unknown = null
  try {
    const event = await dependencies.loadEvent(payload.eventId)
    if (event) {
      const updated = applyTaskActionToEvent(
        event,
        payload.taskId,
        payload.action
      )
      if (updated) {
        await dependencies.saveEvent(updated)
        return 'local-outbox' as const
      }
    }
  } catch (error) {
    localError = error
  }

  try {
    await dependencies.sendRemote(payload)
    return 'remote' as const
  } catch (remoteError) {
    throw localError || remoteError
  }
}

