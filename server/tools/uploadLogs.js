/**
 * Script for uploading daily user logs to the engagement monitoring system
 * 
 * Usage:
 *   node uploadLogs.js <logsDirectory> <date>
 * 
 * Example:
 *   node uploadLogs.js ./daily-logs/2026-03-30 2026-03-30
 * 
 * Expected log file naming convention:
 *   {email}_logs_{date}.txt
 *   OR
 *   {email}_HR_{timestamp}.txt
 *   {email}_SPO2_{timestamp}.txt
 *   etc.
 * 
 * Note: Email in filename should have @ replaced with underscore or dash
 *   Example: john_doe@example.com → john_doe_at_example.com_HR_123.txt
 *            john.doe@company.com → john.doe-at-company.com_logs.txt
 */

const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:8080';
const AUTH_TOKEN = process.env.ADMIN_TOKEN || '';  // Set this in environment

async function uploadLogs(logsDirectory, date) {
  try {
    console.log('📤 Starting log upload process...\n');
    console.log(`📁 Logs directory: ${logsDirectory}`);
    console.log(`📅 Date: ${date}\n`);

    // Verify directory exists
    if (!fs.existsSync(logsDirectory)) {
      throw new Error(`Directory not found: ${logsDirectory}`);
    }

    // Read all files in directory
    const files = fs.readdirSync(logsDirectory);
    const logFiles = files.filter(f => 
      f.endsWith('.txt') || f.endsWith('.csv') || f.endsWith('.log')
    );

    if (logFiles.length === 0) {
      throw new Error('No log files found in directory');
    }

    console.log(`✅ Found ${logFiles.length} log files\n`);

    // Prepare form data
    const formData = new FormData();
    let fileIndex = 0;

    for (const fileName of logFiles) {
      const filePath = path.join(logsDirectory, fileName);
      
      // Extract email from filename
      // Expected format: {email}_logs_{date}.txt or {email}_HR_{timestamp}.txt
      // Email might have @ replaced with "_at_" or "-at-" in filename
      const email = extractEmailFromFilename(fileName);
      
      if (!email) {
        console.log(`⚠️  Skipping ${fileName}: Could not extract email`);
        continue;
      }

      console.log(`📄 Processing: ${fileName}`);
      console.log(`   Email: ${email}`);

      // Add file to form data
      const fieldName = `file${fileIndex}`;
      formData.append(fieldName, fs.createReadStream(filePath), fileName);
      formData.append(`email_${fieldName}`, email);
      formData.append(`date_${fieldName}`, date);

      fileIndex++;
    }

    if (fileIndex === 0) {
      throw new Error('No valid log files to upload');
    }

    console.log(`\n🚀 Uploading ${fileIndex} files to ${API_URL}/api/engagement/upload-logs\n`);

    // Upload to API
    const response = await axios.post(
      `${API_URL}/api/engagement/upload-logs`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${AUTH_TOKEN}`
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    // Display results
    console.log('\n' + '='.repeat(60));
    console.log('✅ UPLOAD COMPLETE');
    console.log('='.repeat(60));
    console.log(JSON.stringify(response.data, null, 2));
    console.log('='.repeat(60) + '\n');

    // Summary
    const results = response.data.results || [];
    const successful = results.filter(r => r.status === 'success').length;
    const failed = results.filter(r => r.status === 'failed').length;

    console.log(`📊 Summary:`);
    console.log(`   ✅ Successful: ${successful}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📁 Total: ${results.length}\n`);

    if (failed > 0) {
      console.log('❌ Failed uploads:');
      results
        .filter(r => r.status === 'failed')
        .forEach(r => {
          console.log(`   - ${r.fileName}: ${r.error}`);
        });
      console.log();
    }

  } catch (error) {
    console.error('\n❌ Upload failed:');
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Message:', error.response.data?.message || error.message);
    } else {
      console.error('   Error:', error.message);
    }
    console.error();
    process.exit(1);
  }
}

/**
 * Extract user email from filename
 * Supports formats:
 *   - {email}_logs_{date}.txt
 *   - {email}_HR_{timestamp}.txt
 *   - {email}_{metricType}_{timestamp}.txt
 * 
 * Email might be encoded in filename with @ replaced:
 *   - "_at_" → user_at_example.com
 *   - "-at-" → user-at-example.com
 *   - Direct: user@example.com (if @ is preserved)
 */
function extractEmailFromFilename(filename) {
  // Remove extension
  const nameWithoutExt = filename.split('.')[0];
  
  // Split by underscore
  const parts = nameWithoutExt.split('_');
  
  // First part is the email identifier
  let emailPart = parts[0] || null;
  
  if (!emailPart) return null;
  
  // Check if email spans multiple parts (e.g., user_at_example.com)
  // Look for "at" in second or third position
  if (parts.length > 2 && (parts[1] === 'at' || parts[1] === 'AT')) {
    // Format: user_at_example.com → user@example.com
    emailPart = `${parts[0]}@${parts[2]}`;
  } else if (emailPart.includes('-at-')) {
    // Format: user-at-example.com → user@example.com
    emailPart = emailPart.replace('-at-', '@');
  }
  // If @ already exists in filename, keep as is
  
  return emailPart;
}

/**
 * Legacy function - kept for backward compatibility
 * @deprecated Use extractEmailFromFilename instead
 */
function extractUserIdFromFilename(filename) {
  return extractEmailFromFilename(filename);
}

// Main execution
const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('❌ Usage: node uploadLogs.js <logsDirectory> <date>');
  console.error('\nExample:');
  console.error('   node uploadLogs.js ./daily-logs/2026-03-30 2026-03-30');
  console.error('\nEnvironment variables:');
  console.error('   API_URL: API base URL (default: http://localhost:8080)');
  console.error('   ADMIN_TOKEN: Admin authentication token (required)');
  console.error();
  process.exit(1);
}

const [logsDirectory, date] = args;

if (!AUTH_TOKEN) {
  console.error('❌ Error: ADMIN_TOKEN environment variable not set');
  console.error('\nSet it with:');
  console.error('   export ADMIN_TOKEN="your_token_here"');
  console.error('   # OR');
  console.error('   ADMIN_TOKEN="your_token" node uploadLogs.js ...');
  console.error();
  process.exit(1);
}

uploadLogs(logsDirectory, date);
