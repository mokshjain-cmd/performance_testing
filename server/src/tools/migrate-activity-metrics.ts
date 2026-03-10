import mongoose from 'mongoose';
import Session from '../models/Session';
import SessionAnalysis from '../models/SessionAnalysis';
import UserAccuracySummary from '../models/UserAccuracySummary';
import BenchmarkComparisonSummary from '../models/BenchmarkComparisonSummary';
import AdminGlobalSummary from '../models/AdminGlobalSummary';
import AdminDailyTrend from '../models/AdminDailyTrend';
import FirmwarePerformance from '../models/FirmwarePerformance';

/**
 * Migration script to update all activity-related metrics from "Steps" and "Calories" to unified "Activity"
 */
async function migrateActivityMetrics() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI_DEV || 'mongodb://localhost:27017/performance_testing';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Update Sessions
    console.log('\n📝 Migrating Sessions...');
    const sessionsResult = await Session.updateMany(
      { metric: { $in: ['Steps', 'Calories'] } },
      { $set: { metric: 'Activity' } }
    );
    console.log(`✅ Updated ${sessionsResult.modifiedCount} sessions`);

    // Update SessionAnalysis
    console.log('\n📝 Migrating SessionAnalysis...');
    const analysesResult = await SessionAnalysis.updateMany(
      { metric: { $in: ['Steps', 'Calories'] } },
      { $set: { metric: 'Activity' } }
    );
    console.log(`✅ Updated ${analysesResult.modifiedCount} session analyses`);

    // Update UserAccuracySummary
    console.log('\n📝 Migrating UserAccuracySummary...');
    const userSummaryResult = await UserAccuracySummary.updateMany(
      { metric: { $in: ['Steps', 'Calories'] } },
      { $set: { metric: 'Activity' } }
    );
    console.log(`✅ Updated ${userSummaryResult.modifiedCount} user summaries`);

    // Delete duplicate UserAccuracySummary entries (keep Activity, remove Steps/Calories if both exist)
    console.log('\n🗑️  Cleaning up duplicate user summaries...');
    const userSummaries = await UserAccuracySummary.find({ metric: 'Activity' });
    let deletedCount = 0;
    for (const summary of userSummaries) {
      // Check if there are duplicates for this user
      const duplicates = await UserAccuracySummary.find({
        userId: summary.userId,
        metric: 'Activity',
        _id: { $ne: summary._id }
      });
      
      if (duplicates.length > 0) {
        // Keep the one with the most recent data
        const allDocs = [summary, ...duplicates].sort((a, b) => 
          new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime()
        );
        const toKeep = allDocs[0];
        const toDelete = allDocs.slice(1);
        
        for (const doc of toDelete) {
          await UserAccuracySummary.deleteOne({ _id: doc._id });
          deletedCount++;
        }
      }
    }
    console.log(`✅ Deleted ${deletedCount} duplicate user summaries`);

    // Update BenchmarkComparisonSummary
    console.log('\n📝 Migrating BenchmarkComparisonSummary...');
    const benchmarkResult = await BenchmarkComparisonSummary.updateMany(
      { metric: { $in: ['Steps', 'Calories'] } },
      { $set: { metric: 'Activity' } }
    );
    console.log(`✅ Updated ${benchmarkResult.modifiedCount} benchmark summaries`);

    // Delete duplicates for BenchmarkComparisonSummary
    console.log('\n🗑️  Cleaning up duplicate benchmark summaries...');
    const benchmarkSummaries = await BenchmarkComparisonSummary.find({ metric: 'Activity' });
    deletedCount = 0;
    for (const summary of benchmarkSummaries) {
      const duplicates = await BenchmarkComparisonSummary.find({
        benchmarkDeviceType: summary.benchmarkDeviceType,
        metric: 'Activity',
        _id: { $ne: summary._id }
      });
      
      if (duplicates.length > 0) {
        const allDocs = [summary, ...duplicates].sort((a, b) => 
          new Date(b.lastUpdated || 0).getTime() - new Date(a.lastUpdated || 0).getTime()
        );
        const toDelete = allDocs.slice(1);
        
        for (const doc of toDelete) {
          await BenchmarkComparisonSummary.deleteOne({ _id: doc._id });
          deletedCount++;
        }
      }
    }
    console.log(`✅ Deleted ${deletedCount} duplicate benchmark summaries`);

    // Update AdminGlobalSummary
    console.log('\n📝 Migrating AdminGlobalSummary...');
    const globalResult = await AdminGlobalSummary.updateMany(
      { metric: { $in: ['Steps', 'Calories'] } },
      { $set: { metric: 'Activity' } }
    );
    console.log(`✅ Updated ${globalResult.modifiedCount} global summaries`);

    // Delete duplicates for AdminGlobalSummary
    console.log('\n🗑️  Cleaning up duplicate global summaries...');
    const globalSummaries = await AdminGlobalSummary.find({ metric: 'Activity' });
    deletedCount = 0;
    for (const summary of globalSummaries) {
      const duplicates = await AdminGlobalSummary.find({
        metric: 'Activity',
        _id: { $ne: summary._id }
      });
      
      if (duplicates.length > 0) {
        const allDocs = [summary, ...duplicates].sort((a, b) => 
          new Date(b.computedAt || 0).getTime() - new Date(a.computedAt || 0).getTime()
        );
        const toDelete = allDocs.slice(1);
        
        for (const doc of toDelete) {
          await AdminGlobalSummary.deleteOne({ _id: doc._id });
          deletedCount++;
        }
      }
    }
    console.log(`✅ Deleted ${deletedCount} duplicate global summaries`);

    // Update AdminDailyTrend
    console.log('\n📝 Migrating AdminDailyTrend...');
    const dailyResult = await AdminDailyTrend.updateMany(
      { metric: { $in: ['Steps', 'Calories'] } },
      { $set: { metric: 'Activity' } }
    );
    console.log(`✅ Updated ${dailyResult.modifiedCount} daily trends`);

    // Delete duplicates for AdminDailyTrend
    console.log('\n🗑️  Cleaning up duplicate daily trends...');
    const dailyTrends = await AdminDailyTrend.find({ metric: 'Activity' });
    deletedCount = 0;
    for (const trend of dailyTrends) {
      const duplicates = await AdminDailyTrend.find({
        date: trend.date,
        metric: 'Activity',
        _id: { $ne: trend._id }
      });
      
      if (duplicates.length > 0) {
        const allDocs = [trend, ...duplicates].sort((a, b) => 
          new Date(b.computedAt || 0).getTime() - new Date(a.computedAt || 0).getTime()
        );
        const toDelete = allDocs.slice(1);
        
        for (const doc of toDelete) {
          await AdminDailyTrend.deleteOne({ _id: doc._id });
          deletedCount++;
        }
      }
    }
    console.log(`✅ Deleted ${deletedCount} duplicate daily trends`);

    // Update FirmwarePerformance
    console.log('\n📝 Migrating FirmwarePerformance...');
    const firmwareResult = await FirmwarePerformance.updateMany(
      { metric: { $in: ['Steps', 'Calories'] } },
      { $set: { metric: 'Activity' } }
    );
    console.log(`✅ Updated ${firmwareResult.modifiedCount} firmware performance records`);

    // Delete duplicates for FirmwarePerformance
    console.log('\n🗑️  Cleaning up duplicate firmware performance records...');
    const firmwarePerfs = await FirmwarePerformance.find({ metric: 'Activity' });
    deletedCount = 0;
    for (const perf of firmwarePerfs) {
      const duplicates = await FirmwarePerformance.find({
        firmwareVersion: perf.firmwareVersion,
        metric: 'Activity',
        _id: { $ne: perf._id }
      });
      
      if (duplicates.length > 0) {
        const allDocs = [perf, ...duplicates].sort((a, b) => 
          new Date(b.computedAt || 0).getTime() - new Date(a.computedAt || 0).getTime()
        );
        const toDelete = allDocs.slice(1);
        
        for (const doc of toDelete) {
          await FirmwarePerformance.deleteOne({ _id: doc._id });
          deletedCount++;
        }
      }
    }
    console.log(`✅ Deleted ${deletedCount} duplicate firmware performance records`);

    console.log('\n✅ Migration completed successfully!');
    
    // Show summary statistics
    console.log('\n📊 Summary:');
    const activitySessionsCount = await Session.countDocuments({ metric: 'Activity' });
    const activityAnalysesCount = await SessionAnalysis.countDocuments({ metric: 'Activity' });
    console.log(`- Total Activity sessions: ${activitySessionsCount}`);
    console.log(`- Total Activity analyses: ${activityAnalysesCount}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateActivityMetrics();
