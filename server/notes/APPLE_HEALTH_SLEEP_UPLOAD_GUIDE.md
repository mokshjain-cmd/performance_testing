# Apple Health Sleep Data Upload Guide

## Overview

This guide explains how to upload Apple Health sleep data via ZIP file, which will be automatically extracted, processed, and cleaned up.

---

## Architecture

### Workflow

1. **User uploads a ZIP file** containing Apple Health export data
2. **Server receives the file** via multer middleware (saved to `temp/` directory)
3. **ZIP is extracted** to a temporary folder (`temp/<filename>_extracted/`)
4. **export.xml is located** within the extracted folder (searched recursively)
5. **AppleHealthSleepParser parses** the export.xml file
6. **Sleep epochs are stored** in the `SleepStageEpoch` collection
7. **Analysis is performed** on the sleep data
8. **Summary collections are updated** (AdminGlobalSummary, FirmwarePerformance, etc.)
9. **GCS upload** (production only) stores the original ZIP file
10. **Cleanup:** Both the ZIP file and extracted folder are deleted from local temp storage

---

## File Structure

### Uploaded ZIP Structure

```
export.zip
└── apple_health_export/          # Folder name may vary
    ├── export.xml                # Main file we need
    ├── export_cda.xml
    └── workout-routes/
```

The system will recursively search for `export.xml` regardless of the folder structure.

---

## API Endpoint

### Create Sleep Session with Apple Health Data

**Endpoint:** `POST /api/sessions/create`

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: multipart/form-data
```

**Form Data:**
```javascript
{
  userId: "60f7b3b3e6b3a72d8c8b4567",
  sessionName: "Sleep Session - 2026-03-06",
  activityType: "sleep",
  metric: "Sleep",
  sleepDate: "2026-03-06",           // Format: YYYY-MM-DD
  benchmarkDeviceType: "apple",      // Important: triggers Apple Health parsing
  firmwareVersion: "1.0.0",
  mobileType: "iOS",                 // Optional: iOS or Android
  
  // Files (use device type as field name)
  apple: <export.zip file>,          // Apple Health ZIP
  luna: <luna_sleep.csv file>        // Optional: Luna device data
}
```

---

## Implementation Details

### 1. ZIP Extraction Utility

Located in: [`src/tools/zipExtractor.ts`](../src/tools/zipExtractor.ts)

**Key Functions:**

- `extractZipFile(zipFilePath, extractToDir?)`: Extracts a ZIP to a folder
- `findFileInDirectory(dirPath, fileName)`: Recursively finds a file (e.g., export.xml)
- `extractAppleHealthZip(zipFilePath)`: Combined extraction + file search
- `deleteDirectory(dirPath)`: Recursively deletes a folder
- `deleteFile(filePath)`: Deletes a single file

### 2. IngestSleepService Updates

Located in: [`src/services/sleep/IngestSleepService.ts`](../src/services/sleep/IngestSleepService.ts)

**Changes:**

1. **Tracks extracted folders** in an array for cleanup
2. **Detects ZIP files** by file extension (`.zip`)
3. **Extracts ZIP and finds export.xml** for Apple Health data
4. **Passes export.xml path to parser** instead of ZIP path
5. **Cleans up extracted folders** in the `finally` block (along with temp files)

**Modified Method:**
```typescript
private static async processBenchmarkSleepData(
  sessionId, userId, filePath, benchmarkDeviceType
): Promise<{ epochsInserted: number; extractedFolder?: string }>
```

Now returns both the count of epochs inserted AND the extracted folder path (if applicable).

### 3. File Upload Middleware

Located in: [`src/middleware/upload.middleware.ts`](../src/middleware/upload.middleware.ts)

**No changes needed** - multer is already configured to accept any file type, including `.zip` files.

**Configuration:**
- Max file size: **100MB**
- Destination: `temp/` directory
- Filename format: `<deviceType>_<metric>_<userId>_<startTime>_<endTime>.<ext>`

---

## Example Usage

### Frontend Code (React)

```typescript
const formData = new FormData();

// Session fields
formData.append('userId', userId);
formData.append('sessionName', 'Sleep Session - 2026-03-06');
formData.append('activityType', 'sleep');
formData.append('metric', 'Sleep');
formData.append('sleepDate', '2026-03-06');
formData.append('benchmarkDeviceType', 'apple');
formData.append('firmwareVersion', '1.0.0');
formData.append('mobileType', 'iOS');

// Files
const appleHealthZip = document.getElementById('apple-file').files[0];
formData.append('apple', appleHealthZip);  // Field name = device type

const lunaFile = document.getElementById('luna-file').files[0];
formData.append('luna', lunaFile);         // Optional: Luna device

