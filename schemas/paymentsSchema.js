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
    enum: ['manual', 'system'],
  },
  comment: {
    type: String,
    default: '',
  },
}

export default paymentsSchema
