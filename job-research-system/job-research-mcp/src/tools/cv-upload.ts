/**
 * CV Upload and Parsing Tools
 *
 * Handles file uploads, content extraction from PDFs/DOCX,
 * and saving to database.
 */

import { readFile } from 'fs/promises';
import path from 'path';
import mammoth from 'mammoth';

/**
 * Parse PDF file and extract text content
 */
export async function parsePDF(filePath: string): Promise<string> {
  try {
    // Dynamic import to avoid ESM/CJS issues
    const pdfParse = (await import('pdf-parse')).default;
    const dataBuffer = await readFile(filePath);
    // @ts-expect-error - pdf-parse type definitions are incorrect for ESM
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF file');
  }
}

/**
 * Parse DOCX file and extract text content
 */
export async function parseDOCX(filePath: string): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    console.error('Error parsing DOCX:', error);
    throw new Error('Failed to parse DOCX file');
  }
}

/**
 * Parse text or markdown file
 */
export async function parsePlainText(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, 'utf-8');
  } catch (error) {
    console.error('Error reading text file:', error);
    throw new Error('Failed to read text file');
  }
}

/**
 * Parse uploaded CV file based on file type
 */
export async function parseCV(filePath: string, fileType: string): Promise<string> {
  const extension = path.extname(filePath).toLowerCase();

  switch (extension) {
    case '.pdf':
      return await parsePDF(filePath);
    case '.docx':
      return await parseDOCX(filePath);
    case '.txt':
    case '.md':
      return await parsePlainText(filePath);
    default:
      throw new Error(`Unsupported file type: ${extension}`);
  }
}
