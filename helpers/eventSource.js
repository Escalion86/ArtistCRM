const isObject = (value) => value && typeof value === 'object'

const isEventCreatedViaPublicApi = (event) => {
  const clientData = event?.clientData
  if (!isObject(clientData)) return false

  if (clientData.createdViaApi === true) return true

  const leadData = clientData.lead
  if (!isObject(leadData)) return false
  if (leadData.isPublicApi === true) return true

  const hasRawPayload =
    leadData.raw !== null &&
    leadData.raw !== undefined &&
    typeof leadData.raw === 'object'
  if (!hasRawPayload) return false

  return (
    leadData.source !== undefined ||
    leadData.phone !== undefined ||
    leadData.telegram !== undefined ||
    leadData.whatsapp !== undefined ||
    leadData.comment !== undefined
  )
}

export { isEventCreatedViaPublicApi }
