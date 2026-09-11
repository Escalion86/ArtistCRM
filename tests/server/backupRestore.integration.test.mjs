import assert from 'node:assert/strict'
import test from 'node:test'
import { spawn, spawnSync, execFile } from 'node:child_process'
import { once } from 'node:events'
import { promisify } from 'node:util'
import { createHash, randomUUID } from 'node:crypto'
import { copyFile, mkdtemp, readFile, rm } from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import mongoose from 'mongoose'

const execFileAsync = promisify(execFile)
const binaries = {
  mongod: process.env.MONGOD_BINARY || 'mongod',
  dump: process.env.MONGODUMP_BINARY || 'mongodump',
  restore: process.env.MONGORESTORE_BINARY || 'mongorestore',
}
const missing = Object.entries(binaries)
  .filter(
    ([, binary]) =>
      spawnSync(binary, ['--version'], { stdio: 'ignore', windowsHide: true })
        .status !== 0
  )
  .map(([name]) => name)

const freePort = () =>
  new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port
      server.close((error) => (error ? reject(error) : resolve(port)))
    })
  })

const snapshot = async (db, names) => {
  const result = {}
  for (const name of names) {
    const documents = await db
      .collection(name)
      .find()
      .sort({ _id: 1 })
      .toArray()
    const indexes = await db.collection(name).listIndexes().toArray()
    result[name] = {
      documents: mongoose.mongo.BSON.EJSON.stringify(documents, {
        relaxed: false,
      }),
      indexes: indexes
        .map(({ ns, ...index }) => index)
        .sort((a, b) => a.name.localeCompare(b.name)),
    }
  }
  return result
}

test(
  'local Mongo: archive → checksum → restore preserves documents, relations, indexes and source',
  {
    timeout: 60000,
    skip: missing.length
      ? `Не установлены MongoDB tools: ${missing.join(', ')}`
      : false,
  },
  async (t) => {
    // Никогда не читаем MONGODB_URI/.env: только новый локальный процесс и синтетические данные.
    const directory = await mkdtemp(
      path.join(os.tmpdir(), 'artistcrm-restore-smoke-')
    )
    const port = await freePort()
    const uri = `mongodb://127.0.0.1:${port}`
    const sourceName = `artistcrm_smoke_${randomUUID().replaceAll('-', '')}`
    const targetName = `${sourceName}_restored`
    const server = spawn(
      binaries.mongod,
      [
        '--dbpath',
        directory,
        '--port',
        String(port),
        '--bind_ip',
        '127.0.0.1',
        '--noauth',
        '--quiet',
      ],
      { stdio: 'ignore', windowsHide: true }
    )
    let connection
    try {
      connection = await mongoose
        .createConnection(uri, {
          dbName: sourceName,
          serverSelectionTimeoutMS: 10000,
        })
        .asPromise()
      const source = connection.db
      const target = connection.getClient().db(targetName)
      assert.deepEqual(
        await target.listCollections().toArray(),
        [],
        'Restore target должен быть пустым'
      )
      const tenantA = new mongoose.Types.ObjectId()
      const tenantB = new mongoose.Types.ObjectId()
      const clientId = new mongoose.Types.ObjectId()
      const eventId = new mongoose.Types.ObjectId()
      const now = new Date('2026-09-09T05:00:00.000Z')
      await source.collection('users').insertMany([
        {
          _id: tenantA,
          tenantId: tenantA,
          firstName: 'Тест A',
          balance: 1500.25,
        },
        { _id: tenantB, tenantId: tenantB, firstName: 'Тест B', balance: 0 },
      ])
      await source
        .collection('clients')
        .insertOne({
          _id: clientId,
          tenantId: tenantA,
          firstName: 'Вымышленный клиент',
        })
      await source.collection('events').insertOne({
        _id: eventId,
        tenantId: tenantA,
        clientId,
        status: 'active',
        eventDate: now,
        additionalEvents: [
          { title: 'Уточнить детали', date: now, done: false },
        ],
      })
      await source
        .collection('transactions')
        .insertOne({
          tenantId: tenantA,
          eventId,
          clientId,
          type: 'income',
          category: 'deposit',
          amount: 1500.25,
          date: now,
        })
      await source
        .collection('sitesettings')
        .insertOne({
          tenantId: tenantA,
          custom: { defaultTown: 'Тестовый город' },
        })
      await source.createCollection('calls')
      await source
        .collection('events')
        .createIndex({ tenantId: 1, eventDate: -1 })
      await source
        .collection('clients')
        .createIndex({ tenantId: 1, firstName: 1 }, { unique: true })
      await source
        .collection('sitesettings')
        .createIndex({ tenantId: 1 }, { unique: true })
      const names = [
        'users',
        'clients',
        'events',
        'transactions',
        'sitesettings',
        'calls',
      ]
      const before = await snapshot(source, names)
      const archive = path.join(directory, 'synthetic.archive.gz')
      const copiedArchive = path.join(directory, 'copied.archive.gz')
      await execFileAsync(
        binaries.dump,
        [
          `--uri=${uri}`,
          `--db=${sourceName}`,
          `--archive=${archive}`,
          '--gzip',
        ],
        { windowsHide: true, timeout: 20000 }
      )
      const originalBytes = await readFile(archive)
      assert.ok(originalBytes.length > 0)
      const checksum = createHash('sha256').update(originalBytes).digest('hex')
      await copyFile(archive, copiedArchive)
      assert.equal(
        createHash('sha256')
          .update(await readFile(copiedArchive))
          .digest('hex'),
        checksum
      )
      await execFileAsync(
        binaries.restore,
        [
          `--uri=${uri}`,
          `--archive=${copiedArchive}`,
          '--gzip',
          `--nsInclude=${sourceName}.*`,
          `--nsFrom=${sourceName}.*`,
          `--nsTo=${targetName}.*`,
        ],
        { windowsHide: true, timeout: 20000 }
      )
      assert.deepEqual(await snapshot(target, names), before)
      assert.deepEqual(
        await snapshot(source, names),
        before,
        'Исходная база не должна изменяться'
      )
      assert.equal(
        await target.collection('events').countDocuments({ tenantId: tenantB }),
        0
      )
      t.diagnostic(
        `Восстановлены ${names.length} коллекций, включая пустую; документы, BSON-типы, связи и индексы совпали`
      )

      // Закрываем ранее пропускавшуюся проверку бюджета на той же изолированной MongoDB.
      await execFileAsync(
        process.execPath,
        ['--test', 'server/fileImportBudget.integration.test.mjs'],
        {
          cwd: path.resolve(import.meta.dirname, '../..'),
          env: { ...process.env, FILE_IMPORT_TEST_MONGO_URI: uri },
          windowsHide: true,
          timeout: 25000,
        }
      )
      t.diagnostic(
        'Mongo-тест резервирования, конкурирующих списаний и возврата бюджета прошёл без skip'
      )
    } finally {
      if (connection) await connection.close()
      if (server.exitCode === null) {
        const exited = once(server, 'exit')
        server.kill('SIGTERM')
        await exited
      }
      const resolved = path.resolve(directory)
      assert.ok(resolved.startsWith(path.resolve(os.tmpdir()) + path.sep))
      assert.ok(path.basename(resolved).startsWith('artistcrm-restore-smoke-'))
      await rm(resolved, {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: 100,
      })
    }
  }
)
