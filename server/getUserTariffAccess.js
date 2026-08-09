import Tariffs from '@models/Tariffs'
import Users from '@models/Users'
import dbConnect from './dbConnect'
import { getUserTariffAccess as buildUserTariffAccess } from '@helpers/tariffAccess'

const getUserTariffAccess = async (userId) => {
  if (!userId) return null
  await dbConnect()
  const user = await Users.findById(userId).lean()
  if (!user) return null
  const tariff = user.tariffId
    ? await Tariffs.findById(user.tariffId).lean()
    : null
  return {
    user,
    ...buildUserTariffAccess(user, tariff ? [tariff] : []),
  }
}

export default getUserTariffAccess
