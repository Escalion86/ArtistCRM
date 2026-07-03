import {
  DOCUMENT_TYPES,
  getDocumentDefaultTitle,
  normalizeDocumentType,
} from './documentTypes.js'

const cleanString = (value) => String(value ?? '').trim()

const createEventDocumentId = () => {
  if (typeof crypto !== 'undefined' && crypto?.randomUUID) {
    return crypto.randomUUID()
  }
  return `document-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

const normalizeIsoDate = (value, fallback) => {
  const raw = cleanString(value)
  if (!raw) return fallback
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? fallback : date.toISOString()
}

const normalizeDocumentFile = (file) => {
  if (!file || typeof file !== 'object') return null
  const name = cleanString(file.name || file.fileName || file.description)
  const url = cleanString(file.url)
  const path = cleanString(file.path || file.filePath)
  if (!name && !url && !path) return null
  return {
    name: name || 'Документ',
    url,
    path,
    size: Number(file.size) > 0 ? Number(file.size) : null,
    contentType: cleanString(file.contentType || file.type),
  }
}

const normalizeEventDocument = (
  document,
  { now = new Date().toISOString() } = {}
) => {
  if (!document || typeof document !== 'object') return null
  const type = normalizeDocumentType(document.type)
  const customTypeName =
    type === DOCUMENT_TYPES.OTHER ? cleanString(document.customTypeName) : ''
  const url = cleanString(document.url)
  const file = normalizeDocumentFile(document.file)
  if (!url && !file) return null
  return {
    id: cleanString(document.id) || createEventDocumentId(),
    type,
    customTypeName,
    title:
      cleanString(document.title) ||
      getDocumentDefaultTitle(type, customTypeName),
    url,
    file,
    createdAt: normalizeIsoDate(document.createdAt, now),
  }
}

const getDocumentDedupKey = (document) => {
  if (!document) return ''
  if (document.url) return `url:${document.type}:${document.url}`
  const fileKey =
    document.file?.path || document.file?.url || document.file?.name || ''
  return fileKey ? `file:${fileKey}` : ''
}

const normalizeEventDocuments = (documents, options = {}) => {
  if (!Array.isArray(documents)) return []
  const seen = new Set()
  return documents
    .map((document) => normalizeEventDocument(document, options))
    .filter(Boolean)
    .filter((document) => {
      const key = getDocumentDedupKey(document)
      if (!key) return true
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

const linkDocuments = (links, type, title, now) =>
  (Array.isArray(links) ? links : [])
    .map((url) => cleanString(url))
    .filter(Boolean)
    .map((url) => ({ type, title, url, createdAt: now }))

const fileDocuments = (files, now) =>
  (Array.isArray(files) ? files : [])
    .map((file) => normalizeDocumentFile(file))
    .filter(Boolean)
    .map((file) => ({
      type: DOCUMENT_TYPES.OTHER,
      title: file.name || 'Документ',
      file,
      createdAt: now,
    }))

const mergeLegacyEventDocuments = (
  event,
  { now = new Date().toISOString() } = {}
) =>
  normalizeEventDocuments(
    [
      ...(Array.isArray(event?.documents) ? event.documents : []),
      ...linkDocuments(
        event?.contractLinks,
        DOCUMENT_TYPES.CONTRACT,
        'Договор',
        now
      ),
      ...linkDocuments(event?.invoiceLinks, DOCUMENT_TYPES.INVOICE, 'Счет', now),
      ...linkDocuments(event?.receiptLinks, DOCUMENT_TYPES.RECEIPT, 'Чек', now),
      ...linkDocuments(event?.actLinks, DOCUMENT_TYPES.ACT, 'Акт', now),
      ...fileDocuments(event?.documentFiles, now),
    ],
    { now }
  )

const eventHasDocuments = (payload) => mergeLegacyEventDocuments(payload).length > 0

export {
  eventHasDocuments,
  mergeLegacyEventDocuments,
  normalizeDocumentFile,
  normalizeEventDocument,
  normalizeEventDocuments,
}
