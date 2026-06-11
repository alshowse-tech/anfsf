/**
 * ANFSF Input — Attachment Sanitization
 *
 * Validates uploaded files and sanitizes extracted text content.
 * Sniffs magic bytes to verify file content — does NOT trust client-provided MIME.
 */

import { ALL_ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from './attachment-types';

const DANGEROUS_EXTENSIONS = /\.(exe|sh|bat|cmd|ps1|vbs|js|scr|pif|com|msi|dll|sys|drv)$/i;
const DANGEROUS_CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

// Magic bytes for common file types
const MAGIC_BYTES: Array<[RegExp, string]> = [
  [/^\x89PNG\r\n\x1A\n/, 'image/png'],
  [/^\xFF\xD8\xFF/, 'image/jpeg'],
  [/^RIFF....WEBPVP/, 'image/webp'],
  [/^%PDF-/, 'application/pdf'],
];

export interface AttachmentValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateAttachment(filename: string, mimeType: string, size: number): AttachmentValidationResult {
  const errors: string[] = [];

  // Check for dangerous extensions
  if (DANGEROUS_EXTENSIONS.test(filename)) {
    errors.push(`File extension not allowed: ${filename}`);
  }

  // Check MIME type (client-provided — may be spoofed, sniffed later in validateAttachmentMIME)
  if (!ALL_ALLOWED_MIME_TYPES.includes(mimeType)) {
    errors.push(`MIME type not allowed: ${mimeType} (${filename})`);
  }

  // Check file size
  if (size > MAX_FILE_SIZE) {
    errors.push(`File too large: ${(size / 1024 / 1024).toFixed(1)}MB exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit (${filename})`);
  }

  // Check for path traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    errors.push(`Invalid filename (path traversal): ${filename}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate the actual MIME type by sniffing magic bytes.
 * Returns the detected MIME type or falls back to extension-based check.
 * Throws if the detected type is not in the allowlist.
 */
export function validateAttachmentMIME(buffer: Buffer, filename: string): string {
  const header = buffer.toString('binary', 0, Math.min(16, buffer.length));

  // Check magic bytes
  for (const [pattern, mime] of MAGIC_BYTES) {
    if (pattern.test(header)) {
      if (!ALL_ALLOWED_MIME_TYPES.includes(mime)) {
        throw new Error(`Detected file type ${mime} is not allowed for ${filename}`);
      }
      return mime;
    }
  }

  // Fallback: extension-based check for text files (no magic bytes)
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext) {
    const extMap: Record<string, string> = {
      txt: 'text/plain',
      md: 'text/markdown',
      csv: 'text/csv',
    };
    const fallback = extMap[ext];
    if (fallback && ALL_ALLOWED_MIME_TYPES.includes(fallback)) {
      return fallback;
    }
  }

  throw new Error(`Could not detect MIME type for ${filename} — file content does not match any allowed type`);
}

export function sanitizeExtractedText(text: string, maxLength: number = 50_000): string {
  let sanitized = text;

  // Strip dangerous control characters
  sanitized = sanitized.replace(DANGEROUS_CONTROL_CHARS, '');

  // Normalize line endings
  sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Truncate
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized.trim();
}
