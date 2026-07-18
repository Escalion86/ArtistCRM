import mongoose from 'mongoose'
import Payments from '@models/Payments'
import dbConnect from '@server/dbConnect'
import getRequestContext from '@server/getRequestContext'
import { loadMobileBilling } from '@server/mobile/billingStore'
import { mobileError, mobileSuccess } from '@server/mobile/routeHelpers'
import { syncTochkaPayment } from '@server/tochkaPaymentProcessing'

export const POST = async (req, { params }) => {
  const context = await getRequestContext(req)
  if (!context.user?._id || !context.tenantId) {
    return mobileError('UNAUTHORIZED', 'Не авторизован', 401)
  }
  const { id } = await params
  if (!mongoose.isValidObjectId(id)) {
    return mobileError('PAYMENT_INVALID', 'Платёж не найден', 400)
  }
  await dbConnect()
  const payment = await Payments.findOne({
    _id: id,
    userId: context.user._id,
    tenantId: context.tenantId,
    provider: 'tochka',
    purpose: 'balance',
  }).lean()
  if (!payment) return mobileError('PAYMENT_NOT_FOUND', 'Платёж не найден', 404)
  const sync = await syncTochkaPayment({ paymentId: id })
  if (!sync.ok) {
    return mobileError(
      'PAYMENT_SYNC_FAILED',
      'Платёж пока не подтверждён. Повторите проверку позже.',
      409
    )
  }
  const billing = await loadMobileBilling({
    userId: context.user._id,
    tenantId: context.tenantId,
  })
  return mobileSuccess({ billing, paymentStatus: sync.status || 'succeeded' })
}
