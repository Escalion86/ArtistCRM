import { POST as uploadToCloud } from '../../../../escalioncloud/route'
import Users from '@models/Users'
import dbConnect from '@server/dbConnect'
import getRequestContext from '@server/getRequestContext'
import {
  extractMobileUploadUrl,
  getMobileUploadDirectory,
  normalizeMobileCloudUrl,
  sanitizeMobileFileName,
  validateMobileAvatarFiles,
} from '@server/mobile/files'
import { mobileError, mobileSuccess } from '@server/mobile/routeHelpers'
import { serializeMobileUserWithTariff } from '@server/mobile/tariff'

export const runtime = 'nodejs'

const getUserFilter = (context) => ({
  _id: context.user._id,
  $or: [
    { tenantId: context.tenantId },
    { tenantId: null },
    { tenantId: { $exists: false } },
  ],
})

export const POST = async (req) => {
  const context = await getRequestContext(req)
  if (!context.user?._id || !context.tenantId) {
    return mobileError('UNAUTHORIZED', 'Не авторизован', 401)
  }
  const incoming = await req.formData().catch(() => null)
  const validation = validateMobileAvatarFiles(incoming?.getAll('files') || [])
  if (!validation.file) {
    return mobileError(
      validation.code,
      validation.message,
      validation.status,
      'files'
    )
  }

  await dbConnect()
  const user = await Users.findOne(getUserFilter(context))
  if (!user) return mobileError('USER_NOT_FOUND', 'Пользователь не найден', 404)

  const file = validation.file
  const form = new FormData()
  form.append('files', file, sanitizeMobileFileName(file.name))
  form.append(
    'directory',
    `${getMobileUploadDirectory(context.tenantId)}/profile`
  )
  const uploadRequest = new Request(req.url, {
    method: 'POST',
    headers: { authorization: req.headers.get('authorization') || '' },
    body: form,
  })
  const cloudResponse = await uploadToCloud(uploadRequest)
  if (!cloudResponse.ok) return cloudResponse

  const cloudPayload = await cloudResponse.json().catch(() => null)
  const avatarUrl = normalizeMobileCloudUrl(
    extractMobileUploadUrl(cloudPayload?.data)
  )
  if (!avatarUrl) {
    return mobileError(
      'AVATAR_UPLOAD_FAILED',
      'Cloud-сервис не вернул URL аватара',
      502
    )
  }

  user.images = [avatarUrl]
  await user.save()
  return mobileSuccess(await serializeMobileUserWithTariff(user))
}

export const DELETE = async (req) => {
  const context = await getRequestContext(req)
  if (!context.user?._id || !context.tenantId) {
    return mobileError('UNAUTHORIZED', 'Не авторизован', 401)
  }
  await dbConnect()
  const user = await Users.findOneAndUpdate(
    getUserFilter(context),
    { $set: { images: [] } },
    { returnDocument: 'after', runValidators: true }
  )
  if (!user) return mobileError('USER_NOT_FOUND', 'Пользователь не найден', 404)
  return mobileSuccess(await serializeMobileUserWithTariff(user))
}
