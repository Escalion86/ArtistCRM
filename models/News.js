import mongoose from 'mongoose'
import newsSchema from '@schemas/newsSchema'

const NewsSchema = new mongoose.Schema(newsSchema, { timestamps: true })
NewsSchema.index({ isPublished: 1, publishedAt: -1 })

export default mongoose.models.News || mongoose.model('News', NewsSchema)
