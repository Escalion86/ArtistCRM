import Clients from '@models/Clients'
import Events from '@models/Events'
import getPersonFullName from '@helpers/getPersonFullName'
import { buildIncomingMessagePushPayload } from '@helpers/incomingMessageNotification'
import { sendMultiChannelPushToTenant } from '@server/multiChannelPush'

const resolveNearestClientEvent = async ({
  tenantId,
  clientId,
  associatedEvent,
  associatedEventId,
}) => {
  if (clientId) {
    const nearestEvent = await Events.findOne({
      tenantId,
      clientId,
      status: { $nin: ['canceled', 'closed'] },
      eventDate: { $gte: new Date() },
    })
      .sort({ eventDate: 1, createdAt: 1 })
      .select('_id eventType eventDate')
      .lean()
    if (nearestEvent) return nearestEvent
  }

  if (associatedEvent?._id) {
    return {
      _id: associatedEvent._id,
      eventType: associatedEvent.eventType,
      eventDate: associatedEvent.eventDate,
    }
  }

  if (associatedEventId) {
    return Events.findOne({ _id: associatedEventId, tenantId })
      .select('_id eventType eventDate')
      .lean()
  }

  return null
}

const resolveClientName = async ({ tenantId, clientId, fallback }) => {
  if (!clientId) return fallback || 'Клиент'
  const client = await Clients.findOne({ _id: clientId, tenantId })
    .select('firstName secondName thirdName')
    .lean()
  return getPersonFullName(client, { fallback: fallback || 'Клиент' })
}

const resolveClientMessageContext = async ({
  tenantId,
  clientId,
  clientName,
  associatedEvent,
  associatedEventId,
}) => {
  const [resolvedClientName, nearestEvent] = await Promise.all([
    resolveClientName({ tenantId, clientId, fallback: clientName }),
    resolveNearestClientEvent({
      tenantId,
      clientId,
      associatedEvent,
      associatedEventId,
    }),
  ])
  return { clientName: resolvedClientName, event: nearestEvent }
}

export const notifyIncomingClientMessage = async ({
  tenantId,
  provider,
  messageId,
  messageText,
  clientId,
  clientName,
  associatedEvent,
  associatedEventId,
}) => {
  if (!tenantId || !provider) return null

  const context = await resolveClientMessageContext({
    tenantId,
    clientId,
    clientName,
    associatedEvent,
    associatedEventId,
  })
  const payload = buildIncomingMessagePushPayload({
    provider,
    messageId,
    messageText,
    clientId,
    clientName: context.clientName,
    event: context.event,
  })

  return sendMultiChannelPushToTenant({
    tenantId,
    payload,
    source: `messenger_${provider}`,
  })
}

export { resolveClientMessageContext, resolveNearestClientEvent }
