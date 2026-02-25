// Drop the old deviceType_1 unique index from MongoDB
const { MongoClient } = require('mongodb');

async function dropOldIndex() {
  const client = new MongoClient(process.env.MONGO_URI || 'mongodb://localhost:27017/Performance_testing');
  
  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('devices');
    
    console.log('Current indexes:');
    const indexes = await collection.indexes();
    console.log(JSON.stringify(indexes, null, 2));
    
    console.log('\nDropping deviceType_1 index...');
    try {
      await collection.dropIndex('deviceType_1');
      console.log('✅ Successfully dropped deviceType_1 index');
    } catch (err) {
      if (err.code === 27) {
        console.log('ℹ️  Index deviceType_1 does not exist (already dropped or never existed)');
      } else {
        throw err;
      }
    }
    
    console.log('\nIndexes after dropping:');
    const newIndexes = await collection.indexes();
    console.log(JSON.stringify(newIndexes, null, 2));
    
  } finally {
    await client.close();
  }
}

dropOldIndex().catch(console.error);
