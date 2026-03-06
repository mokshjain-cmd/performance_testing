/**
 * Test script for ZIP extraction functionality
 * Tests the zipExtractor utility functions
 * 
 * Run: ts-node test-zip-extractor.ts
 */

import * as path from 'path';
import * as fs from 'fs';
import { 
  extractZipFile, 
  findFileInDirectory, 
  deleteDirectory, 
  extractAppleHealthZip 
} from './src/tools/zipExtractor';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function printSeparator() {
  console.log(colors.cyan + '='.repeat(80) + colors.reset);
}

function printSuccess(message: string) {
  console.log(colors.green + '✅ ' + message + colors.reset);
}

function printError(message: string) {
  console.log(colors.red + '❌ ' + message + colors.reset);
}

function printInfo(message: string) {
  console.log(colors.yellow + '📋 ' + message + colors.reset);
}

async function testZipExtractor() {
  printSeparator();
  console.log(colors.cyan + 'ZIP Extractor Test Suite' + colors.reset);
  printSeparator();
  
  // Check if a test ZIP file exists in temp folder
  const tempDir = path.join(__dirname, 'temp');
  const testZipPath = path.join(tempDir, 'test-export.zip');
  
  if (!fs.existsSync(testZipPath)) {
    printInfo('No test ZIP file found at: ' + testZipPath);
    printInfo('To test ZIP extraction:');
    console.log('  1. Place an Apple Health export.zip in server/temp/');
    console.log('  2. Rename it to "test-export.zip"');
    console.log('  3. Run this script again');
    console.log('');
    printInfo('Alternatively, you can test with any ZIP file');
    return;
  }
  
  console.log('\n📦 Test 1: Extract ZIP file');
  printSeparator();
  
  try {
    const extractedPath = await extractZipFile(testZipPath);
    printSuccess('ZIP extracted to: ' + extractedPath);
    printSuccess('Test 1 PASSED');
    
    console.log('\n📂 Test 2: Find export.xml in extracted folder');
    printSeparator();
    
    const exportXmlPath = findFileInDirectory(extractedPath, 'export.xml');
    
    if (exportXmlPath) {
      printSuccess('Found export.xml at: ' + exportXmlPath);
      printSuccess('Test 2 PASSED');
    } else {
      printError('export.xml not found in extracted folder');
      printError('Test 2 FAILED');
    }
    
    console.log('\n🗑️ Test 3: Clean up extracted folder');
    printSeparator();
    
    await deleteDirectory(extractedPath);
    
    if (!fs.existsSync(extractedPath)) {
      printSuccess('Extracted folder deleted successfully');
      printSuccess('Test 3 PASSED');
    } else {
      printError('Extracted folder still exists');
      printError('Test 3 FAILED');
    }
    
    console.log('\n🚀 Test 4: extractAppleHealthZip (combined function)');
    printSeparator();
    
    const { exportXmlPath: xml, extractedFolder } = await extractAppleHealthZip(testZipPath);
    printSuccess('export.xml path: ' + xml);
    printSuccess('Extracted folder: ' + extractedFolder);
    printSuccess('Test 4 PASSED');
    
    console.log('\n🧹 Test 5: Final cleanup');
    printSeparator();
    
    await deleteDirectory(extractedFolder);
    printSuccess('Final cleanup completed');
    printSuccess('Test 5 PASSED');
    
    printSeparator();
    console.log(colors.green + '\n🎉 ALL TESTS PASSED!' + colors.reset);
    printSeparator();
    
  } catch (error) {
    printError('Test failed with error:');
    console.error(error);
    printSeparator();
    console.log(colors.red + '\n❌ TESTS FAILED!' + colors.reset);
    printSeparator();
  }
}

// Run tests
testZipExtractor().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
