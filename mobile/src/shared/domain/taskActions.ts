import type { Event } from './types'

export type TaskAction = 'complete' | 'postpone_1' | 'postpone_3'

const getPostponedDate = (
  currentValue: string | null | undefined,
  days: number,
  now: Date
) => {
  const current = currentValue ? new Date(currentValue) : null
  const target = new Date(now)
  target.setDate(target.getDate() + days)
  if (current && !Number.isNaN(current.getTime())) {
    target.setHours(
      current.getHours(),
      current.getMinutes(),
      current.getSeconds(),
      current.getMilliseconds()
    )
  }
  return target.toISOString()
}

export const applyTaskActionToEvent = (
  event: Event,
  taskId: string,
  action: TaskAction,
  now = new Date()
) => {
  const taskIndex = (event.additionalEvents || []).findIndex(
    (task) => String(task._id || '') === taskId
  )
  if (taskIndex < 0) return null

  const additionalEvents = (event.additionalEvents || []).map((task, index) => {
    if (index !== taskIndex) return { ...task }
    if (action === 'complete') {
      return { ...task, done: true, doneAt: now.toISOString() }
    }
    return {
      ...task,
      done: false,
      doneAt: null,
      date: getPostponedDate(
        task.date,
        action === 'postpone_1' ? 1 : 3,
        now
      ),
    }
  })

  return { ...event, additionalEvents }
}

