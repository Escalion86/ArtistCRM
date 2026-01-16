import { NextResponse } from 'next/server'
import Events from '@models/Events'
import Requests from '@models/Requests'
import dbConnect from '@server/dbConnect'
import { updateEventInCalendar } from '@server/CRUD'
import getTenantContext from '@server/getTenantContext'

const EVENT_STATUSES = new Set([
  'canceled',
  'active',
  'closed',
])

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

export const PUT = async (req, { params }) => {
  const { id } = await params
  const body = await req.json()
  const { tenantId } = await getTenantContext()
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }
  await dbConnect()

  const update = {}
  if (body.eventDate !== undefined)
    update.eventDate = body.eventDate ? new Date(body.eventDate) : null
  if (body.clientId !== undefined) update.clientId = body.clientId
  if (body.address !== undefined) {
    if (typeof body.address === 'string')
      update.address = normalizeAddress({}, body.address)
    else update.address = normalizeAddress(body.address)
  }
  if (body.contractSum !== undefined)
    update.contractSum = Number(body.contractSum) || 0
  if (body.description !== undefined) update.description = body.description ?? ''
  if (body.invoiceLinks !== undefined)
    update.invoiceLinks = Array.isArray(body.invoiceLinks)
      ? body.invoiceLinks
      : []
  if (body.receiptLinks !== undefined)
    update.receiptLinks = Array.isArray(body.receiptLinks)
      ? body.receiptLinks
      : []
  if (body.servicesIds !== undefined)
    update.servicesIds = Array.isArray(body.servicesIds)
      ? body.servicesIds
      : []
  if (body.calendarImportChecked !== undefined)
    update.calendarImportChecked = Boolean(body.calendarImportChecked)
  if (body.colleagueId !== undefined) update.colleagueId = body.colleagueId
  if (body.isTransferred !== undefined) {
    update.isTransferred = Boolean(body.isTransferred)
    if (!update.isTransferred) update.colleagueId = null
  }
  if (body.status && EVENT_STATUSES.has(body.status)) update.status = body.status

  const event = await Events.findOneAndUpdate(
    { _id: id, tenantId },
    update,
    { new: true }
  )
  if (!event)
    return NextResponse.json(
      { success: false, error: 'Мероприятие не найдено' },
      { status: 404 }
    )

  if (event.calendarImportChecked) {
    try {
      await updateEventInCalendar(event, req)
    } catch (error) {
      console.log('Google Calendar update error', error)
    }
  }

  return NextResponse.json({ success: true, data: event }, { status: 200 })
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
  const deleted = await Events.findOneAndDelete({ _id: id, tenantId })
  if (!deleted)
    return NextResponse.json(
      { success: false, error: 'Мероприятие не найдено' },
      { status: 404 }
    )
  if (deleted.requestId) {
    await Requests.findOneAndUpdate(
      { _id: deleted.requestId, tenantId },
      {
      status: 'canceled',
      eventId: null,
      }
    )
  }
  return NextResponse.json({ success: true }, { status: 200 })
}
