import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';

/**
 * Google Cloud Storage Service
 * Handles file uploads and signed URL generation
 */
class StorageService {
  private storage: Storage;
  private bucketName: string;

  constructor() {
    console.log('🔧 Initializing StorageService...');
    console.log('📋 Environment check:');
    console.log('  - GCP_PROJECT_ID:', process.env.GCP_PROJECT_ID || '❌ NOT SET');
    console.log('  - GCS_BUCKET_NAME:', process.env.GCS_BUCKET_NAME || '❌ NOT SET');
    console.log('  - GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS || '❌ NOT SET');
    
    // Initialize Google Cloud Storage
    // For local development, set GOOGLE_APPLICATION_CREDENTIALS env var
    // For Cloud Run, authentication is automatic
    this.storage = new Storage({
      projectId: process.env.GCP_PROJECT_ID,
      // Credentials will be automatically loaded from:
      // 1. GOOGLE_APPLICATION_CREDENTIALS environment variable
      // 2. Cloud Run service account (in production)
      ...(process.env.GCP_CREDENTIALS && {
        credentials: JSON.parse(process.env.GCP_CREDENTIALS)
      })
    });

    this.bucketName = process.env.GCS_BUCKET_NAME || 'performance-testing-device-logs';
    
    console.log(`✅ Storage Service initialized with bucket: ${this.bucketName}`);
  }

  /**
   * Upload a file to Google Cloud Storage
   * @param filePath - Local file path
   * @param deviceType - Device type (luna, polar, etc.)
   * @param sessionId - Session ID
   * @returns Object with file URL and metadata
   */
  async uploadFile(
    filePath: string,
    deviceType: string,
    sessionId: string
  ): Promise<{ url: string; gsPath: string; fileName: string }> {
    try {
      const fileName = path.basename(filePath);
      const fileExtension = path.extname(fileName);
      
      // Organize files by session and device type
      // Format: sessions/{sessionId}/{deviceType}/{fileName}
      const destination = `sessions/${sessionId}/${deviceType}/${fileName}`;

      console.log(`📤 Uploading ${fileName} to GCS: ${destination}`);

      // Upload file to GCS
      await this.storage.bucket(this.bucketName).upload(filePath, {
        destination: destination,
        metadata: {
          contentType: this.getContentType(fileExtension),
          metadata: {
            deviceType: deviceType,
            sessionId: sessionId,
            uploadedAt: new Date().toISOString()
          }
        },
        // Make file private (require signed URL for access)
        public: false
      });

      // Generate signed URL (valid for 7 days)
      const signedUrl = await this.generateSignedUrl(destination);

      console.log(`✅ File uploaded successfully: ${destination}`);

      return {
        url: signedUrl,
        gsPath: `gs://${this.bucketName}/${destination}`,
        fileName: fileName
      };

    } catch (error) {
      console.error(`❌ Error uploading file to GCS:`, error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a signed URL for downloading a file
   * @param filePath - File path in GCS bucket
   * @param expirationMinutes - URL expiration in minutes (default: 7 days)
   * @returns Signed URL
   */
  async generateSignedUrl(
    filePath: string,
    expirationMinutes: number = 7 * 24 * 60 // 7 days
  ): Promise<string> {
    try {
      const options = {
        version: 'v4' as const,
        action: 'read' as const,
        expires: Date.now() + expirationMinutes * 60 * 1000
      };

      const [url] = await this.storage
        .bucket(this.bucketName)
        .file(filePath)
        .getSignedUrl(options);

      return url;

    } catch (error) {
      console.error(`❌ Error generating signed URL:`, error);
      throw new Error(`Failed to generate signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload multiple device files and return URLs mapped by device type
   * @param files - Array of uploaded files (from multer)
   * @param sessionId - Session ID
   * @returns Object with device types as keys and download URLs as values
   */
  async uploadDeviceFiles(
    files: Express.Multer.File[],
    sessionId: string
  ): Promise<Record<string, string>> {
    try {
      console.log(`🔧 StorageService.uploadDeviceFiles called with ${files.length} files`);
      const rawFiles: Record<string, string> = {};

      // Upload all files in parallel
      const uploadPromises = files.map(async (file) => {
        const deviceType = file.fieldname; // luna, polar, etc.
        console.log(`📤 Starting upload for ${deviceType}: ${file.filename}`);
        const result = await this.uploadFile(file.path, deviceType, sessionId.toString());
        
        // Store the signed URL for this device type
        rawFiles[deviceType] = result.url;
        
        console.log(`✅ ${deviceType}: ${result.fileName} uploaded, URL: ${result.url.substring(0, 100)}...`);
      });

      await Promise.all(uploadPromises);

      console.log(`✅ All device files uploaded for session ${sessionId}`);
      console.log(`📦 Returning rawFiles:`, Object.keys(rawFiles));
      return rawFiles;

    } catch (error) {
      console.error(`❌ Error in uploadDeviceFiles:`, error);
      console.error('Error details:', error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Delete a file from GCS
   * @param filePath - File path in GCS bucket
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      await this.storage.bucket(this.bucketName).file(filePath).delete();
      console.log(`🗑️ File deleted: ${filePath}`);
    } catch (error) {
      console.error(`❌ Error deleting file from GCS:`, error);
      throw error;
    }
  }

  /**
   * Delete all files for a session
   * @param sessionId - Session ID
   */
  async deleteSessionFiles(sessionId: string): Promise<void> {
    try {
      const prefix = `sessions/${sessionId}/`;
      const [files] = await this.storage.bucket(this.bucketName).getFiles({ prefix });

      console.log(`🗑️ Deleting ${files.length} files for session ${sessionId}`);

      const deletePromises = files.map(file => file.delete());
      await Promise.all(deletePromises);

      console.log(`✅ All files deleted for session ${sessionId}`);
    } catch (error) {
      console.error(`❌ Error deleting session files:`, error);
      throw error;
    }
  }

  /**
   * Get content type based on file extension
   * @param extension - File extension
   * @returns Content type
   */
  private getContentType(extension: string): string {
    const contentTypes: Record<string, string> = {
      '.csv': 'text/csv',
      '.CSV': 'text/csv',
      '.txt': 'text/plain',
      '.TXT': 'text/plain',
      '.json': 'application/json'
    };

    return contentTypes[extension] || 'application/octet-stream';
  }

  /**
   * Check if bucket exists and is accessible
   */
  async verifyBucket(): Promise<boolean> {
    try {
      const [exists] = await this.storage.bucket(this.bucketName).exists();
      
      if (!exists) {
        console.warn(`⚠️ Bucket ${this.bucketName} does not exist`);
        return false;
      }

      console.log(`✅ Bucket ${this.bucketName} is accessible`);
      return true;
    } catch (error) {
      console.error(`❌ Error checking bucket:`, error);
      return false;
    }
  }

  /**
   * Create bucket if it doesn't exist
   */
  async createBucketIfNotExists(): Promise<void> {
    try {
      const [exists] = await this.storage.bucket(this.bucketName).exists();
      
      if (!exists) {
        console.log(`📦 Creating bucket: ${this.bucketName}`);
        await this.storage.createBucket(this.bucketName, {
          location: 'US',
          storageClass: 'STANDARD'
        });
        console.log(`✅ Bucket created: ${this.bucketName}`);
      }
    } catch (error) {
      console.error(`❌ Error creating bucket:`, error);
      throw error;
    }
  }
}

// Export singleton instance (created after .env is loaded)
export const storageService = new StorageService();
export default storageService;
