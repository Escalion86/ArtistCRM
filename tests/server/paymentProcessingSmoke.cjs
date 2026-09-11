const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const mongoose = require('mongoose')
const { loadBindings, transformSync } = require('next/dist/build/swc')

const compile = (file, resolve = require) => {
  const filename = path.resolve(file)
  const { code } = transformSync(fs.readFileSync(filename, 'utf8'), {
    filename,
    jsc: { parser: { syntax: 'ecmascript' } },
    module: { type: 'commonjs' },
  })
  const mod = { exports: {} }
  new Function('require', 'module', 'exports', code)(resolve, mod, mod.exports)
  return mod.exports
}

exports.runPaymentProcessingSmoke = async ({ db }) => {
  await loadBindings()
  // Реальные Mongo-записи в изолированных коллекциях; внешние побочные действия
  // (тариф, рефералы, аналитика) заменены заглушками. Код обработчиков настоящий.
  const Users = db.model(
    'PaymentSmokeUsers',
    new mongoose.Schema({ balance: Number }, { strict: false })
  )
  const Payments = db.model(
    'PaymentSmokePayments',
    new mongoose.Schema(
      {
        userId: mongoose.Schema.Types.ObjectId,
        tenantId: mongoose.Schema.Types.ObjectId,
        amount: Number,
        status: String,
        purpose: String,
        providerPaymentId: String,
      },
      { strict: false }
    )
  )
  let barrier
  const usersAdapter = {
    findById: async (...args) => {
      const user = await Users.findById(...args)
      if (barrier) await barrier()
      return user
    },
    updateOne: (...args) => Users.updateOne(...args),
  }
  const resolve = (name) => {
    if (name === '@models/Users') return usersAdapter
    if (name === '@models/Payments') return Payments
    if (name === '@models/SiteSettings') return {}
    if (name === '@server/billing')
      return { applyTariffPurchase: async () => ({ ok: true }) }
    if (name === '@server/referralRewards')
      return { createReferralRewardForBalanceTopup: async () => {} }
    if (name === '@server/acquisitionFunnel')
      return { recordPaymentSucceeded: async () => {} }
    if (
      ['@server/billingConfig', '@server/yookassa', '@server/tochka'].includes(
        name
      )
    )
      return compile(`${name.replace('@server/', 'server/')}.js`)
    return require(name)
  }
  for (const [provider, exportName] of [
    ['yookassa', 'processSucceededYookassaPayment'],
    ['tochka', 'processSucceededTochkaPayment'],
  ]) {
    const processPayment = compile(
      `server/${provider}PaymentProcessing.js`,
      resolve
    )[exportName]
    const user = await Users.create({ balance: 10 })
    const unrelated = await Users.create({ balance: 77 })
    const createPayment = (amount) =>
      Payments.create({
        userId: user._id,
        tenantId: user._id,
        amount,
        status: 'pending',
        purpose: 'balance',
        providerPaymentId: `${provider}-${amount}`,
      })
    const confirmed = (amount) => ({
      status: 'succeeded',
      paid: true,
      amount: { value: amount.toFixed(2), currency: 'RUB' },
      payment_method: { type: 'bank_card' },
      paymentType: 'card',
    })
    const pay = async (payment, providerPayment = confirmed(payment.amount)) =>
      processPayment({
        payment: await Payments.findById(payment._id),
        providerPayment,
      })
    const duplicate = await createPayment(50)
    await Promise.all([pay(duplicate), pay(duplicate)])
    assert.equal(
      (await Users.findById(user._id)).balance,
      60,
      `${provider}: повтор одного платежа`
    )
    const mismatch = await createPayment(30)
    assert.equal((await pay(mismatch, confirmed(31))).error, 'amount_mismatch')
    assert.equal((await Users.findById(user._id)).balance, 60)
    const first = await createPayment(100)
    const second = await createPayment(200)
    let reads = 0
    let release
    const ready = new Promise((resolveReady) => {
      release = resolveReady
    })
    barrier = async () => {
      reads += 1
      if (reads === 2) release()
      await ready
    }
    try {
      const results = await Promise.all([pay(first), pay(second)])
      assert.ok(results.every((result) => result.ok))
    } finally {
      barrier = undefined
    }
    assert.equal(
      (await Users.findById(user._id)).balance,
      360,
      `${provider}: два разных платежа не должны терять начисление`
    )
    assert.equal((await Users.findById(unrelated._id)).balance, 77)
    await Users.updateOne({ _id: user._id }, { $set: { balance: null } })
    assert.equal((await pay(await createPayment(10))).ok, true)
    assert.equal((await Users.findById(user._id)).balance, 10)
    const previousBonusFlag = process.env.BILLING_SBP_BONUS_ENABLED
    process.env.BILLING_SBP_BONUS_ENABLED = 'true'
    try {
      const sbp = await createPayment(150)
      const details = {
        ...confirmed(150),
        payment_method: { type: 'sbp' },
        paymentType: 'sbp',
      }
      await Promise.all([pay(sbp, details), pay(sbp, details)])
      assert.equal((await Users.findById(user._id)).balance, 163)
      assert.equal(
        await Payments.countDocuments({
          userId: user._id,
          source: 'system',
          amount: 3,
        }),
        1
      )
    } finally {
      if (previousBonusFlag === undefined)
        delete process.env.BILLING_SBP_BONUS_ENABLED
      else process.env.BILLING_SBP_BONUS_ENABLED = previousBonusFlag
    }
  }
}
