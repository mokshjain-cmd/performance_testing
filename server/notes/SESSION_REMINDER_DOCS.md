# Session Reminder System

## Overview
Automated daily reminder system that checks if testers have created at least 2 sessions per day and sends email notifications to those who haven't met their daily goal.

## Features
- ✅ Automatic daily check at 8:00 PM
- ✅ Email notifications using Nodemailer with Mailtrap
- ✅ Tracks session creation per tester
- ✅ Beautiful HTML email templates
- ✅ Manual trigger endpoint for testing

## Components

### 1. Mail Service (`services/mail.service.ts`)
Handles all email functionality using Nodemailer.

**Key Methods:**
- `sendMail(options)` - Generic email sending
- `sendSessionReminder(email, name, sessionsCreated)` - Sends reminder emails to testers
- `verifyConnection()` - Verifies mail server connection

### 2. Cron Service (`crons/sessionReminder.cron.ts`)
Schedules and executes the daily check at 8:00 PM.

**Key Functions:**
- `startSessionReminderCron()` - Initializes the cron job
- `triggerSessionReminderManually()` - Manual trigger for testing

**Logic:**
1. Fetches all users with role 'tester'
2. For each tester, counts sessions created today
3. Sends reminder email if session count < 2
4. Logs results for monitoring

## Setup Instructions

### 1. Environment Configuration

Add the following to your `.env` file:

```env
# Mail Configuration (Mailtrap for development)
MAIL_HOST=sandbox.smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USER=your_mailtrap_username
MAIL_PASS=your_mailtrap_password
MAIL_FROM=noreply@perftesting.com
```

### 2. Get Mailtrap Credentials

1. Sign up for a free account at [Mailtrap.io](https://mailtrap.io)
2. Go to "Email Testing" → "Inboxes"
3. Select your inbox
4. Copy the SMTP credentials:
   - Host: `sandbox.smtp.mailtrap.io`
   - Port: `2525`
   - Username: (copy from Mailtrap)
   - Password: (copy from Mailtrap)

### 3. Install Dependencies (Already Done)

```bash
npm install node-cron nodemailer
npm install --save-dev @types/node-cron @types/nodemailer
```

### 4. Start the Server

The cron job automatically starts when the server starts:

```bash
npm run dev
```

You should see:
```
✅ Session reminder cron job scheduled for 8:00 PM daily
```

## Testing

### Manual Trigger

To test the functionality without waiting for 8:00 PM:

**Endpoint:** `POST http://localhost:3000/api/cron/trigger-session-reminder`

**Using cURL:**
```bash
curl -X POST http://localhost:3000/api/cron/trigger-session-reminder
```

**Using Postman:**
1. Create a new POST request
2. URL: `http://localhost:3000/api/cron/trigger-session-reminder`
3. Send the request

**Expected Response:**
```json
{
  "success": true,
  "message": "Session reminder check triggered successfully"
}
```

### Testing Scenarios

#### Scenario 1: Tester with 0 sessions
1. Create a user with role 'tester'
2. Don't create any sessions for today
3. Trigger the cron job manually
4. Check Mailtrap inbox for reminder email

#### Scenario 2: Tester with 1 session
1. Create a user with role 'tester'
2. Create 1 session for today
3. Trigger the cron job manually
4. Should receive reminder (needs 1 more session)

#### Scenario 3: Tester with 2+ sessions
1. Create a user with role 'tester'
2. Create 2 or more sessions for today
3. Trigger the cron job manually
4. Should receive congratulatory email (goal met)

## Email Template

The reminder email includes:
- Personalized greeting
- Current session count
- Daily goal (2 sessions)
- Action required message (if < 2 sessions)
- Success message (if ≥ 2 sessions)
- Beautiful HTML formatting with color-coded alerts

## Cron Schedule

**Default Schedule:** `0 20 * * *` (8:00 PM daily)

To modify the schedule, edit the cron expression in `crons/sessionReminder.cron.ts`:

```typescript
cron.schedule('0 20 * * *', async () => {
  // ...
});
```

**Common Cron Expressions:**
- `0 20 * * *` - 8:00 PM daily
- `0 9 * * *` - 9:00 AM daily
- `0 12 * * 1-5` - 12:00 PM Monday-Friday
- `*/5 * * * *` - Every 5 minutes (for testing)

## Monitoring & Logs

The cron job logs detailed information:

```
🕒 Running session reminder cron job at 8:00 PM...
📊 Checking sessions for 5 testers...
✅ John Doe (john@example.com) - Sessions: 3/2 - Goal met!
📧 Sending reminder to Jane Smith (jane@example.com) - Sessions: 1/2
✉️  Email sent to jane@example.com: <message-id>
✨ Session reminder check complete: 2/2 reminders sent successfully
```

## Production Setup

When deploying to production:

1. **Replace Mailtrap with real SMTP:**
   ```env
   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USER=your-email@gmail.com
   MAIL_PASS=your-app-password
   MAIL_FROM=noreply@yourcompany.com
   ```

2. **Use environment-specific configurations:**
   - Development: Mailtrap
   - Staging: Test email service
   - Production: Production SMTP (Gmail, SendGrid, AWS SES, etc.)

3. **Add email rate limiting** to avoid spam complaints

4. **Implement retry logic** for failed emails

5. **Add email templates** using a template engine like Handlebars

## Troubleshooting

### Emails not sending
- Check Mailtrap credentials in `.env`
- Verify mail service connection: Check server logs for "✅ Mail server connection verified"
- Check for errors in cron job logs

### Cron not running
- Verify cron is initialized in `server.ts`
- Check server logs for "✅ Session reminder cron job scheduled"
- Ensure node-cron is installed

### Wrong timezone
- Cron uses server timezone
- For specific timezone, use moment-timezone or configure system timezone

## Future Enhancements

- [ ] Add configurable reminder thresholds per user
- [ ] Support multiple reminder times
- [ ] Weekly summary emails
- [ ] Dashboard for email delivery status
- [ ] Template customization through admin panel
- [ ] SMS notifications using Twilio
- [ ] Push notifications
