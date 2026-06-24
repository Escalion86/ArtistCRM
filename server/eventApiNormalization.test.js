import test from 'node:test'
import assert from 'node:assert/strict'
import {
  hasDocuments,
  normalizeEventDocumentFiles,
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
