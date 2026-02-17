import fs from 'fs';
import path from 'path';

const LUNA_CSV_HEADER = 'SySTime,ACC_X,ACC_Y,ACC_Z,G_RawData,R_RawData,IR_RawData,AMB_Rawdata,G_Scale_PPG,R_Scale_PPG,IR_Scale_PPG,g_agin,r_agin,ir_agin,Hr_Qi,Hrs,Spo2_Qi,Spo2';

/**
 * Convert Luna .txt file to .csv by adding the header if missing.
 * If the file is already a .csv or already has a header, it returns the original path.
 * Otherwise, creates a new .csv file with the header prepended.
 * 
 * @param filePath - Path to the Luna file (can be .txt or .csv)
 * @returns Path to the CSV file (either original or newly created)
 */
export async function convertLunaTxtToCsv(filePath: string): Promise<string> {
  const ext = path.extname(filePath).toLowerCase();
  
  // If already a CSV, check if it has a header
  if (ext === '.csv') {
    const firstLine = await getFirstLine(filePath);
    // If it already has a header (contains "SySTime"), return as is
    if (firstLine && firstLine.includes('SySTime')) {
      console.log('✅ Luna CSV already has header, using as is:', filePath);
      return filePath;
    }
    // Otherwise, add header
    console.log('⚠️ Luna CSV missing header, adding it...');
    return addHeaderToCsv(filePath);
  }
  
  // If .txt file, convert to CSV with header
  if (ext === '.txt') {
    console.log('📝 Converting Luna .txt to .csv with header...');
    return addHeaderToCsv(filePath);
  }
  
  // For other extensions, throw error
  throw new Error(`Unsupported Luna file format: ${ext}. Only .txt and .csv files are supported.`);
}

/**
 * Read the first line of a file
 */
async function getFirstLine(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
    let firstLine = '';
    let foundLine = false;
    
    stream.on('data', (chunk: string | Buffer) => {
      if (!foundLine) {
        const chunkStr = typeof chunk === 'string' ? chunk : chunk.toString('utf8');
        const lines = chunkStr.split('\n');
        firstLine = lines[0];
        foundLine = true;
        stream.destroy(); // Stop reading after first line
      }
    });
    
    stream.on('close', () => resolve(firstLine));
    stream.on('error', reject);
  });
}

/**
 * Create a new CSV file with the header prepended
 */
async function addHeaderToCsv(filePath: string): Promise<string> {
  const dir = path.dirname(filePath);
  const basename = path.basename(filePath, path.extname(filePath));
  const newFilePath = path.join(dir, `${basename}_with_header.csv`);
  
  return new Promise((resolve, reject) => {
    const readStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const writeStream = fs.createWriteStream(newFilePath, { encoding: 'utf8' });
    
    // Write header first
    writeStream.write(LUNA_CSV_HEADER + '\n');
    
    // Pipe the rest of the file
    readStream.pipe(writeStream);
    
    writeStream.on('finish', () => {
      console.log('✅ Created Luna CSV with header:', newFilePath);
      resolve(newFilePath);
    });
    
    writeStream.on('error', reject);
    readStream.on('error', reject);
  });
}
