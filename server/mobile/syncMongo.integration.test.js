import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, rm } from 'node:fs/promises'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import mongoose from 'mongoose'
import mobileSyncOperationsSchema from '../../schemas/mobileSyncOperationsSchema.js'
import mobileSyncTombstonesSchema from '../../schemas/mobileSyncTombstonesSchema.js'
import mobileSessionsSchema from '../../schemas/mobileSessionsSchema.js'
import {
  advanceSyncPosition,
  buildSyncPageQuery,
  encodeSyncCursor,
  parseSyncCursor,
} from './syncCursor.js'
import {
  markSyncOperationApplying,
  persistSyncOperationResult,
  reserveSyncOperation,
} from './syncOperationStore.js'
import { buildTombstoneUpdate } from './syncTombstone.js'
import {
  findActiveMobileSessionByRefreshHash,
  findAuthorizedMobileSession,
  revokeMobileSessionRecord,
  rotateMobileSessionToken,
} from './sessionStore.js'
import { hashRefreshToken } from './tokens.js'

const mongodBinary = process.env.MONGOD_BINARY || 'mongod'
const mongodAvailable = spawnSync(mongodBinary, ['--version'], {
  stdio: 'ignore',
  windowsHide: true,
}).status === 0

const getFreePort = () => new Promise((resolve, reject) => {
  const server = net.createServer()
  server.once('error', reject)
  server.listen(0, '127.0.0.1', () => {
    const address = server.address()
    const port = typeof address === 'object' && address ? address.port : 0
    server.close((error) => error ? reject(error) : resolve(port))
  })
})

