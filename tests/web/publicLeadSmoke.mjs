import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import mongoose from 'mongoose'

export const runPublicLeadSmoke = async ({ baseUrl, db }) => {
  const tenantId = new mongoose.Types.ObjectId()
  const foreignTenantId = new mongoose.Types.ObjectId()
  const tariffId = new mongoose.Types.ObjectId()
  const key = `smoke-${randomUUID()}`
  await db
    .collection('tariffs')
    .insertOne({
      _id: tariffId,
      title: 'Public smoke',
      eventsPerMonth: 100,
      allowPublicLeadApi: true,
    })
  await db
    .collection('users')
    .insertOne({
      _id: tenantId,
      tenantId,
      tariffId,
      role: 'user',
      archive: false,
    })
  await db.collection('sitesettings').insertOne({
    tenantId,
    custom: {
      publicLeadEnabled: true,
      publicLeadPushEnabled: false,
      publicLeadApiKeys: [
        { id: 'smoke', key, name: 'Тестовый сайт', enabled: true },
      ],
    },
  })
  const post = async (route, payload, apiKey, form = false) => {
    const response = await fetch(`${baseUrl}${route}`, {
      method: 'POST',
      headers: {
        'content-type': form
          ? 'application/x-www-form-urlencoded'
          : 'application/json',
        ...(apiKey ? { 'x-api-key': apiKey } : {}),
      },
      body: form ? new URLSearchParams(payload) : JSON.stringify(payload),
    })
    return { status: response.status, body: await response.json() }
  }
  for (const route of ['/api/public/lead', '/api/public/lead/tilda']) {
    assert.equal((await post(route, { name: 'Тест' })).status, 401)
    assert.equal(
      (await post(route, { name: 'Тест' }, 'invalid-smoke')).status,
      403
    )
  }
  const lead = await post(
    '/api/public/lead',
    {
      name: 'Тестовый лид',
      phone: '+7 (900) 000-08-99',
      tenantId: String(foreignTenantId),
      apiKey: key,
      nested: { token: 'synthetic-secret', comment: 'Сохранить' },
    },
    key
  )
  assert.equal(lead.status, 201, JSON.stringify(lead.body))
  const tilda = await post(
    '/api/public/lead/tilda',
    {
      Name: 'Тестовый лид',
      Phone: '89000000899',
      formname: 'Тестовая форма',
      secret: 'synthetic-secret',
    },
    key,
    true
  )
  assert.equal(tilda.status, 201, JSON.stringify(tilda.body))
  assert.equal(
    tilda.body.data.clientId,
    lead.body.data.clientId,
    'Телефон должен объединять клиента из API и Tilda'
  )
  const events = await db.collection('events').find({ tenantId }).toArray()
  assert.equal(events.length, 2)
  for (const event of events) {
    assert.equal(event.status, 'draft')
    assert.equal(event.clientData.sourceLabel, 'Тестовый сайт')
    assert.ok(
      event.additionalEvents.length > 0,
      'Лид должен получить задачу контакта'
    )
    const raw = JSON.stringify(event.clientData.lead.raw)
    assert.ok(!raw.includes(key))
    assert.ok(!raw.includes('synthetic-secret'))
  }
  assert.equal(
    await db.collection('events').countDocuments({ tenantId: foreignTenantId }),
    0
  )
  const legacyClientId = new mongoose.Types.ObjectId()
  await db
    .collection('clients')
    .insertOne({
      _id: legacyClientId,
      tenantId,
      phone: 89000000898,
      firstName: 'Старый клиент',
    })
  const legacyLead = await post(
    '/api/public/lead',
    { name: 'Старый клиент', phone: '9000000898' },
    key
  )
  assert.equal(legacyLead.status, 201)
  assert.equal(legacyLead.body.data.clientId, String(legacyClientId))
  assert.equal(await db.collection('clients').countDocuments({ tenantId }), 2)
  await db
    .collection('sitesettings')
    .updateOne({ tenantId }, { $set: { 'custom.publicLeadEnabled': false } })
  assert.equal(
    (await post('/api/public/lead', { name: 'Тест' }, key)).status,
    403
  )
  assert.equal(await db.collection('events').countDocuments({ tenantId }), 3)
}
