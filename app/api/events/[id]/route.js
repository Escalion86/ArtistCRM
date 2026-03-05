import { NextResponse } from 'next/server'
import Events from '@models/Events'
import Transactions from '@models/Transactions'
import Histories from '@models/Histories'
import dbConnect from '@server/dbConnect'
import { deleteEventFromCalendar, updateEventInCalendar } from '@server/CRUD'
import getTenantContext from '@server/getTenantContext'
import getUserTariffAccess from '@server/getUserTariffAccess'
import compareObjectsWithDif from '@helpers/compareObjectsWithDif'
import {
  hasDocuments,
  normalizeAdditionalEvents,
  normalizeDepositExpectedAmount,
  normalizeEventType,
  normalizeWaitDeposit,
  parseDateValue,
} from '@server/eventApiNormalization'

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

const normalizeCancelReason = (value) =>
  typeof value === 'string' ? value.trim() : ''

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
  if (
    body.eventType !== undefined &&
    !normalizeEventType(body.eventType)
  ) {
    return NextResponse.json(
      { success: false, error: 'Поле "Что за событие" обязательно' },
      { status: 400 }
    )
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
  if (body.waitDeposit !== undefined)
    update.waitDeposit = normalizeWaitDeposit(body.waitDeposit)
  if (body.depositDueAt !== undefined)
    update.depositDueAt = parseDateValue(body.depositDueAt)
  if (body.depositExpectedAmount !== undefined)
    update.depositExpectedAmount = normalizeDepositExpectedAmount(
      body.depositExpectedAmount
    )
  if (body.description !== undefined)
    update.description = body.description ?? ''
  if (body.eventType !== undefined)
    update.eventType = normalizeEventType(body.eventType)
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
  if (body.actLinks !== undefined)
    update.actLinks = Array.isArray(body.actLinks) ? body.actLinks : []
  if (body.contractLinks !== undefined)
    update.contractLinks = Array.isArray(body.contractLinks)
      ? body.contractLinks
      : []
  if (body.isByContract !== undefined)
    update.isByContract = Boolean(body.isByContract)
  if (body.servicesIds !== undefined)
    update.servicesIds = Array.isArray(body.servicesIds) ? body.servicesIds : []
  if (body.otherContacts !== undefined)
    update.otherContacts = normalizeOtherContacts(body.otherContacts)
  if (body.calendarImportChecked !== undefined && access?.allowCalendarSync)
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
    returnDocument: 'after',
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
      { returnDocument: 'after' }
    )
  } else if (event.calendarImportChecked && access?.allowCalendarSync) {
    try {
      await updateEventInCalendar(event, req, user, oldEvent)
      responseEvent = await Events.findByIdAndUpdate(
        event._id,
        { calendarSyncError: '' },
        { returnDocument: 'after' }
      )
    } catch (error) {
      console.log('Google Calendar update error', error)
      responseEvent = await Events.findByIdAndUpdate(
        event._id,
        { calendarSyncError: 'calendar_sync_failed' },
        { returnDocument: 'after' }
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
