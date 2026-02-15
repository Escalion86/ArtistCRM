import { NextResponse } from 'next/server'
import dbConnect from '@server/dbConnect'
import SiteSettings from '@models/SiteSettings'
import Clients from '@models/Clients'
import Events from '@models/Events'
import Histories from '@models/Histories'
import getUserTariffAccess from '@server/getUserTariffAccess'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key, X-Public-Api-Key',
}

const readCustomValue = (custom, key) => {
  if (!custom) return undefined
  if (typeof custom.get === 'function') return custom.get(key)
  return custom[key]
}

const normalizeText = (value, maxLength = 500) => {
  if (value === null || value === undefined) return ''
  const text = String(value).trim()
  if (!text) return ''
  return text.slice(0, maxLength)
}

const normalizePhone = (value) => String(value ?? '').replace(/\D/g, '')

const parseDateValue = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const normalizeServicesIds = (value) => {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => normalizeText(item, 64))
    .filter(Boolean)
    .slice(0, 20)
}

const getApiKey = (req, body) =>
  normalizeText(
    req.headers.get('x-public-api-key') ||
      req.headers.get('x-api-key') ||
      body?.apiKey,
    256
  )

const buildAddress = ({ town, address, comment }) => ({
  town: normalizeText(town, 120),
  street: '',
  house: '',
  entrance: '',
  floor: '',
  flat: '',
  comment: normalizeText(address || comment, 500),
  latitude: '',
  longitude: '',
  link2Gis: '',
  linkYandexNavigator: '',
  link2GisShow: true,
  linkYandexShow: true,
})

const upsertClient = async ({ tenantId, name, phone, whatsapp, telegram }) => {
  const phoneDigits = normalizePhone(phone)
  const phoneNumber =
    phoneDigits.length >= 10 ? Number(phoneDigits.slice(-15)) : null

  let client = null
  if (phoneNumber) {
    client = await Clients.findOne({ tenantId, phone: phoneNumber })
  }

  if (!client) {
    client = await Clients.create({
      tenantId,
      firstName: normalizeText(name, 120),
      phone: phoneNumber,
      whatsapp: normalizePhone(whatsapp)
        ? Number(normalizePhone(whatsapp).slice(-15))
        : null,
      telegram: normalizeText(telegram, 120),
      clientType: 'none',
    })
    return client
  }

  const nextName = normalizeText(name, 120)
  const nextTelegram = normalizeText(telegram, 120)
  const nextWhatsapp = normalizePhone(whatsapp)
    ? Number(normalizePhone(whatsapp).slice(-15))
    : null

  let hasChanges = false
  if (nextName && !client.firstName) {
    client.firstName = nextName
    hasChanges = true
  }
  if (nextTelegram && !client.telegram) {
    client.telegram = nextTelegram
    hasChanges = true
  }
  if (nextWhatsapp && !client.whatsapp) {
    client.whatsapp = nextWhatsapp
    hasChanges = true
  }
  if (hasChanges) await client.save()

  return client
}

export const OPTIONS = async () =>
  new NextResponse(null, { status: 204, headers: CORS_HEADERS })

export const POST = async (req) => {
  try {
    const body = await req.json().catch(() => ({}))
    const apiKey = getApiKey(req, body)

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key обязателен' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    await dbConnect()

    const siteSettings = await SiteSettings.findOne({
      'custom.publicLeadApiKey': apiKey,
    })
      .select('tenantId custom')
      .lean()

    if (!siteSettings?.tenantId) {
      return NextResponse.json(
        { success: false, error: 'Неверный API key' },
        { status: 403, headers: CORS_HEADERS }
      )
    }

    const publicLeadEnabled = readCustomValue(
      siteSettings.custom,
      'publicLeadEnabled'
    )
    if (publicLeadEnabled !== true) {
      return NextResponse.json(
        { success: false, error: 'Прием заявок через API отключен' },
        { status: 403, headers: CORS_HEADERS }
      )
    }

    const tenantId = siteSettings.tenantId
    const access = await getUserTariffAccess(tenantId)
    if (!access?.trialActive && !access?.hasTariff) {
      return NextResponse.json(
        { success: false, error: 'Не выбран тариф' },
        { status: 403, headers: CORS_HEADERS }
      )
    }

    const name = normalizeText(body?.name || body?.clientName, 120)
    const phone = normalizePhone(body?.phone || body?.clientPhone)
    const whatsapp = normalizePhone(body?.whatsapp)
    const telegram = normalizeText(body?.telegram, 120)
    const comment = normalizeText(
      body?.comment || body?.description || body?.message,
      5000
    )
    const eventDate = parseDateValue(body?.eventDate)
    const dateEnd = parseDateValue(body?.dateEnd)
    const contractSum = Number(body?.contractSum) || 0
    const servicesIds = normalizeServicesIds(body?.servicesIds)
    const source = normalizeText(body?.source, 120) || 'public_api'
    const town = normalizeText(body?.town || body?.city, 120)
    const address = normalizeText(body?.address || body?.location, 500)

    if (!name && !phone && !telegram && !whatsapp) {
      return NextResponse.json(
        {
          success: false,
          error: 'Нужен минимум один контакт: имя, телефон, telegram или whatsapp',
        },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    if (eventDate && dateEnd && eventDate.getTime() > dateEnd.getTime()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Дата начала не может быть позже даты завершения',
        },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const client = await upsertClient({
      tenantId,
      name,
      phone,
      whatsapp,
      telegram,
    })

    const event = await Events.create({
      tenantId,
      clientId: client?._id ?? null,
      status: 'draft',
      requestCreatedAt: new Date(),
      eventDate,
      dateEnd,
      address: buildAddress({ town, address, comment }),
      servicesIds,
      contractSum: contractSum > 0 ? contractSum : 0,
      description: comment,
      calendarImportChecked: true,
      importedFromCalendar: false,
      additionalEvents: [],
      clientData: {
        source,
        lead: {
          name,
          phone,
          telegram,
          whatsapp,
          raw: body,
        },
      },
    })

    await Histories.create({
      schema: Events.collection.collectionName,
      action: 'add',
      data: [event.toJSON()],
      userId: 'public-api',
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          eventId: String(event._id),
          clientId: client?._id ? String(client._id) : null,
          status: event.status,
        },
      },
      { status: 201, headers: CORS_HEADERS }
    )
  } catch (error) {
    console.error('public lead create error', error)
    return NextResponse.json(
      { success: false, error: 'Внутренняя ошибка сервера' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
