import { NextResponse } from 'next/server'
import Requests from '@models/Requests'
import dbConnect from '@server/dbConnect'
import getTenantContext from '@server/getTenantContext'

export const GET = async (req, { params }) => {
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
  if (!request) {
    return NextResponse.json(
      { success: false, error: 'Заявка не найдена' },
      { status: 404 }
    )
  }

  const reasons = []
  if (request.eventId) reasons.push({ type: 'event' })
  if (request.status === 'converted') reasons.push({ type: 'converted' })

  return NextResponse.json(
    {
      success: true,
      data: {
        allowed: reasons.length === 0,
        reasons,
      },
    },
    { status: 200 }
  )
}