// Upload
const response = await fetch('/api/sessions/create', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const data = await response.json();
console.log('Session created:', data.data);
```

### cURL Example

```bash
curl -X POST http://localhost:3000/api/sessions/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "userId=60f7b3b3e6b3a72d8c8b4567" \
  -F "sessionName=Sleep Session - 2026-03-06" \
  -F "activityType=sleep" \
  -F "metric=Sleep" \
  -F "sleepDate=2026-03-06" \
  -F "benchmarkDeviceType=apple" \
  -F "firmwareVersion=1.0.0" \
  -F "mobileType=iOS" \
  -F "apple=@/path/to/export.zip"
```

---

## Cleanup Process

### Automatic Cleanup

The system automatically deletes temporary files in the `finally` block of `ingestSleepSession`:

1. **Temp files** (uploaded ZIP, CSV files):
   ```typescript
   await unlinkAsync(file.path);
   ```

2. **Extracted folders** (from ZIP extraction):
   ```typescript
   await deleteDirectory(folderPath);
   ```

### What Gets Deleted

| File/Folder | Example | When Deleted |
|-------------|---------|--------------|
| Uploaded ZIP | `temp/apple_Sleep_123_20260306_093000_20260307_093000.zip` | After processing (success or failure) |
| Extracted folder | `temp/apple_Sleep_123_20260306_093000_20260307_093000_extracted/` | After processing (success or failure) |
| CSV files | `temp/luna_Sleep_123_20260306_093000_20260307_093000.csv` | After processing (success or failure) |

### Manual Cleanup (if needed)

If the server crashes during processing, you can manually clean up:

```bash
cd server/temp
rm -rf *_extracted/
rm -f *.zip
```

---

## Error Handling

### ZIP Extraction Errors

**Error:** `export.xml not found in the uploaded ZIP file`

**Cause:** The ZIP doesn't contain a valid Apple Health export

**Solution:** Re-export from Apple Health app:
1. Open **Health** app on iPhone
2. Tap **Profile** → **Export All Health Data**
3. Wait for export to complete
4. Share the ZIP file

### Parser Errors

**Error:** `No sleep data found for date: 2026-03-06`

**Cause:** The export.xml doesn't contain sleep data for the specified date

**Solution:** 
- Check if sleep data exists in Apple Health for that date
- Verify the `sleepDate` parameter matches the actual sleep date

---

## GCS Upload (Production Only)

In production (`ENV=production`), the original ZIP file is uploaded to Google Cloud Storage before being deleted:

**Bucket structure:**
```
gs://performance-testing-device-logs/
  └── sessions/
      └── {sessionId}/
          └── apple/
              └── apple_Sleep_123_20260306_093000_20260307_093000.zip
```

**Signed URL validity:** 7 days

**Session document:**
```json
{
  "_id": "60f7b3b3e6b3a72d8c8b4567",
  "metric": "Sleep",
  "rawFiles": {
    "apple": "https://storage.googleapis.com/bucket/sessions/123/apple/file.zip?...",
    "luna": "https://storage.googleapis.com/bucket/sessions/123/luna/file.csv?..."
  }
}
```

---

## Testing

### Local Testing

1. Export your Apple Health data on iPhone
2. Transfer the ZIP to your computer
3. Use the cURL command above or test via the frontend

### Verify Cleanup

```bash
# Before upload
ls -la server/temp

# Upload the ZIP
# ... wait for processing ...

# After upload (should be empty or only contain other sessions' files)
ls -la server/temp
```

### Check Logs

```bash
cd server
npm run dev
```

Look for these log messages:
```
📦 Extracting ZIP: /path/to/file.zip
📁 Extraction path: /path/to/file_extracted
✅ ZIP extracted successfully
✅ Found export.xml at: /path/to/export.xml
[IngestSleepService] Using export.xml from: /path/to/export.xml
✅ Inserted X apple sleep epochs
🗑️ Deleting 1 temp files after sleep ingestion
✅ Deleted temp file: apple_Sleep_123_...zip
🗑️ Deleting 1 extracted folders after sleep ingestion
✅ Deleted extracted folder: /path/to/file_extracted
```

---

## Dependencies

- **extract-zip** (v2.0.1): ZIP extraction
- **fs/promises**: File system operations
- **path**: Path manipulation

---

## Future Enhancements

1. **Support for other ZIP formats**: Garmin, Fitbit, etc.
2. **Parallel ZIP extraction**: Extract multiple ZIPs concurrently
3. **Progress tracking**: Real-time progress updates for large files
4. **Retry mechanism**: Auto-retry on extraction failure
5. **ZIP validation**: Validate ZIP structure before extraction

---

## Troubleshooting

### Issue: `ENOSPC: no space left on device`

**Solution:** Clean up temp directory or increase disk space

```bash
cd server/temp
rm -rf *
```

### Issue: `Permission denied` on cleanup

**Solution:** Check file permissions

```bash
chmod -R 755 server/temp
```

### Issue: ZIP extraction timeout

**Solution:** Increase timeout limit in `extractZipFile` or split large exports

---

## Related Documentation

- [Apple Health Sleep Parser](../src/parsers/sleep/AppleHealthSleepParser.ts)
- [Sleep Ingestion Service](../src/services/sleep/IngestSleepService.ts)
- [ZIP Extraction Utilities](../src/tools/zipExtractor.ts)
- [GCS Setup Guide](./GCS_SETUP.md)

---

**Last Updated:** March 6, 2026  
**Status:** ✅ Production Ready
