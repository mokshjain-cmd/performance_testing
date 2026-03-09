# Fix CORS Issue for GCS Downloads

## Problem
When users click the download button for raw files, they get this error:
```
Access to fetch at 'https://storage.googleapis.com/...' from origin 
'https://performance-testing-frontend-326803110924.asia-south2.run.app' 
has been blocked by CORS policy
```

## Root Cause
Google Cloud Storage bucket `benchmarkperformancebucket-1` doesn't have CORS configured to allow requests from the frontend domain.

## Quick Fix (Temporary) ✅
**Already applied** - Updated SessionDetails.tsx to use direct navigation instead of fetch. This bypasses CORS and works immediately.

## Proper Fix (Recommended)

### Step 1: Create CORS Configuration File
```bash
cat > cors-config.json <<EOF
[
  {
    "origin": [
      "https://performance-testing-frontend-326803110924.asia-south2.run.app",
      "http://localhost:5173",
      "http://localhost:3000"
    ],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type", "Content-Length", "Content-Disposition"],
    "maxAgeSeconds": 3600
  }
]
EOF
```

### Step 2: Apply CORS to Your Bucket
```bash
gsutil cors set cors-config.json gs://benchmarkperformancebucket-1
```

### Step 3: Verify CORS Configuration
```bash
gsutil cors get gs://benchmarkperformancebucket-1
```

Expected output:
```json
[
  {
    "origin": [
      "https://performance-testing-frontend-326803110924.asia-south2.run.app",
      "http://localhost:5173",
      "http://localhost:3000"
    ],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type", "Content-Length", "Content-Disposition"],
    "maxAgeSeconds": 3600
  }
]
```

## What This Does
- **origin**: Allows requests from your frontend domains
- **method**: Permits GET (download) and HEAD (metadata check) requests
- **responseHeader**: Specifies which response headers can be exposed
- **maxAgeSeconds**: Browsers cache the CORS preflight response for 1 hour

## Testing
After applying CORS:
1. Open your frontend
2. Navigate to a session with raw files
3. Click the download button
4. File should download without CORS errors

## Troubleshooting

### CORS still not working?
```bash
# Check if CORS is actually applied
gsutil cors get gs://benchmarkperformancebucket-1

# If empty, reapply:
gsutil cors set cors-config.json gs://benchmarkperformancebucket-1
```

### Need to add more domains?
Edit `cors-config.json` and add your domain:
```json
"origin": [
  "https://performance-testing-frontend-326803110924.asia-south2.run.app",
  "https://your-new-domain.com",
  "http://localhost:5173"
]
```

Then reapply:
```bash
gsutil cors set cors-config.json gs://benchmarkperformancebucket-1
```

## Security Note
CORS only controls which domains can access your signed URLs via JavaScript. The signed URLs themselves still require proper authentication (they're time-limited and signed). CORS doesn't make your bucket less secure.
