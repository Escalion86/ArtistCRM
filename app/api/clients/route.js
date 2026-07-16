import { NextResponse } from 'next/server'
import Clients from '@models/Clients'
import dbConnect from '@server/dbConnect'
import getRequestContext from '@server/getRequestContext'

export const GET = async (req) => {
  const { tenantId } = await getRequestContext(req)
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }
  await dbConnect()
  const clients = await Clients.find({ tenantId }).sort({ firstName: 1 }).lean()
  return NextResponse.json({ success: true, data: clients }, { status: 200 })
}

export const POST = async (req) => {
  const body = await req.json()
  const { tenantId } = await getRequestContext(req)
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }
  await dbConnect()
  const client = await Clients.create({ ...body, tenantId })

  return NextResponse.json({ success: true, data: client }, { status: 201 })
}
