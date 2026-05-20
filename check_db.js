const fs = require('fs');
const mongoose = require('mongoose');

// Parse .env manually
const envContent = fs.readFileSync('/home/apps/artistcrm/.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([A-Z_]+)='?([^']*)'?$/);
  if (match) env[match[1]] = match[2];
});

const uri = 'mongodb://' + env.MONGODB_USER + ':' + env.MONGODB_PASSWORD + '@' + env.MONGODB_SERVER + ':' + env.MONGODB_PORT + '/?authSource=admin';

async function main() {
  try {
    await mongoose.connect(uri + '&dbName=partycrm');
    const db = mongoose.connection.db;
    
    const collections = await db.listCollections().toArray();
    console.log('PartyCRM Collections:', collections.map(c => c.name).join(', '));
    
    for (const col of collections) {
      const count = await db.collection(col.name).countDocuments();
      console.log('  ' + col.name + ': ' + count + ' docs');
    }
    
    // Users
    const users = await db.collection('users').find({}).limit(5).toArray();
    console.log('\nUsers:', JSON.stringify(users.map(u => ({ 
      _id: u._id, email: u.email, role: u.role, balance: u.balance, 
      tenantId: u.tenantId, tariffId: u.tariffId, phone: u.phone,
      billingStatus: u.billingStatus 
    })), null, 2));
    
    // Events
    const events = await db.collection('events').find({}).limit(5).toArray();
    console.log('\nEvents:', JSON.stringify(events.map(e => ({ 
      _id: e._id, title: e.title, status: e.status, clientId: e.clientId, 
      tenantId: e.tenantId, contractSum: e.contractSum 
    })), null, 2));
    
    // Payments
    const payments = await db.collection('payments').find({}).limit(5).toArray();
    console.log('\nPayments:', JSON.stringify(payments, null, 2));
    
    // Transactions
    const txns = await db.collection('transactions').find({}).limit(5).toArray();
    console.log('\nTransactions:', JSON.stringify(txns, null, 2));
    
    // Tariffs
    const tariffs = await db.collection('tariffs').find({}).toArray();
    console.log('\nTariffs:', JSON.stringify(tariffs, null, 2));
    
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error:', err.message);
  }
}
main();
