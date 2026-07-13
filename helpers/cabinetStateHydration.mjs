const resolveCabinetEventsScope = ({ page, eventsPaging } = {}) => {
  if (eventsPaging?.scope && eventsPaging.scope !== 'none') {
    return eventsPaging.scope
  }
  if (page === 'eventsUpcoming') return 'upcoming'
  if (page === 'eventsPast') return 'past'
  return 'all'
}

const buildEventsQueryPayload = ({ events, eventsPaging } = {}) => ({
  data: Array.isArray(events) ? events : [],
  meta: eventsPaging && typeof eventsPaging === 'object' ? eventsPaging : {},
})

export { buildEventsQueryPayload, resolveCabinetEventsScope }
