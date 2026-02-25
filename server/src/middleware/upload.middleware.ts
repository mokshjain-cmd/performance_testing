import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';

// Ensure temp directory exists
const tempDir = path.join(process.cwd(), 'temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, tempDir);
  },

  filename: (req: Request, file: Express.Multer.File, cb) => {
    const deviceType = file.fieldname; // The device type (e.g., 'luna', 'polar')
    const userId = req.body.userId || 'unknown';
    
    // Format timestamps for filename (remove special characters)
    const startTime = req.body.startTime 
      ? req.body.startTime.replace(/[:-]/g, '').replace('T', '_') 
      : Date.now().toString();
    const endTime = req.body.endTime 
      ? req.body.endTime.replace(/[:-]/g, '').replace('T', '_')
      : Date.now().toString();

    const ext = path.extname(file.originalname);

    // Format: <deviceType>_<userid>_<starttime>_<endtime>.<ext>
    cb(null, `${deviceType}_${userId}_${startTime}_${endTime}${ext}`);
  }
});

// File filter
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  // Accept any file type for raw data files
  // You can add specific file type validation here if needed
  cb(null, true);
};

// Configure multer
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max file size
  }
});

// Middleware to handle multiple device files
export const uploadDeviceFiles = upload.any(); // Max 10 files
