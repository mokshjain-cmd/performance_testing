# Google Cloud Storage Setup Guide

## Overview

Device log files uploaded by users are now automatically stored in Google Cloud Storage (GCS) with signed download URLs stored in the database. This provides:
- **Scalable storage** for large files
- **Secure file access** via time-limited signed URLs
- **Automatic file management** when sessions are deleted
- **Cost-effective** long-term storage

---

## File Storage Structure

Files are organized in GCS as:
```
gs://performance-testing-device-logs/
  └── sessions/
      └── {sessionId}/
          ├── luna/
          │   └── luna_userId_timestamp.csv
          ├── polar/
          │   └── polar_userId_timestamp.csv
          └── ... other devices
```

---

## Database Schema

Session documents now include a `rawFiles` field:

```typescript
{
  _id: ObjectId("..."),
  userId: ObjectId("..."),
  activityType: "running",
  startTime: ISODate("2026-02-25T10:00:00Z"),
  endTime: ISODate("2026-02-25T11:00:00Z"),
  devices: [...],
  rawFiles: {
    "luna": "https://storage.googleapis.com/bucket/sessions/123/luna/file.csv?...",
    "polar": "https://storage.googleapis.com/bucket/sessions/123/polar/file.csv?..."
  },
  ...
}
```

**Signed URLs are valid for 7 days** and can be regenerated if needed.

---

## Setup Instructions

### 1. Create a Google Cloud Project

```bash
# Set project ID
export GCP_PROJECT_ID="performance-testing-platform"

# Create project (or use existing)
gcloud projects create $GCP_PROJECT_ID

# Set as active project
gcloud config set project $GCP_PROJECT_ID
```

### 2. Enable Required APIs

```bash
# Enable Cloud Storage API
gcloud services enable storage-api.googleapis.com
gcloud services enable storage-component.googleapis.com
```

### 3. Create Storage Bucket

```bash
# Create bucket with standard storage class
gsutil mb -p $GCP_PROJECT_ID -c STANDARD -l US gs://performance-testing-device-logs/

# Set bucket lifecycle policy (optional - auto-delete old files)
cat > lifecycle.json <<EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 365}
      }
    ]
  }
}
EOF

gsutil lifecycle set lifecycle.json gs://performance-testing-device-logs/
```

**Bucket Naming Rules:**
- Must be globally unique
- 3-63 characters
- Lowercase letters, numbers, hyphens, underscores
- Cannot start with "goog"

### 4. Create Service Account (for local development)

```bash
# Create service account
gcloud iam service-accounts create performance-testing-sa \
  --display-name="Performance Testing Service Account" \
  --description="Service account for uploading device logs to GCS"

# Grant Storage Object Admin role
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:performance-testing-sa@${GCP_PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# Create and download key
gcloud iam service-accounts keys create gcs-key.json \
  --iam-account=performance-testing-sa@${GCP_PROJECT_ID}.iam.gserviceaccount.com

# Move key to secure location
mv gcs-key.json ~/.gcp/performance-testing-gcs-key.json
chmod 600 ~/.gcp/performance-testing-gcs-key.json
```

### 5. Configure Environment Variables

**For Local Development:**

Update `server/.env`:
```env
# Google Cloud Storage
GCP_PROJECT_ID=performance-testing-platform
GCS_BUCKET_NAME=performance-testing-device-logs

# Option 1: Set credentials as environment variable (recommended)
# Copy the entire JSON key file content as a single line:
GCP_CREDENTIALS='{"type":"service_account","project_id":"...","private_key":"..."}'

# Option 2: Use gcloud CLI authentication (no credential needed)
# Run: gcloud auth application-default login
```

**For Cloud Run / Docker Deployment:**

Set the credentials as an environment variable:

```bash
# Set environment variables in Cloud Run
gcloud run services update performance-testing-api \
  --set-env-vars "GCP_PROJECT_ID=performance-testing-platform" \
  --set-env-vars "GCS_BUCKET_NAME=performance-testing-device-logs" \
  --set-env-vars "GCP_CREDENTIALS=$(cat /path/to/key.json | tr -d '\n')"
```

Or use Docker:
```bash
# Set as environment variable in docker-compose or docker run
docker run -e GCP_CREDENTIALS="$(cat key.json | tr -d '\n')" ...
```

### 6. Grant Cloud Run Service Account Access

```bash
# Get Cloud Run service account email
SERVICE_ACCOUNT=$(gcloud run services describe performance-testing-api --format='value(spec.template.spec.serviceAccountName)')

# Grant Storage Object Admin role
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/storage.objectAdmin"
```

---

## Testing the Integration

### 1. Test Bucket Access

```bash
# Verify bucket exists
gsutil ls gs://performance-testing-device-logs/

# List files (should be empty initially)
gsutil ls -r gs://performance-testing-device-logs/
```

### 2. Test File Upload (Local)

Start your server and create a session with device files:

