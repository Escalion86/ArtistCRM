import { NextResponse } from 'next/server'
import Requests from '@models/Requests'
import Clients from '@models/Clients'
import SiteSettings from '@models/SiteSettings'
import Users from '@models/Users'
import dbConnect from '@server/dbConnect'
import formatDate from '@helpers/formatDate'
import formatAddress from '@helpers/formatAddress'
import telegramPost from '@server/telegramApi'
import {
  getUserCalendarClient,
  getUserCalendarId,
  normalizeCalendarSettings,
} from '@server/googleUserCalendarClient'
import getTenantContext from '@server/getTenantContext'
import getUserTariffAccess from '@server/getUserTariffAccess'

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
  return []
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

const sendTelegramMassage = async (text, url) =>
  await telegramPost(
    `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`,
    {
      chat_id: 261102161,
      text,
      parse_mode: 'html',
      // reply_markup: url
      //   ? JSON.stringify({
      //       inline_keyboard: [
      //         [
      //           {
      //             text: 'Позвонить клиенту',
      //             url,
      //           },
      //         ],
      //       ],
      //     })
      //   : undefined,
    },
    (data) => console.log('data', data),
    (data) => console.log('error', data),
    true
  )

const DEFAULT_TIME_ZONE = 'Asia/Krasnoyarsk'

const getSiteTimeZone = async (tenantId) => {
  if (!tenantId) return DEFAULT_TIME_ZONE
  const settings = await SiteSettings.findOne({ tenantId })
    .select('timeZone')
    .lean()
  return settings?.timeZone || DEFAULT_TIME_ZONE
}

const getDefaultTenantId = async () => {
  if (process.env.PUBLIC_TENANT_ID) return process.env.PUBLIC_TENANT_ID
  const user = await Users.findOne({
    role: { $in: ['admin', 'dev'] },
  })
    .sort({ createdAt: 1 })
    .select('_id')
    .lean()
  return user?._id ?? null
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

const buildRequestCalendarPayload = (request, timeZone = DEFAULT_TIME_ZONE) => {
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
  const descriptionParts = [
    request.clientName ? `Клиент: ${request.clientName}` : null,
    phone ? `Телефон: ${phone}` : null,
    contacts ? `Контакты: ${contacts}` : null,
    request.contractSum
      ? `Сумма: ${Number(request.contractSum).toLocaleString('ru-RU')}`
      : null,
    request.comment ? `Комментарий: ${request.comment}` : null,
  ].filter(Boolean)

  const payload = {
    summary: `(Заявка) ${addressTitle}`,
    description: descriptionParts.join('\n'),
    location,
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 10 },
      ],
    },
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

const createRequestCalendarEvent = async (request, timeZone, user) => {
  const settings = normalizeCalendarSettings(user)
  if (!settings.enabled || !settings.refreshToken) return null
  const calendar = getUserCalendarClient(user)
  if (!calendar) return null
  const calendarId = getUserCalendarId(user)

  const resource = buildRequestCalendarPayload(request, timeZone)
  try {
    const response = await calendar.events.insert({
      calendarId,
      resource,
    })
    console.log('Google Calendar request create response', {
      status: response?.status,
      id: response?.data?.id,
      htmlLink: response?.data?.htmlLink,
    })
    return response?.data?.id ?? null
  } catch (error) {
    console.log('Google Calendar request create failed', {
      message: error?.message,
      status: error?.code ?? error?.response?.status,
      errors: error?.errors ?? error?.response?.data?.error?.errors,
      calendarId,
    })
    throw error
  }
}

export const GET = async () => {
  const { tenantId } = await getTenantContext()
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }
  await dbConnect()
  const requests = await Requests.find({ tenantId })
    .sort({ createdAt: -1 })
    .lean()
  const prepared = requests.map((request) => ({
    ...request,
    calendarLink: buildCalendarLink(
      request.googleCalendarId,
      request.googleCalendarCalendarId
    ),
  }))

  return NextResponse.json({ success: true, data: prepared }, { status: 200 })
}

