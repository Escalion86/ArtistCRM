import fs from 'fs'
import path from 'path'
import mongoose from 'mongoose'
import { normalizeDocumentTemplatesFromSettings } from '../helpers/documentTemplates.js'

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

const SiteSettings =
  mongoose.models.SiteSettings ||
  mongoose.model(
    'SiteSettings',
    new mongoose.Schema({}, { strict: false, timestamps: true })
  )

const readCustom = (settings) => {
  if (settings?.custom instanceof Map) return Object.fromEntries(settings.custom)
  return settings?.custom && typeof settings.custom === 'object'
    ? settings.custom
    : {}
}

const migrateDocumentTemplates = async () => {
  await connect()

  const cursor = SiteSettings.find({
    $or: [
      { 'custom.contractDocxTemplateBase64': { $exists: true, $ne: '' } },
      { 'custom.actDocxTemplateBase64': { $exists: true, $ne: '' } },
      { 'custom.documentTemplates': { $exists: true } },
    ],
  }).cursor()

  let scanned = 0
  let updated = 0

  for await (const settings of cursor) {
    scanned += 1
    const currentCustom = readCustom(settings)
    const documentTemplates =
      normalizeDocumentTemplatesFromSettings(currentCustom)
    const previous = JSON.stringify(currentCustom.documentTemplates ?? [])
    const next = JSON.stringify(documentTemplates)
    if (previous === next) continue

    settings.custom = {
      ...currentCustom,
      documentTemplates,
    }
    await settings.save()
    updated += 1
  }

  await mongoose.disconnect()
  return { scanned, updated }
}

migrateDocumentTemplates()
  .then((result) => {
    console.log(
      `migrate-document-templates complete: scanned=${result.scanned}, updated=${result.updated}`
    )
    process.exit(0)
  })
  .catch(async (error) => {
    console.error('migrate-document-templates failed', error)
    await mongoose.disconnect().catch(() => {})
    process.exit(1)
  })
