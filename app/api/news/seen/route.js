import { NextResponse } from 'next/server'
import Users from '@models/Users'
import dbConnect from '@server/dbConnect'
import getRequestContext from '@server/getRequestContext'

export const POST = async (req) => {
  try {
    const { tenantId, user } = await getRequestContext(req)
    if (!tenantId || !user?._id) {
      return NextResponse.json(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      )
    }

    await dbConnect()
    const body = await req.json().catch(() => null)
    const now = new Date()
    const requestedSeenAt = body?.seenAt ? new Date(body.seenAt) : now
    const lastSeenNewsAt =
      Number.isNaN(requestedSeenAt.getTime()) || requestedSeenAt > now
        ? now
        : requestedSeenAt
    await Users.updateOne(
      { _id: user._id },
      { $max: { lastSeenNewsAt } }
    )

    return NextResponse.json(
      { success: true, data: { lastSeenNewsAt } },
      { status: 200 }
    )
  } catch (error) {
    console.error('POST /api/news/seen error', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка сервера' },
      { status: 500 }
    )
  }
}
