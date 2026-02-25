import { Storage } from '@google-cloud/storage';
import dotenv from 'dotenv';

dotenv.config();

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  // Use credentials from environment variable (JSON string)
  // or fall back to Application Default Credentials
  ...(process.env.GCP_CREDENTIALS && {
    credentials: JSON.parse(process.env.GCP_CREDENTIALS)
  })
});

const bucket = storage.bucket(process.env.GCS_BUCKET_NAME || 'performance-testing-device-logs');

export { storage, bucket };