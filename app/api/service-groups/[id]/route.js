import { NextResponse } from 'next/server'
import ServiceGroups from '@models/ServiceGroups'
import Services from '@models/Services'
import dbConnect from '@server/dbConnect'
import getTenantContext from '@server/getTenantContext'

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
  const group = await ServiceGroups.findOneAndUpdate(
    { _id: id, tenantId },
    body,
    {
      returnDocument: 'after',
    }
  )
  if (!group)
    return NextResponse.json(
      { success: false, error: 'Группа не найдена' },
      { status: 404 }
    )
  return NextResponse.json({ success: true, data: group }, { status: 200 })
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

  // Проверяем, есть ли услуги в этой группе
  const servicesCount = await Services.countDocuments({
    tenantId,
    groupId: id,
  })
  if (servicesCount > 0) {
    return NextResponse.json(
      {
        success: false,
        error: `Нельзя удалить группу: в ней ${servicesCount} услуг`,
      },
      { status: 409 }
    )
  }

  const deleted = await ServiceGroups.findOneAndDelete({ _id: id, tenantId })
  if (!deleted)
    return NextResponse.json(
      { success: false, error: 'Группа не найдена' },
      { status: 404 }
    )
  return NextResponse.json({ success: true }, { status: 200 })
}
