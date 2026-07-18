export const MOBILE_FILE_MAX_SIZE = 5 * 1024 * 1024
export const MOBILE_AVATAR_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

export const getMobileUploadDirectory = (tenantId) => {
  const segment = String(tenantId || '').replace(/[^a-zA-Z0-9_-]/g, '')
  return segment ? `artistcrm/${segment}/mobile` : ''
}

export const sanitizeMobileFileName = (value) => {
  const name = String(value || '')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
    .trim()
    .slice(0, 180)
  return name || 'file'
}

export const validateMobileUploadFiles = (
  files,
  isFile = (item) => typeof File !== 'undefined' && item instanceof File
) => {
  if (!Array.isArray(files) || files.length !== 1) {
    return { code: 'FILE_REQUIRED', message: 'Передайте один файл', status: 400 }
  }
  const file = files[0]
  if (!isFile(file) || Number(file?.size || 0) <= 0) {
    return { code: 'FILE_INVALID', message: 'Некорректный файл', status: 400 }
  }
  if (Number(file.size) > MOBILE_FILE_MAX_SIZE) {
    return {
      code: 'FILE_TOO_LARGE',
      message: 'Файл не должен превышать 5 МБ',
      status: 413,
    }
  }
  return { file }
}

export const validateMobileAvatarFiles = (
  files,
  isFile = (item) => typeof File !== 'undefined' && item instanceof File
) => {
  const validation = validateMobileUploadFiles(files, isFile)
  if (!validation.file) return validation
  if (!MOBILE_AVATAR_MIME_TYPES.has(String(validation.file.type || '').toLowerCase())) {
    return {
      code: 'AVATAR_TYPE_INVALID',
      message: 'Аватар должен быть в формате JPEG, PNG или WebP',
      status: 400,
    }
  }
  return validation
}

export const extractMobileUploadUrl = (data) => {
  const first = Array.isArray(data) ? data[0] : data
  if (typeof first === 'string') return first
  if (!first || typeof first !== 'object') return ''
  return String(first.url || first.fileUrl || first.path || '')
}

export const normalizeMobileCloudUrl = (
  value,
  origin = 'https://cloud.escalion.ru'
) => {
  const candidate = String(value || '').trim()
  if (!candidate) return ''
  try {
    const url = new URL(candidate, `${origin.replace(/\/$/, '')}/`)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : ''
  } catch {
    return ''
  }
}
