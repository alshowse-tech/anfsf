/**
 * ANFSF Input — PRD Content Merger
 *
 * Merges original PRD text with extracted attachment content into a single enriched text.
 */

import type { ExtractedContent } from './attachment-types';

export function mergePRDContent(originalText: string, extractions: ExtractedContent[]): string {
  const parts: string[] = [];

  if (originalText && originalText.trim()) {
    parts.push(originalText.trim());
  }

  for (const ext of extractions) {
    if (!ext.text || !ext.text.trim()) continue;
    parts.push(`\n\n--- Content from attachment: ${ext.sourceFilename} ---\n\n${ext.text.trim()}`);
  }

  return parts.join('\n');
}
