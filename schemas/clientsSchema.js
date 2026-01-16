import { DEFAULT_USERS_NOTIFICATIONS } from '@helpers/constants'
import { Schema } from 'mongoose'

const clientsSchema = {
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'Users',
    index: true,
    default: null,
  },
  firstName: {
    type: String,
    maxlength: [
      100,
      'Имя не может быть больше 100 символов. Или это "Напу-Амо-Хала-Она-Она-Анека-Вехи-Вехи-Она-Хивеа-Нена-Вава-Кехо-Онка-Кахе-Хеа-Леке-Еа-Она-Ней-Нана-Ниа-Кеко-Оа-Ога-Ван-Ика-Ванао"? Тут 102 буквы, можешь загуглить....',
    ],
    default: '',
  },
  secondName: {
    type: String,
    maxlength: [
      100,
      'Фамилия не может быть больше 100 символов. Или это "Напу-Амо-Хала-Она-Она-Анека-Вехи-Вехи-Она-Хивеа-Нена-Вава-Кехо-Онка-Кахе-Хеа-Леке-Еа-Она-Ней-Нана-Ниа-Кеко-Оа-Ога-Ван-Ика-Ванао"? Тут 102 буквы, можешь загуглить....',
    ],
    default: '',
  },
  thirdName: {
    type: String,
    maxlength: [
      100,
      'Отчество не может быть больше 100 символов. Или это "Напу-Амо-Хала-Она-Она-Анека-Вехи-Вехи-Она-Хивеа-Нена-Вава-Кехо-Онка-Кахе-Хеа-Леке-Еа-Она-Ней-Нана-Ниа-Кеко-Оа-Ога-Ван-Ика-Ванао"? Тут 102 буквы, можешь загуглить....',
    ],
    default: '',
  },
  priorityContact: {
    type: String,
    default: null,
  },
  email: {
    type: String,
    lowercase: true,
    default: '',
  },
  password: {
    type: String,
    default: '',
  },
  images: {
    type: Array,
    default: [],
  },
  gender: {
    type: String,
    default: null,
  },
  phone: {
    type: Number,
    default: null,
  },
  whatsapp: {
    type: Number,
    default: null,
  },
  viber: {
    type: Number,
    default: null,
  },
  telegram: {
    type: String,
    default: '',
  },
  instagram: {
    type: String,
    default: '',
  },
  vk: {
    type: String,
    default: '',
  },
  birthday: {
    type: Date,
    default: null,
  },
  role: {
    type: String,
    default: 'client',
  },
  clientType: {
    type: String,
    default: 'none',
  },
  lastActivityAt: {
    type: Date,
    default: () => Date.now(),
  },
  prevActivityAt: {
    type: Date,
    default: () => Date.now(),
  },
  archive: {
    type: Boolean,
    default: false,
  },
  notifications: {
    type: Map,
    of: Schema.Types.Mixed,
    default: DEFAULT_USERS_NOTIFICATIONS,
  },
  town: {
    type: String,
    default: null,
  },
}

export default clientsSchema
