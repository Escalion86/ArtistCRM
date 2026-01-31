import { NextResponse } from 'next/server'
import Requests from '@models/Requests'
import Events from '@models/Events'
import Clients from '@models/Clients'
import SiteSettings from '@models/SiteSettings'
import Histories from '@models/Histories'
import dbConnect from '@server/dbConnect'
import { updateEventInCalendar } from '@server/CRUD'
import {
  getUserCalendarClient,
  getUserCalendarId,
  normalizeCalendarSettings,
} from '@server/googleUserCalendarClient'
import formatAddress from '@helpers/formatAddress'
import getTenantContext from '@server/getTenantContext'
import getUserTariffAccess from '@server/getUserTariffAccess'
import compareObjectsWithDif from '@helpers/compareObjectsWithDif'

const DEFAULT_TIME_ZONE = 'Asia/Krasnoyarsk'

const getSiteTimeZone = async (tenantId) => {
  if (!tenantId) return DEFAULT_TIME_ZONE
  const settings = await SiteSettings.findOne({ tenantId })
    .select('timeZone')
    .lean()
  return settings?.timeZone || DEFAULT_TIME_ZONE
}

const formatDateInTimeZone = (date, timeZone) => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date)
  } catch (error) {
    return date.toISOString().slice(0, 10)
  }
}

const base64Url = (value) =>
  Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

const buildCalendarLink = (googleEventId, calendarId) => {
  if (!googleEventId || !calendarId) return null
  const payload = `${googleEventId} ${calendarId}`
  return `https://www.google.com/calendar/event?eid=${base64Url(payload)}`
}

const buildCalendarReminders = (settings) => {
  const reminders = settings?.reminders ?? {}
  return reminders.useDefault
    ? { useDefault: true }
    : { useDefault: false, overrides: reminders.overrides ?? [] }
}

const normalizePhoneDigits = (value) => {
  if (value === null || value === undefined) return ''
  const digits = String(value).replace(/[^\d]/g, '')
  if (!digits) return ''
  if (digits.length >= 11 && (digits.startsWith('7') || digits.startsWith('8')))
    return `7${digits.slice(1, 11)}`
  if (digits.length === 10) return `7${digits}`
  return digits
}

const normalizeSocialHandle = (value) => {
  if (!value) return ''
  const trimmed = String(value).trim()
  if (!trimmed) return ''
  return trimmed.startsWith('@') ? trimmed.slice(1) : trimmed
}

const buildClientContactsLines = (client) => {
  if (!client || typeof client !== 'object') return []
  const lines = []
  const phoneDigits = normalizePhoneDigits(client.phone)
  const whatsappDigits = normalizePhoneDigits(client.whatsapp)
  const viberDigits = normalizePhoneDigits(client.viber)
  const telegram = normalizeSocialHandle(client.telegram)
  const instagram = normalizeSocialHandle(client.instagram)
  const vk = normalizeSocialHandle(client.vk)
  const email = client.email ? String(client.email).trim() : ''

  if (phoneDigits) lines.push(`Телефон: +${phoneDigits}`)
  if (whatsappDigits) lines.push(`WhatsApp: wa.me/${whatsappDigits}`)
  if (viberDigits) lines.push(`Viber: viber://chat?number=+${viberDigits}`)
  if (telegram) lines.push(`Telegram: t.me/${telegram}`)
  if (instagram) lines.push(`Instagram: instagram.com/${instagram}`)
  if (vk) lines.push(`VK: vk.com/${vk}`)
  if (email) lines.push(`Email: ${email}`)

  return lines
}

