import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildAiClientPayload,
  extractAiClientContacts,
  findClientByAiContacts,
  formatAiClientName,
  keepAiContactsPresentInText,
  matchAiServiceIds,
  mergeAiClientContacts,
  resolveAiClientByName,
} from './aiEventDraftContacts.mjs'

test('извлекает телефон, email и ссылки на соцсети из заметки', () => {
  const contacts = extractAiClientContacts(
    'Анна +7 (913) 123-45-67, anna@example.ru, Telegram: @anna_show, vk.com/anna_magic'
  )

  assert.equal(contacts.phone, '79131234567')
  assert.equal(contacts.email, 'anna@example.ru')
  assert.equal(contacts.telegram, 'anna_show')
  assert.equal(contacts.vk, 'anna_magic')
})

test('находит клиента по номеру независимо от поля хранения', () => {
  const clients = [
    { _id: 'client-1', firstName: 'Анна', whatsapp: 79131234567 },
  ]

  const client = findClientByAiContacts(clients, {
    phone: '+7 913 123-45-67',
  })
  assert.equal(client?._id, 'client-1')
})

test('использует контакт как имя нового клиента', () => {
  const payload = buildAiClientPayload({
    contacts: { phone: '8 913 123-45-67' },
  })

  assert.equal(payload.firstName, '+79131234567')
  assert.equal(payload.phone, 79131234567)
  assert.equal(payload.preferredContactChannel, 'phone')
})

test('объединяет детерминированные и AI-контакты', () => {
  const contacts = mergeAiClientContacts(
    { phone: '+7 913 123-45-67' },
    { telegram: 'https://t.me/anna' }
  )

  assert.equal(contacts.phone, '79131234567')
  assert.equal(contacts.telegram, 'anna')
})

test('отбрасывает контакт, которого не было в исходной заметке', () => {
  const contacts = keepAiContactsPresentInText(
    { email: 'invented@example.ru', telegram: 'invented_user' },
    'Клиент Анна, связь по телефону +7 913 123-45-67'
  )

  assert.equal(contacts.email, '')
  assert.equal(contacts.telegram, '')
})

test('подбирает услуги по полному названию из заметки', () => {
  const services = [
    { _id: 'service-1', title: 'Шоу иллюзий' },
    { _id: 'service-2', title: 'Встреча гостей' },
  ]

  assert.deepEqual(matchAiServiceIds('Нужно шоу иллюзий на свадьбу', services), [
    'service-1',
  ])
})

test('находит единственного клиента по падежной форме фамилии', () => {
  const clients = [
    { _id: 'client-1', firstName: 'Анна', secondName: 'Ларкович' },
    { _id: 'client-2', firstName: 'Пётр', secondName: 'Соколов' },
  ]

  const result = resolveAiClientByName(
    clients,
    'Завтра на Линейной 38 от Ларковича за свадебное'
  )

  assert.equal(result.client?._id, 'client-1')
  assert.equal(result.ambiguous, false)
})

test('не выбирает клиента при одинаково подходящей фамилии', () => {
  const clients = [
    { _id: 'client-1', firstName: 'Анна', secondName: 'Ларкович' },
    { _id: 'client-2', firstName: 'Пётр', secondName: 'Ларкович' },
  ]

  const result = resolveAiClientByName(clients, 'Заказ от Ларковича')

  assert.equal(result.client, null)
  assert.equal(result.ambiguous, true)
  assert.deepEqual(
    result.candidates.map(formatAiClientName),
    ['Анна Ларкович', 'Пётр Ларкович']
  )
})

test('уточняющее имя снимает неоднозначность одинаковой фамилии', () => {
  const clients = [
    { _id: 'client-1', firstName: 'Анна', secondName: 'Ларкович' },
    { _id: 'client-2', firstName: 'Пётр', secondName: 'Ларкович' },
  ]

  const result = resolveAiClientByName(
    clients,
    'Заказ от Анны Ларкович'
  )

  assert.equal(result.client?._id, 'client-1')
  assert.equal(result.ambiguous, false)
})

test('не принимает служебные слова из названия другого клиента за совпадение', () => {
  const clients = [
    { _id: 'client-1', firstName: '', secondName: 'Ларкович' },
    {
      _id: 'client-2',
      firstName: 'Выступление на Утро на Енисее',
      secondName: '',
    },
  ]

  const result = resolveAiClientByName(
    clients,
    'Завтра на Линейной 38 от Ларковича за свадебное'
  )

  assert.equal(result.client?._id, 'client-1')
  assert.equal(result.ambiguous, false)
})
