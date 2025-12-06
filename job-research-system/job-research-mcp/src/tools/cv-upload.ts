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
 * Convert plain text to basic HTML with paragraph formatting
 */
function convertPlainTextToHTML(text: string): string {
  // Split by double newlines for paragraphs
  const paragraphs = text.split(/\n\n+/);

  return paragraphs
    .map(para => {
      // Trim and skip empty paragraphs
      const trimmed = para.trim();
      if (!trimmed) return '';

      // Check if it looks like a heading (all caps, or short line)
      if (trimmed === trimmed.toUpperCase() && trimmed.length < 100 && !trimmed.match(/[.!?]$/)) {
        return `<h2>${trimmed}</h2>`;
      }

      // Convert single newlines within paragraph to <br>
      const withBreaks = trimmed.replace(/\n/g, '<br>');
      return `<p>${withBreaks}</p>`;
    })
    .filter(Boolean)
    .join('\n');
}

/**
 * Parse PDF file and extract text content, convert to HTML
 */
export async function parsePDF(filePath: string): Promise<string> {
  try {
    // Dynamic import to avoid ESM/CJS issues
    const pdfParse = (await import('pdf-parse')).default;
    const dataBuffer = await readFile(filePath);
    // @ts-expect-error - pdf-parse type definitions are incorrect for ESM
    const data = await pdfParse(dataBuffer);
    // Convert plain text to HTML for formatting
    return convertPlainTextToHTML(data.text);
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF file');
  }
}

/**
 * Parse DOCX file and extract HTML content with formatting
 */
export async function parseDOCX(filePath: string): Promise<string> {
  try {
    // Extract HTML to preserve formatting
    const result = await mammoth.convertToHtml({ path: filePath });
    return result.value;
  } catch (error) {
    console.error('Error parsing DOCX:', error);
    // Try reading as plain text if DOCX parsing fails
    console.log('Attempting to read as plain text...');
    try {
      const content = await readFile(filePath, 'utf-8');
      if (content && content.trim().length > 0) {
        return convertPlainTextToHTML(content);
      }
    } catch (textError) {
      console.error('Failed to read as plain text:', textError);
    }
    throw new Error('Failed to parse DOCX file. Please ensure the file is a valid DOCX document or try uploading as PDF or TXT.');
  }
}

/**
 * Parse text or markdown file and convert to HTML
 */
export async function parsePlainText(filePath: string): Promise<string> {
  try {
    const content = await readFile(filePath, 'utf-8');
    // Convert plain text to HTML for formatting
    return convertPlainTextToHTML(content);
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
