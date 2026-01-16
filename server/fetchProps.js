import Events from '@models/Events'
import SiteSettings from '@models/SiteSettings'
import Clients from '@models/Clients'
import Requests from '@models/Requests'
import Transactions from '@models/Transactions'
import Services from '@models/Services'
import Users from '@models/Users'
import dbConnect from './dbConnect'
import mongoose from 'mongoose'

const fetchProps = async (user) => {
  const serverDateTime = new Date()
  try {
    const db = await dbConnect()
    const tenantId = user?.tenantId || user?._id || null

    if (!tenantId) {
      return {
        clients: [],
        events: [],
        siteSettings: {},
        requests: [],
        transactions: [],
        services: [],
        serverSettings: JSON.parse(
          JSON.stringify({
            dateTime: serverDateTime,
          })
        ),
        error: { message: 'Не удалось определить пользователя' },
      }
    }

    const tenantObjectId = new mongoose.Types.ObjectId(tenantId)

    await Promise.all([
      Clients.updateMany(
        { tenantId: { $exists: false } },
        { $set: { tenantId: tenantObjectId } }
      ),
      Events.updateMany(
        { tenantId: { $exists: false } },
        { $set: { tenantId: tenantObjectId } }
      ),
      Requests.updateMany(
        { tenantId: { $exists: false } },
        { $set: { tenantId: tenantObjectId } }
      ),
      Transactions.updateMany(
        { tenantId: { $exists: false } },
        { $set: { tenantId: tenantObjectId } }
      ),
      Services.updateMany(
        { tenantId: { $exists: false } },
        { $set: { tenantId: tenantObjectId } }
      ),
      SiteSettings.updateMany(
        { tenantId: { $exists: false } },
        { $set: { tenantId: tenantObjectId } }
      ),
    ])

    const clients = await Clients.find({ tenantId }).select('-password').lean()
    const events = await Events.find({ tenantId }).lean()
    const siteSettings = await SiteSettings.findOne({ tenantId }).lean()
    const requests = await Requests.find({ tenantId }).lean()
    const transactions = await Transactions.find({ tenantId }).lean()
    const services = await Services.find({ tenantId }).lean()
    const canManageAllUsers = ['dev', 'admin'].includes(user?.role)
    const usersQuery = canManageAllUsers ? {} : { tenantId }
    const users = await Users.find(usersQuery).select('-password').lean()

    const fetchResult = {
      loggedUser: JSON.parse(JSON.stringify(user ?? null)),
      clients: JSON.parse(JSON.stringify(clients)),
      events: JSON.parse(JSON.stringify(events)),
      siteSettings: JSON.parse(
        JSON.stringify(siteSettings ?? {})
      ),
      requests: JSON.parse(JSON.stringify(requests)),
      transactions: JSON.parse(JSON.stringify(transactions)),
      services: JSON.parse(JSON.stringify(services)),
      users: JSON.parse(JSON.stringify(users)),
      serverSettings: JSON.parse(
        JSON.stringify({
          dateTime: serverDateTime,
        })
      ),
    }

    return fetchResult
  } catch (error) {
    return {
      loggedUser: JSON.parse(JSON.stringify(user ?? null)),
      clients: [],
      events: [],
      siteSettings: {},
      requests: [],
      transactions: [],
      services: [],
      users: [],
      serverSettings: JSON.parse(
        JSON.stringify({
          dateTime: serverDateTime,
        })
      ),
      error: JSON.parse(JSON.stringify(error)),
    }
  }
}

export default fetchProps
