import { Schema } from 'mongoose'

const newsSchema = {
  title: {
    type: String,
    required: true,
    maxlength: 120,
    trim: true,
  },
  version: {
    type: String,
    maxlength: 20,
    default: '',
    trim: true,
  },
  items: {
    type: [{ type: String, maxlength: 300, trim: true }],
    default: [],
    validate: {
      validator(value) {
        if (!Array.isArray(value) || value.length > 20) return false
        if (value.length >= 1) return true
        const content = String(this.contentHtml ?? '')
        return (
          /<img\b[^>]*\bsrc=/i.test(content) ||
          content.replace(/<[^>]+>/g, '').trim().length > 0
        )
      },
      message: 'Новость должна содержать текст или изображение',
    },
  },
  contentHtml: {
    type: String,
    maxlength: 100000,
    default: '',
  },
  isPublished: {
    type: Boolean,
    default: false,
  },
  publishedAt: {
    type: Date,
    default: null,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'Users',
    default: null,
  },
}

export default newsSchema
