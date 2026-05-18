import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const uploadTempDir = path.join(process.cwd(), 'temp', 'uploads');

if (!fs.existsSync(uploadTempDir)) {
  fs.mkdirSync(uploadTempDir, { recursive: true });
}


export const uploadChunk = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('\n📦 ===== upload-chunk hit =====');

    const file = req.file;
    const { uploadId, fileName, chunkIndex, totalChunks, fieldname } = req.body;

    console.log('body:', {
      uploadId,
      fileName,
      chunkIndex,
      totalChunks,
      fieldname,
    });

    if (!file) {
      console.log('❌ req.file missing');
      res.status(400).json({
        success: false,
        message: 'No chunk uploaded'
      });
      return;
    }

    console.log('received file:', {
      originalname: file.originalname,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
    });

    const finalPath = path.join(uploadTempDir, `${uploadId}.tmp`);

    console.log('target temp file:', finalPath);

    const chunkBuffer = fs.readFileSync(file.path);

    console.log(
      `writing chunk ${Number(chunkIndex) + 1}/${totalChunks} | bytes=${chunkBuffer.length}`
    );

    fs.appendFileSync(finalPath, chunkBuffer);

    const mergedSize = fs.statSync(finalPath).size;

    console.log('merged file size now:', mergedSize);

    fs.unlinkSync(file.path);

    const isLastChunk = Number(chunkIndex) === Number(totalChunks) - 1;

    console.log('completed:', isLastChunk);

    console.log('✅ chunk stored');
    console.log('===========================\n');

    res.status(200).json({
      success: true,
      data: {
        uploadId,
        fieldname,
        tempPath: finalPath,
        fileName,
        completed: isLastChunk,
      }
    });

  } catch (error) {
    console.error('❌ uploadChunk error:', error);

    res.status(500).json({
      success: false,
      message: 'Chunk upload failed'
    });
  }
};
export const uploadSingle = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const file = req.file || ((req.files as Express.Multer.File[])?.[0]);

    if (!file) {
      res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
      return;
    }

    const uploadId = crypto.randomUUID();
    const tempPath = path.join(uploadTempDir, `${uploadId}.tmp`);

    fs.copyFileSync(file.path, tempPath);

    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    res.status(200).json({
      success: true,
      data: {
        uploadId,
        fieldname: req.body.fieldname || file.fieldname,
        originalname: file.originalname,
        chunked: false,
      },
    });

  } catch (error) {
    console.error('uploadSingle error:', error);

    res.status(500).json({
      success: false,
      message: 'Single upload failed',
    });
  }
};
export const cleanupUploadedFiles = async (req: Request, res: Response) => {
  try {
    const { uploadIds } = req.body;

    for (const id of uploadIds) {
      const filePath = path.join(uploadTempDir, `${id}.tmp`);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.json({ success: true });

  } catch (error) {
    res.status(500).json({ success: false });
  }
};