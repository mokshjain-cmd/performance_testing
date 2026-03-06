import extract from 'extract-zip';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const unlinkAsync = promisify(fs.unlink);
const rmdirAsync = promisify(fs.rm);

/**
 * Extract a ZIP file to a destination folder
 * @param zipFilePath - Path to the ZIP file
 * @param extractToDir - Directory to extract files to (optional, defaults to same directory as ZIP)
 * @returns Path to the extracted folder
 */
export async function extractZipFile(
  zipFilePath: string,
  extractToDir?: string
): Promise<string> {
  try {
    // Create extraction directory if not provided
    const zipDir = path.dirname(zipFilePath);
    const zipBaseName = path.basename(zipFilePath, path.extname(zipFilePath));
    const extractionPath = extractToDir || path.join(zipDir, `${zipBaseName}_extracted`);

    // Ensure extraction directory exists
    if (!fs.existsSync(extractionPath)) {
      fs.mkdirSync(extractionPath, { recursive: true });
    }

    console.log(`📦 Extracting ZIP: ${zipFilePath}`);
    console.log(`📁 Extraction path: ${extractionPath}`);

    // Extract the ZIP file
    await extract(zipFilePath, { dir: extractionPath });

    console.log(`✅ ZIP extracted successfully to: ${extractionPath}`);

    return extractionPath;
  } catch (error) {
    console.error(`❌ Error extracting ZIP file:`, error);
    throw new Error(`Failed to extract ZIP: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Find a specific file in an extracted folder (recursively)
 * @param dirPath - Directory to search in
 * @param fileName - Name of the file to find (e.g., 'export.xml')
 * @returns Full path to the file, or null if not found
 */
export function findFileInDirectory(dirPath: string, fileName: string): string | null {
  try {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        // Recursively search subdirectories
        const found = findFileInDirectory(fullPath, fileName);
        if (found) return found;
      } else if (file === fileName) {
        // Found the file
        return fullPath;
      }
    }

    return null;
  } catch (error) {
    console.error(`❌ Error searching directory ${dirPath}:`, error);
    return null;
  }
}

/**
 * Delete a directory and all its contents recursively
 * @param dirPath - Path to the directory to delete
 */
export async function deleteDirectory(dirPath: string): Promise<void> {
  try {
    if (fs.existsSync(dirPath)) {
      await rmdirAsync(dirPath, { recursive: true, force: true });
      console.log(`🗑️ Deleted directory: ${dirPath}`);
    }
  } catch (error) {
    console.error(`❌ Error deleting directory ${dirPath}:`, error);
    throw error;
  }
}

/**
 * Delete a file
 * @param filePath - Path to the file to delete
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    if (fs.existsSync(filePath)) {
      await unlinkAsync(filePath);
      console.log(`🗑️ Deleted file: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error deleting file ${filePath}:`, error);
    throw error;
  }
}

/**
 * Extract Apple Health ZIP and find export.xml
 * @param zipFilePath - Path to the uploaded Apple Health ZIP file
 * @returns Object containing path to export.xml and extraction folder
 */
export async function extractAppleHealthZip(zipFilePath: string): Promise<{
  exportXmlPath: string;
  extractedFolder: string;
}> {
  try {
    // Extract the ZIP
    const extractedFolder = await extractZipFile(zipFilePath);

    // Find export.xml in the extracted folder
    const exportXmlPath = findFileInDirectory(extractedFolder, 'export.xml');

    if (!exportXmlPath) {
      throw new Error('export.xml not found in the uploaded ZIP file');
    }

    console.log(`✅ Found export.xml at: ${exportXmlPath}`);

    return {
      exportXmlPath,
      extractedFolder,
    };
  } catch (error) {
    console.error(`❌ Error extracting Apple Health ZIP:`, error);
    throw error;
  }
}
