import { Schema } from 'mongoose'

const requestsSchema = {
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'Users',
    default: null,
  },
  clientId: {
    type: Schema.Types.ObjectId,
    ref: 'Clients',
    default: null,
  },
  clientName: {
    type: String,
    required: [true, 'Укажите имя клиента'],
    trim: true,
  },
  clientPhone: {
    type: String,
    required: [true, 'Укажите телефон клиента'],
  },
  contactChannels: {
    type: [String],
    default: [],
  },
  eventDate: {
    type: Date,
    default: null,
  },
  servicesIds: {
    type: [Schema.Types.ObjectId],
    ref: 'Services',
    default: [],
  },
  address: {
    type: {
      town: { type: String, default: '' },
      street: { type: String, default: '' },
      house: { type: String, default: '' },
      entrance: { type: String, default: '' },
      floor: { type: String, default: '' },
      flat: { type: String, default: '' },
      comment: { type: String, default: '' },
      latitude: { type: String, default: '' },
      longitude: { type: String, default: '' },
      link2Gis: { type: String, default: '' },
      linkYandexNavigator: { type: String, default: '' },
      link2GisShow: { type: Boolean, default: true },
      linkYandexShow: { type: Boolean, default: true },
    },
    default: () => ({}),
  },
  contractSum: {
    type: Number,
    default: 0,
  },
  comment: {
    type: String,
    default: '',
  },
  yandexAim: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['new', 'in_progress', 'converted', 'canceled'],
    default: 'new',
  },
  eventId: {
    type: Schema.Types.ObjectId,
    ref: 'Events',
    default: null,
  },
  googleCalendarId: {
    type: String,
    default: '',
  },
}

export default requestsSchema
