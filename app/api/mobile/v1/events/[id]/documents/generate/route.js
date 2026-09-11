import crypto from 'crypto'
import Clients from '@models/Clients'
import Events from '@models/Events'
import Services from '@models/Services'
import SiteSettings from '@models/SiteSettings'
import dbConnect from '@server/dbConnect'
import getRequestContext from '@server/getRequestContext'
import getUserTariffAccess from '@server/getUserTariffAccess'
import createHistorySafely from '@server/historyAudit'
import { DOCX_MIME, formatDocumentDate, renderDocxTemplate } from '@server/documentGeneration'
import { mobileError, mobileSuccess } from '@server/mobile/routeHelpers'
import { POST as uploadToCloud } from '../../../../../../escalioncloud/route'
import { normalizeDocumentTemplatesFromSettings } from '@helpers/documentTemplates'
import { getDocumentLastNumberKey } from '@helpers/documentTypes'
import { normalizeEventDocuments } from '@helpers/eventDocuments'
import { getContractTemplateVariablesMap } from '@helpers/generateContractTemplate'
import { getActTemplateVariablesMap } from '@helpers/generateActTemplate'
import getPersonFullName from '@helpers/getPersonFullName'

export const runtime = 'nodejs'

const CLOUD_UPLOADS_URL = 'https://cloud.escalion.ru/uploads'

const getCustomValue = (custom, key) =>
  typeof custom?.get === 'function' ? custom.get(key) : custom?.[key]

const normalizeUpload = (item, directory, fallbackName) => {
  const path = String(item?.path || item?.filePath || '').trim()
  const name = String(
    item?.originalName || item?.name || item?.fileName || fallbackName
  ).trim()
  const directUrl = String(item?.url || item?.secure_url || item?.href || '').trim()
  const url =
    directUrl ||
    (path
      ? `${CLOUD_UPLOADS_URL}/${path}`
      : `${CLOUD_UPLOADS_URL}/${directory}/${name}`
    ).replaceAll(' ', '%20')
  return { name, path, url }
}

