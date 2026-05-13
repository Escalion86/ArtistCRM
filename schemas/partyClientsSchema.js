import { Schema } from 'mongoose'

const partyClientsSchema = {
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'PartyCompanies',
    required: true,
    index: true,
  },
  firstName: {
    type: String,
    trim: true,
    default: '',
    maxlength: 120,
  },
  secondName: {
    type: String,
    trim: true,
    default: '',
    maxlength: 120,
  },
  thirdName: {
    type: String,
    trim: true,
    default: '',
    maxlength: 120,
  },
  phone: {
    type: String,
    trim: true,
    default: '',
    maxlength: 40,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    default: '',
    maxlength: 160,
  },
  comment: {
    type: String,
    trim: true,
    default: '',
    maxlength: 1000,
  },
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active',
  },
}

export default partyClientsSchema
