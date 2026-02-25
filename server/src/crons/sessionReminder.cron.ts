import cron from 'node-cron';
import User from '../models/Users';
import Session from '../models/Session';
import { mailService } from '../services/mail.service';

/**
 * Check if a tester has created at least 2 sessions today
 * Runs daily at 8:00 PM
 */
export const startSessionReminderCron = (): void => {
  console.log('\n🕐 Initializing Session Reminder Cron Job...');
  console.log('   Schedule: Daily at 8:00 PM (20:00)');
  console.log('   Cron Expression: 0 20 * * *');
  console.log('   Current server time: ' + new Date().toISOString());
  
  // Cron expression: '0 20 * * *' means:
  // - 0: At minute 0
  // - 20: At hour 20 (8 PM)
  // - *: Every day of month
  // - *: Every month
  // - *: Every day of week
  cron.schedule('0 20 * * *', async () => {
    console.log('\n' + '='.repeat(60));
    console.log('🕒 SCHEDULED CRON JOB TRIGGERED');
    console.log('='.repeat(60));
    console.log('Running session reminder cron job at 8:00 PM...');
    console.log(`Trigger time: ${new Date().toISOString()}`);
    console.log('='.repeat(60) + '\n');
    
    try {
      await checkTestersSessionsAndSendReminders();
      console.log('\n✅ Scheduled cron job completed successfully\n');
    } catch (error) {
      console.error('\n❌ Scheduled cron job failed');
      console.error('❌ Error in session reminder cron job:', error);
    }
  });

  console.log('✅ Session reminder cron job scheduled for 8:00 PM daily\n');
};

/**
 * Check all testers and send reminders to those who haven't created 2 sessions today
 */
async function checkTestersSessionsAndSendReminders(): Promise<void> {
  try {
    console.log('🔍 Starting session reminder check...');
    console.log(`⏰ Current time: ${new Date().toISOString()}`);
    
    // Get all users with role 'tester'
    console.log('👥 Fetching testers from database...');
    const testers = await User.find({ role: 'tester' });
    console.log(`✅ Found ${testers.length} tester(s)`);

    if (testers.length === 0) {
      console.log('ℹ️  No testers found - nothing to do');
      return;
    }

    console.log(`📊 Checking sessions for ${testers.length} testers...`);

    // Get start and end of today (UTC)
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setUTCHours(23, 59, 59, 999);
    
    console.log(`📅 Date range for today (UTC):`);
    console.log(`   Start: ${startOfToday.toISOString()}`);
    console.log(`   End: ${endOfToday.toISOString()}`);

    // Check each tester
    console.log('🔍 Querying sessions for each tester...');
    const results = await Promise.all(
      testers.map(async (tester, index) => {
        console.log(`   [${index + 1}/${testers.length}] Checking ${tester.name} (${tester.email})...`);
        
        // Count sessions created by this tester today
        const sessionCount = await Session.countDocuments({
          userId: tester._id,
          createdAt: {
            $gte: startOfToday,
            $lte: endOfToday
          }
        });
        
        console.log(`   [${index + 1}/${testers.length}] ${tester.name}: ${sessionCount} session(s) found`);

        return {
          tester,
          sessionCount
        };
      })
    );
    
    console.log('✅ Session count check completed for all testers');

    // Send reminders to testers who haven't created 2 sessions
    console.log('\n📨 Processing reminders...');
    let remindersSent = 0;
    let remindersNeeded = 0;
    let remindersFailed = 0;
    let testersWithGoalMet = 0;

    for (const { tester, sessionCount } of results) {
      if (sessionCount < 2) {
        remindersNeeded++;
        console.log(
          `\n📧 [REMINDER ${remindersNeeded}] Sending to ${tester.name} (${tester.email})`
        );
        console.log(`   Sessions: ${sessionCount}/2 (needs ${2 - sessionCount} more)`);

        const emailSent = await mailService.sendSessionReminder(
          tester.email,
          tester.name,
          sessionCount
        );

        if (emailSent) {
          remindersSent++;
          console.log(`   ✅ Reminder sent successfully`);
        } else {
          remindersFailed++;
          console.log(`   ❌ Failed to send reminder`);
        }
      } else {
        testersWithGoalMet++;
        console.log(
          `✅ ${tester.name} (${tester.email}) - Sessions: ${sessionCount}/2 - Goal met!`
        );
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 SESSION REMINDER CHECK SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total testers checked: ${testers.length}`);
    console.log(`Testers with goal met (≥2 sessions): ${testersWithGoalMet}`);
    console.log(`Reminders needed: ${remindersNeeded}`);
    console.log(`Reminders sent successfully: ${remindersSent}`);
    console.log(`Reminders failed: ${remindersFailed}`);
    console.log(`Success rate: ${remindersNeeded > 0 ? ((remindersSent / remindersNeeded) * 100).toFixed(1) : 100}%`);
    console.log('='.repeat(60) + '\n');
    console.log(
      `✨ Session reminder check complete: ${remindersSent}/${remindersNeeded} reminders sent successfully`
    );
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ CRITICAL ERROR in session reminder check');
    console.error('='.repeat(60));
    console.error('Error details:', error);
    if (error instanceof Error) {
      console.error(`Error message: ${error.message}`);
      console.error(`Error stack: ${error.stack}`);
    }
    console.error('='.repeat(60) + '\n');
    throw error;
  }
}

/**
 * Manual trigger for testing purposes
 */
export const triggerSessionReminderManually = async (): Promise<void> => {
  console.log('\n' + '='.repeat(60));
  console.log('🔧 MANUAL TRIGGER - Session Reminder Check');
  console.log('='.repeat(60));
  console.log(`Triggered at: ${new Date().toISOString()}`);
  console.log('='.repeat(60) + '\n');
  
  await checkTestersSessionsAndSendReminders();
  
  console.log('\n🎉 Manual trigger completed!');
};
