import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DOCX_TEMPLATE_MAX_BYTES,
  normalizeDocumentTemplate,
  normalizeDocumentTemplates,
  normalizeDocumentTemplatesFromSettings,
  validateDocxTemplateFileMeta,
} from './documentTemplates.js'

test('normalizes one document template', () => {
  const result = normalizeDocumentTemplate(
    {
      id: 'template-1',
      name: ' Договор ИП ',
      type: 'contract',
      fileName: 'dogovor.docx',
      templateBase64: 'abc',
      createdAt: '2026-07-01T00:00:00.000Z',
      updatedAt: '2026-07-02T00:00:00.000Z',
    },
    { now: '2026-07-03T00:00:00.000Z' }
  )

  assert.deepEqual(result, {
    id: 'template-1',
    name: 'Договор ИП',
    type: 'contract',
    customTypeName: '',
    fileName: 'dogovor.docx',
    templateBase64: 'abc',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-02T00:00:00.000Z',
  })
})

test('drops templates without base64 payload', () => {
  assert.deepEqual(
    normalizeDocumentTemplates([{ name: 'Пустой', fileName: 'empty.docx' }]),
    []
  )
})

test('converts legacy contract and act settings into templates', () => {
  const result = normalizeDocumentTemplatesFromSettings(
    {
      contractDocxTemplateBase64: 'contract-base64',
      contractDocxTemplateFileName: 'contract.docx',
      actDocxTemplateBase64: 'act-base64',
      actDocxTemplateFileName: 'act.docx',
      documentTemplates: [],
    },
    { now: '2026-07-03T00:00:00.000Z' }
  )

  assert.equal(result.length, 2)
  assert.equal(result[0].name, 'Договор')
  assert.equal(result[0].type, 'contract')
  assert.equal(result[0].templateBase64, 'contract-base64')
  assert.equal(result[1].name, 'Акт')
  assert.equal(result[1].type, 'act')
  assert.equal(result[1].templateBase64, 'act-base64')
})

test('keeps existing templates before adding missing legacy templates', () => {
  const result = normalizeDocumentTemplatesFromSettings(
    {
      documentTemplates: [
        {
          id: 'custom',
          name: 'Счет',
          type: 'invoice',
          fileName: 'invoice.docx',
          templateBase64: 'invoice-base64',
        },
      ],
      contractDocxTemplateBase64: 'contract-base64',
      contractDocxTemplateFileName: 'contract.docx',
    },
    { now: '2026-07-03T00:00:00.000Z' }
  )

  assert.equal(result.length, 2)
  assert.equal(result[0].id, 'custom')
  assert.equal(result[1].type, 'contract')
})

test('validates docx file metadata', () => {
  assert.deepEqual(
    validateDocxTemplateFileMeta({
      name: 'template.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: DOCX_TEMPLATE_MAX_BYTES,
    }),
    { valid: true, error: '' }
  )
  assert.equal(
    validateDocxTemplateFileMeta({ name: 'template.pdf', type: '', size: 10 })
      .error,
    'Загрузите файл в формате .docx'
  )
  assert.equal(
    validateDocxTemplateFileMeta({
      name: 'big.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: DOCX_TEMPLATE_MAX_BYTES + 1,
    }).error,
    'Размер DOCX-шаблона не должен превышать 5 МБ'
  )
})
