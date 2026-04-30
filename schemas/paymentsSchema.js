import { Schema } from 'mongoose'

const paymentsSchema = {
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'Users',
    default: null,
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
  },
  tariffId: {
    type: Schema.Types.ObjectId,
    ref: 'Tariffs',
    default: null,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  type: {
    type: String,
    required: true,
    enum: ['topup', 'charge', 'refund'],
  },
  source: {
    type: String,
    required: true,
    enum: ['manual', 'system', 'yookassa'],
  },
  status: {
    type: String,
    default: 'succeeded',
    enum: ['pending', 'succeeded', 'canceled', 'failed'],
  },
  purpose: {
    type: String,
    default: 'balance',
    enum: ['balance', 'tariff', 'system'],
  },
  provider: {
    type: String,
    default: '',
  },
  providerPaymentId: {
    type: String,
    default: '',
    trim: true,
    index: true,
  },
  idempotenceKey: {
    type: String,
    default: '',
    trim: true,
  },
  paidAt: {
    type: Date,
    default: null,
  },
  rawProviderStatus: {
    type: String,
    default: '',
  },
  comment: {
    type: String,
    default: '',
  },
}

export default paymentsSchema
