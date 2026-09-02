import mongoose from 'mongoose'

const FileImportSchema = new mongoose.Schema(
  {
    tenantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    fileName: String,
    fileHash: String,
    lines: { type: [mongoose.Schema.Types.Mixed], default: [], select: false },
    characters: Number,
    warnings: [String],
    note: { type: String, default: '' },
    status: {
      type: String,
      enum: [
        'uploaded',
        'analyzing',
        'review',
        'quoted',
        'importing',
        'paused',
        'completed',
        'failed',
      ],
      default: 'uploaded',
    },
    analysis: mongoose.Schema.Types.Mixed,
    answers: { type: mongoose.Schema.Types.Mixed, default: {} },
    selectedIds: [String],
    records: { type: [mongoose.Schema.Types.Mixed], default: [] },
    quote: mongoose.Schema.Types.Mixed,
    budgetId: String,
    budgetIds: { type: [String], default: [] },
    analysisAttempt: { type: Number, default: 0 },
    importAttempt: { type: Number, default: 0 },
    leaseToken: String,
    leaseUntil: { type: Date, default: null },
    error: { type: String, default: '' },
    cancelRequested: { type: Boolean, default: false },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 86400000),
    },
  },
  { timestamps: true }
)
FileImportSchema.index({ tenantId: 1, fileHash: 1 }, { unique: true })
FileImportSchema.index({ status: 1, leaseUntil: 1 })
// No TTL: a worker must release money before removing expired source data.
export default mongoose.models.FileImports ||
  mongoose.model('FileImports', FileImportSchema)
