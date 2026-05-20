const mongoose = require('mongoose');
async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/partycrm', {directConnection: true});
  const db = mongoose.connection.db;
  
  const collections = await db.listCollections().toArray();
  console.log('Collections:', collections.map(c => c.name));
  
  for (const col of collections) {
    const count = await db.collection(col.name).countDocuments();
    console.log('  ' + col.name + ': ' + count + ' docs');
  }
  
  const users = await db.collection('users').find({}).limit(10).toArray();
  console.log('\nUsers:', JSON.stringify(users.map(u => ({
    _id: u._id.toString(),
    phone: u.phone,
    email: u.email,
    role: u.role,
    first_name: u.first_name,
    last_name: u.last_name,
    tenantId: u.tenantId ? u.tenantId.toString() : null,
    billingStatus: u.billingStatus
  })), null, 2));
  
  await mongoose.disconnect();
}
main().catch(e => console.error(e)).finally(() => process.exit(0));
