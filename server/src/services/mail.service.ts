import nodemailer, { Transporter } from 'nodemailer';
require("dotenv").config();

interface MailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

class MailService {
  private transporter: Transporter;

  constructor() {
    console.log('📧 Initializing Mail Service...');
    console.log(`📧 Mail Host: ${process.env.MAIL_HOST || 'sandbox.smtp.mailtrap.io'}`);
    console.log(`📧 Mail Port: ${process.env.MAIL_PORT || '2525'}`);
    console.log(`📧 Mail User: ${process.env.MAIL_USER ? '***' + process.env.MAIL_USER.slice(-4) : 'NOT SET'}`);
    
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'sandbox.smtp.mailtrap.io',
      port: parseInt(process.env.MAIL_PORT || '2525'),
      secure: false, // Mailtrap doesn't require secure connection
      auth: {
        user: process.env.MAIL_USER || '',
        pass: process.env.MAIL_PASS || ''
      }
    });
    
    console.log('✅ Mail Service initialized');
  }

  /**
   * Send an email
   */
  async sendMail(options: MailOptions): Promise<boolean> {
    try {
      console.log('📤 Preparing to send email...');
      console.log(`   📧 To: ${options.to}`);
      console.log(`   📝 Subject: ${options.subject}`);
      console.log(`   📏 Text length: ${options.text?.length || 0} chars`);
      console.log(`   🎨 HTML length: ${options.html?.length || 0} chars`);
     
      
      const mailOptions = {
        from: process.env.MAIL_FROM || 'noreply@perftesting.com',
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html
      };

      console.log(`   🚀 Sending email from ${mailOptions.from}...`);
      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully to ${options.to}`);
      console.log(`   📨 Message ID: ${info.messageId}`);
      console.log(`   📮 Response: ${info.response}`);
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
    console.log('📧 Composing session reminder email...');
    console.log(`   👤 User: ${userName}`);
    console.log(`   📧 Email: ${userEmail}`);
    console.log(`   📊 Sessions created: ${sessionsCreated}/2`);
    
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
      to: userEmail,
      subject,
      text,
      html
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
