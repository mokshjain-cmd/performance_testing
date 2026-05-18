import multer from 'multer';
import path from 'path';
import fs from 'fs';

const chunkDir = path.join(process.cwd(), 'temp', 'chunks');

if (!fs.existsSync(chunkDir)) {
  fs.mkdirSync(chunkDir, { recursive: true });
}

export const uploadChunkMiddleware = multer({
  dest: chunkDir,
  limits: {
    fileSize: 22 * 1024 * 1024,
  }
});