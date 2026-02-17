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

const getApiKey = (req, body) =>
  normalizeText(
    req.headers.get('x-public-api-key') ||
      req.headers.get('x-api-key') ||
      body?.apiKey ||
      body?.api_key,
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

const toObject = (value) => {
  if (!value) return {}
  if (typeof value === 'object' && !Array.isArray(value)) return value
  return {}
}

const parseRawPayload = async (req) => {
  const contentType = req.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return toObject(await req.json().catch(() => ({})))
  }

  const text = await req.text().catch(() => '')
  if (!text) return {}

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(text)
    const payload = {}
    params.forEach((value, key) => {
      payload[key] = value
    })
    return payload
  }

  try {
    return toObject(JSON.parse(text))
  } catch (error) {
    return {}
  }
}

const pickFirst = (payload, keys) => {
  const lowerMap = new Map(
    Object.entries(payload).map(([key, value]) => [key.toLowerCase(), value])
  )
  for (const key of keys) {
    const value = lowerMap.get(String(key).toLowerCase())
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value
    }
  }
  return ''
}

const normalizeServices = (payload) => {
  const direct = pickFirst(payload, ['servicesIds', 'services_ids'])
  if (Array.isArray(direct)) return direct.map((item) => normalizeText(item, 64))
  if (typeof direct === 'string' && direct.trim()) {
    return direct
      .split(',')
      .map((item) => normalizeText(item, 64))
      .filter(Boolean)
      .slice(0, 20)
  }
  return []
}

const normalizeTildaPayload = (payload) => {
  const name = normalizeText(
    pickFirst(payload, [
      'name',
      'clientName',
      'client_name',
      'fio',
      'fullname',
      'Имя',
      'ФИО',
    ]),
    120
  )
  const phone = normalizePhone(
    pickFirst(payload, ['phone', 'clientPhone', 'client_phone', 'tel', 'Телефон'])
  )
  const whatsapp = normalizePhone(
    pickFirst(payload, ['whatsapp', 'wa', 'WhatsApp'])
  )
  const telegram = normalizeText(
    pickFirst(payload, ['telegram', 'tg', 'Telegram']),
    120
  )
  const comment = normalizeText(
    pickFirst(payload, ['comment', 'description', 'message', 'text', 'Комментарий']),
    5000
  )
  const eventDate = parseDateValue(
    pickFirst(payload, ['eventDate', 'event_date', 'date', 'Дата'])
  )
  const dateEnd = parseDateValue(
    pickFirst(payload, ['dateEnd', 'date_end', 'end_date'])
  )
  const contractSum =
    Number(pickFirst(payload, ['contractSum', 'sum', 'amount', 'budget'])) || 0
  const town = normalizeText(
    pickFirst(payload, ['town', 'city', 'gorod', 'Город']),
    120
  )
  const address = normalizeText(
    pickFirst(payload, ['address', 'location', 'Адрес']),
    500
  )
  const source = normalizeText(pickFirst(payload, ['source']), 120) || 'tilda'
  const servicesIds = normalizeServices(payload)

  return {
    name,
    phone,
    whatsapp,
    telegram,
    comment,
    eventDate,
    dateEnd,
    contractSum,
    town,
    address,
    source,
    servicesIds,
  }
}

export const OPTIONS = async () =>
  new NextResponse(null, { status: 204, headers: CORS_HEADERS })

export const POST = async (req) => {
  try {
    const body = await parseRawPayload(req)
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

    const normalized = normalizeTildaPayload(body)

    if (
      !normalized.name &&
      !normalized.phone &&
      !normalized.telegram &&
      !normalized.whatsapp
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Нужен минимум один контакт: имя, телефон, telegram или whatsapp',
        },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    if (
      normalized.eventDate &&
      normalized.dateEnd &&
      normalized.eventDate.getTime() > normalized.dateEnd.getTime()
    ) {
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
      name: normalized.name,
      phone: normalized.phone,
      whatsapp: normalized.whatsapp,
      telegram: normalized.telegram,
    })

    const event = await Events.create({
      tenantId,
      clientId: client?._id ?? null,
      status: 'draft',
      requestCreatedAt: new Date(),
      eventDate: normalized.eventDate,
      dateEnd: normalized.dateEnd,
      address: buildAddress({
        town: normalized.town,
        address: normalized.address,
        comment: normalized.comment,
      }),
      servicesIds: normalized.servicesIds,
      contractSum: normalized.contractSum > 0 ? normalized.contractSum : 0,
      description: normalized.comment,
      calendarImportChecked: true,
      importedFromCalendar: false,
      additionalEvents: [],
      clientData: {
        source: normalized.source,
        lead: {
          ...normalized,
          raw: body,
        },
      },
    })

    await Histories.create({
      schema: Events.collection.collectionName,
      action: 'add',
      data: [event.toJSON()],
      userId: 'public-api-tilda',
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
    console.error('public tilda lead create error', error)
    return NextResponse.json(
      { success: false, error: 'Внутренняя ошибка сервера' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
