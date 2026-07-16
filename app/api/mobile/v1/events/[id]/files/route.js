import mongoose from 'mongoose'
import Events from '@models/Events'
import dbConnect from '@server/dbConnect'
import getRequestContext from '@server/getRequestContext'
import getUserTariffAccess from '@server/getUserTariffAccess'
import { POST as uploadToCloud } from '../../../../../escalioncloud/route'
import { mobileError, mobileSuccess } from '@server/mobile/routeHelpers'
import {
  getMobileUploadDirectory,
  sanitizeMobileFileName,
  validateMobileUploadFiles,
} from '@server/mobile/files'

export const runtime = 'nodejs'

const normalizeUpload = (body) => {
  const value = Array.isArray(body?.data)
    ? body.data[0]
    : body?.data ?? body
  if (typeof value === 'string') return { url: value }
  if (!value || typeof value !== 'object') return null
  const url = String(value.url || value.fileUrl || value.path || '').trim()
  return url ? { ...value, url } : null
}

export const POST = async (req, { params }) => {
  const context = await getRequestContext(req)
  if (!context.user?._id || !context.tenantId) {
    return mobileError('UNAUTHORIZED', 'Не авторизован', 401)
  }
  const { id } = await params
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return mobileError('EVENT_ID_INVALID', 'Некорректный ID мероприятия', 400, 'id')
  }
  const access = await getUserTariffAccess(context.user._id)
  if (!access?.allowDocuments) {
    return mobileError('DOCUMENTS_UNAVAILABLE', 'Вложения недоступны на текущем тарифе', 403)
  }

  const incoming = await req.formData().catch(() => null)
  const fileQueueId = String(incoming?.get('fileQueueId') || '').trim()
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(fileQueueId)) {
    return mobileError('FILE_QUEUE_ID_INVALID', 'Некорректный ID локального файла', 400, 'fileQueueId')
  }
  const validation = validateMobileUploadFiles(incoming?.getAll('files') || [])
  if (!validation.file) {
    return mobileError(validation.code, validation.message, validation.status, 'files')
  }

  await dbConnect()
  const event = await Events.findOne({ _id: id, tenantId: context.tenantId }).lean()
  if (!event) return mobileError('EVENT_NOT_FOUND', 'Мероприятие не найдено', 404)
  if (event.status === 'draft') {
    return mobileError('EVENT_DRAFT', 'Вложения доступны после подтверждения заявки', 400)
  }
  const existing = (event.documentFiles || []).find(
    (item) => item?.mobileUploadId === fileQueueId
  )
  if (existing?.url) {
    return mobileSuccess({ url: existing.url, file: existing, event })
  }

  const file = validation.file
  const safeName = sanitizeMobileFileName(file.name)
  const directory = `${getMobileUploadDirectory(context.tenantId)}/events/${id}`
  const form = new FormData()
  form.append('files', file, safeName)
  form.append('directory', directory)
  const uploadRequest = new Request(req.url, {
    method: 'POST',
    headers: { authorization: req.headers.get('authorization') || '' },
    body: form,
  })
  const uploadResponse = await uploadToCloud(uploadRequest)
  const uploadBody = await uploadResponse.json().catch(() => ({}))
  if (!uploadResponse.ok) {
    return mobileError('FILE_UPLOAD_FAILED', 'Не удалось загрузить вложение', uploadResponse.status)
  }
  const uploaded = normalizeUpload(uploadBody)
  if (!uploaded?.url) {
    return mobileError('FILE_URL_MISSING', 'Хранилище не вернуло URL файла', 502)
  }

  const documentFile = {
    mobileUploadId: fileQueueId,
    name: safeName,
    description: '',
    url: uploaded.url,
    size: file.size,
    type: file.type || 'application/octet-stream',
    uploadedAt: new Date(),
  }
  const updated = await Events.findOneAndUpdate(
    {
      _id: id,
      tenantId: context.tenantId,
      'documentFiles.mobileUploadId': { $ne: fileQueueId },
    },
    { $push: { documentFiles: documentFile }, $inc: { syncVersion: 1 } },
    { returnDocument: 'after' }
  ).lean()
  const finalEvent = updated || await Events.findOne({ _id: id, tenantId: context.tenantId }).lean()
  const finalFile = (finalEvent?.documentFiles || []).find(
    (item) => item?.mobileUploadId === fileQueueId
  ) || documentFile
  return mobileSuccess({ url: finalFile.url, file: finalFile, event: finalEvent })
}
