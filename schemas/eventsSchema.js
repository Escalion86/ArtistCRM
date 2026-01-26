import { Schema } from 'mongoose'

const eventsSchema = {
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
  requestId: {
    type: Schema.Types.ObjectId,
    ref: 'Requests',
    default: null,
  },
  description: {
    type: String,
    default: 'Описание мероприятия',
  },
  eventDate: {
    type: Date,
    default: null,
  },
  requestDate: {
    type: Date,
    default: null,
  },
  servicesIds: {
    type: [Schema.Types.ObjectId],
    ref: 'Services',
    default: [],
  },
  dateStart: {
    type: Date,
    default: null,
  },
  dateEnd: {
    type: Date,
    default: null,
  },
  otherContacts: {
    type: [
      {
        clientId: {
          type: Schema.Types.ObjectId,
          ref: 'Clients',
          default: null,
        },
        comment: {
          type: String,
          default: '',
        },
      },
    ],
    default: [],
  },
  invoiceLinks: {
    type: [String],
    default: [],
  },
  receiptLinks: {
    type: [String],
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
  status: {
    type: String,
    default: 'active',
  },
  isTransferred: {
    type: Boolean,
    default: false,
  },
  colleagueId: {
    type: Schema.Types.ObjectId,
    ref: 'Clients',
    default: null,
  },
  images: {
    type: Array,
    default: [],
  },
  showOnSite: {
    type: Boolean,
    default: true,
  },
  tags: {
    type: Array,
    default: [String],
  },
  report: {
    type: String,
    default: '',
  },
  reportImages: {
    type: Array,
    default: [],
  },
  googleCalendarId: {
    type: String,
    default: null,
  },
  googleCalendarCalendarId: {
    type: String,
    default: '',
  },
  importedFromCalendar: {
    type: Boolean,
    default: false,
  },
  calendarImportChecked: {
    type: Boolean,
    default: false,
  },
  contractSum: {
    type: Number,
    default: 0,
  },
  isByContract: {
    type: Boolean,
    default: false,
  },
  clientData: {
    type: {},
    default: {},
  },
}

export default eventsSchema
