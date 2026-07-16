import { sendExpoPushToTenant } from '@server/expoPushNotifications'
import { sendPushToTenant } from '@server/pushNotifications'
import { aggregatePushResults } from './pushResultAggregation.js'

export const sendMultiChannelPushToTenant = async ({
  tenantId,
  payload,
  source = 'unknown',
}) => {
  const [web, expo] = await Promise.all([
    sendPushToTenant({ tenantId, payload, source }),
    sendExpoPushToTenant({ tenantId, payload }),
  ])
  return aggregatePushResults(web, expo)
}
