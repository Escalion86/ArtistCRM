import { Schema } from 'mongoose'

const assignedStaffSchema = new Schema(
  {
    staffId: {
      type: Schema.Types.ObjectId,
      ref: 'PartyStaff',
      required: true,
    },
    role: {
      type: String,
      enum: ['performer', 'admin', 'assistant'],
      default: 'performer',
    },
    payoutAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    payoutStatus: {
      type: String,
      enum: ['planned', 'ready', 'paid', 'canceled'],
      default: 'planned',
    },
    confirmationStatus: {
      type: String,
      enum: ['pending', 'confirmed', 'declined', 'done'],
      default: 'pending',
    },
  },
  { _id: false }
)

const partyOrdersSchema = {
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'PartyCompanies',
    required: true,
    index: true,
  },
  title: {
    type: String,
    trim: true,
    default: '',
    maxlength: 180,
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'canceled', 'closed'],
    default: 'draft',
    index: true,
  },
  client: {
    name: { type: String, trim: true, default: '', maxlength: 160 },
    phone: { type: String, trim: true, default: '', maxlength: 40 },
    email: { type: String, trim: true, lowercase: true, default: '', maxlength: 160 },
  },
  eventDate: {
    type: Date,
    default: null,
    index: true,
  },
  dateEnd: {
    type: Date,
    default: null,
  },
  placeType: {
    type: String,
    enum: ['company_location', 'client_address'],
    default: 'company_location',
  },
  locationId: {
    type: Schema.Types.ObjectId,
    ref: 'PartyLocations',
    default: null,
    index: true,
  },
  customAddress: {
    type: String,
    trim: true,
    default: '',
    maxlength: 500,
  },
  serviceTitle: {
    type: String,
    trim: true,
    default: '',
    maxlength: 180,
  },
  clientPayment: {
    totalAmount: { type: Number, default: 0, min: 0 },
    prepaidAmount: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['none', 'wait_prepayment', 'prepaid', 'paid'],
      default: 'none',
    },
  },
  assignedStaff: {
    type: [assignedStaffSchema],
    default: [],
  },
  adminComment: {
    type: String,
    trim: true,
    default: '',
    maxlength: 2000,
  },
}

export default partyOrdersSchema
