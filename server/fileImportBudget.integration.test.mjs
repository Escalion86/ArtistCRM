import test from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import { randomUUID } from 'node:crypto'
import { createFileImportBudgetStore } from './fileImportBudget.mjs'

test(
  'Mongo: резерв, гонки, повторы, предел списания и возврат средств',
  { skip: !process.env.FILE_IMPORT_TEST_MONGO_URI, timeout: 20000 },
  async () => {
    const dbName = `codex_file_import_test_${randomUUID().replaceAll('-', '')}`
    const connection = await mongoose
      .createConnection(process.env.FILE_IMPORT_TEST_MONGO_URI, {
        dbName,
        retryWrites: false,
      })
      .asPromise()
    try {
      const users = connection.db.collection('users')
      const ownerId = new mongoose.Types.ObjectId()
      const otherId = new mongoose.Types.ObjectId()
      await users.insertMany([
        { _id: ownerId, balance: 3 },
        { _id: otherId, balance: 20 },
      ])
      const store = createFileImportBudgetStore({ users, ownerId })
      const other = createFileImportBudgetStore({ users, ownerId: otherId })
      const id = `${new mongoose.Types.ObjectId()}_i1`
      const options = {
        amountKopecks: 300,
        markup: 1.5,
        platform: true,
        feature: 'file_import',
        model: 'test',
      }
      await Promise.all(
        Array.from({ length: 8 }, () => store.reserve(id, options))
      )
      assert.equal(
        (await users.findOne({ _id: ownerId })).balance,
        0,
        'точного баланса хватает, резерв списан один раз'
      )
      assert.equal(
        await other.read(id),
        null,
        'резерв не доступен другому tenant'
      )
      let calls = 0
      const response = { content: '{"ok":true}', usage: { cost_rub: 1 } }
      const results = await Promise.allSettled(
        Array.from({ length: 6 }, () =>
          store.execute(id, 'one', async () => {
            calls++
            await new Promise((resolve) => setTimeout(resolve, 50))
            return response
          })
        )
      )
      assert.equal(calls, 1)
      assert.ok(results.some((result) => result.status === 'fulfilled'))
      assert.deepEqual(
        await store.execute(id, 'one', () => {
          throw new Error('must not call')
        }),
        response
      )
      assert.equal((await store.read(id)).spentKopecks, 150)
      await Promise.all(Array.from({ length: 5 }, () => store.close(id)))
      assert.equal(
        (await users.findOne({ _id: ownerId })).balance,
        1.5,
        'возврат выполнен один раз'
      )
      assert.deepEqual(
        await store.execute(id, 'one', () => {
          throw new Error('must not call')
        }),
        response,
        'сохранённый ответ доступен после закрытия'
      )

      const second = `${new mongoose.Types.ObjectId()}_a1`
      await assert.rejects(store.reserve(second, options), {
        code: 'AI_BALANCE_INSUFFICIENT',
      })
      await store.reserve(second, { ...options, amountKopecks: 150 })
      await store.execute(second, 'expensive', async () => ({
        content: 'ok',
        usage: { cost_rub: 10 },
      }))
      assert.equal((await store.read(second)).spentKopecks, 150)
      await assert.rejects(
        store.execute(second, 'next', async () => response),
        { code: 'AI_BUDGET_EXHAUSTED' }
      )
      await store.close(second)
      assert.equal((await users.findOne({ _id: ownerId })).balance, 0)

      const third = `${new mongoose.Types.ObjectId()}_a1`
      await users.updateOne({ _id: ownerId }, { $set: { balance: 2 } })
      await store.reserve(third, { ...options, amountKopecks: 100 })
      await assert.rejects(
        store.execute(third, 'network', async () => {
          throw new Error('network')
        })
      )
      await assert.rejects(
        store.execute(third, 'unknown', async () => ({
          content: 'ok',
          usage: {},
        })),
        { code: 'AI_COST_UNKNOWN' }
      )
      await store.close(third)
      assert.equal((await users.findOne({ _id: ownerId })).balance, 2)
      assert.equal((await users.findOne({ _id: otherId })).balance, 20)
    } finally {
      if (!connection.name.startsWith('codex_file_import_test_'))
        throw new Error('Unsafe test database')
      await connection.dropDatabase()
      await connection.close()
    }
  }
)