export const POST = async (req) => {
  const body = await req.json()
  const { tenantId: sessionTenantId, user: sessionUser } =
    await getTenantContext()
  const clientName = (body.clientName ?? body.name ?? '').trim() || 'Не указан'
  const rawPhone = body.clientPhone ?? body.phone ?? ''
  const contactChannels =
    body.contactChannels ?? body.contact ?? ''
  const eventDate = body.eventDate ?? body.date ?? null
  const legacyLocation =
    body.location ??
    [body.town, body.address]
      .filter((value) => typeof value === 'string' && value.trim().length > 0)
      .join(', ')
  const address = normalizeAddress(body.address, legacyLocation)
  const contractSum = body.contractSum ?? body.price ?? 0
  const comment = body.comment ?? ''
  const yandexAim = body.yandexAim ?? ''
  const servicesIds = Array.isArray(body.servicesIds) ? body.servicesIds : []
  const otherContacts = normalizeOtherContacts(body.otherContacts)
  const createdAt = parseDateValue(body.createdAt)
  const eventDateValue = parseDateValue(eventDate)

  const referer = req.headers.get('referer') ?? ''
  const isCabinetRequest = referer.includes('/cabinet')
  await dbConnect()
  const tenantId = isCabinetRequest
    ? sessionTenantId
    : await getDefaultTenantId()

  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: 'Не удалось определить владельца заявки' },
      { status: 400 }
    )
  }

  if (!rawPhone) {
    return NextResponse.json(
      {
        success: false,
        error: 'Укажите телефон клиента',
      },
      { status: 400 }
    )
  }
  if (isCabinetRequest && !body.clientId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Укажите клиента',
      },
      { status: 400 }
    )
  }
  if (isCabinetRequest && !eventDate) {
    return NextResponse.json(
      {
        success: false,
        error: 'Укажите дату мероприятия',
      },
      { status: 400 }
    )
  }
  if (isCabinetRequest && servicesIds.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: 'Укажите услугу',
      },
      { status: 400 }
    )
  }
  if (
    createdAt &&
    eventDateValue &&
    createdAt.getTime() > eventDateValue.getTime()
  ) {
    return NextResponse.json(
      {
        success: false,
        error: 'Дата начала не может быть позже даты завершения',
      },
      { status: 400 }
    )
  }

  const timeZone = await getSiteTimeZone(tenantId)
  const tenantUser =
    isCabinetRequest && sessionUser?._id
      ? sessionUser
      : await Users.findById(tenantId).lean()

  const normalizedPhone = normalizePhone(rawPhone)
  const contacts = sanitizeContacts(contactChannels)
  const numericContractSum = Number(contractSum) || 0
  const formattedAddress = formatAddress(address, null)
  const displayPhone =
    typeof rawPhone === 'string' && rawPhone.trim().length > 0
      ? rawPhone.trim()
      : normalizedPhone
      ? `+${normalizedPhone}`
      : ''

  const messageParts = [
    `Новая заявка${process.env.DOMAIN ? ` с ${process.env.DOMAIN}` : ''}`,
    '',
    clientName ? `<b>Имя клиента:</b> ${clientName}` : null,
    displayPhone ? `<b>Телефон:</b> ${displayPhone}` : null,
    contacts.length > 0 ? `<b>Способы связи:</b> ${contacts.join(', ')}` : null,
    eventDate
      ? `<b>Дата мероприятия:</b> ${formatDate(eventDate, false, true)}`
      : null,
    formattedAddress ? `<b>Локация:</b> ${formattedAddress}` : null,
    numericContractSum
      ? `<b>Договорная сумма:</b> ${numericContractSum.toLocaleString(
          'ru-RU'
        )} ₽`
      : null,
    comment ? `<b>Комментарий:</b> ${comment}` : null,
    yandexAim ? `<b>Яндекс цель:</b> ${yandexAim}` : null,
  ].filter(Boolean)
  // const telegramResult = await
  if (!isCabinetRequest) {
    sendTelegramMassage(
      messageParts.join('\n'),
      normalizedPhone ? `tel:+${normalizedPhone}` : undefined
    )
  }
  // if (!telegramResult?.ok) {
  //   return NextResponse.json(
  //     {
  //       success: false,
  //       error: 'Не удалось отправить уведомление в Telegram',
  //     },
  //     { status: 502 }
  //   )
  // }

  const phoneAsNumber = normalizedPhone ? Number(normalizedPhone) : null

  let client =
    phoneAsNumber !== null
      ? await Clients.findOne({ phone: phoneAsNumber, tenantId })
      : null

  if (!client) {
    client = await Clients.create({
      tenantId,
      firstName: clientName,
      phone: phoneAsNumber,
    })
  } else {
    const updates = {}
    if (!client.firstName && clientName) updates.firstName = clientName
    if (Object.keys(updates).length > 0) {
      client = await Clients.findByIdAndUpdate(client._id, updates, {
        new: true,
      })
    }
  }

  const request = await Requests.create({
    tenantId,
    clientId: client?._id ?? null,
    clientName,
    clientPhone: normalizedPhone,
    contactChannels: contacts,
    eventDate: eventDate ? new Date(eventDate) : null,
    ...(createdAt ? { createdAt } : {}),
    address,
    contractSum: numericContractSum,
    comment: comment ?? '',
    yandexAim,
    servicesIds,
    otherContacts,
  })

  let googleCalendarId = null
  let googleCalendarCalendarId = null
  let calendarLink = null
  try {
    const access = tenantUser?._id
      ? await getUserTariffAccess(tenantUser._id)
      : null
    if (access?.allowCalendarSync && tenantUser) {
      googleCalendarId = await createRequestCalendarEvent(
        request,
        timeZone,
        tenantUser
      )
      if (googleCalendarId) {
        googleCalendarCalendarId = getUserCalendarId(tenantUser)
        calendarLink = buildCalendarLink(
          googleCalendarId,
          googleCalendarCalendarId
        )
      }
    }
  } catch (error) {
    console.log('Google Calendar request create error', error)
  }

  if (googleCalendarId) {
    await Requests.findByIdAndUpdate(request._id, {
      googleCalendarId,
      googleCalendarCalendarId,
    })
    request.googleCalendarId = googleCalendarId
    request.googleCalendarCalendarId = googleCalendarCalendarId
  }
  request.calendarLink = calendarLink

  return NextResponse.json(
    {
      success: true,
      data: {
        request,
        client,
      },
    },
    { status: 201 }
  )
}
