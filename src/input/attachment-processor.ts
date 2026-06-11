/**
 * ANFSF Input — Attachment Processor
 *
 * Routes uploaded files to type-specific extractors:
 * - Images → LLM Vision API (OCR/description)
 * - CSV → Markdown table
 * - TXT/MD → UTF-8 text
 * - PDF → Basic text stream extraction
 */

import { LLMClient } from '../integrations/llm-client';
import {
  type Attachment,
  type ExtractedContent,
  categorizeAttachment,
  AttachmentType,
} from './attachment-types';
import { sanitizeExtractedText } from './sanitization-attachments';

const VISION_OCR_PROMPT = `Extract all text content from this image. If it contains UI mockups, wireframes, or diagrams, describe them in structured text. If it contains tables, convert them to markdown table format. Be thorough — include all visible text and structural information.`;

const MAX_EXTRACTED_TEXT = 50_000;

export class AttachmentProcessor {
  private llm: LLMClient;

  constructor(llm: LLMClient) {
    this.llm = llm;
  }

  async process(attachments: Attachment[]): Promise<ExtractedContent[]> {
    if (attachments.length === 0) return [];

    const results: ExtractedContent[] = [];

    for (const attachment of attachments) {
      try {
        const type = categorizeAttachment(attachment.mimeType, attachment.filename);
        const extracted = await this.extract(attachment, type);
        results.push(extracted);
      } catch (e) {
        // Non-fatal: record error as text content so it appears in the merged output
        results.push({
          sourceId: generateId(),
          sourceFilename: attachment.filename,
          text: `[Error processing ${attachment.filename}: ${e instanceof Error ? e.message : String(e)}]`,
        });
      }
    }

    return results;
  }

  private async extract(attachment: Attachment, type: AttachmentType): Promise<ExtractedContent> {
    switch (type) {
      case 'image':
        return this.processImage(attachment);
      case 'table':
        return this.processCSV(attachment);
      case 'text-document':
        return this.processTextDocument(attachment);
      default:
        throw new Error(`Unknown attachment type: ${type}`);
    }
  }

  private async processImage(attachment: Attachment): Promise<ExtractedContent> {
    const dataUri = this.imageToBase64DataUri(attachment.content, attachment.mimeType);
    const result = await this.llm.chatVision(dataUri, VISION_OCR_PROMPT);

    if (!result.ok) {
      throw new Error(`Vision API failed: ${result.error}`);
    }

    return {
      sourceId: generateId(),
      sourceFilename: attachment.filename,
      text: sanitizeExtractedText(result.content, MAX_EXTRACTED_TEXT),
    };
  }

  private async processCSV(attachment: Attachment): Promise<ExtractedContent> {
    const text = attachment.content.toString('utf-8');
    const markdownTable = csvToMarkdown(text);

    return {
      sourceId: generateId(),
      sourceFilename: attachment.filename,
      text: sanitizeExtractedText(markdownTable, MAX_EXTRACTED_TEXT),
    };
  }

  private async processTextDocument(attachment: Attachment): Promise<ExtractedContent> {
    const ext = attachment.filename.split('.').pop()?.toLowerCase() || '';

    if (ext === 'pdf') {
      const text = extractPdfText(attachment.content);
      return {
        sourceId: generateId(),
        sourceFilename: attachment.filename,
        text: sanitizeExtractedText(text, MAX_EXTRACTED_TEXT),
      };
    }

    // TXT or MD — direct UTF-8 read
    const text = attachment.content.toString('utf-8');
    return {
      sourceId: generateId(),
      sourceFilename: attachment.filename,
      text: sanitizeExtractedText(text, MAX_EXTRACTED_TEXT),
    };
  }

  private imageToBase64DataUri(buffer: Buffer, mimeType: string): string {
    return `data:${mimeType};base64,${buffer.toString('base64')}`;
  }
}

// ============================================================================
// CSV to Markdown Table
// ============================================================================

function csvToMarkdown(csvText: string): string {
  const lines = csvText.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return '(empty CSV)';

  const rows: string[][] = [];
  for (const line of lines) {
    rows.push(parseCSVLine(line));
  }

  const maxCols = Math.max(...rows.map(r => r.length));
  // Normalize all rows to same length
  for (const row of rows) {
    while (row.length < maxCols) row.push('');
  }

  const lines_out: string[] = [];
  // Header
  lines_out.push('| ' + rows[0].join(' | ') + ' |');
  // Separator
  lines_out.push('| ' + rows[0].map(() => '---').join(' | ') + ' |');
  // Data rows
  for (let i = 1; i < rows.length; i++) {
    lines_out.push('| ' + rows[i].join(' | ') + ' |');
  }

  return lines_out.join('\n');
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

// ============================================================================
// PDF Text Extraction (basic)
// ============================================================================

function extractPdfText(buffer: Buffer): string {
  const text = buffer.toString('binary');
  const extracted: string[] = [];

  // Extract text from BT...ET blocks (text objects)
  const textObjectRegex = /BT([\s\S]*?)ET/g;
  let match;

  while ((match = textObjectRegex.exec(text)) !== null) {
    const block = match[1];

    // Extract strings from (...) operators (PDF literal strings)
    const stringRegex = /\(([^)]*)\)/g;
    let strMatch;

    while ((strMatch = stringRegex.exec(block)) !== null) {
      const raw = strMatch[1];
      // Decode PDF escape sequences
      const decoded = raw
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\\\/g, '\\')
        .replace(/\\([()])/g, '$1');
      extracted.push(decoded);
    }

    // Also try hex strings <...>
    const hexRegex = /<([0-9a-fA-F]+)>/g;
    let hexMatch;

    while ((hexMatch = hexRegex.exec(block)) !== null) {
      try {
        const hex = hexMatch[1];
        const bytes = hex.match(/.{2}/g)?.map(b => parseInt(b, 16)) || [];
        const decoded = String.fromCharCode(...bytes.filter(b => b > 0 && b < 128));
        if (decoded.trim()) extracted.push(decoded);
      } catch {
        // Skip invalid hex
      }
    }
  }

  if (extracted.length === 0) {
    return '(PDF text extraction found no text — this may be a scanned/image PDF)';
  }

  return extracted.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// ============================================================================
// Utils
// ============================================================================

function generateId(): string {
  return `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
