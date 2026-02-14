const toDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate())

const endOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)

export const getAdditionalEventSegment = (dateValue, now = new Date()) => {
  const date = toDate(dateValue)
  if (!date) return null
  const nowMs = now.getTime()
  const todayStart = startOfDay(now).getTime()
  const tomorrowStart = todayStart + 24 * 60 * 60 * 1000
  const dayAfterTomorrowStart = tomorrowStart + 24 * 60 * 60 * 1000
  const dateMs = date.getTime()

  if (dateMs < nowMs) return 'overdue'
  if (dateMs >= todayStart && dateMs < tomorrowStart) return 'today'
  if (dateMs >= tomorrowStart && dateMs < dayAfterTomorrowStart)
    return 'tomorrow'
  return null
}

export const getAdditionalEventsSummary = (events, now = new Date()) => {
  const summary = {
    overdue: 0,
    today: 0,
    tomorrow: 0,
  }

  ;(Array.isArray(events) ? events : []).forEach((event) => {
    ;(Array.isArray(event?.additionalEvents) ? event.additionalEvents : []).forEach(
      (item) => {
        const segment = getAdditionalEventSegment(item?.date, now)
        if (segment) summary[segment] += 1
      }
    )
  })

  return summary
}

export const eventHasAdditionalSegment = (event, segment, now = new Date()) => {
  if (!segment) return true
  const additionalEvents = Array.isArray(event?.additionalEvents)
    ? event.additionalEvents
    : []
  return additionalEvents.some(
    (item) => getAdditionalEventSegment(item?.date, now) === segment
  )
}

export const getUpcomingEventsByDays = (events, days = 3, now = new Date()) => {
  const start = startOfDay(now).getTime()
  const endDate = new Date(now)
  endDate.setDate(endDate.getDate() + Math.max(1, days) - 1)
  const end = endOfDay(endDate).getTime()

  return (Array.isArray(events) ? events : [])
    .filter((event) => {
      if (event?.status === 'canceled') return false
      const date = toDate(event?.eventDate)
      if (!date) return false
      const ms = date.getTime()
      return ms >= start && ms <= end
    })
    .sort((a, b) => {
      const dateA = toDate(a?.eventDate)?.getTime() ?? 0
      const dateB = toDate(b?.eventDate)?.getTime() ?? 0
      return dateA - dateB
    })
}

export const getAdditionalEventsListBySegments = (events, now = new Date()) => {
  const segments = {
    overdue: [],
    today: [],
    tomorrow: [],
  }

  ;(Array.isArray(events) ? events : []).forEach((event) => {
    ;(Array.isArray(event?.additionalEvents) ? event.additionalEvents : []).forEach(
      (item, index) => {
        const segment = getAdditionalEventSegment(item?.date, now)
        if (!segment) return
        segments[segment].push({
          eventId: event?._id,
          eventDate: event?.eventDate ?? null,
          eventStatus: event?.status ?? '',
          eventTown: event?.address?.town ?? '',
          eventDescription: event?.description ?? '',
          title: item?.title ?? '',
          description: item?.description ?? '',
          date: item?.date ?? null,
          index,
        })
      }
    )
  })

  Object.keys(segments).forEach((key) => {
    segments[key].sort((a, b) => {
      const dateA = toDate(a?.date)?.getTime() ?? 0
      const dateB = toDate(b?.date)?.getTime() ?? 0
      return dateA - dateB
    })
  })

  return segments
}
