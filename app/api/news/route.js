import { NextResponse } from 'next/server'
import News from '@models/News'
import dbConnect from '@server/dbConnect'
import getRequestContext from '@server/getRequestContext'
import { normalizeNewsPayload } from '@helpers/whatsNew.mjs'

const NEWS_LIST_LIMIT = 50

export const GET = async (req) => {
  try {
    const { tenantId, user } = await getRequestContext(req)
    if (!tenantId || !user?._id) {
      return NextResponse.json(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const includeAll = searchParams.get('all') === '1'
    if (includeAll && user.role !== 'dev') {
      return NextResponse.json(
        { success: false, error: 'Недостаточно прав' },
        { status: 403 }
      )
    }

    await dbConnect()
    const news = await News.find(includeAll ? {} : { isPublished: true })
      .sort(includeAll ? { createdAt: -1 } : { publishedAt: -1 })
      .limit(NEWS_LIST_LIMIT)
      .lean()

    return NextResponse.json({ success: true, data: news }, { status: 200 })
  } catch (error) {
    console.error('GET /api/news error', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка сервера' },
      { status: 500 }
    )
  }
}

export const POST = async (req) => {
  try {
    const { tenantId, user } = await getRequestContext(req)
    if (!tenantId || !user?._id) {
      return NextResponse.json(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      )
    }
    if (user.role !== 'dev') {
      return NextResponse.json(
        { success: false, error: 'Недостаточно прав' },
        { status: 403 }
      )
    }

    const body = await req.json().catch(() => null)
    const { error, value } = normalizeNewsPayload(body)
    if (error) {
      return NextResponse.json({ success: false, error }, { status: 400 })
    }

    await dbConnect()
    const created = await News.create({
      ...value,
      publishedAt: value.isPublished ? new Date() : null,
      createdBy: user._id,
    })

    return NextResponse.json({ success: true, data: created }, { status: 201 })
  } catch (error) {
    console.error('POST /api/news error', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка сервера' },
      { status: 500 }
    )
  }
}
