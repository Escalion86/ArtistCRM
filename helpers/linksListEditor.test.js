import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getClipboardLinkAddResult,
  isClickableLink,
} from './linksListEditor.js'

test('adds trimmed clipboard link to list when url is valid', () => {
  const result = getClipboardLinkAddResult({
    links: ['https://artistcrm.ru/contract/1'],
    clipboardText: '  https://example.com/check-123  ',
  })

  assert.deepEqual(result, {
    ok: true,
    links: [
      'https://artistcrm.ru/contract/1',
      'https://example.com/check-123',
    ],
  })
})

test('rejects empty clipboard text', () => {
  const result = getClipboardLinkAddResult({
    links: ['https://artistcrm.ru/contract/1'],
    clipboardText: '   ',
  })

  assert.deepEqual(result, {
    ok: false,
    error: 'В буфере обмена нет корректной ссылки',
  })
})

test('rejects invalid clipboard text', () => {
  const result = getClipboardLinkAddResult({
    links: ['https://artistcrm.ru/contract/1'],
    clipboardText: 'не ссылка',
  })

  assert.deepEqual(result, {
    ok: false,
    error: 'В буфере обмена нет корректной ссылки',
  })
})

test('recognizes clickable http and https links only', () => {
  assert.equal(isClickableLink('https://artistcrm.ru/doc'), true)
  assert.equal(isClickableLink('http://artistcrm.ru/doc'), true)
  assert.equal(isClickableLink('ftp://artistcrm.ru/doc'), false)
  assert.equal(isClickableLink('artistcrm.ru/doc'), false)
})
