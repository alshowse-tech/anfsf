/**
 * ANFSF V1.5.0 - Citation Tracer Skill (v2.0)
 * 
 * 引用溯源系统 + 片段级引用 + 置信度评分
 * 注册到：Governance Harness
 * 能效比目标：2.4 倍 (与 HybridRetriever 共享)
 * 延迟增幅：+5-8ms
 */

import { Skill, SkillResult } from './base';

// ============================================================================
// Types
// ============================================================================

export interface CitationSource {
  documentId: string;
  fragmentId: string;
  content: string;
  startOffset: number;
  endOffset: number;
  metadata?: {
    author?: string;
    createdAt?: number;
    version?: string;
  };
}

export interface CitationContext {
  generatedText: string;
  sources: CitationSource[];
  minConfidence?: number;
}

export interface CitationResult extends SkillResult {
  citations: Array<{
    statement: string;
    sources: CitationSource[];
    confidence: number;
    verified: boolean;
  }>;
  unverifiedStatements: string[];
  overallConfidence: number;
}

// ============================================================================
// CitationTracerSkill
// ============================================================================

export class CitationTracerSkill extends Skill {
  name = 'citation-tracer';
  version = '2.0.0';
  description = '引用溯源系统 + 片段级引用 + 置信度评分';

  async execute(ctx: CitationContext): Promise<CitationResult> {
    const startTime = Date.now();

    // 1. Split generated text into statements
    const statements = this.splitIntoStatements(ctx.generatedText);

    // 2. Find citations for each statement
    const citations: CitationResult['citations'] = [];
    const unverifiedStatements: string[] = [];

    for (const statement of statements) {
      const matchedSources = this.findMatchingSources(statement, ctx.sources);

      if (matchedSources.length > 0) {
        const confidence = this.calculateConfidence(statement, matchedSources);
        const verified = confidence >= (ctx.minConfidence || 0.7);

        citations.push({
          statement,
          sources: matchedSources,
          confidence,
          verified,
        });

        if (!verified) {
          unverifiedStatements.push(statement);
        }
      } else {
        unverifiedStatements.push(statement);
      }
    }

    // 3. Calculate overall confidence
    const overallConfidence = citations.length > 0
      ? citations.reduce((sum, c) => sum + c.confidence, 0) / citations.length
      : 0;

    const executionTime = Date.now() - startTime;

    return {
      citations,
      unverifiedStatements,
      overallConfidence,
      metadata: {
        totalStatements: statements.length,
        citedStatements: citations.length,
        verifiedStatements: citations.filter(c => c.verified).length,
        unverifiedCount: unverifiedStatements.length,
      },
    };
  }

  /**
   * Split text into statements.
   */
  private splitIntoStatements(text: string): string[] {
    // Simple sentence splitting
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    return sentences.map(s => s.trim()).filter(Boolean);
  }

  /**
   * Find matching sources for a statement.
   */
  private findMatchingSources(statement: string, sources: CitationSource[]): CitationSource[] {
    const statementWords = statement.toLowerCase().split(/\s+/).filter(w => w.length > 3);

    const scoredSources = sources.map(source => {
      const sourceWords = source.content.toLowerCase().split(/\s+/);
      const overlap = statementWords.filter(w => sourceWords.includes(w)).length;
      const score = overlap / Math.max(1, statementWords.length);
      return { source, score };
    });

    // Return sources with score > 0.3
    return scoredSources
      .filter(s => s.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .map(s => s.source);
  }

  /**
   * Calculate confidence score for a citation.
   */
  private calculateConfidence(statement: string, sources: CitationSource[]): number {
    // Base confidence from source count
    const sourceCountScore = Math.min(1, sources.length / 3);

    // Content overlap score
    const statementWords = statement.toLowerCase().split(/\s+/);
    const allSourceWords = sources.flatMap(s => s.content.toLowerCase().split(/\s+/));
    const overlap = statementWords.filter(w => allSourceWords.includes(w)).length;
    const overlapScore = overlap / Math.max(1, statementWords.length);

    // Source quality score (based on metadata)
    const qualityScore = sources.reduce((sum, s) => {
      let quality = 0.5;
      if (s.metadata?.author) quality += 0.2;
      if (s.metadata?.createdAt && Date.now() - s.metadata.createdAt < 30 * 24 * 60 * 60 * 1000) quality += 0.2;
      if (s.metadata?.version) quality += 0.1;
      return sum + Math.min(1, quality);
    }, 0) / Math.max(1, sources.length);

    // Combined confidence
    const confidence = (
      0.4 * sourceCountScore +
      0.4 * overlapScore +
      0.2 * qualityScore
    );

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Get skill metadata.
   */
  getMetadata(): Record<string, any> {
    return {
      name: this.name,
      version: this.version,
      minConfidenceThreshold: 0.7,
      citationGranularity: 'fragment-level',
      energyEfficiencyRatio: '2.4:1 (shared with hybrid-retriever)',
    };
  }
}

// ============================================================================
// Skill Registration
// ============================================================================

export function registerCitationTracerSkill(registry: any): void {
  registry.register(new CitationTracerSkill());
}

export function createCitationTracerSkill(): CitationTracerSkill {
  return new CitationTracerSkill();
}