```bash
cd server
npm run dev
```

Upload a session via API or frontend. Check logs for:
```
📤 Uploading file.csv to GCS: sessions/123/luna/file.csv
✅ File uploaded successfully: sessions/123/luna/file.csv
✅ All device files uploaded for session 123
```

### 3. Verify Files in GCS

```bash
# List uploaded files
gsutil ls -r gs://performance-testing-device-logs/sessions/

# Check specific session
SESSION_ID="your-session-id"
gsutil ls gs://performance-testing-device-logs/sessions/$SESSION_ID/
```

### 4. Test File Download

Get session data from MongoDB or API:
```bash
curl http://localhost:3000/api/sessions/:sessionId
```

Copy a signed URL from `rawFiles` and test in browser or:
```bash
curl -I "https://storage.googleapis.com/bucket/sessions/.../file.csv?..."
```

Should return `200 OK` with file headers.

---

## Cost Estimation

### Storage Costs (Standard Class, US Region)

| Storage | Price |
|---------|-------|
| First 5 GB | $0 (free tier) |
| 5-50 GB | $0.020 per GB/month |
| 50-500 GB | $0.023 per GB/month |
| 500+ GB | $0.020 per GB/month |

### Network Egress Costs

| Operation | Price |
|-----------|-------|
| First 1 GB | $0 (free tier) |
| Upload (ingress) | FREE |
| Download (egress) to US | $0.12 per GB |
| Download (egress) worldwide | $0.12-$0.23 per GB |

### Class A Operations (uploads, list)
- $0.05 per 10,000 operations
- First 5,000 operations/month FREE

### Class B Operations (reads, signed URLs)
- $0.004 per 10,000 operations
- First 50,000 operations/month FREE

**Example Scenario:**
- 100 sessions/day × 2 files × 5 MB = 1 GB/day
- Monthly storage: ~30 GB = **$0.60/month**
- Monthly uploads: ~6,000 = **FREE** (within free tier)
- Monthly downloads: ~1,000 × 5 MB = **$0.60/month**

**Total Estimated Cost: $1.20/month** for moderate usage

---

## Security Best Practices

### 1. IAM Permissions

Use **principle of least privilege**:
```bash
# For service accounts, only grant specific permissions needed
--role="roles/storage.objectAdmin"  # Can create, read, delete objects
# NOT: --role="roles/storage.admin"  # Too broad
```

### 2. Bucket Security

```bash
# Disable public access (default)
gsutil iam ch -d allUsers:objectViewer gs://performance-testing-device-logs/

# Enable uniform bucket-level access
gsutil uniformbucketlevelaccess set on gs://performance-testing-device-logs/

# Set CORS for frontend access (if needed)
cat > cors-config.json <<EOF
[
  {
    "origin": ["https://yourfrontend.com"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set cors-config.json gs://performance-testing-device-logs/
```

### 3. Signed URL Expiration

Current setting: **7 days** (configurable in `storage.service.ts`)

For shorter expiration:
```typescript
// In storage.service.ts
await this.generateSignedUrl(destination, 60); // 60 minutes
```

### 4. Encryption

GCS encrypts all data at rest by default. For additional security:

```bash
# Use customer-managed encryption keys (CMEK)
gcloud kms keyrings create my-keyring --location=us
gcloud kms keys create my-key --keyring=my-keyring --location=us --purpose=encryption

# Set default encryption on bucket
gsutil encryption set \
  -k projects/$GCP_PROJECT_ID/locations/us/keyRings/my-keyring/cryptoKeys/my-key \
  gs://performance-testing-device-logs/
```

---

## Monitoring & Logging

### 1. Enable Cloud Monitoring

```bash
# Enable Monitoring API
gcloud services enable monitoring.googleapis.com

# View storage metrics in Cloud Console
# https://console.cloud.google.com/monitoring
```

### 2. Set Up Usage Alerts

Create budget alerts at https://console.cloud.google.com/billing/budgets

Example alert thresholds:
- 50% of $10/month
- 90% of $10/month
- 100% of $10/month

### 3. View Access Logs

```bash
# Enable Data Access audit logs
gcloud logging write test-log "Test log entry"

# View GCS access logs
gcloud logging read "resource.type=gcs_bucket" --limit=50
```

---

## Troubleshooting

### Issue: "Cannot access bucket"

**Solution:**
```bash
# Check service account exists
gcloud iam service-accounts list

# Verify IAM permissions
gsutil iam get gs://performance-testing-device-logs/

# Test authentication
gsutil ls gs://performance-testing-device-logs/
```

### Issue: "SignedURL generation failed"

**Solution:**
1. Verify service account has `storage.objectAdmin` role
2. Check that `GCP_PROJECT_ID` is set correctly
3. For local dev, verify `GCP_CREDENTIALS` is set correctly or use gcloud auth