export const POST = async (req, { params }) => {
  const { id } = await params
  const context = await getRequestContext(req)
  if (!context.user?._id || !context.tenantId) {
    return mobileError('UNAUTHORIZED', 'Не авторизован', 401)
  }
  const access = await getUserTariffAccess(context.user._id)
  if (!access?.allowDocuments) {
    return mobileError(
      'DOCUMENTS_NOT_AVAILABLE',
      'Документы недоступны на текущем тарифе',
      403
    )
  }
  const body = await req.json().catch(() => ({}))
  const templateId = String(body?.templateId || '').trim()
  const documentDate = formatDocumentDate(body?.documentDate)
  if (!templateId) {
    return mobileError('TEMPLATE_REQUIRED', 'Выберите шаблон', 400, 'templateId')
  }
  if (!documentDate) {
    return mobileError('DATE_INVALID', 'Некорректная дата документа', 400, 'documentDate')
  }

  await dbConnect()
  const [event, settings] = await Promise.all([
    Events.findOne({ _id: id, tenantId: context.tenantId }).lean(),
    SiteSettings.findOne({ tenantId: context.tenantId }).lean(),
  ])
  if (!event) return mobileError('EVENT_NOT_FOUND', 'Мероприятие не найдено', 404)
  if (event.status === 'draft') {
    return mobileError(
      'DRAFT_DOCUMENTS_UNAVAILABLE',
      'Документы недоступны для заявки',
      409
    )
  }
  const template = normalizeDocumentTemplatesFromSettings(settings?.custom).find(
    (item) => item.id === templateId
  )
  if (!template) return mobileError('TEMPLATE_NOT_FOUND', 'Шаблон не найден', 404)

  const [client, services] = await Promise.all([
    event.clientId
      ? Clients.findOne({ _id: event.clientId, tenantId: context.tenantId }).lean()
      : null,
    event.servicesIds?.length
      ? Services.find({
          _id: { $in: event.servicesIds },
          tenantId: context.tenantId,
        }).lean()
      : [],
  ])
  const numberKey = getDocumentLastNumberKey(template.type)
  const numberedSettings = await SiteSettings.findOneAndUpdate(
    { tenantId: context.tenantId },
    {
      $setOnInsert: { tenantId: context.tenantId },
      $inc: { [`custom.${numberKey}`]: 1, syncVersion: 1 },
    },
    { upsert: true, returnDocument: 'after' }
  )
  const documentNumber = Number(getCustomValue(numberedSettings.custom, numberKey)) || 1
  const custom = numberedSettings.custom
  const meta = {
    defaultTown: numberedSettings.defaultTown || '',
    artistFullName: getCustomValue(custom, 'contractArtistFullName') || '',
    artistName: getCustomValue(custom, 'contractArtistName') || '',
    artistStatus:
      getCustomValue(custom, 'contractArtistStatus') || 'individual_entrepreneur',
    artistOgrnip: getCustomValue(custom, 'contractArtistOgrnip') || '',
    artistInn: getCustomValue(custom, 'contractArtistInn') || '',
    artistBankName: getCustomValue(custom, 'contractArtistBankName') || '',
    artistBik: getCustomValue(custom, 'contractArtistBik') || '',
    artistCheckingAccount:
      getCustomValue(custom, 'contractArtistCheckingAccount') || '',
    artistCorrespondentAccount:
      getCustomValue(custom, 'contractArtistCorrespondentAccount') || '',
    artistLegalAddress: getCustomValue(custom, 'contractArtistLegalAddress') || '',
    documentNumber: String(documentNumber),
    nextDocumentNumber: documentNumber,
    contractDate: documentDate.iso,
    actDate: documentDate.iso,
    requisitesSidesMode: 'docx',
  }
  const buildVariables =
    template.type === 'act'
      ? getActTemplateVariablesMap
      : getContractTemplateVariablesMap
  const variables = buildVariables({
    event,
    client,
    serviceTitles: services.map((service) => service.title).filter(Boolean),
    performerName: getPersonFullName(context.user),
    ...(template.type === 'act' ? { actMeta: meta } : { contractMeta: meta }),
  })

  let content
  try {
    content = renderDocxTemplate({
      templateBase64: template.templateBase64,
      variables,
    })
  } catch {
    return mobileError(
      'DOCUMENT_GENERATION_FAILED',
      'Не удалось сформировать DOCX. Проверьте шаблон и его переменные.',
      422
    )
  }

  const fileName = `${template.name} №${documentNumber} от ${documentDate.label}.docx`
    .replace(/[\\/:*?"<>|]/g, '_')
    .slice(0, 180)
  const directory = `artistcrm/${context.tenantId}/events/${event._id}/documents`
  const form = new FormData()
  form.append('files', new File([content], fileName, { type: DOCX_MIME }))
  form.append('directory', directory)
  const uploadRequest = new Request(req.url, {
    method: 'POST',
    headers: { authorization: req.headers.get('authorization') || '' },
    body: form,
  })
  const uploadResponse = await uploadToCloud(uploadRequest)
  if (!uploadResponse.ok) {
    return mobileError(
      'DOCUMENT_UPLOAD_FAILED',
      'Документ сформирован, но не был загружен. Повторите попытку.',
      502
    )
  }
  const uploadBody = await uploadResponse.json().catch(() => ({}))
  const uploadItem = Array.isArray(uploadBody?.data)
    ? uploadBody.data[0]
    : uploadBody?.data
  const uploaded = normalizeUpload(uploadItem, directory, fileName)
  const document = normalizeEventDocuments([
    {
      id: crypto.randomUUID(),
      type: template.type,
      customTypeName: template.customTypeName,
      title: template.name,
      file: {
        name: uploaded.name,
        url: uploaded.url,
        path: uploaded.path,
        size: content.length,
        contentType: DOCX_MIME,
      },
      createdAt: new Date().toISOString(),
    },
  ])[0]
  const updatedEvent = await Events.findOneAndUpdate(
    { _id: event._id, tenantId: context.tenantId },
    { $push: { documents: document }, $inc: { syncVersion: 1 } },
    { returnDocument: 'after' }
  )
  await createHistorySafely(
    {
      schema: Events.collection.collectionName,
      action: 'update',
      data: [{ documents: { old: event.documents || [], new: updatedEvent.documents } }],
      userId: String(context.user._id),
      difference: true,
    },
    'mobile.events.documents.generate'
  )
  return mobileSuccess({ document, event: updatedEvent })
}
