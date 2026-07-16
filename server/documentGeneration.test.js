import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import PizZip from 'pizzip'
import { renderDocxTemplate } from './documentGeneration.js'

const templateBase64 = fs
  .readFileSync(new URL('../public/templates/default-contract-template.docx', import.meta.url))
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
  const marker = `[[PARTIES_TABLES:${encodeURIComponent(JSON.stringify({
    performer: { title: 'Исполнитель', rows: [{ key: 'ИНН', value: '123' }] },
    customer: { title: 'Заказчик', rows: [{ key: 'ИНН', value: '456' }] },
  }))}]]`
  const output = renderDocxTemplate({
    templateBase64,
    variables: { 'РЕКВИЗИТЫ СТОРОН': marker },
  })
  const xml = new PizZip(output).file('word/document.xml').asText()
  assert.doesNotMatch(xml, /PARTIES_TABLES/)
  assert.match(xml, /<w:tbl/)
  assert.match(xml, /Исполнитель/)
})
