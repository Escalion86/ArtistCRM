import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getProposalBlockContentHtml,
  renderProposalRichTextVariables,
  sanitizeProposalRichText,
} from './proposalRichText.js'

test('proposal rich text removes unsafe markup and protocols', () => {
  const result = sanitizeProposalRichText(
    '<p>Текст<script>alert(1)</script><a href="javascript:alert(1)">ссылка</a></p>'
  )
  assert.equal(result.includes('<script'), false)
  assert.equal(result.includes('javascript:'), false)
  assert.equal(result.includes('Текст'), true)
})

test('proposal rich text renders variables as escaped values', () => {
  const result = renderProposalRichTextVariables(
    '<p>Для {{client.firstName}} — {{event.date}}</p>',
    { client: { firstName: '<Анна>' }, event: {} }
  )
  assert.equal(result.html.includes('&lt;Анна&gt;'), true)
  assert.deepEqual(result.unknown, ['event.date'])
})

test('proposal variable tokens survive sanitizing', () => {
  const result = sanitizeProposalRichText(
    '<p><span data-proposal-variable="event.date" data-proposal-variable-label="Дата мероприятия">{{event.date}}</span></p>'
  )
  assert.equal(result.includes('data-proposal-variable="event.date"'), true)
  assert.equal(result.includes('{{event.date}}'), true)
})

test('legacy proposal block text and benefits become rich text', () => {
  assert.equal(
    getProposalBlockContentHtml({ type: 'intro', text: 'Первая\nВторая' }),
    '<p>Первая</p><p>Вторая</p>'
  )
  assert.equal(
    getProposalBlockContentHtml({ type: 'benefits', items: ['Опыт', 'Шоу'] }),
    '<ul><li>Опыт</li><li>Шоу</li></ul>'
  )
})
