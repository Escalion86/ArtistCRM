import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'
import { mergeLegacyEventDocuments } from '../helpers/eventDocuments.js'

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
    value = value.replace(/\$\{([^}]+)\}/g, (_, name) => process.env[name] ?? '')
    if (process.env[key] === undefined) process.env[key] = value
  })
}

const connect = async () => {
  loadEnvFile(path.join(process.cwd(), '.env'))
  loadEnvFile(path.join(process.cwd(), '.env.local'))
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is missing')
  }
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DBNAME,
  })
}

const Events =
  mongoose.models.Events ||
  mongoose.model(
    'Events',
    new mongoose.Schema({}, { strict: false, timestamps: true })
  )

const migrateEventDocuments = async () => {
  await connect()

  const cursor = Events.find({
    $or: [
      { contractLinks: { $exists: true, $ne: [] } },
      { invoiceLinks: { $exists: true, $ne: [] } },
      { receiptLinks: { $exists: true, $ne: [] } },
      { actLinks: { $exists: true, $ne: [] } },
      { documentFiles: { $exists: true, $ne: [] } },
    ],
  }).cursor()

  let scanned = 0
  let updated = 0

  for await (const event of cursor) {
    scanned += 1
    const eventObject = event.toObject()
    const documents = mergeLegacyEventDocuments(eventObject)
    const previous = JSON.stringify(eventObject.documents ?? [])
    const next = JSON.stringify(documents)
    if (previous === next) continue

    event.documents = documents
    await event.save()
    updated += 1
  }

  await mongoose.disconnect()
  return { scanned, updated }
}

migrateEventDocuments()
  .then((result) => {
    console.log(
      `migrate-event-documents complete: scanned=${result.scanned}, updated=${result.updated}`
    )
    process.exit(0)
  })
  .catch(async (error) => {
    console.error('migrate-event-documents failed', error)
    await mongoose.disconnect().catch(() => {})
    process.exit(1)
  })
