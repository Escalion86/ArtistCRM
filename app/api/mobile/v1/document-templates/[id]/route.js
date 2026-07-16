import SiteSettings from '@models/SiteSettings'
import dbConnect from '@server/dbConnect'
import getRequestContext from '@server/getRequestContext'
import getUserTariffAccess from '@server/getUserTariffAccess'
import { mobileError } from '@server/mobile/routeHelpers'
import { normalizeDocumentTemplatesFromSettings } from '@helpers/documentTemplates'

export const runtime = 'nodejs'

const safeFileName = (value) =>
  String(value || 'template.docx')
    .replace(/[\r\n"\\/]/g, '_')
    .slice(0, 180)

export const GET = async (req, { params }) => {
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
  await dbConnect()
  const settings = await SiteSettings.findOne({ tenantId: context.tenantId }).lean()
  const template = normalizeDocumentTemplatesFromSettings(settings?.custom).find(
    (item) => item.id === id
  )
  if (!template) return mobileError('TEMPLATE_NOT_FOUND', 'Шаблон не найден', 404)

  const content = Buffer.from(template.templateBase64, 'base64')
  return new Response(content, {
    status: 200,
    headers: {
      'content-type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'content-length': String(content.length),
      'content-disposition': `attachment; filename="${safeFileName(template.fileName)}"`,
      'cache-control': 'private, no-store',
    },
  })
}
