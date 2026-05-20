const mongoose = require('mongoose');
async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/partycrm', {directConnection: true});
  const db = mongoose.connection.db;
  
  // Find all users with their roles and tenant info
  const users = await db.collection('users').find({}).toArray();
  console.log('All users:');
  users.forEach(u => {
    console.log(JSON.stringify({
      _id: u._id.toString(),
      phone: u.phone,
      email: u.email,
      role: u.role,
      first_name: u.first_name,
      last_name: u.last_name,
      tenantId: u.tenantId ? u.tenantId.toString() : null,
      billingStatus: u.billingStatus,
      tariffId: u.tariffId ? u.tariffId.toString() : null,
      partyAccess: u.partyAccess,
      permissions: u.permissions
    }, null, 2));
  });
  
  // Find tenants
  const tenants = await db.collection('tenants').find({}).toArray();
  console.log('\nAll tenants:');
  tenants.forEach(t => {
    console.log(JSON.stringify({
      _id: t._id.toString(),
      name: t.name,
      slug: t.slug,
      status: t.status,
      plan: t.plan
    }, null, 2));
  });
  
  await mongoose.disconnect();
}
main().catch(e => console.error(e)).finally(() => process.exit(0));
