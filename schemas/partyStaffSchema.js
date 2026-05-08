import { Schema } from 'mongoose'

const partyStaffSchema = {
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'PartyCompanies',
    required: true,
    index: true,
  },
  authUserId: {
    type: String,
    trim: true,
    default: '',
    index: true,
  },
  firstName: {
    type: String,
    trim: true,
    default: '',
    maxlength: 100,
  },
  secondName: {
    type: String,
    trim: true,
    default: '',
    maxlength: 100,
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
  role: {
    type: String,
    enum: ['owner', 'admin', 'performer'],
    default: 'performer',
    index: true,
  },
  status: {
    type: String,
    enum: ['active', 'invited', 'paused', 'archived'],
    default: 'active',
  },
  visibleToPerformer: {
    type: Boolean,
    default: true,
  },
  lastLoginAt: {
    type: Date,
    default: null,
  },
}

export default partyStaffSchema
