import cron from 'node-cron';
import { engagementService } from '../services/engagement.service';
import User from '../models/Users';
import DailyEngagementMetrics from '../models/DailyEngagementMetrics';

/**
 * Update user engagement status daily at 8:30 PM
 * Runs after expected log uploads (8:00 PM)
 */
export const startEngagementStatusUpdateCron = (): void => {
  console.log('\n🕐 Initializing Engagement Status Update Cron Job...');
  console.log('   Schedule: Daily at 8:30 PM (20:30)');
  console.log('   Cron Expression: 30 20 * * *');
  console.log('   Current server time: ' + new Date().toISOString());
  
  // Cron expression: '30 20 * * *' means:
  // - 30: At minute 30
  // - 20: At hour 20 (8 PM)
  // - *: Every day of month
  // - *: Every month
  // - *: Every day of week
  cron.schedule('30 20 * * *', async () => {
    console.log('\n' + '='.repeat(60));
    console.log('🕒 ENGAGEMENT STATUS UPDATE CRON JOB TRIGGERED');
    console.log('='.repeat(60));
    console.log('Running engagement status update at 8:30 PM...');
    console.log(`Trigger time: ${new Date().toISOString()}`);
    console.log('='.repeat(60) + '\n');
    
    try {
      await updateAllUsersEngagementStatus();
      console.log('\n✅ Engagement status update completed successfully\n');
    } catch (error) {
      console.error('\n❌ Engagement status update failed');
      console.error('❌ Error in engagement status cron job:', error);
    }
  });

  console.log('✅ Engagement status update cron job scheduled for 8:30 PM daily\n');
};

/**
 * Update engagement status for all tester users
 */
async function updateAllUsersEngagementStatus(): Promise<void> {
  try {
    console.log('🔍 Starting engagement status update for all users...');
    console.log(`⏰ Current time: ${new Date().toISOString()}`);
    
    // Get all tester users
    const testers = await User.find({ role: 'tester' });
    console.log(`📊 Found ${testers.length} tester users to check`);
    
    let activeCount = 0;
    let decliningCount = 0;
    let inactiveCount = 0;
    
    for (const user of testers) {
      try {
        const summary = await engagementService.getUserEngagementSummary(user._id.toString(), 7);
        
        // Log the status
        console.log(`👤 User: ${user.name} (${user.email})`);
        console.log(`   Status: ${summary.status}`);
        console.log(`   Last Active: ${summary.lastActiveDate?.toISOString().split('T')[0] || 'Never'}`);
        console.log(`   Inactive Days: ${summary.consecutiveInactiveDays}`);
        console.log(`   Avg Score (7d): ${summary.avgEngagementScore}`);
        
        // Increment counters
        if (summary.status === 'active') activeCount++;
        else if (summary.status === 'declining') decliningCount++;
        else if (summary.status === 'inactive') inactiveCount++;
        
      } catch (error) {
        console.error(`   ❌ Error updating status for user ${user.email}:`, error);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📈 ENGAGEMENT STATUS SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Active Users:    ${activeCount} (${Math.round(activeCount/testers.length*100)}%)`);
    console.log(`⚠️  Declining Users: ${decliningCount} (${Math.round(decliningCount/testers.length*100)}%)`);
    console.log(`❌ Inactive Users:  ${inactiveCount} (${Math.round(inactiveCount/testers.length*100)}%)`);
    console.log('='.repeat(60) + '\n');
    
    // Alert if too many inactive users
    if (inactiveCount > testers.length * 0.3) {
      console.log('⚠️  WARNING: More than 30% users are inactive!');
      console.log('   Consider device reclaim or re-engagement campaign.\n');
    }
    
  } catch (error) {
    console.error('❌ Failed to update engagement status:', error);
    throw error;
  }
}

/**
 * Manual trigger function for testing
 */
export const triggerEngagementStatusUpdate = async (): Promise<void> => {
  console.log('🚀 Manually triggering engagement status update...\n');
  await updateAllUsersEngagementStatus();
};
