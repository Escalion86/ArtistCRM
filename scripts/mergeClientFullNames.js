// Скрипт объединения ФИО клиентов в одну строку.
//
// Форма клиента в кабинете теперь использует одно поле «ФИО», которое
// сохраняется целиком в firstName (secondName/thirdName остаются пустыми).
// Этот скрипт приводит существующие записи к тому же виду:
//   firstName = "firstName secondName thirdName" (склейка непустых частей)
//   secondName = '', thirdName = ''
// Отображаемое имя при этом не меняется: все места в системе
// (getPersonFullName, уведомления, документы) и так склеивают эти поля.
// syncVersion увеличивается, чтобы изменения уехали в мобильную синхронизацию.
//
// По умолчанию работает в режиме dry-run: только показывает планируемые
// изменения, ничего не записывая. Для применения запустите с флагом --apply.
//
// Использование:
//   node scripts/mergeClientFullNames.js            — dry-run по всем tenant
//   node scripts/mergeClientFullNames.js --apply    — применить изменения
//   node scripts/mergeClientFullNames.js --tenant=<tenantId> [--apply]

const fs = require('fs')
const path = require('path')
const mongoose = require('mongoose')

const loadEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, 'utf8')
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) return
    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    value = value.replace(/\$\{([^}]+)\}/g, (_, name) => {
      return process.env[name] ?? ''
    })
    if (process.env[key] === undefined) process.env[key] = value
  })
}

const parseArgs = () => {
  const args = process.argv.slice(2)
  const tenantArg = args.find((arg) => arg.startsWith('--tenant='))
  return {
    apply: args.includes('--apply'),
    tenantId: tenantArg ? tenantArg.slice('--tenant='.length).trim() : null,
  }
}

const run = async () => {
  const { apply, tenantId } = parseArgs()

  loadEnvFile(path.join(__dirname, '..', '.env.local'))

  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error('mergeClientFullNames: MONGODB_URI is missing')
    process.exit(1)
  }

  await mongoose.connect(uri, { dbName: process.env.MONGODB_DBNAME })

  const ClientsSchema = new mongoose.Schema({}, { collection: 'clients' })
  const Clients =
    mongoose.models.Clients || mongoose.model('Clients', ClientsSchema)

  const filter = {
    $or: [
      { secondName: { $regex: /\S/ } },
      { thirdName: { $regex: /\S/ } },
    ],
  }
  if (tenantId) filter.tenantId = new mongoose.Types.ObjectId(tenantId)

  const clients = await Clients.find(filter)
    .select('_id tenantId firstName secondName thirdName')
    .lean()

  // Склейка с защитой от дублей: если часть уже является последним словом
  // накопленной строки (например firstName="Юлия Старостенко" и
  // secondName="Старостенко"), повторно она не добавляется.
  const mergeNameParts = (parts) =>
    parts
      .map((part) => String(part ?? '').trim())
      .filter(Boolean)
      .reduce((acc, part) => {
        if (!acc) return part
        const lastWord = acc.split(/\s+/).pop()
        return lastWord.toLowerCase() === part.toLowerCase()
          ? acc
          : `${acc} ${part}`
      }, '')

  // secondName/thirdName непустые по фильтру, поэтому запись нужна всегда:
  // даже если склейка совпала с firstName, поля надо очистить.
  const planned = clients
    .map((client) => ({
      client,
      merged: mergeNameParts([
        client.firstName,
        client.secondName,
        client.thirdName,
      ]),
    }))
    .filter(({ merged }) => merged)

  console.log(
    `mergeClientFullNames: клиентов с заполненными secondName/thirdName — ${clients.length}`
  )
  console.log(`  будет объединено: ${planned.length}`)
  console.log('')

  planned.forEach(({ client, merged }) => {
    console.log(
      `${apply ? 'UPDATE' : 'PLAN  '} ${client._id} (tenant ${
        client.tenantId
      }): "${[client.firstName, client.secondName, client.thirdName]
        .map((part) => String(part ?? '').trim())
        .filter(Boolean)
        .join('" + "')}" -> firstName="${merged}"`
    )
  })

  if (apply && planned.length) {
    const ops = planned.map(({ client, merged }) => ({
      updateOne: {
        filter: { _id: client._id },
        update: {
          $set: { firstName: merged, secondName: '', thirdName: '' },
          $inc: { syncVersion: 1 },
        },
      },
    }))
    const result = await Clients.bulkWrite(ops)
    console.log('')
    console.log(
      `mergeClientFullNames: записано изменений — ${result.modifiedCount ?? 0}`
    )
  } else if (!apply) {
    console.log('')
    console.log(
      'Это dry-run, база не изменена. Для применения запустите с флагом --apply'
    )
  }

  await mongoose.disconnect()
}

run().catch((error) => {
  console.error('mergeClientFullNames: error', error)
  process.exit(1)
})
