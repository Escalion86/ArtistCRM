import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('contacts Telegram buttons use Telegram app deep links only', async () => {
  const source = await readFile('components/ContactsIconsButtons.js', 'utf8')

  assert.match(source, /tg:\/\/resolve\?domain=\$\{user\.telegram\}/)
  assert.match(source, /tg:\/\/resolve\?phone=\$\{user\.phone\}/)
  assert.match(source, /tg:\/\/resolve\?phone=\$\{user\.telegramPhone\}/)
  assert.doesNotMatch(source, /https:\/\/t\.me/)
})

test('phone messenger fallbacks can be confirmed or hidden', async () => {
  const [source, eventCardSource, clientSchemaSource] = await Promise.all([
    readFile('components/ContactsIconsButtons.js', 'utf8'),
    readFile('layouts/cards/EventCard.js', 'utf8'),
    readFile('schemas/clientsSchema.js', 'utf8'),
  ])

  assert.match(source, /!user\?\.whatsappPhoneUnavailable/)
  assert.match(source, /!user\?\.telegramPhoneUnavailable/)
  assert.match(source, /onPhoneMessengerAttempt\?\.\('whatsapp', user\)/)
  assert.match(source, /onPhoneMessengerAttempt\?\.\('telegram', user\)/)
  assert.doesNotMatch(eventCardSource, /forceTelegram=\{false\}/)
  assert.match(eventCardSource, /\[confirmedField\]: targetClient\.phone/)
  assert.match(eventCardSource, /\[unavailableField\]: true/)
  assert.match(clientSchemaSource, /whatsappPhoneUnavailable:/)
  assert.match(clientSchemaSource, /telegramPhone:/)
  assert.match(clientSchemaSource, /telegramPhoneUnavailable:/)
})
