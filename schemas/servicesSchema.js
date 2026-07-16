import { Schema } from 'mongoose'

const servicesSchema = {
  syncVersion: {
    type: Number,
    default: 1,
  },
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'Users',
    default: null,
  },
  title: {
    type: String,
    required: [true, 'Укажите название услуги'],
    trim: true,
  },
  description: {
    type: String,
    default: '',
  },
  images: {
    type: Array,
    default: [],
  },
  duration: {
    type: Number,
    default: 0,
  },
  price: {
    type: Number,
    default: 0,
    min: 0,
  },
  groupId: {
    type: Schema.Types.ObjectId,
    ref: 'ServiceGroups',
    default: null,
  },
}

export default servicesSchema
