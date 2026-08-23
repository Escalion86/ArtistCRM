import mongoose from 'mongoose'

const getLegacySnapshot = (row) => {
  if (!Array.isArray(row.data) || row.data.length !== 1) return null
  const value = row.data[0]
  return value && typeof value === 'object' ? value : null
}

const getLabel = (snapshot) => {
  const title = String(snapshot?.eventType || '').trim()
  const prefix = snapshot?.status === 'draft' ? 'Заявка' : 'Мероприятие'
  return title ? `${prefix}: ${title}` : prefix
}

const run = async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required')
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DBNAME || undefined,
  })
  const histories = mongoose.connection.collection('histories')
  const cursor = histories.find({
    entityType: { $in: [null, ''] },
    schema: 'events',
  })
  const stats = { scanned: 0, migrated: 0, skipped: 0 }

  for await (const row of cursor) {
    stats.scanned += 1
    const snapshot = getLegacySnapshot(row)
    const tenantId = snapshot?.tenantId
    const entityId = snapshot?._id
    if (!tenantId || !entityId || !mongoose.Types.ObjectId.isValid(String(tenantId))) {
      stats.skipped += 1
      continue
    }
    const operation = { add: 'create', update: 'update', delete: 'delete' }[row.action]
    if (!operation) {
      stats.skipped += 1
      continue
    }
    await histories.updateOne(
      { _id: row._id, entityType: { $in: [null, ''] } },
      {
        $set: {
          tenantId,
          entityType: 'event',
          entityId: String(entityId),
          operation,
          entityLabel: getLabel(snapshot),
          summary: `${operation === 'create' ? 'Добавлено' : operation === 'delete' ? 'Удалено' : 'Изменено'}: ${getLabel(snapshot)}`,
          actorType: 'user',
          actorId: row.userId || '',
          actorLabel: 'Пользователь',
          source: 'web',
          occurredAt: row.createdAt,
          legacy: true,
        },
      }
    )
    stats.migrated += 1
  }
  process.stdout.write(`${JSON.stringify(stats)}\n`)
  await mongoose.disconnect()
}

run().catch((error) => {
  process.stderr.write(`Migration failed: ${error?.message || 'unknown error'}\n`)
  process.exitCode = 1
})
