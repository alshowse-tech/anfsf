/**
 * ANFSF Input — Attachment Types
 *
 * Shared type definitions for multi-format PRD input (images, tables, documents).
 */

export type AttachmentType = 'image' | 'table' | 'text-document';

export interface Attachment {
  filename: string;
  mimeType: string;
  size: number;
  content: Buffer;
}

export interface ExtractedContent {
  sourceId: string;
  sourceFilename: string;
  text: string;
}

export const ALLOWED_MIME_TYPES: Record<AttachmentType, string[]> = {
  image: ['image/png', 'image/jpeg', 'image/webp'],
  table: ['text/csv'],
  'text-document': ['text/plain', 'text/markdown', 'application/pdf'],
};

export const ALL_ALLOWED_MIME_TYPES = Object.values(ALLOWED_MIME_TYPES).flat();

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file
export const MAX_ATTACHMENT_COUNT = 10;

export function categorizeAttachment(mimeType: string, filename: string): AttachmentType {
  if (ALLOWED_MIME_TYPES.image.includes(mimeType)) return 'image';
  if (ALLOWED_MIME_TYPES.table.includes(mimeType)) return 'table';
  if (ALLOWED_MIME_TYPES['text-document'].includes(mimeType)) return 'text-document';

  // Fallback: categorize by file extension
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return 'image';
  if (ext === 'csv') return 'table';
  if (['txt', 'md', 'pdf'].includes(ext)) return 'text-document';

  throw new Error(`Unsupported file type: ${mimeType} (${filename})`);
}