const waitForPort = async (port, processRef) => {
  const deadline = Date.now() + 10_000
  while (Date.now() < deadline) {
    if (processRef.exitCode !== null) throw new Error('mongod завершился до запуска тестов')
    const connected = await new Promise((resolve) => {
      const socket = net.createConnection({ host: '127.0.0.1', port })
      socket.once('connect', () => { socket.destroy(); resolve(true) })
      socket.once('error', () => resolve(false))
      socket.setTimeout(250, () => { socket.destroy(); resolve(false) })
    })
    if (connected) return
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error('mongod не запустился за 10 секунд')
}

test('MongoDB integration: mobile sync contract', {
  skip: mongodAvailable ? false : 'mongod не установлен; задайте MONGOD_BINARY для integration-тестов',
}, async (t) => {
  const dbPath = await mkdtemp(path.join(os.tmpdir(), 'artistcrm-mobile-sync-'))
  const port = await getFreePort()
  const mongod = spawn(mongodBinary, [
    '--dbpath', dbPath,
    '--port', String(port),
    '--bind_ip', '127.0.0.1',
    '--noauth',
    '--quiet',
  ], { stdio: 'ignore', windowsHide: true })
  let connection

  try {
    await waitForPort(port, mongod)
    connection = await mongoose.createConnection(
      `mongodb://127.0.0.1:${port}/artistcrm_mobile_sync_test`,
      { serverSelectionTimeoutMS: 5_000 }
    ).asPromise()

    const operationSchema = new mongoose.Schema(
      mobileSyncOperationsSchema,
      { timestamps: true }
    )
    operationSchema.index({ tenantId: 1, operationId: 1 }, { unique: true })
    const tombstoneSchema = new mongoose.Schema(
      mobileSyncTombstonesSchema,
      { timestamps: true }
    )
    tombstoneSchema.index(
      { tenantId: 1, entityType: 1, entityId: 1 },
      { unique: true }
    )
    const entitySchema = new mongoose.Schema({
      tenantId: { type: mongoose.Schema.Types.ObjectId, required: true },
      value: String,
      updatedAt: { type: Date, required: true },
    }, { versionKey: false })
    const sessionSchema = new mongoose.Schema(mobileSessionsSchema, { timestamps: true })
    sessionSchema.index({ refreshTokenHash: 1 }, { unique: true })

    const Operations = connection.model('IntegrationSyncOperations', operationSchema)
    const Tombstones = connection.model('IntegrationSyncTombstones', tombstoneSchema)
    const Entities = connection.model('IntegrationSyncEntities', entitySchema)
    const Sessions = connection.model('IntegrationMobileSessions', sessionSchema)
    await Promise.all([
      Operations.init(), Tombstones.init(), Entities.init(), Sessions.init(),
    ])

    await t.test('refresh token вращается атомарно и revoke закрывает access-сессию', async () => {
      const tenantId = new mongoose.Types.ObjectId()
      const userId = new mongoose.Types.ObjectId()
      const otherUserId = new mongoose.Types.ObjectId()
      const oldHash = hashRefreshToken('old-refresh-token')
      const session = await Sessions.create({
        tenantId,
        userId,
        refreshTokenHash: oldHash,
        deviceId: 'device-old',
        deviceName: 'Old phone',
        platform: 'android',
        appVersion: '1.0.0',
        lastUsedAt: new Date('2026-07-15T10:00:00.000Z'),
        expiresAt: new Date('2026-08-15T10:00:00.000Z'),
      })
      const now = new Date('2026-07-15T11:00:00.000Z')
      const found = await findActiveMobileSessionByRefreshHash({
        model: Sessions, refreshTokenHash: oldHash, now,
      })
      assert.equal(String(found._id), String(session._id))

      const nextHashes = [
        hashRefreshToken('next-refresh-token-a'),
        hashRefreshToken('next-refresh-token-b'),
      ]
      const rotations = await Promise.all(nextHashes.map((nextRefreshTokenHash) =>
        rotateMobileSessionToken({
          model: Sessions,
          sessionId: session._id,
          expectedRefreshTokenHash: oldHash,
          nextRefreshTokenHash,
          device: { deviceId: 'device-new', deviceName: 'New phone', platform: 'android' },
          now,
        })
      ))
      assert.equal(rotations.filter(Boolean).length, 1)
      assert.equal(await findActiveMobileSessionByRefreshHash({
        model: Sessions, refreshTokenHash: oldHash, now,
      }), null)

      const rotated = await Sessions.findById(session._id).lean()
      assert.equal(nextHashes.includes(rotated.refreshTokenHash), true)
      assert.equal(rotated.deviceId, 'device-new')
      assert.ok(await findAuthorizedMobileSession({
        model: Sessions, sessionId: session._id, userId, now,
      }))
      assert.equal(await revokeMobileSessionRecord({
        model: Sessions, sessionId: session._id, userId: otherUserId, now,
      }), false)
      assert.ok(await findAuthorizedMobileSession({
        model: Sessions, sessionId: session._id, userId, now,
      }))
      assert.equal(await revokeMobileSessionRecord({
        model: Sessions, sessionId: session._id, userId, now,
      }), true)
      assert.equal(await findAuthorizedMobileSession({
        model: Sessions, sessionId: session._id, userId, now,
      }), null)
    })

    await t.test('конкурентно выполняется только одна tenant-scoped резервация', async () => {
      const tenantA = new mongoose.Types.ObjectId()
      const tenantB = new mongoose.Types.ObjectId()
      const userId = new mongoose.Types.ObjectId()
      const operation = {
        operationId: 'concurrent-op',
        entityType: 'events',
        entityId: 'event-1',
        method: 'update',
        payload: { status: 'closed' },
        baseVersion: '1',
        baseValues: { status: 'active' },
        attachments: [],
      }

      const results = await Promise.all([
        reserveSyncOperation({ model: Operations, tenantId: tenantA, userId, operation }),
        reserveSyncOperation({ model: Operations, tenantId: tenantA, userId, operation }),
      ])
      assert.deepEqual(results.map((item) => item.state).sort(), ['claimed', 'processing'])
      assert.equal(await Operations.countDocuments({ tenantId: tenantA }), 1)

      const claimed = results.find((item) => item.state === 'claimed')
      await markSyncOperationApplying({
        model: Operations,
        tenantId: tenantA,
        operationId: operation.operationId,
        operationHash: claimed.operationHash,
      })
      const response = { operationId: operation.operationId, status: 'applied' }
      await persistSyncOperationResult({
        model: Operations,
        tenantId: tenantA,
        operationId: operation.operationId,
        operationHash: claimed.operationHash,
        status: 'applied',
        response,
      })

      const replay = await reserveSyncOperation({
        model: Operations, tenantId: tenantA, userId, operation,
      })
      assert.deepEqual(replay, { state: 'replay', response })
      const reused = await reserveSyncOperation({
        model: Operations,
        tenantId: tenantA,
        userId,
        operation: { ...operation, payload: { status: 'canceled' } },
      })
      assert.equal(reused.state, 'reused')

      const otherTenant = await reserveSyncOperation({
        model: Operations, tenantId: tenantB, userId, operation,
      })
      assert.equal(otherTenant.state, 'claimed')
      assert.equal(await Operations.countDocuments({ operationId: operation.operationId }), 2)
    })

    await t.test('tombstone не снижает версию и изолирован между tenant', async () => {
      const tenantA = new mongoose.Types.ObjectId()
      const tenantB = new mongoose.Types.ObjectId()
      const filter = { entityType: 'clients', entityId: 'client-1' }
      const write = (tenantId, version, now) => Tombstones.findOneAndUpdate(
        { tenantId, ...filter },
        {
          ...buildTombstoneUpdate({ tenantId, version, now }),
          $setOnInsert: { tenantId, ...filter },
        },
        { upsert: true, returnDocument: 'after' }
      )

      await write(tenantA, 7, new Date('2026-07-15T10:00:00.000Z'))
      const repeated = await write(tenantA, 2, new Date('2026-07-15T11:00:00.000Z'))
      await write(tenantB, 1, new Date('2026-07-15T11:00:00.000Z'))
      assert.equal(repeated.version, 8)
      assert.equal(await Tombstones.countDocuments({ ...filter }), 2)
      assert.equal(await Tombstones.countDocuments({ tenantId: tenantA, ...filter }), 1)
    })

    await t.test('opaque cursor дочитывает одинаковые updatedAt без другого tenant и будущих записей', async () => {
      const tenantA = new mongoose.Types.ObjectId()
      const tenantB = new mongoose.Types.ObjectId()
      const sameTime = new Date('2026-07-15T10:00:00.000Z')
      const upperBound = new Date('2026-07-15T12:00:00.000Z')
      await Entities.insertMany([
        ...Array.from({ length: 7 }, (_, index) => ({
          tenantId: tenantA,
          value: `tenant-a-${index + 1}`,
          updatedAt: sameTime,
        })),
        { tenantId: tenantA, value: 'future', updatedAt: new Date('2026-07-15T13:00:00.000Z') },
        { tenantId: tenantB, value: 'other-tenant', updatedAt: sameTime },
      ])

      let cursor = parseSyncCursor('1970-01-01T00:00:00.000Z', upperBound)
      const received = []
      for (let page = 0; page < 10; page += 1) {
        const rows = await Entities.find(buildSyncPageQuery({
          tenantId: tenantA,
          position: cursor.positions.events,
          upperBound: cursor.upperBound,
          dateField: 'updatedAt',
        })).sort({ updatedAt: 1, _id: 1 }).limit(4).lean()
        const items = rows.slice(0, 3)
        received.push(...items)
        if (rows.length <= 3) break
        const positions = {
          ...cursor.positions,
          events: advanceSyncPosition(items, 'updatedAt', cursor.positions.events),
        }
        cursor = parseSyncCursor(
          encodeSyncCursor({ upperBound: cursor.upperBound, positions }),
          new Date('2026-07-15T14:00:00.000Z')
        )
      }

      assert.equal(received.length, 7)
      assert.equal(new Set(received.map((item) => String(item._id))).size, 7)
      assert.equal(received.every((item) => String(item.tenantId) === String(tenantA)), true)
      assert.equal(received.some((item) => item.value === 'future'), false)
    })
  } finally {
    if (connection) await connection.close()
    if (mongod.exitCode === null) {
      const exitPromise = once(mongod, 'exit')
      mongod.kill('SIGTERM')
      await Promise.race([
        exitPromise,
        new Promise((resolve) => {
          const timer = setTimeout(resolve, 5_000)
          timer.unref()
        }),
      ])
      if (mongod.exitCode === null) mongod.kill('SIGKILL')
    }
    await rm(dbPath, { recursive: true, force: true }).catch(() => undefined)
  }
})