const buildRequestCalendarPayload = (
  request,
  timeZone = DEFAULT_TIME_ZONE,
  settings,
  client
) => {
  const hasEventDate = Boolean(request.eventDate)
  const fallbackDate = request.createdAt ? new Date(request.createdAt) : new Date()
  const startDate = hasEventDate ? new Date(request.eventDate) : fallbackDate
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000)
  const location = formatAddress(request.address, null)
  const addressTitle = formatAddress(
    request.address,
    request.location ?? 'Адрес не указан'
  )
  const phone = request.clientPhone ? `+${request.clientPhone}` : ''
  const contacts =
    request.contactChannels?.length > 0
      ? request.contactChannels.join(', ')
      : ''
  const clientContacts = buildClientContactsLines(client)
  const hasClientPhoneLine = clientContacts.some((line) =>
    line.toLowerCase().startsWith('телефон:')
  )
  const phoneLine = phone && !hasClientPhoneLine ? `Телефон: ${phone}` : null
  const descriptionParts = [
    request.clientName ? `Клиент: ${request.clientName}` : null,
    phoneLine,
    contacts ? `Контакты: ${contacts}` : null,
    ...(clientContacts.length > 0 ? clientContacts : []),
    request.comment ? `Комментарий: ${request.comment}` : null,
    request.contractSum
      ? `Договорная сумма: ${Number(request.contractSum).toLocaleString('ru-RU')}`
      : null,
    'Транзакции: нет',
    request?._id && process.env.DOMAIN
      ? `Ссылка на заявку:\n${process.env.DOMAIN + '/request/' + request._id}`
      : null,
  ].filter(Boolean)

  const payload = {
    summary: `(Заявка) ${addressTitle}`,
    description: descriptionParts.join('\n'),
    location,
    reminders: buildCalendarReminders(settings),
  }

  if (hasEventDate) {
    payload.start = {
      dateTime: startDate.toISOString(),
      timeZone,
    }
    payload.end = {
      dateTime: endDate.toISOString(),
      timeZone,
    }
  } else {
    const allDayDate = formatDateInTimeZone(startDate, timeZone)
    payload.start = { date: allDayDate }
    const nextDay = new Date(startDate)
    nextDay.setDate(nextDay.getDate() + 1)
    payload.end = { date: formatDateInTimeZone(nextDay, timeZone) }
  }

  return payload
}

const updateRequestCalendarEvent = async (request, timeZone, user) => {
  if (!request?.googleCalendarId) return
  const settings = normalizeCalendarSettings(user)
  if (!settings.enabled || !settings.refreshToken) return
  const calendar = getUserCalendarClient(user)
  if (!calendar) return
  const calendarId = request.googleCalendarCalendarId || getUserCalendarId(user)
  const client = request?.clientId
    ? await Clients.findById(request.clientId).lean()
    : null
  const resource = buildRequestCalendarPayload(
    request,
    timeZone,
    settings,
    client
  )
  await calendar.events.update({
    calendarId,
    eventId: request.googleCalendarId,
    resource,
  })
}

const normalizePhone = (phone) =>
  typeof phone === 'string'
    ? phone.replace(/[^0-9]/g, '')
    : typeof phone === 'number'
    ? String(phone)
    : ''

const sanitizeContacts = (contacts) => {
  if (Array.isArray(contacts))
    return contacts.map((item) => String(item).trim()).filter(Boolean)
  if (typeof contacts === 'string')
    return contacts
      .split(/[\n,;]/)
      .map((item) => item.trim())
      .filter(Boolean)
  return undefined
}

const normalizeOtherContacts = (contacts) => {
  if (!Array.isArray(contacts)) return []
  return contacts
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const clientId = item.clientId ?? null
      if (!clientId) return null
      return {
        clientId,
        comment: typeof item.comment === 'string' ? item.comment.trim() : '',
      }
    })
    .filter(Boolean)
}

const normalizeCancelReason = (value) =>
  typeof value === 'string' ? value.trim() : ''

const parseDateValue = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const DEFAULT_ADDRESS = {
  town: '',
  street: '',
  house: '',
  entrance: '',
  floor: '',
  flat: '',
  comment: '',
  link2Gis: '',
  linkYandexNavigator: '',
  link2GisShow: true,
  linkYandexShow: true,
}

const normalizeAddress = (rawAddress, legacyLocation) => {
  const normalized = {
    ...DEFAULT_ADDRESS,
    ...(rawAddress && typeof rawAddress === 'object' ? rawAddress : {}),
  }

  const hasMainFields =
    normalized.town ||
    normalized.street ||
    normalized.house ||
    normalized.flat

  if (legacyLocation && !normalized.comment && !hasMainFields) {
    normalized.comment = legacyLocation
  }

  return normalized
}

