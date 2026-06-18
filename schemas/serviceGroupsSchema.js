import { Schema } from 'mongoose'

const serviceGroupsSchema = {
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'Users',
    default: null,
  },
  title: {
    type: String,
    required: [true, 'Укажите название группы'],
    trim: true,
  },
  order: {
    type: Number,
    default: 0,
  },
}

export default serviceGroupsSchema
