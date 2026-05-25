const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
let client;
let dbInstance;

async function connectDB() {
  if (dbInstance) return dbInstance;
  client = new MongoClient(uri);
  await client.connect();
  dbInstance = client.db('hk_macau_system');
  return dbInstance;
}

module.exports = { connectDB };
