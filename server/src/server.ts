import dotenv from 'dotenv';

// Load environment variables FIRST, before any other imports
dotenv.config();

// Now import modules that depend on env vars
import { createApp } from './app';
import { connectDatabase } from './config/database';
import { startSessionReminderCron } from './crons/sessionReminder.cron';

const PORT = Number(process.env.PORT) || 8080;

const startServer = async (): Promise<void> => {
  try {
    console.log('\n🚀 Starting Performance Testing Platform Server...\n');
    
    // Connect to database

    await connectDatabase();
    console.log('✅ Database connected successfully\n');

    // Create Express app
    const app = createApp();

    // Start cron jobs
    //console.log('⏰ Step 3: Initializing cron jobs...');
    //startSessionReminderCron(); //later put it somwhere else
    //console.log('✅ Cron jobs initialized\n');

    // Start server
    console.log('🌐 Step 4: Starting HTTP server...');
    app.listen(PORT, '0.0.0.0' , () => {
      console.log('✅ HTTP server started\n');
      console.log('='.repeat(60));
      console.log(`🚀 Server is running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🧪 Test cron: POST http://localhost:${PORT}/api/cron/trigger-session-reminder`);
      console.log('='.repeat(60) + '\n');
    });
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ Failed to start server');
    console.error('='.repeat(60));
    console.error(error);
    console.error('='.repeat(60) + '\n');
    process.exit(1);
  }
};

startServer();
