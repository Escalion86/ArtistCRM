import mongoose from 'mongoose'

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DBNAME

if (!uri) throw new Error('MONGODB_URI is required')

await mongoose.connect(uri, dbName ? { dbName } : {})
const tariffsCollection = mongoose.connection.collection('tariffs')
const tariffs = await tariffsCollection
  .find({ allowProposals: { $exists: false } })
  .toArray()
let updated = 0
for (const tariff of tariffs) {
  await tariffsCollection.updateOne(
    { _id: tariff._id, allowProposals: { $exists: false } },
    { $set: { allowProposals: Boolean(tariff.allowDocuments) } }
  )
  updated += 1
}
console.log(`Proposal tariff access migrated: ${updated}`)
await mongoose.disconnect()
