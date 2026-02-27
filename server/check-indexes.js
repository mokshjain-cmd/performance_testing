/**
 * Script to check current indexes in MongoDB
 * Run this to see what indexes exist in your collections
 * 
 * Usage: node check-indexes.js
 */

const mongoose = require('mongoose');

// Load environment variables
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/performance-testing';

async function checkIndexes() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    const collections = [
      'useraccuracysummaries',
      'firmwareperformances',
      'benchmarkcomparisonsummaries',
      'admindailytrends',
      'adminglobalsummaries',
      'activityperformancesummaries'
    ];

    for (const collectionName of collections) {
      console.log(`\n📋 Collection: ${collectionName}`);
      console.log('═'.repeat(60));
      
      try {
        const collection = db.collection(collectionName);
        const indexes = await collection.indexes();
        
        if (indexes.length === 0) {
          console.log('  ⚠️  No indexes found');
        } else {
          indexes.forEach((index, i) => {
            console.log(`\n  Index ${i + 1}:`);
            console.log(`    Name: ${index.name}`);
            console.log(`    Keys: ${JSON.stringify(index.key)}`);
            if (index.unique) {
              console.log(`    Unique: ✅ YES`);
            }
          });
        }
      } catch (err) {
        console.log(`  ⚠️  Collection not found or error: ${err.message}`);
      }
    }

    console.log('\n\n✅ Expected indexes:');
    console.log('═'.repeat(60));
    console.log('useraccuracysummaries:');
    console.log('  - { userId: 1, metric: 1 } UNIQUE ✓');
    console.log('\nfirmwareperformances:');
    console.log('  - { firmwareVersion: 1, metric: 1 } UNIQUE ✓');
    console.log('\nbenchmarkcomparisonsummaries:');
    console.log('  - { benchmarkDeviceType: 1, metric: 1 } UNIQUE ✓');
    console.log('\nadmindailytrends:');
    console.log('  - { date: 1, metric: 1 } UNIQUE ✓');
    console.log('\nadminglobalsummaries:');
    console.log('  - { metric: 1 } UNIQUE ✓');
    console.log('\nactivityperformancesummaries:');
    console.log('  - { activityType: 1 } UNIQUE ✓\n');

  } catch (error) {
    console.error('❌ Error checking indexes:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

checkIndexes();
