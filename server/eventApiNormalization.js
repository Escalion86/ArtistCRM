const hasDocuments = (payload) => {
  const invoiceLinks = Array.isArray(payload?.invoiceLinks)
    ? payload.invoiceLinks
    : []
  const receiptLinks = Array.isArray(payload?.receiptLinks)
    ? payload.receiptLinks
    : []
  const actLinks = Array.isArray(payload?.actLinks) ? payload.actLinks : []
  const contractLinks = Array.isArray(payload?.contractLinks)
    ? payload.contractLinks
    : []
  const invoiceFiles = Array.isArray(payload?.invoiceFiles)
    ? payload.invoiceFiles
    : []
  const receiptFiles = Array.isArray(payload?.receiptFiles)
    ? payload.receiptFiles
    : []
  const actFiles = Array.isArray(payload?.actFiles) ? payload.actFiles : []
  const contractFiles = Array.isArray(payload?.contractFiles)
    ? payload.contractFiles
    : []
  return (
    invoiceLinks.some((item) => Boolean(item)) ||
    receiptLinks.some((item) => Boolean(item)) ||
    actLinks.some((item) => Boolean(item)) ||
    contractLinks.some((item) => Boolean(item)) ||
    invoiceFiles.some((item) => Boolean(item?.url)) ||
    receiptFiles.some((item) => Boolean(item?.url)) ||
    actFiles.some((item) => Boolean(item?.url)) ||
    contractFiles.some((item) => Boolean(item?.url))
  )
}

const parseDateValue = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const normalizeWaitDeposit = (value) => Boolean(value)

const normalizeEventType = (value) =>
  typeof value === 'string' ? value.trim() : ''

const normalizeDepositExpectedAmount = (value) => {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) return null
  return Math.floor(number)
}

const normalizeAdditionalEvents = (items) => {
  if (!Array.isArray(items)) return []
  return items
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const title = typeof item.title === 'string' ? item.title.trim() : ''
      const description =
        typeof item.description === 'string' ? item.description.trim() : ''
      const date = parseDateValue(item.date)
      if (!title && !description && !date) return null
      const googleCalendarEventId =
        typeof item.googleCalendarEventId === 'string'
          ? item.googleCalendarEventId.trim()
          : ''
      const done = Boolean(item.done)
      const doneAt = done ? parseDateValue(item.doneAt) : null
      return {
        title,
        description,
        date,
        done,
        doneAt,
        googleCalendarEventId,
      }
    })
    .filter(Boolean)
}

const normalizeEventDocumentFiles = (items) => {
  if (!Array.isArray(items)) return []
  return items
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const url = typeof item.url === 'string' ? item.url.trim() : ''
      if (!url) return null
      const name =
        typeof item.name === 'string' && item.name.trim()
          ? item.name.trim()
          : url.split('/').pop() || 'Документ'
      const size = Number(item.size)
      const uploadedAt = parseDateValue(item.uploadedAt) ?? new Date()
      return {
        name,
        url,
        size: Number.isFinite(size) && size >= 0 ? Math.floor(size) : 0,
        type: typeof item.type === 'string' ? item.type.trim() : '',
        uploadedAt: uploadedAt.toISOString(),
      }
    })
    .filter(Boolean)
}

export {
  hasDocuments,
  parseDateValue,
  normalizeWaitDeposit,
  normalizeEventType,
  normalizeDepositExpectedAmount,
  normalizeAdditionalEvents,
  normalizeEventDocumentFiles,
}
