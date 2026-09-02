// Uses an explicitly supplied local MongoDB and a unique disposable database.
// The AI endpoint is local and mocked: no paid requests or real customer data.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { encode } from 'next-auth/jwt'
import { createFileImportBudgetStore } from '../../server/fileImportBudget.mjs'

if (!process.env.FILE_IMPORT_TEST_MONGO_URI)
  throw new Error('Set FILE_IMPORT_TEST_MONGO_URI to a local test MongoDB')
const dbName = `codex_file_import_test_${randomUUID().replaceAll('-', '')}`
const connection = await mongoose
  .createConnection(process.env.FILE_IMPORT_TEST_MONGO_URI, {
    dbName,
    retryWrites: false,
  })
  .asPromise()
const db = connection.db
const ownerId = new mongoose.Types.ObjectId()
const otherId = new mongoose.Types.ObjectId()
const tariffId = new mongoose.Types.ObjectId()
const password = 'FileImportTest123!'
const secret = 'file-import-local-test-secret'
const port = Number(process.env.FILE_IMPORT_TEST_PORT || 3117)
const baseUrl = `http://localhost:${port}`
let aiCalls = 0
let app
let appLog = ''
const source =
  'Заказы\n03.09.2026 18:00 Анна +79000000111 свадьба 20000\nБорис +79000000222 юбилей 15000'
const mock = createServer(async (req, res) => {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const body = JSON.parse(Buffer.concat(chunks).toString())
  aiCalls++
  const analysis = body.messages[0].content.includes('Ты анализируешь файл')
  const record = body.messages.at(-1).content
  const result = analysis
    ? {
        summary: 'Две записи мероприятий, одна дата отсутствует.',
        rules: 'Одна строка — одно мероприятие. Суммы — стоимость.',
        questions: [
          { question: 'Какой год для записей без года?', options: ['2026'] },
        ],
        examples: ['03.09.2026 → дата мероприятия'],
        records: [
          { title: 'Свадьба Анны', sourceIds: ['L2'] },
          { title: 'Юбилей Бориса', sourceIds: ['L3'] },
        ],
      }
    : record.includes('Борис')
      ? { eventDate: null, description: 'Юбилей Бориса', eventType: 'Юбилей' }
      : {
          eventDate: '2026-09-03T18:00',
          dateEvidence: '03.09.2026',
          yearEvidence: '2026',
          eventType: 'Свадьба',
          clientName: 'Анна',
          contractSum: 20000,
          description: 'Свадьба Анны',
          address: { town: 'Красноярск' },
          warnings: [],
        }
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(
    JSON.stringify({
      choices: [{ message: { content: JSON.stringify(result) } }],
      usage: {
        cost_rub: 0.1,
        prompt_tokens: 500,
        completion_tokens: 200,
        total_tokens: 700,
      },
    })
  )
})
await new Promise((resolve) => mock.listen(0, '127.0.0.1', resolve))
const cookie = async (id) =>
  `next-auth.session-token=${await encode({ secret, token: { userId: String(id), tenantId: String(id), phone: '79000000001', role: 'user', tariffId: String(tariffId) } })}`
