import { Schema } from 'mongoose'

const pushReminderLogsSchema = {
  tenantId: {
    type: Schema.Types.ObjectId,
    ref: 'Users',
    required: true,
  },
  eventId: {
    type: Schema.Types.ObjectId,
    ref: 'Events',
    default: null,
    required() {
      return this.reminderType !== 'summary'
    },
  },
  additionalEventIndex: {
    type: Number,
    default: null,
  },
  reminderType: {
    type: String,
    required: true,
    enum: ['tomorrow', 'overdue', 'summary'],
  },
  dateKey: {
    type: String,
    required: true,
  },
  sentAt: {
    type: Date,
    default: () => new Date(),
  },
}

export default pushReminderLogsSchema
