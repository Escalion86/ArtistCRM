import { NextResponse } from 'next/server'
import dbConnect from '@server/dbConnect'
import getTenantContext from '@server/getTenantContext'
import { sendPushToTenant } from '@server/pushNotifications'

export const POST = async () => {
  const { tenantId } = await getTenantContext()
  if (!tenantId) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' },
      { status: 401 }
    )
  }

  await dbConnect()
  const result = await sendPushToTenant({
    tenantId,
    payload: {
      title: 'Тест push-уведомления',
      body: 'Проверка канала уведомлений для API-заявок',
      icon: '/icons/AppImages/android/android-launchericon-192-192.png',
      badge: '/icons/AppImages/android/android-launchericon-192-192.png',
      tag: `push-test-${Date.now()}`,
      data: {
        url: '/cabinet/eventsUpcoming',
        type: 'push_test',
      },
    },
  })

  return NextResponse.json({ success: true, data: result }, { status: 200 })
}
