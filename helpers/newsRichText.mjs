import DOMPurify from 'isomorphic-dompurify'

export const NEWS_CONTENT_MAX = 100000
const ESCALIONCLOUD_ORIGIN = 'https://cloud.escalion.ru'

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  's',
  'h2',
  'h3',
  'ul',
  'ol',
  'li',
  'blockquote',
  'a',
  'img',
]

const ALLOWED_ATTR = [
  'href',
  'target',
  'rel',
  'src',
  'alt',
  'title',
  'loading',
]

export const escapeNewsHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

export const newsItemsToHtml = (items) => {
  const normalized = Array.isArray(items)
    ? items.map((item) => String(item ?? '').trim()).filter(Boolean)
    : []
  if (normalized.length === 0) return ''
  return `<ul>${normalized
    .map((item) => `<li>${escapeNewsHtml(item)}</li>`)
    .join('')}</ul>`
}

export const sanitizeNewsRichText = (value) =>
  DOMPurify.sanitize(String(value ?? '').slice(0, NEWS_CONTENT_MAX), {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:(?:https?):|\/uploads\/)/i,
  })
    .replace(/\s+src=(["'])(?:data|blob):[\s\S]*?\1/gi, '')
    .trim()

export const hasMeaningfulNewsContent = (value) => {
  const content = sanitizeNewsRichText(value)
  if (/<img\b[^>]*\bsrc=/i.test(content)) return true
  return content
    .replace(/<br\s*\/?>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .trim().length > 0
}

export const getNewsContentHtml = (newsItem) => {
  const richText = sanitizeNewsRichText(newsItem?.contentHtml)
  return richText || newsItemsToHtml(newsItem?.items)
}

const collectUploadCandidates = (value) => {
  if (!value) return []
  if (typeof value === 'string') return value.trim() ? [value.trim()] : []
  if (Array.isArray(value)) return value.flatMap(collectUploadCandidates)
  if (typeof value !== 'object') return []

  return [
    value.url,
    value.secure_url,
    value.fileUrl,
    value.href,
    value.src,
    value.location,
    value.path,
    value.filePath,
    value.data,
    value.files,
    value.urls,
  ].flatMap(collectUploadCandidates)
}

const normalizeUploadCandidate = (value) => {
  const candidate = String(value ?? '').trim()
  if (!candidate) return ''
  if (/^https:\/\/cloud\.escalion\.ru(?:\/|$)/i.test(candidate)) {
    return candidate
  }
  if (candidate.startsWith('/uploads/')) {
    return `${ESCALIONCLOUD_ORIGIN}${candidate}`
  }
  if (candidate.startsWith('uploads/')) {
    return `${ESCALIONCLOUD_ORIGIN}/${candidate}`
  }
  if (/^(?:artistcrm\/|news\/)/i.test(candidate)) {
    return `${ESCALIONCLOUD_ORIGIN}/uploads/${candidate.replace(/^\/+/, '')}`
  }
  return ''
}

export const resolveNewsUploadUrl = (
  uploadResult,
  { directory = 'news/draft', project = 'artistcrm' } = {}
) => {
  const directUrl = collectUploadCandidates(uploadResult)
    .map(normalizeUploadCandidate)
    .find(Boolean)
  if (directUrl) return directUrl.replaceAll(' ', '%20')

  const first = Array.isArray(uploadResult)
    ? uploadResult[0]
    : Array.isArray(uploadResult?.data)
      ? uploadResult.data[0]
      : uploadResult?.data || uploadResult
  const stringValue = typeof first === 'string' ? first.trim() : ''
  const fileName = String(
    first?.fileName ||
      first?.filename ||
      first?.name ||
      first?.originalName ||
      stringValue
  ).trim()
  if (!fileName) return ''

  const safeDirectory = String(directory || 'news/draft').replace(
    /^\/+|\/+$/g,
    ''
  )
  const safeProject = String(project || 'artistcrm').replace(/^\/+|\/+$/g, '')
  const relativePath = fileName.includes('/')
    ? fileName.replace(/^\/+/, '')
    : `${safeProject}/${safeDirectory}/${fileName}`
  return `${ESCALIONCLOUD_ORIGIN}/uploads/${relativePath}`.replaceAll(
    ' ',
    '%20'
  )
}
