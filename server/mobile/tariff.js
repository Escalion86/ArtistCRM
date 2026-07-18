import Tariffs from '@models/Tariffs'
import { serializeMobileProfile } from './profile.js'

export const getMobileTariffSummary = async (tariffId) => {
  if (!tariffId) return null
  return Tariffs.findById(tariffId).select('_id title').lean()
}

export const serializeMobileUserWithTariff = async (user) => {
  if (!user) return null
  const tariff = await getMobileTariffSummary(user.tariffId)
  return serializeMobileProfile(user, tariff)
}
