import { NextResponse } from 'next/server'
import Events from '@models/Events'
import Transactions from '@models/Transactions'
import Histories from '@models/Histories'
import dbConnect from '@server/dbConnect'
import { deleteEventFromCalendar, updateEventInCalendar } from '@server/CRUD'
import getTenantContext from '@server/getTenantContext'
import getUserTariffAccess from '@server/getUserTariffAccess'
import compareObjectsWithDif from '@helpers/compareObjectsWithDif'

const EVENT_STATUSES = new Set(['draft', 'canceled', 'active', 'closed'])

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
    normalized.town || normalized.street || normalized.house || normalized.flat

  if (legacyLocation && !normalized.comment && !hasMainFields) {
    normalized.comment = legacyLocation
  }

  return normalized
}

const parseDateValue = (value) => {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const normalizeCancelReason = (value) =>
  typeof value === 'string' ? value.trim() : ''

const normalizeAdditionalEvents = (items) => {
  if (!Array.isArray(items)) return []
  return items
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const title = typeof item.title === 'string' ? item.title.trim() : ''
      const description =
        typeof item.description === 'string' ? item.description.trim() : ''
      const date = parseDateValue(item.date)
      if (!title && !description && !date) return null
      return {
        title,
        description,
        date,
      }
    })
    .filter(Boolean)
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

const hasDocuments = (payload) => {
  const invoiceLinks = Array.isArray(payload?.invoiceLinks)
    ? payload.invoiceLinks
    : []
  const receiptLinks = Array.isArray(payload?.receiptLinks)
    ? payload.receiptLinks
    : []
  return (
    invoiceLinks.some((item) => Boolean(item)) ||
    receiptLinks.some((item) => Boolean(item))
  )
}

