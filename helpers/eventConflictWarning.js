const toTimestamp = (value) => {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null

  return date.getTime()
}

export const shouldShowEventConflictWarning = ({
  eventId,
  initialEventDate,
  initialDateEnd,
  eventDate,
  dateEnd,
  conflictsCount,
}) => {
  if (!(conflictsCount > 0)) return false
  if (!eventId) return true

  return (
    toTimestamp(initialEventDate) !== toTimestamp(eventDate) ||
    toTimestamp(initialDateEnd) !== toTimestamp(dateEnd)
  )
}
