const getLinkedEventsCount = (preview) =>
  Math.max(0, Number(preview?.events || 0))

export const recommendClientMergeTargetId = ({
  currentClientId,
  selectedClientId,
  currentPreview,
  selectedPreview,
}) => {
  const currentEvents = getLinkedEventsCount(currentPreview)
  const selectedEvents = getLinkedEventsCount(selectedPreview)

  return selectedEvents > currentEvents
    ? String(selectedClientId || '')
    : String(currentClientId || '')
}
