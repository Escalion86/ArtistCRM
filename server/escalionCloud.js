const ESCALIONCLOUD_API_URL =
  process.env.ESCALIONCLOUD_API_URL || 'https://cloud.escalion.ru/api'
const ESCALIONCLOUD_ORIGIN = 'https://cloud.escalion.ru'

const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type') || ''
  return contentType.includes('application/json')
    ? response.json()
    : response.text()
}

const normalizeUploadRows = (payload) => {
  const value = Array.isArray(payload) ? payload : (payload?.data ?? payload)
  return Array.isArray(value) ? value : value ? [value] : []
}

export const normalizeEscalionCloudUrl = (value) => {
  const candidate = String(value || '').trim()
  if (!candidate) return ''
  try {
    const url = new URL(candidate, `${ESCALIONCLOUD_ORIGIN}/`)
    if (url.protocol !== 'https:' || url.hostname !== 'cloud.escalion.ru') {
      return ''
    }
    return url.toString()
  } catch {
    return ''
  }
}

export const uploadFilesToEscalionCloud = async ({ files, directory }) => {
  const password = process.env.ESCALIONCLOUD_PASSWORD
  if (!password) throw new Error('ESCALIONCLOUD_NOT_CONFIGURED')
  if (!Array.isArray(files) || files.length === 0) return []

  const formData = new FormData()
  files.forEach((file) => formData.append('files', file, file.name))
  formData.append('directory', directory)

  const response = await fetch(ESCALIONCLOUD_API_URL, {
    method: 'POST',
    headers: { 'x-api-password': password },
    body: formData,
    cache: 'no-store',
  })
  const payload = await parseResponse(response)
  if (!response.ok) {
    const message = payload?.reason || payload?.message || payload
    throw new Error(
      typeof message === 'string' ? message : 'ESCALIONCLOUD_UPLOAD_FAILED'
    )
  }

  return normalizeUploadRows(payload)
}

export const extractEscalionCloudUploadUrl = (row) =>
  normalizeEscalionCloudUrl(
    typeof row === 'string' ? row : row?.url || row?.fileUrl || row?.path
  )
