# Log Upload Tool

This script helps the app team upload daily user logs to the engagement monitoring system.

## Prerequisites

```bash
npm install form-data axios
```

## Setup

1. Get your admin authentication token from the system
2. Set it as an environment variable:

```bash
# Linux/Mac
export ADMIN_TOKEN="your_admin_token_here"

# Windows PowerShell
$env:ADMIN_TOKEN = "your_admin_token_here"

# Windows CMD
set ADMIN_TOKEN=your_admin_token_here
```

3. Organize your log files in a directory with naming convention:
   - `{email}_logs_{date}.txt`
   - OR `{email}_HR_{timestamp}.txt`, `{email}_SPO2_{timestamp}.txt`, etc.
   - **Note:** If email contains `@`, replace it with `_at_` or `-at-` in filename
   - Examples:
     - `john.doe_at_example.com_logs_2026-03-30.txt`
     - `user-at-company.com_HR_1774251225531.txt`

## Usage

```bash
node uploadLogs.js <logsDirectory> <date>
```

### Example

```bash
# Upload all logs from a directory for a specific date
node uploadLogs.js ./daily-logs/2026-03-30 2026-03-30

# With custom API URL
API_URL="https://api.production.com" node uploadLogs.js ./daily-logs/2026-03-30 2026-03-30
```

## Expected Output

```
📤 Starting log upload process...

📁 Logs directory: ./daily-logs/2026-03-30
📅 Date: 2026-03-30

✅ Found 20 log files

📄 Processing: user123_logs_2026-03-30.txt
   User ID: user123
...

🚀 Uploading 20 files to http://localhost:8080/api/engagement/upload-logs

============================================================
✅ UPLOAD COMPLETE
============================================================
{
  "success": true,
  "message": "Log upload completed",
  "results": [...]
}
============================================================

📊 Summary:
   ✅ Successful: 18
   ❌ Failed: 2
   📁 Total: 20
```

## File Naming Convention

The script extracts the user email from the filename by taking the first part before the underscore.

**Supported formats:**
- `{email}_logs_{date}.txt`
- `{email}_HR_{timestamp}.txt`
- `{email}_SPO2_{timestamp}.csv`
- `{email}_{metricType}_{anything}.log`

**Email Encoding in Filenames:**
Since `@` symbol may not be allowed in some filesystems or can cause issues, you can encode it:
- Replace `@` with `_at_` → `john.doe_at_example.com_HR_123.txt`
- Replace `@` with `-at-` → `john.doe-at-example.com_logs.txt`
- Keep `@` if your filesystem supports it → `john.doe@example.com_logs.txt`

**Examples:**
- `user_at_example.com_logs_2026-03-30.txt` → Email: `user@example.com`
- `john.doe-at-company.com_HR_1774251225531.txt` → Email: `john.doe@company.com`
- `admin@test.com_SPO2_123456.csv` → Email: `admin@test.com`

**Note:** The system will look up the user by email in the database and use their MongoDB ObjectId internally.

## Environment Variables

- **ADMIN_TOKEN** (required): Admin authentication token
- **API_URL** (optional): API base URL (default: `http://localhost:8080`)

## Troubleshooting

### "ADMIN_TOKEN environment variable not set"
Set your admin token:
```bash
export ADMIN_TOKEN="your_token"
```

### "Directory not found"
Check the path to your logs directory:. Email should be the first part of the filename before the first underscore.

### "User not found with email"
The email in the filename doesn't exist in the database. Make sure:
- The email is correctly formatted in the filename
- The user exists in the database with that exact email
- Check for typos or encoding issues
```bash
ls -la ./daily-logs/2026-03-30
```

### "No log files found"
Ensure files have extensions: `.txt`, `.csv`, or `.log`

### "Could not extract user ID"
Check filename format matches the convention (see above)

### Upload fails with 401 Unauthorized
- Token expired or invalid
- Get a fresh token from the system

### Upload fails with 403 Forbidden
- User doesn't have admin role
- Use an admin account token

## Automation

### Create a Daily Cron Job (Linux/Mac)

```bash
# Edit crontab
crontab -e

# Add this line to run at 8 PM daily
0 20 * * * export ADMIN_TOKEN="your_token" && cd /path/to/server/tools && node uploadLogs.js /path/to/daily-logs/$(date +\%Y-\%m-\%d) $(date +\%Y-\%m-\%d) >> /path/to/logs/upload.log 2>&1
```

### Create a Scheduled Task (Windows)

Create a batch file `upload_daily.bat`:
```batch
@echo off
set ADMIN_TOKEN=your_token_here
set API_URL=http://localhost:8080
set DATE=%date:~10,4%-%date:~4,2%-%date:~7,2%
set LOGS_DIR=C:\logs\%DATE%

cd C:\path\to\server\tools
node uploadLogs.js "%LOGS_DIR%" "%DATE%"
```

Then schedule it with Task Scheduler to run at 8 PM daily.

## Support

For issues or questions, contact the backend team.