const REQUEST_STATUSES = new Set([
  'active',
  'converted',
  'canceled',
])

export const PUT = async (req, { params }) => {
  const { id } = await params
  const body = await req.json()
  const { tenantId, user } = await getTenantContext()
  if (!tenantId || !user?._id) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }

  await dbConnect()
  const timeZone = await getSiteTimeZone(tenantId)

  const request = await Requests.findOne({ _id: id, tenantId })
  if (!request)
    return NextResponse.json(
      { success: false, error: 'Заявка не найдена' },
      { status: 404 }
    )

  if (request.status === 'converted' && !body.convertToEvent) {
    return NextResponse.json(
      { success: false, error: 'Заявка уже преобразована в мероприятие' },
      { status: 400 }
    )
  }

  if (body.convertToEvent) {
    const access = await getUserTariffAccess(user._id)
    if (!access?.trialActive && !access?.hasTariff) {
      return NextResponse.json(
        { success: false, error: 'Не выбран тариф' },
        { status: 403 }
      )
    }
    if (Number.isFinite(access?.eventsPerMonth) && access.eventsPerMonth > 0) {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      const count = await Events.countDocuments({
        tenantId,
        createdAt: { $gte: start, $lt: end },
      })
      if (count >= access.eventsPerMonth) {
        return NextResponse.json(
          { success: false, error: 'Достигнут лимит мероприятий' },
          { status: 403 }
        )
      }
    }
    if (request.eventId)
      return NextResponse.json(
        { success: false, error: 'Заявка уже преобразована в мероприятие' },
        { status: 400 }
      )

    const eventData = body.eventData ?? {}
    const servicesIds =
      Array.isArray(eventData.servicesIds) && eventData.servicesIds.length > 0
        ? eventData.servicesIds
        : Array.isArray(request.servicesIds)
        ? request.servicesIds
        : []
    const clientId = eventData.clientId ?? request.clientId ?? null
    const eventDate = eventData.eventDate ?? request.eventDate ?? null
    const dateEnd = eventData.dateEnd ?? null

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'Укажите клиента для мероприятия' },
        { status: 400 }
      )
    }
    if (!eventDate) {
      return NextResponse.json(
        { success: false, error: 'Укажите дату мероприятия' },
      { status: 400 }
    )
  }
  if (!servicesIds || servicesIds.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Укажите услугу для мероприятия' },
      { status: 400 }
    )
  }
  const startDate = parseDateValue(eventDate)
  const endDateValue = parseDateValue(dateEnd)
  if (
    startDate &&
    endDateValue &&
    startDate.getTime() > endDateValue.getTime()
  ) {
    return NextResponse.json(
      {
        success: false,
        error: 'Дата начала не может быть позже даты завершения',
      },
      { status: 400 }
    )
  }

    const normalizedContractSum =
      typeof eventData.contractSum === 'number' &&
      !Number.isNaN(eventData.contractSum)
        ? eventData.contractSum
        : request.contractSum

    const isTransferred = Boolean(eventData.isTransferred)
    const rawAddress = eventData.address ?? request.address ?? null
    const legacyLocation = [
      eventData.location,
      request.location,
      typeof rawAddress === 'string' ? rawAddress : '',
      request?.town,
    ]
      .filter((value) => typeof value === 'string' && value.trim().length > 0)
      .join(', ')
    const normalizedAddress = normalizeAddress(
      typeof rawAddress === 'string' ? null : rawAddress,
      legacyLocation
    )
    const normalizedOtherContacts = normalizeOtherContacts(
      eventData.otherContacts ?? request.otherContacts ?? []
    )

    const event = await Events.create({
      tenantId,
      requestId: request._id,
      clientId,
      eventDate,
      requestDate: request.createdAt,
      dateEnd,
      googleCalendarId: request.googleCalendarId ?? null,
      googleCalendarCalendarId: request.googleCalendarCalendarId ?? '',
      address: normalizedAddress,
      contractSum: normalizedContractSum,
      status: eventData.status ?? 'planned',
      isByContract: Boolean(eventData.isByContract),
      isTransferred,
      colleagueId: isTransferred ? eventData.colleagueId ?? null : null,
      calendarImportChecked: Boolean(eventData.calendarImportChecked),
      servicesIds,
      description: eventData.description ?? request.comment ?? '',
      otherContacts: normalizedOtherContacts,
      calendarSyncError: access?.allowCalendarSync
        ? ''
        : 'calendar_sync_unavailable',
    })
    await Histories.create({
      schema: Events.collection.collectionName,
      action: 'add',
      data: [event.toJSON?.() ?? event],
      userId: String(user._id),
    })

    let updatedEvent = event
    if (access?.allowCalendarSync) {
      try {
        await updateEventInCalendar(event, req, user)
        const refreshedEvent = await Events.findById(event._id).lean()
        if (refreshedEvent) updatedEvent = refreshedEvent
      } catch (error) {
        console.log('Google Calendar convert error', error)
        updatedEvent = await Events.findByIdAndUpdate(
          event._id,
          { calendarSyncError: 'calendar_sync_failed' },
          { new: true }
        )
      }
    }

    const updatedRequest = await Requests.findOneAndUpdate(
      { _id: id, tenantId },
      {
        status: 'converted',
        eventId: event._id,
      },
      { new: true }
    )
    const convertChanges = compareObjectsWithDif(
      request.toJSON?.() ?? request,
      updatedRequest.toJSON?.() ?? updatedRequest
    )
    if (Object.keys(convertChanges).length > 0) {
      await Histories.create({
        schema: Requests.collection.collectionName,
        action: 'update',
        data: [convertChanges],
        userId: String(user._id),
        difference: true,
      })
    }

    const client = request.clientId
      ? await Clients.findOne({ _id: request.clientId, tenantId })
      : null

    return NextResponse.json(
      {
        success: true,
        data: {
          request: {
            ...updatedRequest.toJSON(),
            calendarLink: buildCalendarLink(
              updatedRequest.googleCalendarId,
              updatedRequest.googleCalendarCalendarId
            ),
          },
          event: updatedEvent,
          client,
        },
      },
      { status: 200 }
    )
  }

  const update = {}

  if (body.clientName !== undefined) update.clientName = body.clientName
  if (body.clientPhone !== undefined) {
    const normalizedPhone = normalizePhone(body.clientPhone)
    update.clientPhone = normalizedPhone
    if (request.clientId && normalizedPhone) {
      await Clients.findOneAndUpdate(
        { _id: request.clientId, tenantId },
        {
          $set: { phone: Number(normalizedPhone) },
        }
      )
    }
  }

  const startDate =
    body.createdAt !== undefined
      ? parseDateValue(body.createdAt)
      : request.createdAt
  const endDate =
    body.eventDate !== undefined
      ? parseDateValue(body.eventDate)
      : request.eventDate
  if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
    return NextResponse.json(
      {
        success: false,
        error: 'Дата начала не может быть позже даты завершения',
      },
      { status: 400 }
    )
  }

  const contacts = sanitizeContacts(body.contactChannels)
  if (contacts !== undefined) {
    update.contactChannels = contacts
    if (request.clientId)
      await Clients.findOneAndUpdate(
        { _id: request.clientId, tenantId },
        {
        }
      )
  }

  if (body.eventDate !== undefined)
    update.eventDate = body.eventDate ? new Date(body.eventDate) : null
  if (body.createdAt !== undefined)
    update.createdAt = body.createdAt ? new Date(body.createdAt) : null
  if (body.servicesIds !== undefined)
    update.servicesIds = Array.isArray(body.servicesIds)
      ? body.servicesIds
      : []
  if (body.address !== undefined) {
    if (typeof body.address === 'string')
      update.address = normalizeAddress({}, body.address)
    else update.address = normalizeAddress(body.address)
  } else if (body.location !== undefined) {
    update.address = normalizeAddress({}, body.location ?? '')
  }
  if (body.contractSum !== undefined)
    update.contractSum = Number(body.contractSum) || 0
  if (body.comment !== undefined) update.comment = body.comment ?? ''
  if (body.yandexAim !== undefined) update.yandexAim = body.yandexAim ?? ''
  if (body.otherContacts !== undefined) {
    update.otherContacts = normalizeOtherContacts(body.otherContacts)
  }
  if (body.cancelReason !== undefined) {
    update.cancelReason = normalizeCancelReason(body.cancelReason)
  }

  if (body.status && REQUEST_STATUSES.has(body.status)) {
    update.status = body.status
  }

  const updatedRequest = await Requests.findOneAndUpdate(
    { _id: id, tenantId },
    update,
    {
      new: true,
    }
  )

  const changes = compareObjectsWithDif(
    request.toJSON?.() ?? request,
    updatedRequest.toJSON?.() ?? updatedRequest
  )
  if (Object.keys(changes).length > 0) {
    await Histories.create({
      schema: Requests.collection.collectionName,
      action: 'update',
      data: [changes],
      userId: String(user._id),
      difference: true,
    })
  }

  const access = await getUserTariffAccess(user._id)
  if (!access?.allowCalendarSync) {
    await Requests.findByIdAndUpdate(updatedRequest._id, {
      calendarSyncError: 'calendar_sync_unavailable',
    })
    updatedRequest.calendarSyncError = 'calendar_sync_unavailable'
  } else if (updatedRequest?.googleCalendarId) {
    try {
      if (!updatedRequest.googleCalendarCalendarId) {
        const calendarId = getUserCalendarId(user)
        await Requests.findByIdAndUpdate(updatedRequest._id, {
          googleCalendarCalendarId: calendarId,
        })
        updatedRequest.googleCalendarCalendarId = calendarId
      }
      await updateRequestCalendarEvent(updatedRequest, timeZone, user)
      await Requests.findByIdAndUpdate(updatedRequest._id, {
        calendarSyncError: '',
      })
      updatedRequest.calendarSyncError = ''
    } catch (error) {
      console.log('Google Calendar request update error', error)
      await Requests.findByIdAndUpdate(updatedRequest._id, {
        calendarSyncError: 'calendar_sync_failed',
      })
      updatedRequest.calendarSyncError = 'calendar_sync_failed'
    }
  }

  let client = null
  if (request.clientId) {
    if (body.clientName !== undefined) {
      await Clients.findOneAndUpdate(
        { _id: request.clientId, tenantId },
        {
        $set: { firstName: body.clientName },
        }
      )
    }
    client = await Clients.findOne({ _id: request.clientId, tenantId })
  }

  return NextResponse.json(
    {
      success: true,
      data: {
        request: {
          ...updatedRequest.toJSON(),
          calendarLink: buildCalendarLink(
            updatedRequest.googleCalendarId,
            updatedRequest.googleCalendarCalendarId
          ),
        },
        client,
      },
    },
    { status: 200 }
  )
}

export const DELETE = async (req, { params }) => {
  const { id } = await params
  const { tenantId } = await getTenantContext()
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }
  await dbConnect()
  const request = await Requests.findOne({ _id: id, tenantId }).lean()
  if (!request)
    return NextResponse.json(
      { success: false, error: 'Заявка не найдена' },
      { status: 404 }
    )
  if (request.eventId || request.status === 'converted') {
    return NextResponse.json(
      {
        success: false,
        error: 'Нельзя удалить заявку: она связана с мероприятием',
      },
      { status: 409 }
    )
  }
  const deleted = await Requests.findOneAndDelete({ _id: id, tenantId })
  if (!deleted)
    return NextResponse.json(
      { success: false, error: 'Заявка не найдена' },
      { status: 404 }
    )
  await Histories.create({
    schema: Requests.collection.collectionName,
    action: 'delete',
    data: [deleted.toJSON?.() ?? deleted],
    userId: String(user?._id ?? tenantId),
  })
  return NextResponse.json({ success: true }, { status: 200 })
}
