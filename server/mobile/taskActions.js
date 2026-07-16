const TASK_ACTIONS = new Set(['complete', 'postpone_1', 'postpone_3'])

const isTaskAction = (value) => TASK_ACTIONS.has(value)

const getPostponedDate = (currentValue, days, now = new Date()) => {
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
  return target
}

const applyTaskAction = (task, action, now = new Date()) => {
  if (!task || !isTaskAction(action)) return false
  if (action === 'complete') {
    task.done = true
    task.doneAt = now
    return true
  }
  task.done = false
  task.doneAt = null
  task.date = getPostponedDate(
    task.date,
    action === 'postpone_1' ? 1 : 3,
    now
  )
  return true
}

export { applyTaskAction, getPostponedDate, isTaskAction }
