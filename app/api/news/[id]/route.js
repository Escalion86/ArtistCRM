import mongoose from 'mongoose'
import { NextResponse } from 'next/server'
import News from '@models/News'
import dbConnect from '@server/dbConnect'
import getRequestContext from '@server/getRequestContext'
import { normalizeNewsPayload } from '@helpers/whatsNew.mjs'

const checkDevAccess = async (req) => {
  const { tenantId, user } = await getRequestContext(req)
  if (!tenantId || !user?._id) {
    return {
      errorResponse: NextResponse.json(
        { success: false, error: 'Не авторизован' },
        { status: 401 }
      ),
    }
  }
  if (user.role !== 'dev') {
    return {
      errorResponse: NextResponse.json(
        { success: false, error: 'Недостаточно прав' },
        { status: 403 }
      ),
    }
  }
  return { user }
}

export const PUT = async (req, { params }) => {
  try {
    const { id } = await params
    const { errorResponse } = await checkDevAccess(req)
    if (errorResponse) return errorResponse
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      return NextResponse.json(
        { success: false, error: 'Некорректный идентификатор' },
        { status: 400 }
      )
    }

    const body = await req.json().catch(() => null)
    const { error, value } = normalizeNewsPayload(body)
    if (error) {
      return NextResponse.json({ success: false, error }, { status: 400 })
    }

    await dbConnect()
    const doc = await News.findById(id)
    if (!doc) {
      return NextResponse.json(
        { success: false, error: 'Новость не найдена' },
        { status: 404 }
      )
    }

    const publishedAt =
      doc.isPublished !== true && value.isPublished
        ? new Date()
        : doc.publishedAt
    doc.set({ ...value, publishedAt })
    await doc.save()

    return NextResponse.json({ success: true, data: doc }, { status: 200 })
  } catch (error) {
    console.error('PUT /api/news/[id] error', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка сервера' },
      { status: 500 }
    )
  }
}

export const DELETE = async (req, { params }) => {
  try {
    const { id } = await params
    const { errorResponse } = await checkDevAccess(req)
    if (errorResponse) return errorResponse
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      return NextResponse.json(
        { success: false, error: 'Некорректный идентификатор' },
        { status: 400 }
      )
    }

    await dbConnect()
    const deleted = await News.findByIdAndDelete(id)
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Новость не найдена' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { success: true, data: { deletedId: String(id) } },
      { status: 200 }
    )
  } catch (error) {
    console.error('DELETE /api/news/[id] error', error)
    return NextResponse.json(
      { success: false, error: 'Ошибка сервера' },
      { status: 500 }
    )
  }
}
