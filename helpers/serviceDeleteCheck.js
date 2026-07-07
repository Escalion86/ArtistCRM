const getEventsCountLabel = (count) => {
  const absCount = Math.abs(Number(count) || 0)
  const lastTwo = absCount % 100
  const last = absCount % 10

  if (lastTwo >= 11 && lastTwo <= 14) return 'мероприятиях'
  if (last === 1) return 'мероприятии'
  return 'мероприятиях'
}

export const buildServiceDeleteConfirmText = () =>
  'Связи с мероприятиями нет, поэтому услугу можно удалить без проблем.\n\nВы уверены, что хотите удалить услугу?'

export const buildServiceDeleteBlockedText = (eventsCount) =>
  `Удалить услугу нельзя, так как она используется в ${Number(eventsCount) || 0} ${getEventsCountLabel(eventsCount)}.`
