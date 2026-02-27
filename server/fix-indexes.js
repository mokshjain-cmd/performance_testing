/**
 * Script to drop old indexes and recreate with correct compound unique indexes
 * Run this to fix any duplicate key errors related to metric field
 * 
 * Usage: node fix-indexes.js
 */

const mongoose = require('mongoose');

// Load environment variables
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/performance-testing';

async function fixIndexes() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;

    // Fix UserAccuracySummary indexes
    console.log('🔧 Fixing UserAccuracySummary indexes...');
    const userAccuracyCollection = db.collection('useraccuracysummaries');
    await userAccuracyCollection.dropIndexes();
    console.log('  ✅ Dropped all indexes');
    await userAccuracyCollection.createIndex({ userId: 1, metric: 1 }, { unique: true });
    console.log('  ✅ Created compound unique index: { userId: 1, metric: 1 }');
    await userAccuracyCollection.createIndex({ userId: 1 });
    console.log('  ✅ Created index: { userId: 1 }');
    await userAccuracyCollection.createIndex({ metric: 1 });
    console.log('  ✅ Created index: { metric: 1 }\n');

    // Fix FirmwarePerformance indexes
    console.log('🔧 Fixing FirmwarePerformance indexes...');
    const firmwareCollection = db.collection('firmwareperformances');
    await firmwareCollection.dropIndexes();
    console.log('  ✅ Dropped all indexes');
    await firmwareCollection.createIndex({ firmwareVersion: 1, metric: 1 }, { unique: true });
    console.log('  ✅ Created compound unique index: { firmwareVersion: 1, metric: 1 }');
    await firmwareCollection.createIndex({ firmwareVersion: 1 });
    console.log('  ✅ Created index: { firmwareVersion: 1 }');
    await firmwareCollection.createIndex({ metric: 1 });
    console.log('  ✅ Created index: { metric: 1 }\n');

    // Fix BenchmarkComparisonSummary indexes
    console.log('🔧 Fixing BenchmarkComparisonSummary indexes...');
    const benchmarkCollection = db.collection('benchmarkcomparisonsummaries');
    await benchmarkCollection.dropIndexes();
    console.log('  ✅ Dropped all indexes');
    await benchmarkCollection.createIndex({ benchmarkDeviceType: 1, metric: 1 }, { unique: true });
    console.log('  ✅ Created compound unique index: { benchmarkDeviceType: 1, metric: 1 }');
    await benchmarkCollection.createIndex({ benchmarkDeviceType: 1 });
    console.log('  ✅ Created index: { benchmarkDeviceType: 1 }');
    await benchmarkCollection.createIndex({ metric: 1 });
    console.log('  ✅ Created index: { metric: 1 }\n');

    // Fix AdminDailyTrend indexes
    console.log('🔧 Fixing AdminDailyTrend indexes...');
    const dailyTrendCollection = db.collection('admindailytrends');
    await dailyTrendCollection.dropIndexes();
    console.log('  ✅ Dropped all indexes');
    await dailyTrendCollection.createIndex({ date: 1, metric: 1 }, { unique: true });
    console.log('  ✅ Created compound unique index: { date: 1, metric: 1 }');
    await dailyTrendCollection.createIndex({ date: 1 });
    console.log('  ✅ Created index: { date: 1 }');
    await dailyTrendCollection.createIndex({ metric: 1 });
    console.log('  ✅ Created index: { metric: 1 }\n');

    // Fix AdminGlobalSummary indexes
    console.log('🔧 Fixing AdminGlobalSummary indexes...');
    const globalSummaryCollection = db.collection('adminglobalsummaries');
    await globalSummaryCollection.dropIndexes();
    console.log('  ✅ Dropped all indexes');
    await globalSummaryCollection.createIndex({ metric: 1 }, { unique: true });
    console.log('  ✅ Created unique index: { metric: 1 }');
    await globalSummaryCollection.createIndex({ computedAt: 1 });
    console.log('  ✅ Created index: { computedAt: 1 }\n');

    // ActivityPerformanceSummary is correct (activityType unique, HR-only)
    console.log('ℹ️  ActivityPerformanceSummary indexes are correct (HR-only by design)\n');

    console.log('✅ All indexes fixed successfully!');
    console.log('\n📊 Summary:');
    console.log('  - UserAccuracySummary: { userId, metric } unique');
    console.log('  - FirmwarePerformance: { firmwareVersion, metric } unique');
    console.log('  - BenchmarkComparisonSummary: { benchmarkDeviceType, metric } unique');
    console.log('  - AdminDailyTrend: { date, metric } unique');
    console.log('  - AdminGlobalSummary: { metric } unique');
    console.log('  - ActivityPerformanceSummary: { activityType } unique (HR-only)\n');

  } catch (error) {
    console.error('❌ Error fixing indexes:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

fixIndexes();
