import test from 'node:test'
import assert from 'node:assert/strict'
import {
  hasDocuments,
  normalizeEventDocumentFiles,
  normalizeEventDocuments,
} from './eventApiNormalization.js'

test('normalizes event document file metadata', () => {
  const files = normalizeEventDocumentFiles([
    {
      name: ' Договор.pdf ',
      description: ' Подписанный договор ',
      url: ' https://cloud.escalion.ru/uploads/artistcrm/events/1/contract.pdf ',
      size: '2048',
      type: 'application/pdf',
      uploadedAt: '2026-06-24T05:00:00.000Z',
    },
    {
      name: 'empty-url.pdf',
      url: '',
    },
    null,
  ])

  assert.deepEqual(files, [
    {
      name: 'Договор.pdf',
      description: 'Подписанный договор',
      url: 'https://cloud.escalion.ru/uploads/artistcrm/events/1/contract.pdf',
      size: 2048,
      type: 'application/pdf',
      uploadedAt: '2026-06-24T05:00:00.000Z',
    },
  ])
})

test('detects document files as documents', () => {
  assert.equal(
    hasDocuments({
      documentFiles: [
        {
          description: 'contract.pdf',
          name: 'contract.pdf',
          url: 'https://cloud.escalion.ru/uploads/artistcrm/events/1/contract.pdf',
        },
      ],
    }),
    true
  )
})

test('detects typed documents as documents', () => {
  assert.equal(
    hasDocuments({
      documents: [
        {
          type: 'contract',
          title: 'Договор',
          url: 'https://example.com/contract',
        },
      ],
    }),
    true
  )
})

test('normalizes typed event documents', () => {
  const documents = normalizeEventDocuments([
    {
      type: 'receipt',
      title: ' Чек ',
      url: ' https://example.com/receipt ',
    },
  ])

  assert.equal(documents.length, 1)
  assert.equal(documents[0].type, 'receipt')
  assert.equal(documents[0].title, 'Чек')
  assert.equal(documents[0].url, 'https://example.com/receipt')
})
