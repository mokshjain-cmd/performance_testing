import nodemailer, { Transporter } from 'nodemailer';
require("dotenv").config();

interface MailOptions {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
}

class MailService {
  private transporter: Transporter;

  constructor() {
    console.log('📧 Initializing Mail Service...');
    
    // Remove spaces from Gmail app password
    const gmailPassword = (process.env.GMAIL_PASS || '').replace(/\s+/g, '');
    if(process.env.ENV==='development'){
        this.transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST || 'smtp.mailtrap.io',
        port: parseInt(process.env.MAIL_PORT || '2525'),
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
      });
    }else{
        this.transporter = nodemailer.createTransport({
      host: process.env.GMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.GMAIL_PORT || '587'),
      secure: false, // Use STARTTLS for port 587
      auth: {
        user: process.env.GMAIL_USER || '',
        pass: gmailPassword
      },
      tls: {
        rejectUnauthorized: true
      }
    });
    }
    
    console.log('✅ Mail Service initialized');
  }

  /**
   * Send an email
   */
  async sendMail(options: MailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"${process.env.MAIL_FROM_NAME}" <${process.env.GMAIL_USER}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        replyTo: options.replyTo || process.env.MAIL_REPLY_TO || undefined
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent to ${options.to}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send email to ${options.to}`);
      console.error('   Error details:', error);
      if (error instanceof Error) {
        console.error(`   Error message: ${error.message}`);
        console.error(`   Error stack: ${error.stack}`);
      }
      return false;
    }
  }

  /**
   * Send session reminder email to a tester
   */
  async sendSessionReminder(userEmail: string, userName: string, sessionsCreated: number): Promise<boolean> {

    const subject = 'Daily Session Reminder - Performance Testing Platform';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Daily Session Reminder</h2>
        <p>Hi ${userName},</p>
        <p>This is a friendly reminder that you have created <strong>${sessionsCreated}</strong> session(s) today.</p>
        <p>As a tester, you're expected to create at least <strong>2 sessions per day</strong>.</p>
        ${sessionsCreated < 2 ? `
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e;">
              <strong>Action Required:</strong> Please create ${2 - sessionsCreated} more session(s) to meet your daily goal.
            </p>
          </div>
        ` : `
          <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; color: #065f46;">
              <strong>Great job!</strong> You've met your daily session goal.
            </p>
          </div>
        `}
        <p>Keep up the great work!</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280;">
          This is an automated reminder from the Performance Testing Platform.<br>
          If you have any questions, please contact your administrator.
        </p>
      </div>
    `;

    const text = `
Hi ${userName},

This is a friendly reminder that you have created ${sessionsCreated} session(s) today.
As a tester, you're expected to create at least 2 sessions per day.

${sessionsCreated < 2 ? `Action Required: Please create ${2 - sessionsCreated} more session(s) to meet your daily goal.` : 'Great job! You\'ve met your daily session goal.'}

Keep up the great work!

---
This is an automated reminder from the Performance Testing Platform.
If you have any questions, please contact your administrator.
    `;

    return this.sendMail({
      from: `${process.env.MAIL_FROM_NAME || 'Performance Testing Platform'}`,
      to: userEmail,
      subject,
      text,
      html,
      replyTo: process.env.MAIL_REPLY_TO || 'noreply@perftesting.com'
    });
  }

  /**
   * Send session analysis completion/failure notification
   */
  async sendSessionAnalysisNotification(
    userEmail: string, 
    userName: string, 
    sessionId: string,
    sessionName: string, 
    status: 'success' | 'failed',
    metric: string = 'HR',
    errorMessage?: string
  ): Promise<boolean> {
    const subject = status === 'success' 
      ? `Session Analysis Complete - ${sessionName}`
      : `Session Analysis Failed - ${sessionName}`;
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: ${status === 'success' ? '#10b981' : '#ef4444'};">
          ${status === 'success' ? '✅ Session Analysis Complete' : '❌ Session Analysis Failed'}
        </h2>
        <p>Hi ${userName},</p>
        <p>
          Your session analysis for <strong>${metric}</strong> metric 
          ${status === 'success' ? 'has been completed successfully' : 'has failed'}.
        </p>
        <div style="background-color: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 8px 0;"><strong>Session:</strong> <code>${sessionName}</code></p>
          <p style="margin: 8px 0;"><strong>Metric:</strong> ${metric}</p>
          <p style="margin: 8px 0;"><strong>Status:</strong> ${status === 'success' ? '✅ Success' : '❌ Failed'}</p>
        </div>
        ${status === 'success' ? `
          <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; color: #065f46;">
              <strong>Your results are ready!</strong> Log in to the platform to view your session analysis, charts, and performance metrics.
            </p>
          </div>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View Results
            </a>
          </p>
        ` : `
          <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0;">
            <p style="margin: 0 0 12px 0; color: #991b1b;">
              <strong>Analysis failed:</strong> ${errorMessage || 'An error occurred during session analysis. Please contact support if this persists.'}
            </p>
            <p style="margin: 0; color: #991b1b;">
              <strong>Action Required:</strong> Please contact your administrator to delete this session (ID: ${sessionId}) from the system.
            </p>
          </div>
        `}
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="font-size: 12px; color: #6b7280;">
          This is an automated notification from the Performance Testing Platform.<br>
          If you have any questions, please contact your administrator.
        </p>
      </div>
    `;

    const text = `
Hi ${userName},

Your session analysis for ${metric} metric ${status === 'success' ? 'has been completed successfully' : 'has failed'}.

Session Details:
- Session: ${sessionName}
- Metric: ${metric}
- Status: ${status === 'success' ? 'Success' : 'Failed'}

${status === 'success' 
  ? 'Your results are ready! Log in to the platform to view your session analysis, charts, and performance metrics.\n\nVisit: ' + (process.env.FRONTEND_URL || 'http://localhost:5173')
  : 'Analysis failed: ' + (errorMessage || 'An error occurred during session analysis. Please contact support if this persists.') + '\n\nAction Required: Please contact your administrator to delete this session (ID: ' + sessionId + ') from the system.'}

---
This is an automated notification from the Performance Testing Platform.
If you have any questions, please contact your administrator.
    `;

    return this.sendMail({
      from: `${process.env.MAIL_FROM_NAME || 'Performance Testing Platform'}`,
      to: userEmail,
      subject,
      text,
      html,
      replyTo: process.env.MAIL_REPLY_TO || 'noreply@perftesting.com'
    });
  }

  /**
   * Verify mail configuration
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('✅ Mail server connection verified');
      return true;
    } catch (error) {
      console.error('❌ Mail server connection failed:', error);
      return false;
    }
  }
}

export const mailService = new MailService();