const ownerCookie = await cookie(ownerId)
const otherCookie = await cookie(otherId)
const call = async (url, options = {}, selectedCookie = ownerCookie) => {
  const response = await fetch(`${baseUrl}${url}`, {
    ...options,
    headers: { Cookie: selectedCookie, ...options.headers },
  })
  const payload = await response.json()
  return { status: response.status, ...payload }
}
const post = (id, body) =>
  call(`/api/events/file-import/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
const waitJob = async (id) => {
  for (let i = 0; i < 70; i++) {
    const result = await call(`/api/events/file-import?id=${id}`)
    assert.equal(result.success, true, JSON.stringify(result))
    if (!['analyzing', 'importing'].includes(result.data.status))
      return result.data
    await new Promise((resolve) => setTimeout(resolve, 700))
  }
  throw new Error('Import did not finish')
}
try {
  const passwordHash = await bcrypt.hash(password, 4)
  await db.collection('users').insertMany([
    {
      _id: ownerId,
      tenantId: ownerId,
      firstName: 'Тест импорта',
      phone: '79000000001',
      password: passwordHash,
      role: 'user',
      tariffId,
      balance: 0,
    },
    {
      _id: otherId,
      tenantId: otherId,
      phone: '79000000002',
      password: passwordHash,
      role: 'user',
      tariffId,
      balance: 20,
    },
  ])
  await db.collection('tariffs').insertOne({
    _id: tariffId,
    title: 'Тест',
    allowAi: true,
    allowCalendarSync: false,
    eventsPerMonth: 100,
  })
  await db.collection('sitesettings').insertOne({
    tenantId: ownerId,
    timeZone: 'Asia/Krasnoyarsk',
    custom: {
      aiAnalysisProvider: 'artistcrm',
      firstRunWizardCompleted: true,
    },
  })
  app = spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'dev', '--webpack', '-p', String(port)],
    {
      cwd: process.cwd(),
      windowsHide: true,
      env: {
        ...process.env,
        MONGODB_URI: process.env.FILE_IMPORT_TEST_MONGO_URI,
        MONGODB_DBNAME: dbName,
        NEXTAUTH_SECRET: secret,
        NEXTAUTH_URL: baseUrl,
        DOMAIN: baseUrl,
        AITUNNEL_KEY: 'mock-local-key',
        AI_ANALYSIS_API_URL: `http://127.0.0.1:${mock.address().port}`,
        CRON_SECRET: 'mock-cron',
        NEXT_TELEMETRY_DISABLED: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  )
  app.stdout.on('data', (data) => {
    appLog += data
    if (process.env.FILE_IMPORT_VERBOSE) process.stdout.write(data)
  })
  app.stderr.on('data', (data) => {
    appLog += data
    if (process.env.FILE_IMPORT_VERBOSE) process.stderr.write(data)
  })
  for (let i = 0; i < 120; i++) {
    try {
      const response = await fetch(`${baseUrl}/api/auth/session`)
      if (response.ok) break
    } catch {}
    if (i === 119) throw new Error('Next server did not start')
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  const bad = new FormData()
  bad.set('file', new Blob(['%PDF-1.7']), 'bad.pdf')
  assert.equal(
    (await call('/api/events/file-import', { method: 'POST', body: bad }))
      .status,
    400
  )
  assert.equal(aiCalls, 0)
  const data = new FormData()
  data.set('file', new Blob([source]), 'test.txt')
  const uploaded = await call('/api/events/file-import', {
    method: 'POST',
    body: data,
  })
  assert.equal(uploaded.success, true, JSON.stringify(uploaded))
  let job = uploaded.data
  assert.equal(aiCalls, 0)
  assert.equal(
    (await post(job.id, { action: 'analyze', quoteId: job.quote.id })).status,
    402
  )
  await db
    .collection('users')
    .updateOne({ _id: ownerId }, { $set: { balance: 20 } })
  assert.equal(
    (await post(job.id, { action: 'analyze', quoteId: job.quote.id })).success,
    true
  )
  job = await waitJob(job.id)
  assert.equal(job.status, 'review', JSON.stringify(job))
  assert.equal(aiCalls, 1)
  assert.equal(job.actualCostRub, 0.15)
  assert.equal(
    await db.collection('events').countDocuments({ tenantId: ownerId }),
    0
  )
  assert.equal(
    (await call(`/api/events/file-import?id=${job.id}`, {}, otherCookie))
      .status,
    404
  )
  assert.equal((await call('/api/events/file-import')).data.length, 1)
  const quoteResult = await post(job.id, {
    action: 'quote',
    answers: { q1: '2026', comment: '' },
    selectedIds: ['1', '2'],
  })
  assert.equal(quoteResult.success, true, JSON.stringify(quoteResult))
  job = quoteResult.data
  assert.equal(aiCalls, 1, 'расчёт не вызывает ИИ')
  await db
    .collection('users')
    .updateOne({ _id: ownerId }, { $set: { balance: 0 } })
  assert.equal(
    (await post(job.id, { action: 'start', quoteId: job.quote.id })).status,
    402
  )
  await db
    .collection('users')
    .updateOne({ _id: ownerId }, { $set: { balance: 20 } })
  assert.equal(
    (await post(job.id, { action: 'start', quoteId: job.quote.id })).success,
    true
  )
  job = await waitJob(job.id)
  assert.equal(job.status, 'completed', JSON.stringify(job))
  assert.equal(job.records[0].status, 'created', JSON.stringify(job.records))
  assert.equal(job.records[1].status, 'needs_attention')
  assert.equal(job.actualCostRub, 0.45)
  assert.equal(aiCalls, 3)
  const event = await db.collection('events').findOne({ tenantId: ownerId })
  assert.equal(event.fileImportChecked, false)
  assert.equal(event.importedFromFile, true)
  assert.equal(event.calendarImportChecked, true)
  assert.equal(event.googleCalendarId, null)
  assert.equal(event.status, 'draft')
  assert.equal(event.eventDate.toISOString(), '2026-09-03T11:00:00.000Z')
  assert.equal(await db.collection('transactions').countDocuments({}), 0)
  const check = await call(`/api/events/${event._id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileImportChecked: true }),
  })
  assert.equal(check.success, true, JSON.stringify(check))
  assert.equal(
    (await db.collection('events').findOne({ _id: event._id }))
      .fileImportChecked,
    true
  )
  const again = new FormData()
  again.set('file', new Blob([source]), 'renamed.txt')
  assert.equal(
    (await call('/api/events/file-import', { method: 'POST', body: again }))
      .data.id,
    job.id
  )
  assert.equal(aiCalls, 3)
  const user = await db.collection('users').findOne({ _id: ownerId })
  assert.equal(Math.round(user.balance * 100), 1970)
  const publicSession = await call('/api/auth/session')
  assert.equal(
    JSON.stringify(publicSession).includes('aiFileImportBudgets'),
    false
  )
  const endpoint = await call('/api/events/file-import/worker', {
    method: 'POST',
  })
  assert.equal(endpoint.status, 401)
  // Revoke AI after a job was authorized and its budget was reserved.
  const revokedBudgetId = `${job.id}_i99`
  const budgetStore = createFileImportBudgetStore({
    users: db.collection('users'),
    ownerId,
  })
  await budgetStore.reserve(revokedBudgetId, {
    amountKopecks: 100,
    markup: 1.5,
    platform: true,
    feature: 'file_import',
    model: 'test',
  })
  await db.collection('fileimports').updateOne(
    { _id: new mongoose.Types.ObjectId(job.id), tenantId: ownerId },
    {
      $set: {
        status: 'importing',
        budgetId: revokedBudgetId,
        importAttempt: 99,
        selectedIds: ['2'],
      },
      $addToSet: { budgetIds: revokedBudgetId },
    }
  )
  await db
    .collection('tariffs')
    .updateOne({ _id: tariffId }, { $set: { allowAi: false } })
  await db
    .collection('sitesettings')
    .updateOne(
      { tenantId: ownerId },
      {
        $set: {
          'custom.aiAnalysisProvider': 'aitunnel',
          'custom.aitunnelKey': 'personal-key-does-not-grant-access',
        },
      }
    )
  const assertAiDenied = (result) => {
    assert.equal(result.status, 403, JSON.stringify(result))
    assert.equal(result.code, 'AI_ACCESS_REQUIRED')
  }
  assertAiDenied(await call('/api/events/file-import'))
  assertAiDenied(await call(`/api/events/file-import?id=${job.id}`))
  for (const name of ['new.txt', 'renamed.txt']) {
    const blocked = new FormData()
    blocked.set(
      'file',
      new Blob([name === 'new.txt' ? 'Новый файл' : source]),
      name
    )
    assertAiDenied(
      await call('/api/events/file-import', { method: 'POST', body: blocked })
    )
  }
  for (const action of ['analyze', 'quote', 'start', 'refresh'])
    assertAiDenied(await post(job.id, { action, quoteId: job.quote.id }))
  assert.equal(aiCalls, 3, 'личный ключ и баланс не обходят тариф')
  const worker = await call('/api/events/file-import/worker', {
    method: 'POST',
    headers: { Authorization: 'Bearer mock-cron' },
  })
  assert.equal(worker.success, true)
  let paused
  for (let i = 0; i < 40; i++) {
    paused = await db
      .collection('fileimports')
      .findOne({ _id: new mongoose.Types.ObjectId(job.id) })
    if (paused.status === 'paused') break
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  assert.equal(paused.status, 'paused')
  assert.match(paused.error, /тарифе с ИИ/)
  assert.equal(
    Math.round(
      (await db.collection('users').findOne({ _id: ownerId })).balance * 100
    ),
    1970,
    'при отзыве доступа резерв возвращается'
  )
  assert.equal(aiCalls, 3)
  assert.equal(
    await db.collection('events').countDocuments({ tenantId: ownerId }),
    1
  )
  const existingEvent = await call(`/api/events/${event._id}`)
  assert.equal(
    existingEvent.success,
    true,
    'ранее созданное мероприятие остаётся доступным'
  )
  await db
    .collection('tariffs')
    .updateOne({ _id: tariffId }, { $set: { allowAi: true } })
  await db
    .collection('sitesettings')
    .updateOne(
      { tenantId: ownerId },
      { $set: { 'custom.aiAnalysisProvider': 'artistcrm' } }
    )
  assert.equal(
    (await call(`/api/events/file-import?id=${job.id}`)).success,
    true
  )
  console.log(
    'PASS: AI tariff required for upload, history, cached imports and all processing actions; personal key does not bypass access; revoked background job pauses and refunds its reserve.'
  )
  console.log(
    'PASS: HTTP import, balance checks at both stages, exact charges/refunds, tenant isolation, source deduplication, no transactions/calendar writes, manual verification without calendar tariff.'
  )
  if (process.env.FILE_IMPORT_KEEP_SERVER === '1') {
    const fixturePath = path.join(
      os.tmpdir(),
      'artistcrm-file-import-fixture.json'
    )
    await writeFile(
      fixturePath,
      JSON.stringify({
        baseUrl,
        phone: '79000000001',
        password,
        jobId: job.id,
        dbName,
        cookie: ownerCookie,
      })
    )
    console.log(
      `UI fixture ready at ${baseUrl}; temporary config: ${fixturePath}`
    )
    await new Promise((resolve) => {
      process.once('SIGINT', resolve)
      process.once('SIGTERM', resolve)
    })
  }
} catch (error) {
  console.error(appLog.slice(-10000))
  throw error
} finally {
  app?.kill('SIGTERM')
  mock.close()
  if (!connection.name.startsWith('codex_file_import_test_'))
    throw new Error('Unsafe test database')
  await connection.dropDatabase()
  await connection.close()
}
