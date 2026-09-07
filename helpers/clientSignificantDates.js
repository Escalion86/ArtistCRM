const DAY_MS = 24 * 60 * 60 * 1000

export const formatClientEventDate = (date) =>
  date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: 'long',
  })

export const formatClientEventDaysLeft = (daysLeft) => {
  if (daysLeft === 0) return 'Сегодня'
  if (daysLeft === 1) return 'Завтра'
  return `Через ${daysLeft} дн.`
}

const getNextAnnualDate = (value, now) => {
  if (!value) return null
  const source = new Date(value)
  if (Number.isNaN(source.getTime())) return null

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  let next = new Date(
    today.getFullYear(),
    source.getMonth(),
    source.getDate()
  )
  if (next.getTime() < today.getTime()) {
    next = new Date(
      today.getFullYear() + 1,
      source.getMonth(),
      source.getDate()
    )
  }

  return next
}

// Ближайшие значимые даты клиентов (дни рождения, годовщины и т.п.),
// отсортированные по нарастанию даты
export const buildClientEvents = (clients) => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  return (Array.isArray(clients) ? clients : [])
    .flatMap((client) => {
      const significantDates = Array.isArray(client?.significantDates)
        ? client.significantDates
        : []

      return significantDates
        .map((item) => {
          const nextDate = getNextAnnualDate(item?.date, today)
          if (!nextDate) return null
          const daysLeft = Math.round(
            (nextDate.getTime() - today.getTime()) / DAY_MS
          )

          return {
            client,
            title: String(item?.title || 'Значимая дата').trim(),
            comment: String(item?.comment || '').trim(),
            nextDate,
            daysLeft,
          }
        })
        .filter(Boolean)
    })
    .sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime())
}
