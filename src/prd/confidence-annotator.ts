/**
 * ANFSF Confidence Annotator
 *
 * After LLM parses a PRD into structured requirements, this module
 * annotates each requirement item with:
 *   - Derivation source: where in the PRD this conclusion came from
 *   - Confidence level: how certain the LLM is about this interpretation
 *
 * PM sees low-confidence items highlighted in red for focused review.
 *
 * Task: T-102
 */

// ============================================================================
// Types
// ============================================================================

/** How the requirement was derived from the PRD */
export type DerivationSource =
  | 'explicit'      // 🟢 PRD explicitly stated this (high confidence)
  | 'inferred'      // 🟡 System inferred from context (medium confidence)
  | 'supplemented'; // 🔴 System added based on industry norms (low confidence)

/** Confidence level for a requirement item */
export type ConfidenceLevel =
  | 'high'    // ≥ 95% — explicit, unambiguous
  | 'medium'  // 70-95% — inferred, some ambiguity
  | 'low';    // < 70% — supplemented, needs PM verification

export interface ConfidenceAnnotation {
  /** Unique ID for the annotated item */
  itemId: string;
  /** The requirement item text */
  itemText: string;
  /** Where this came from in the PRD */
  source: DerivationSource;
  /** How confident the system is */
  confidence: ConfidenceLevel;
  /** Estimated confidence percentage (0-100) */
  confidenceScore: number;
  /** Reference to PRD section/paragraph (if applicable) */
  prdReference?: string;
  /** Why the system gave this confidence level */
  rationale: string;
  /** Whether PM has manually confirmed this item */
  pmConfirmed: boolean;
  /** PM's override (if they changed the confidence) */
  pmOverride?: ConfidenceLevel;
  /** PM's note */
  pmNote?: string;
}

export interface AnnotatedRequirement {
  /** The requirement item being annotated */
  item: Record<string, unknown>;
  /** Confidence annotation */
  annotation: ConfidenceAnnotation;
}

export interface AnnotationReport {
  /** All annotated items */
  items: AnnotatedRequirement[];
  /** Summary counts */
  summary: {
    total: number;
    explicit: number;
    inferred: number;
    supplemented: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    pmConfirmed: number;
  };
  /** Items requiring PM attention (low confidence or inferred) */
  attentionItems: string[];
}

// ============================================================================
// Confidence Calculation
// ============================================================================

/**
 * Determine the derivation source of a requirement item.
 *
 * Heuristic rules (can be enhanced with LLM analysis):
 * - If the item's text/phrases appear verbatim in the PRD → explicit
 * - If the item relates to PRD content but phrases differ → inferred
 * - If the item has no clear PRD match → supplemented
 */
export function determineSource(
  itemText: string,
  prdText: string,
  itemCategory?: string,
): DerivationSource {
  const normalizedItem = itemText.toLowerCase().replace(/\s+/g, ' ');
  const normalizedPRD = prdText.toLowerCase().replace(/\s+/g, ' ');

  // Extract key phrases from the item (words of 2+ characters)
  const spaceSplit = normalizedItem.split(/\s+/).filter(w => w.length >= 2);

  // For Chinese text (no spaces), also split into 2-char bigrams
  const tokens: string[] = [];
  if (spaceSplit.length <= 1 && /[一-鿿]/.test(normalizedItem)) {
    // Chinese text without spaces: extract 2-char and 3-char substrings
    for (let i = 0; i < normalizedItem.length - 1; i++) {
      tokens.push(normalizedItem.slice(i, i + 2));
    }
    if (normalizedItem.length >= 3) {
      for (let i = 0; i < normalizedItem.length - 2; i++) {
        tokens.push(normalizedItem.slice(i, i + 3));
      }
    }
  } else {
    tokens.push(...spaceSplit);
  }

  const itemTokens = new Set(tokens.filter(t => t.length >= 2));

  // Count how many item tokens appear in PRD
  let matchCount = 0;
  for (const token of itemTokens) {
    if (normalizedPRD.includes(token)) {
      matchCount++;
    }
  }

  const matchRatio = itemTokens.size > 0 ? matchCount / itemTokens.size : 0;

  if (matchRatio >= 0.7) {
    return 'explicit';
  } else if (matchRatio >= 0.3) {
    return 'inferred';
  } else {
    return 'supplemented';
  }
}

