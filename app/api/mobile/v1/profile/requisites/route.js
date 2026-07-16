import SiteSettings from '@models/SiteSettings'
import dbConnect from '@server/dbConnect'
import getRequestContext from '@server/getRequestContext'
import {
  buildArtistRequisitesUpdate,
  normalizeMobileArtistRequisites,
  serializeMobileArtistRequisites,
} from '@server/mobile/artistRequisites'
import { mobileError, mobileSuccess } from '@server/mobile/routeHelpers'

const loadRequisites = async (tenantId) => {
  const settings = await SiteSettings.findOne({ tenantId }).select('custom').lean()
  return serializeMobileArtistRequisites(settings?.custom)
}

export const GET = async (req) => {
  const { tenantId, user } = await getRequestContext(req)
  if (!tenantId || !user?._id) {
    return mobileError('UNAUTHORIZED', 'Не авторизован', 401)
  }
  await dbConnect()
  return mobileSuccess(await loadRequisites(tenantId))
}

export const PATCH = async (req) => {
  const { tenantId, user } = await getRequestContext(req)
  if (!tenantId || !user?._id) {
    return mobileError('UNAUTHORIZED', 'Не авторизован', 401)
  }
  const body = await req.json().catch(() => ({}))
  await dbConnect()
  const settings = await SiteSettings.findOne({ tenantId }).select('custom').lean()
  const requisites = normalizeMobileArtistRequisites(body, settings?.custom)
  await SiteSettings.findOneAndUpdate(
    { tenantId },
    {
      $set: {
        tenantId,
        ...buildArtistRequisitesUpdate(requisites),
      },
      $inc: { syncVersion: 1 },
    },
    { upsert: true, runValidators: true }
  )
  return mobileSuccess(requisites)
}