const getNextStatus = (current, body) => {
  const next = body?.status
  if (next && EVENT_STATUSES.has(next)) return next
  return current
}

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
  const access = await getUserTariffAccess(user._id)
  if (!access?.trialActive && !access?.hasTariff) {
    return NextResponse.json(
      { success: false, error: 'Не выбран тариф' },
      { status: 403 }
    )
  }
  if (!access?.allowDocuments && hasDocuments(body)) {
    return NextResponse.json(
      { success: false, error: 'Доступ к документам недоступен' },
      { status: 403 }
    )
  }
  if (
    body.calendarImportChecked !== undefined &&
    Boolean(body.calendarImportChecked) &&
    !access?.allowCalendarSync
  ) {
    return NextResponse.json(
      { success: false, error: 'Синхронизация с календарем недоступна' },
      { status: 403 }
    )
  }
  await dbConnect()

  const oldEvent = await Events.findOne({ _id: id, tenantId }).lean()
  if (!oldEvent)
    return NextResponse.json(
      { success: false, error: 'Мероприятие не найдено' },
      { status: 404 }
    )

  const nextStatus = getNextStatus(oldEvent?.status, body)
  if (
    nextStatus === 'draft' &&
    (hasDocuments(body) || hasDocuments(oldEvent))
  ) {
    return NextResponse.json(
      {
        success: false,
        error: 'Документы недоступны для заявки',
      },
      { status: 400 }
    )
  }

  if (body.eventDate !== undefined || body.dateEnd !== undefined) {
    const startDate =
      body.eventDate !== undefined
        ? parseDateValue(body.eventDate)
        : oldEvent.eventDate
    const endDate =
      body.dateEnd !== undefined
        ? parseDateValue(body.dateEnd)
        : oldEvent.dateEnd
    if (startDate && endDate && startDate.getTime() > endDate.getTime()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Дата начала не может быть позже даты завершения',
        },
        { status: 400 }
      )
    }
  }

  const update = {}
  if (body.eventDate !== undefined)
    update.eventDate = body.eventDate ? new Date(body.eventDate) : null
  if (body.dateEnd !== undefined)
    update.dateEnd = body.dateEnd ? new Date(body.dateEnd) : null
  if (body.additionalEvents !== undefined)
    update.additionalEvents = normalizeAdditionalEvents(body.additionalEvents)
  if (body.clientId !== undefined) update.clientId = body.clientId
  if (body.address !== undefined) {
    if (typeof body.address === 'string')
      update.address = normalizeAddress({}, body.address)
    else update.address = normalizeAddress(body.address)
  }
  if (body.contractSum !== undefined)
    update.contractSum = Number(body.contractSum) || 0
  if (body.description !== undefined)
    update.description = body.description ?? ''
  if (body.financeComment !== undefined)
    update.financeComment = body.financeComment ?? ''
  if (body.invoiceLinks !== undefined)
    update.invoiceLinks = Array.isArray(body.invoiceLinks)
      ? body.invoiceLinks
      : []
  if (body.receiptLinks !== undefined)
    update.receiptLinks = Array.isArray(body.receiptLinks)
      ? body.receiptLinks
      : []
  if (body.isByContract !== undefined)
    update.isByContract = Boolean(body.isByContract)
  if (body.servicesIds !== undefined)
    update.servicesIds = Array.isArray(body.servicesIds) ? body.servicesIds : []
  if (body.otherContacts !== undefined)
    update.otherContacts = normalizeOtherContacts(body.otherContacts)
  if (body.calendarImportChecked !== undefined)
    update.calendarImportChecked = Boolean(body.calendarImportChecked)
  if (body.colleagueId !== undefined) update.colleagueId = body.colleagueId
  if (body.isTransferred !== undefined) {
    update.isTransferred = Boolean(body.isTransferred)
    if (!update.isTransferred) update.colleagueId = null
  }
  if (body.cancelReason !== undefined) {
    update.cancelReason = normalizeCancelReason(body.cancelReason)
  }
  if (body.status && EVENT_STATUSES.has(body.status))
    update.status = body.status

  const event = await Events.findOneAndUpdate({ _id: id, tenantId }, update, {
    new: true,
  })
  if (!event)
    return NextResponse.json(
      { success: false, error: 'Мероприятие не найдено' },
      { status: 404 }
    )

  const changes = compareObjectsWithDif(oldEvent, event.toJSON?.() ?? event)
  if (Object.keys(changes).length > 0) {
    await Histories.create({
      schema: Events.collection.collectionName,
      action: 'update',
      data: [changes],
      userId: String(user._id),
      difference: true,
    })
  }

  let responseEvent = event
  if (!event?.importedFromCalendar && !access?.allowCalendarSync) {
    responseEvent = await Events.findByIdAndUpdate(
      event._id,
      { calendarSyncError: 'calendar_sync_unavailable' },
      { new: true }
    )
  } else if (event.calendarImportChecked && access?.allowCalendarSync) {
    try {
      await updateEventInCalendar(event, req, user)
      responseEvent = await Events.findByIdAndUpdate(
        event._id,
        { calendarSyncError: '' },
        { new: true }
      )
    } catch (error) {
      console.log('Google Calendar update error', error)
      responseEvent = await Events.findByIdAndUpdate(
        event._id,
        { calendarSyncError: 'calendar_sync_failed' },
        { new: true }
      )
    }
  }

  return NextResponse.json(
    { success: true, data: responseEvent ?? event },
    { status: 200 }
  )
}

export const DELETE = async (req, { params }) => {
  const { id } = await params
  const { tenantId, user } = await getTenantContext()
  if (!tenantId || !user?._id) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }
  await dbConnect()
  const transactionsCount = await Transactions.countDocuments({
    tenantId,
    eventId: id,
  })
  if (transactionsCount > 0) {
    return NextResponse.json(
      {
        success: false,
        error: `Нельзя удалить мероприятие: есть транзакции (${transactionsCount})`,
      },
      { status: 409 }
    )
  }
  const deleted = await Events.findOneAndDelete({ _id: id, tenantId })
  if (!deleted)
    return NextResponse.json(
      { success: false, error: 'Мероприятие не найдено' },
      { status: 404 }
    )
  await Histories.create({
    schema: Events.collection.collectionName,
    action: 'delete',
    data: [deleted.toJSON?.() ?? deleted],
    userId: String(user._id),
  })
  if (deleted.googleCalendarId) {
    try {
      const access = await getUserTariffAccess(user._id)
      if (access?.allowCalendarSync) {
        await deleteEventFromCalendar(
          deleted.googleCalendarId,
          deleted.googleCalendarCalendarId,
          user
        )
      }
    } catch (error) {
      console.log('Google Calendar delete error', error)
    }
  }
  return NextResponse.json({ success: true }, { status: 200 })
}