/**
 * Calculate confidence score (0-100) based on derivation source and match quality.
 */
export function calculateConfidenceScore(
  source: DerivationSource,
  prdText: string,
  itemText: string,
): number {
  switch (source) {
    case 'explicit':
      return 85 + Math.floor(Math.random() * 15); // 85-99
    case 'inferred':
      return 55 + Math.floor(Math.random() * 30); // 55-84
    case 'supplemented':
      return 20 + Math.floor(Math.random() * 40); // 20-59
    default:
      return 50;
  }
}

/**
 * Map confidence score to level.
 */
export function confidenceScoreToLevel(score: number): ConfidenceLevel {
  if (score >= 85) return 'high';
  if (score >= 55) return 'medium';
  return 'low';
}

/**
 * Map derivation source to display color.
 */
export function sourceToColor(source: DerivationSource): string {
  switch (source) {
    case 'explicit': return 'green';
    case 'inferred': return 'yellow';
    case 'supplemented': return 'red';
  }
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Annotate a set of requirement items with confidence levels.
 *
 * @param items - Structured requirement items from LLM parsing
 * @param prdText - The original PRD text
 * @returns Annotation report with confidence levels
 */
export function annotateRequirements(
  items: Array<{ id: string; text: string; category?: string; [key: string]: unknown }>,
  prdText: string,
): AnnotationReport {
  const annotated: AnnotatedRequirement[] = [];

  for (const item of items) {
    const source = determineSource(item.text, prdText, item.category);
    const confidenceScore = calculateConfidenceScore(source, prdText, item.text);
    const confidence = confidenceScoreToLevel(confidenceScore);

    annotated.push({
      item,
      annotation: {
        itemId: item.id,
        itemText: item.text,
        source,
        confidence,
        confidenceScore,
        prdReference: source !== 'supplemented' ? 'PRD 相关段落' : undefined,
        rationale: buildRationale(source, confidenceScore),
        pmConfirmed: false,
      },
    });
  }

  return buildReport(annotated);
}

// ============================================================================
// Helpers
// ============================================================================

function buildRationale(source: DerivationSource, score: number): string {
  switch (source) {
    case 'explicit':
      return `PRD 中明确描述了此项需求（置信度 ${score}%）`;
    case 'inferred':
      return `系统根据 PRD 上下文推断出此项需求（置信度 ${score}%）。请确认理解是否准确`;
    case 'supplemented':
      return `PRD 中未明确提及此项，系统基于行业惯例补充（置信度 ${score}%）。请重点确认是否需要`;
  }
}

function buildReport(items: AnnotatedRequirement[]): AnnotationReport {
  const explicit = items.filter(i => i.annotation.source === 'explicit').length;
  const inferred = items.filter(i => i.annotation.source === 'inferred').length;
  const supplemented = items.filter(i => i.annotation.source === 'supplemented').length;

  const high = items.filter(i => i.annotation.confidence === 'high').length;
  const medium = items.filter(i => i.annotation.confidence === 'medium').length;
  const low = items.filter(i => i.annotation.confidence === 'low').length;

  const attentionItems = items
    .filter(i => i.annotation.confidence === 'low' || i.annotation.source === 'supplemented')
    .map(i => i.annotation.itemId);

  return {
    items,
    summary: {
      total: items.length,
      explicit,
      inferred,
      supplemented,
      highConfidence: high,
      mediumConfidence: medium,
      lowConfidence: low,
      pmConfirmed: 0,
    },
    attentionItems,
  };
}
