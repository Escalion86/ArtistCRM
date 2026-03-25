import { NextResponse } from 'next/server'
import dbConnect from '@server/dbConnect'
import {
  createPublicLeadDraftEvent,
  getPublicLeadApiKey,
  normalizePhone,
  normalizeServicesIds,
  normalizeText,
  parseDateValue,
  readCustomValue,
  resolvePublicLeadTenant,
  upsertPublicLeadClient,
} from '@server/publicLeadService'
import { notifyApiLeadCreated } from '@server/publicLeadPush'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key, X-Public-Api-Key',
}

export const OPTIONS = async () =>
  new NextResponse(null, { status: 204, headers: CORS_HEADERS })

export const POST = async (req) => {
  try {
    const body = await req.json().catch(() => ({}))
    const apiKey = getPublicLeadApiKey(req, body)

    await dbConnect()
    const accessData = await resolvePublicLeadTenant(apiKey)
    if (!accessData.ok) {
      return NextResponse.json(
        { success: false, error: accessData.error },
        { status: accessData.status, headers: CORS_HEADERS }
      )
    }
    const tenantId = accessData.tenantId
    const pushEnabled =
      readCustomValue(accessData?.siteSettings?.custom, 'publicLeadPushEnabled') ===
      true

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

    const client = await upsertPublicLeadClient({
      tenantId,
      name,
      phone,
      whatsapp,
      telegram,
    })

    const event = await createPublicLeadDraftEvent({
      tenantId,
      clientId: client?._id ?? null,
      normalizedData: {
        name,
        phone,
        telegram,
        whatsapp,
        comment,
        eventDate,
        dateEnd,
        town,
        address,
        servicesIds,
        contractSum,
        source,
      },
      rawPayload: body,
      historyUserId: 'public-api',
    })

    if (pushEnabled) {
      try {
        const pushResult = await notifyApiLeadCreated({
          tenantId,
          event,
          normalizedData: {
            phone,
            source,
          },
        })

        if (
          pushResult &&
          Number(pushResult?.sent || 0) <= 0 &&
          Number(pushResult?.failed || 0) > 0
        ) {
          console.warn('public lead push delivery failed', {
            tenantId: String(tenantId),
            eventId: String(event?._id || ''),
            failed: Number(pushResult?.failed || 0),
            deactivated: Number(pushResult?.deactivated || 0),
          })
        }
      } catch (error) {
        console.error('public lead push notify error', error)
      }
    }

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
