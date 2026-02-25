/**
 * Test script to verify Google Cloud Storage configuration
 * Run: node test-gcs.js
 */

require('dotenv').config();
const { Storage } = require('@google-cloud/storage');

async function testGCSConnection() {
  console.log('\n🧪 Testing Google Cloud Storage Configuration...\n');
  
  // 1. Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`   GCP_PROJECT_ID: ${process.env.GCP_PROJECT_ID || '❌ NOT SET'}`);
  console.log(`   GCS_BUCKET_NAME: ${process.env.GCS_BUCKET_NAME || '❌ NOT SET'}`);
  console.log(`   GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS || '❌ NOT SET'}`);
  
  if (!process.env.GCP_PROJECT_ID || !process.env.GCS_BUCKET_NAME) {
    console.error('\n❌ Missing required environment variables!');
    process.exit(1);
  }
  
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.warn('\n⚠️  GOOGLE_APPLICATION_CREDENTIALS not set. Will try default credentials.');
  }
  
  // 2. Check if credentials file exists
  const fs = require('fs');
  const path = require('path');
  
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const credPath = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    console.log(`\n📄 Checking credentials file: ${credPath}`);
    
    if (fs.existsSync(credPath)) {
      console.log('   ✅ Credentials file exists');
      
      // Parse and validate JSON
      try {
        const credContent = JSON.parse(fs.readFileSync(credPath, 'utf8'));
        console.log(`   ✅ Valid JSON format`);
        console.log(`   ✅ Project ID: ${credContent.project_id}`);
        console.log(`   ✅ Service Account Email: ${credContent.client_email}`);
        console.log(`   ✅ Type: ${credContent.type}`);
      } catch (error) {
        console.error('   ❌ Invalid JSON format:', error.message);
        process.exit(1);
      }
    } else {
      console.error(`   ❌ Credentials file not found at: ${credPath}`);
      process.exit(1);
    }
  }
  
  // 3. Initialize Storage client
  console.log('\n🔌 Initializing Storage client...');
  let storage;
  
  try {
    storage = new Storage({
      projectId: process.env.GCP_PROJECT_ID,
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
    });
    console.log('   ✅ Storage client initialized');
  } catch (error) {
    console.error('   ❌ Failed to initialize Storage client:', error.message);
    process.exit(1);
  }
  
  // 4. Test bucket access
  console.log('\n🪣 Testing bucket access...');
  const bucketName = process.env.GCS_BUCKET_NAME;
  
  try {
    const [exists] = await storage.bucket(bucketName).exists();
    
    if (exists) {
      console.log(`   ✅ Bucket "${bucketName}" exists and is accessible`);
    } else {
      console.error(`   ❌ Bucket "${bucketName}" does not exist`);
      console.log('\n💡 Create the bucket with:');
      console.log(`   gsutil mb -p ${process.env.GCP_PROJECT_ID} -c STANDARD -l US gs://${bucketName}/`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`   ❌ Error accessing bucket:`, error.message);
    console.log('\n💡 Possible issues:');
    console.log('   - Bucket does not exist');
    console.log('   - Service account lacks permissions');
    console.log('   - Invalid project ID');
    process.exit(1);
  }
  
  // 5. Test bucket permissions
  console.log('\n🔐 Testing bucket permissions...');
  
  try {
    const bucket = storage.bucket(bucketName);
    
    // Try to list files (read permission)
    const [files] = await bucket.getFiles({ maxResults: 1 });
    console.log(`   ✅ Read permission: OK (found ${files.length} files)`);
    
    // Try to get bucket metadata (read permission)
    const [metadata] = await bucket.getMetadata();
    console.log(`   ✅ Bucket location: ${metadata.location}`);
    console.log(`   ✅ Storage class: ${metadata.storageClass}`);
    
  } catch (error) {
    console.error(`   ❌ Permission error:`, error.message);
    console.log('\n💡 Grant required permissions:');
    console.log(`   gcloud projects add-iam-policy-binding ${process.env.GCP_PROJECT_ID} \\`);
    console.log(`     --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \\`);
    console.log(`     --role="roles/storage.objectAdmin"`);
    process.exit(1);
  }
  
  // 6. Test file upload (create a test file)
  console.log('\n📤 Testing file upload...');
  
  try {
    const testFileName = `test-${Date.now()}.txt`;
    const testFilePath = path.join(__dirname, 'temp', testFileName);
    const testContent = `Test file created at ${new Date().toISOString()}`;
    
    // Create temp directory if it doesn't exist
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Write test file
    fs.writeFileSync(testFilePath, testContent);
    console.log(`   ✅ Created test file: ${testFileName}`);
    
    // Upload to GCS
    const destination = `test-uploads/${testFileName}`;
    await storage.bucket(bucketName).upload(testFilePath, {
      destination: destination,
      metadata: {
        contentType: 'text/plain',
        metadata: {
          testFile: 'true',
          timestamp: Date.now().toString()
        }
      }
    });
    
    console.log(`   ✅ Upload successful: gs://${bucketName}/${destination}`);
    
    // Clean up local test file
    fs.unlinkSync(testFilePath);
    console.log(`   ✅ Local test file cleaned up`);
    
  } catch (error) {
    console.error(`   ❌ Upload failed:`, error.message);
    process.exit(1);
  }
  
  // 7. Test signed URL generation
  console.log('\n🔗 Testing signed URL generation...');
  
  try {
    const testFileName = `test-uploads/test-${Date.now()}.txt`;
    const [url] = await storage.bucket(bucketName)
      .file(testFileName)
      .getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000 // 1 hour
      });
    
    console.log(`   ✅ Signed URL generated successfully`);
    console.log(`   📎 URL (valid for 1 hour):`);
    console.log(`   ${url.substring(0, 100)}...`);
    
  } catch (error) {
    console.error(`   ❌ Signed URL generation failed:`, error.message);
    process.exit(1);
  }
  
  // 8. Clean up test file from bucket
  console.log('\n🧹 Cleaning up test files...');
  
  try {
    const [files] = await storage.bucket(bucketName).getFiles({
      prefix: 'test-uploads/'
    });
    
    for (const file of files) {
      await file.delete();
      console.log(`   ✅ Deleted: ${file.name}`);
    }
    
    if (files.length === 0) {
      console.log(`   ℹ️  No test files to clean up`);
    }
    
  } catch (error) {
    console.warn(`   ⚠️  Cleanup warning:`, error.message);
  }
  
  // Success!
  console.log('\n' + '='.repeat(60));
  console.log('✅ ALL TESTS PASSED! 🎉');
  console.log('='.repeat(60));
  console.log('\n✨ Your Google Cloud Storage is configured correctly!');
  console.log(`✨ Files will be uploaded to: gs://${bucketName}/`);
  console.log('✨ Session files will be stored in: sessions/{sessionId}/{deviceType}/\n');
}

// Run tests
testGCSConnection().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
