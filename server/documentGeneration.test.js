import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import PizZip from 'pizzip'
import { formatDocumentDate, renderDocxTemplate } from './documentGeneration.js'

test('дата документа отклоняет несуществующий день и сохраняет високосный', () => {
  for (const value of [
    '2026-02-31',
    '2025-02-29',
    '2026-04-31',
    '2026-13-01',
    '2026-00-10',
    '2026-09-00',
    'invalid',
  ]) {
    assert.equal(formatDocumentDate(value), null, value)
  }
  assert.deepEqual(formatDocumentDate('2024-02-29'), {
    iso: '2024-02-29',
    label: '29.02.2024',
  })
  assert.deepEqual(formatDocumentDate('2026-09-10'), {
    iso: '2026-09-10',
    label: '10.09.2026',
  })
  assert.match(formatDocumentDate().iso, /^\d{4}-\d{2}-\d{2}$/)
})

const templateBase64 = fs
  .readFileSync(
    new URL(
      '../public/templates/default-contract-template.docx',
      import.meta.url
    )
  )
  .toString('base64')

test('формирует валидный DOCX и подставляет номер документа', () => {
  const output = renderDocxTemplate({
    templateBase64,
    variables: { 'НОМЕР ДОКУМЕНТА': '42' },
  })
  assert.equal(output.subarray(0, 2).toString(), 'PK')
  const xml = new PizZip(output).file('word/document.xml').asText()
  assert.match(xml, /42/)
})

test('заменяет служебный маркер реквизитов на Word-таблицу', () => {
  const marker = `[[PARTIES_TABLES:${encodeURIComponent(
    JSON.stringify({
      performer: { title: 'Исполнитель', rows: [{ key: 'ИНН', value: '123' }] },
      customer: { title: 'Заказчик', rows: [{ key: 'ИНН', value: '456' }] },
    })
  )}]]`
  const output = renderDocxTemplate({
    templateBase64,
    variables: { 'РЕКВИЗИТЫ СТОРОН': marker },
  })
  const xml = new PizZip(output).file('word/document.xml').asText()
  assert.doesNotMatch(xml, /PARTIES_TABLES/)
  assert.match(xml, /<w:tbl/)
  assert.match(xml, /Исполнитель/)
})
