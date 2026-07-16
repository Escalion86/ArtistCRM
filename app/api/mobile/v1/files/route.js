import { POST as uploadToCloud } from '../../../escalioncloud/route'
import getRequestContext from '@server/getRequestContext'
import { mobileError } from '@server/mobile/routeHelpers'
import {
  getMobileUploadDirectory,
  sanitizeMobileFileName,
  validateMobileUploadFiles,
} from '@server/mobile/files'

export const runtime = 'nodejs'

export const POST = async (req) => {
  const context = await getRequestContext(req)
  if (!context.user?._id || !context.tenantId) {
    return mobileError('UNAUTHORIZED', 'Не авторизован', 401)
  }
  const incoming = await req.formData().catch(() => null)
  const files = incoming?.getAll('files') || []
  const validation = validateMobileUploadFiles(files)
  if (!validation.file) {
    return mobileError(
      validation.code,
      validation.message,
      validation.status,
      'files'
    )
  }
  const file = validation.file

  const form = new FormData()
  form.append('files', file, sanitizeMobileFileName(file.name))
  form.append('directory', getMobileUploadDirectory(context.tenantId))
  const uploadRequest = new Request(req.url, {
    method: 'POST',
    headers: { authorization: req.headers.get('authorization') || '' },
    body: form,
  })
  return uploadToCloud(uploadRequest)
}
