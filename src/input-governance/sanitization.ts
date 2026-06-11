/**
 * ANFSF L1 - Input Sanitization
 *
 * Sanitizes PRD text before sending to LLM: strips control characters,
 * validates encoding, enforces max length, detects prompt injection patterns.
 */

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_LENGTH = 100_000; // 100KB

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(previous|all|above|these)\s+(instruction|prompt|rule|system|message|content)/i,
  /you\s+are\s+now\s+(a|an|the)\s+(new|different)/i,
  /disregard\s+(previous|all|earlier)\s+(instruction|prompt|rule|directive)/i,
  /system\s*:\s*/i,
  /(?:^|\n)\s*(system|developer|assistant)\s*:\s*/i,
  /execute\s+(this|the)\s+(following|command|code|script)/i,
  /override\s+(previous|all|system|default)\s+(settings|config|instruction|prompt)/i,
  /pretend\s+to\s+be/i,
  /act\s+as\s+if\s+you\s+are/i,
  /forget\s+(your|all)\s+(previous|earlier|prior)\s+(instruction|prompt|training|context|memory)/i,
  /dan\s+(mode|prompt)/i,
];

const DANGEROUS_CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
const HTML_TAGS = /<[^>]+>/g;
const HTML_ENTITIES = /&(amp|lt|gt|quot|apos|nbsp|#\d+|#x[0-9a-fA-F]+);/g;

// ============================================================================
// Sanitization Result
// ============================================================================

export interface SanitizationResult {
  sanitized: string;
  removedChars: number;
  truncated: boolean;
  injectionPatternsFound: string[];
  encodingValid: boolean;
}

// ============================================================================
// Core Functions
// ============================================================================

export function sanitizePRDText(text: string, maxLength: number = DEFAULT_MAX_LENGTH): SanitizationResult {
  let sanitized = text;
  let removedChars = 0;
  let truncated = false;
  const injectionPatternsFound: string[] = [];

  // 1. Validate encoding
  const encodingValid = validateEncoding(sanitized);

  // 2. Detect prompt injection
  const detected = detectPromptInjection(sanitized);
  injectionPatternsFound.push(...detected);

  // 3. Strip HTML tags and decode HTML entities
  sanitized = sanitized.replace(HTML_TAGS, '');
  sanitized = sanitized.replace(HTML_ENTITIES, '');

  // 4. Strip dangerous control characters
  const beforeStrip = sanitized;
  sanitized = sanitized.replace(DANGEROUS_CONTROL_CHARS, '');
  removedChars += beforeStrip.length - sanitized.length;

  // 5. Normalize Unicode (NFC) to prevent normalization attacks
  sanitized = sanitized.normalize('NFC');

  // 6. Normalize line endings
  sanitized = sanitized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 7. Enforce max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
    truncated = true;
  }

  // 8. Trim leading/trailing whitespace
  sanitized = sanitized.trim();

  return {
    sanitized,
    removedChars,
    truncated,
    injectionPatternsFound,
    encodingValid,
  };
}

export function detectPromptInjection(text: string): string[] {
  const found: string[] = [];

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      found.push(match[0].trim().substring(0, 100));
    }
  }

  return [...new Set(found)];
}

export function validateEncoding(text: string): boolean {
  try {
    // Check for valid UTF-8 by encoding/decoding round-trip
    const encoded = new TextEncoder().encode(text);
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(encoded);
    return decoded === text;
  } catch {
    return false;
  }
}
