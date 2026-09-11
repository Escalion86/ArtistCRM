import test from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'

import newsSchema from './newsSchema.js'

const NewsSchemaTest =
  mongoose.models.NewsSchemaTest ||
  mongoose.model(
    'NewsSchemaTest',
    new mongoose.Schema(newsSchema, { timestamps: true })
  )

test('newsSchema: пустой массив items не проходит валидацию', async () => {
  const doc = new NewsSchemaTest({ title: 'Тест', items: [] })
  await assert.rejects(doc.validate())
})

test('newsSchema: больше 20 пунктов не проходит валидацию', async () => {
  const doc = new NewsSchemaTest({
    title: 'Тест',
    items: Array.from({ length: 21 }, (_, i) => `p${i}`),
  })
  await assert.rejects(doc.validate())
})

test('newsSchema: валидный документ проходит, дефолты корректны', async () => {
  const doc = new NewsSchemaTest({ title: 'Тест', items: ['Пункт'] })
  await doc.validate()
  assert.equal(doc.isPublished, false)
  assert.equal(doc.publishedAt, null)
  assert.equal(doc.version, '')
  assert.equal(doc.contentHtml, '')
})

test('newsSchema: rich text может использоваться без legacy items', async () => {
  const doc = new NewsSchemaTest({
    title: 'Тест',
    items: [],
    contentHtml: '<p>Оформленный текст</p>',
  })
  await doc.validate()
})