```bash
# Test credentials
gcloud auth list
gcloud auth application-default print-access-token

# Or verify your GCP_CREDENTIALS env var is valid JSON
echo $GCP_CREDENTIALS | jq .
```

### Issue: "Files not uploading"

**Solution:**
1. Check server logs for detailed error messages
2. Verify bucket name matches `.env` configuration
3. Ensure bucket exists: `gsutil ls gs://performance-testing-device-logs/`

```typescript
// Test storage service manually
import storageService from './services/storage.service';

// In a test endpoint
await storageService.verifyBucket(); // Should return true
```

### Issue: "Download link expired"

**Solution:**
Regenerate signed URL:
```typescript
import storageService from './services/storage.service';

const newUrl = await storageService.generateSignedUrl(
  'sessions/123/luna/file.csv',
  7 * 24 * 60 // 7 days
);
```

---

## Migration from Local Storage

If you have existing sessions with local files:

**Option 1: Upload Existing Files**

```bash
# Upload all files in temp/ directory
cd server/temp
for file in *.{csv,CSV,txt,TXT}; do
  # Extract session ID from filename (adjust pattern as needed)
  SESSION_ID=$(echo $file | cut -d'_' -f2)
  DEVICE_TYPE=$(echo $file | cut -d'_' -f1)
  
  gsutil cp $file "gs://performance-testing-device-logs/sessions/$SESSION_ID/$DEVICE_TYPE/$file"
done
```

**Option 2: Update Sessions with GCS URLs**

Create a migration script:
```javascript
// scripts/migrate-to-gcs.js
import Session from '../models/Session';
import storageService from '../services/storage.service';
import fs from 'fs';
import path from 'path';

async function migrateSession(sessionId) {
  const session = await Session.findById(sessionId);
  const tempDir = path.join(process.cwd(), 'temp');
  
  // Find files for this session
  const files = fs.readdirSync(tempDir).filter(f => 
    f.includes(sessionId)
  );
  
  const rawFiles = {};
  for (const file of files) {
    const deviceType = file.split('_')[0];
    const result = await storageService.uploadFile(
      path.join(tempDir, file),
      deviceType,
      sessionId
    );
    rawFiles[deviceType] = result.url;
  }
  
  session.rawFiles = rawFiles;
  await session.save();
  
  console.log(`✅ Migrated session ${sessionId}`);
}

// Run migration
const sessions = await Session.find({ rawFiles: { $exists: false } });
for (const session of sessions) {
  await migrateSession(session._id.toString());
}
```

---

## API Response Example

When creating a session, the response now includes `rawFiles`:

```json
{
  "success": true,
  "data": {
    "_id": "65f7a1b2c3d4e5f6g7h8i9j0",
    "userId": "65f7a1b2c3d4e5f6g7h8i9j1",
    "activityType": "running",
    "startTime": "2026-02-25T10:00:00.000Z",
    "endTime": "2026-02-25T11:00:00.000Z",
    "durationSec": 3600,
    "devices": [
      {
        "deviceId": "65f7a1b2c3d4e5f6g7h8i9j2",
        "deviceType": "luna",
        "firmwareVersion": "1.2.3"
      },
      {
        "deviceId": "65f7a1b2c3d4e5f6g7h8i9j3",
        "deviceType": "polar",
        "firmwareVersion": "2.0.1"
      }
    ],
    "rawFiles": {
      "luna": "https://storage.googleapis.com/performance-testing-device-logs/sessions/65f7a1b2c3d4e5f6g7h8i9j0/luna/luna_user_20260225_100000_110000.csv?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=...",
      "polar": "https://storage.googleapis.com/performance-testing-device-logs/sessions/65f7a1b2c3d4e5f6g7h8i9j0/polar/polar_user_20260225_100000_110000.csv?X-Goog-Algorithm=GOOG4-RSA-SHA256&X-Goog-Credential=..."
    },
    "createdAt": "2026-02-25T10:05:00.000Z",
    "updatedAt": "2026-02-25T10:05:00.000Z"
  }
}
```

---

## Cleanup

To remove files and disable storage:

```bash
# Delete all files in bucket
gsutil -m rm -r gs://performance-testing-device-logs/**

# Delete bucket
gsutil rb gs://performance-testing-device-logs/

# Delete service account
gcloud iam service-accounts delete \
  performance-testing-sa@${GCP_PROJECT_ID}.iam.gserviceaccount.com

# Disable API
gcloud services disable storage-api.googleapis.com
```

---

## Additional Resources

- [GCS Documentation](https://cloud.google.com/storage/docs)
- [Signed URLs Guide](https://cloud.google.com/storage/docs/access-control/signed-urls)
- [Pricing Calculator](https://cloud.google.com/products/calculator)
- [IAM Roles Reference](https://cloud.google.com/storage/docs/access-control/iam-roles)
- [Best Practices](https://cloud.google.com/storage/docs/best-practices)

---

**Last Updated:** February 2026
**Status:** ✅ Production Ready
