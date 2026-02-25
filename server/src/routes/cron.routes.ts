import { Router, Request, Response } from 'express';
import { triggerSessionReminderManually } from '../crons/sessionReminder.cron';

const router = Router();

/**
 * Manually trigger session reminder check
 * For testing purposes - sends reminders to all testers who haven't created 2 sessions today
 * POST /api/cron/trigger-session-reminder
 */
router.post('/trigger-session-reminder', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('\n🌐 API Request received: POST /api/cron/trigger-session-reminder');
    console.log(`   📍 Request IP: ${req.ip}`);
    console.log(`   🕐 Request time: ${new Date().toISOString()}`);
    console.log('🔧 Manual trigger requested for session reminder...');
    
    await triggerSessionReminderManually();
    
    console.log('✅ API Response: Success\n');
    res.status(200).json({
      success: true,
      message: 'Session reminder check triggered successfully'
    });
  } catch (error) {
    console.error('❌ API Response: Error');
    console.error('Error triggering session reminder:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger session reminder check',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
