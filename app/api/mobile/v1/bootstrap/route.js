import Clients from '@models/Clients'
import Events from '@models/Events'
import ServiceGroups from '@models/ServiceGroups'
import Services from '@models/Services'
import SiteSettings from '@models/SiteSettings'
import Transactions from '@models/Transactions'
import dbConnect from '@server/dbConnect'
import getRequestContext from '@server/getRequestContext'
import getUserTariffAccess from '@server/getUserTariffAccess'
import { mobileError, mobileSuccess } from '@server/mobile/routeHelpers'
import { sanitizeMobileAccess } from '@server/mobile/access'
import { serializeMobileProfile } from '@server/mobile/profile'
import { sanitizeMobileSettings } from '@server/mobile/settings'

export const GET = async (req) => {
  const context = await getRequestContext(req)
  if (!context.user?._id || !context.tenantId) {
    return mobileError('UNAUTHORIZED', 'Не авторизован', 401)
  }
  await dbConnect()
  const [events, clients, transactions, services, serviceGroups, settings, access] =
    await Promise.all([
      Events.find({ tenantId: context.tenantId }).sort({ eventDate: 1 }).lean(),
      Clients.find({ tenantId: context.tenantId }).sort({ firstName: 1 }).lean(),
      Transactions.find({ tenantId: context.tenantId }).sort({ date: -1 }).lean(),
      Services.find({ tenantId: context.tenantId }).sort({ title: 1 }).lean(),
      ServiceGroups.find({ tenantId: context.tenantId })
        .sort({ order: 1, title: 1 })
        .lean(),
      SiteSettings.findOne({ tenantId: context.tenantId }).lean(),
      getUserTariffAccess(context.user._id),
    ])

  return mobileSuccess({
    serverTime: new Date().toISOString(),
    user: serializeMobileProfile(context.user, access?.tariff),
    access: sanitizeMobileAccess(access),
    entities: {
      events,
      clients,
      transactions,
      services,
      serviceGroups,
      siteSettings: sanitizeMobileSettings(settings),
    },
  })
}
