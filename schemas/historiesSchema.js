import { Schema } from 'mongoose'

const historiesSchema = {
  tenantId: { type: Schema.Types.ObjectId, ref: 'Users', default: null },
  entityType: { type: String, default: '' },
  entityId: { type: String, default: '' },
  operation: {
    type: String,
    enum: ['create', 'update', 'delete', 'merge', ''],
    default: '',
  },
  semanticAction: { type: String, default: '' },
  entityLabel: { type: String, maxlength: 500, default: '' },
  summary: { type: String, maxlength: 500, default: '' },
  changes: {
    type: [
      {
        _id: false,
        field: { type: String, default: '' },
        label: { type: String, default: '' },
        oldValue: { type: Schema.Types.Mixed, default: null },
        newValue: { type: Schema.Types.Mixed, default: null },
      },
    ],
    default: undefined,
  },
  actorType: {
    type: String,
    enum: ['user', 'integration', 'system', ''],
    default: '',
  },
  actorId: { type: String, default: '' },
  actorLabel: { type: String, maxlength: 200, default: '' },
  source: { type: String, maxlength: 100, default: '' },
  occurredAt: { type: Date, default: () => new Date() },
  operationId: { type: String, default: undefined },
  batchId: { type: String, default: '' },
  legacy: { type: Boolean, default: false },
  schema: {
    type: String,
  },
  action: {
    type: String,
  },
  data: {
    type: [{}],
    default: undefined,
  },
  userId: {
    type: String,
  },
  difference: {
    type: Boolean,
    default: false,
  },
}

export default historiesSchema
