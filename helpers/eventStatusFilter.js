export const getEventStatusFlags = (event, now = new Date()) => {
  const status = event?.status
  const isCanceled = status === 'canceled'
  const isTransferred = Boolean(event?.isTransferred) && !isCanceled
  const isRequest = status === 'draft' && !isTransferred && !isCanceled
  const isClosed = status === 'closed' && !isTransferred && !isCanceled
  const rawEnd = event?.dateEnd ?? event?.eventDate ?? null
  const endDate = rawEnd ? new Date(rawEnd) : null
  const isFinished =
    !isRequest &&
    !isTransferred &&
    !isCanceled &&
    !isClosed &&
    endDate instanceof Date &&
    !Number.isNaN(endDate.getTime()) &&
    endDate.getTime() < now.getTime()
  const isActive =
    !isRequest && !isTransferred && !isCanceled && !isClosed && !isFinished

  return {
    request: isRequest,
    active: isActive,
    finished: isFinished,
    closed: isClosed,
    transferred: isTransferred,
    canceled: isCanceled,
  }
}
