export const getEventStatusFlags = (event, now = new Date()) => {
  const status = event?.status
  const isCanceled = status === 'canceled'
  const isTransferred = Boolean(event?.isTransferred)
  const isRequest = status === 'draft' && !isCanceled
  const isClosed = status === 'closed' && !isCanceled
  const rawEnd = event?.dateEnd ?? event?.eventDate ?? null
  const endDate = rawEnd ? new Date(rawEnd) : null
  const isFinished =
    !isRequest &&
    !isCanceled &&
    !isClosed &&
    endDate instanceof Date &&
    !Number.isNaN(endDate.getTime()) &&
    endDate.getTime() < now.getTime()
  const isActive = !isRequest && !isCanceled && !isClosed && !isFinished

  return {
    request: isRequest,
    active: isActive,
    finished: isFinished,
    closed: isClosed,
    transferred: isTransferred,
    canceled: isCanceled,
  }
}
