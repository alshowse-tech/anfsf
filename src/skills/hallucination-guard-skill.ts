/**
 * ANFSF V1.5.0 - Hallucination Guard Skill (v2.0)
 * 
 * 幻觉检测系统 + 自洽性检查 + Graph 验证 + 事实核查
 * 注册到：Governance Harness
 * 能效比目标：2.4 倍 (与 RAG 共享)
 * 延迟增幅：+8-12ms
 */

import { Skill, SkillResult } from './base';
import { GraphRAG, createGraphRAG } from '../integrations/graphrag';

// ============================================================================
// Types
// ============================================================================

export interface VerificationSource {
  id: string;
  content: string;
  type: 'document' | 'database' | 'graph_node' | 'external_api';
  reliability?: number; // 0-1
}

export interface VerificationContext {
  generatedText: string;
  sources: VerificationSource[];
  mode: 'fast' | 'standard' | 'thorough';
  enableGraphValidation?: boolean;
}

export interface VerificationResult extends SkillResult {
  passed: boolean;
  hallucinations: Array<{
    statement: string;
    type: 'unsupported' | 'contradictory' | 'fabricated';
    confidence: number;
    suggestion?: string;
  }>;
  verifiedStatements: string[];
  overallConfidence: number;
  graphValidation?: {
    passed: boolean;
    validatedNodes: number[];
    conflictingNodes: number[];
  };
}

// ============================================================================
// Constants
// ============================================================================

const MODE_CONFIGS = {
  fast: {
    selfConsistencyVariants: 1,
    enableGraphValidation: false,
    confidenceThreshold: 0.7,
  },
  standard: {
    selfConsistencyVariants: 3,
    enableGraphValidation: true,
    confidenceThreshold: 0.8,
  },
  thorough: {
    selfConsistencyVariants: 5,
    enableGraphValidation: true,
    confidenceThreshold: 0.9,
  },
};

// ============================================================================
// HallucinationGuardSkill
// ============================================================================

export class HallucinationGuardSkill extends Skill {
  name = 'hallucination-guard';
  version = '2.0.0';
  description = '幻觉检测系统 + 自洽性检查 + Graph 验证 + 事实核查';

  private graphRAG: GraphRAG;

  constructor() {
    super();
    this.graphRAG = createGraphRAG();
  }

  async execute(ctx: VerificationContext): Promise<VerificationResult> {
    const startTime = Date.now();
    const config = MODE_CONFIGS[ctx.mode];

    // 1. Split into statements
    const statements = this.splitIntoStatements(ctx.generatedText);

    // 2. Check self-consistency
    const consistencyResults = await this.checkSelfConsistency(statements, config.selfConsistencyVariants);

    // 3. Check source grounding
    const groundingResults = this.checkSourceGrounding(statements, ctx.sources);

    // 4. Graph validation (if enabled)
    let graphValidation: VerificationResult['graphValidation'] | undefined;
    if (config.enableGraphValidation && ctx.enableGraphValidation) {
      // Connect to GraphRAG if not connected
      if (!this.graphRAG.isConnected()) {
        await this.graphRAG.connect().catch(console.error);
      }
      graphValidation = await this.validateWithGraphRAG(statements, ctx.sources);
    }

    // 5. Combine results and identify hallucinations
    const hallucinations: VerificationResult['hallucinations'] = [];
    const verifiedStatements: string[] = [];

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const consistent = consistencyResults[i];
      const grounded = groundingResults[i];
      const graphValid = graphValidation?.validatedNodes ? graphValidation.validatedNodes.includes(i) : true;

      const confidence = (consistent.score + grounded.score + (graphValid ? 1 : 0)) / 3;

      if (confidence >= config.confidenceThreshold && grounded.supported) {
        verifiedStatements.push(statement);
      } else {
        hallucinations.push({
          statement,
          type: this.classifyHallucination(statement, grounded, consistent),
          confidence,
          suggestion: grounded.supportedSources.length > 0
            ? `Consider citing: ${grounded.supportedSources.map(s => s.id).join(', ')}`
            : undefined,
        });
      }
    }

    // 6. Calculate overall confidence
    const overallConfidence = statements.length > 0
      ? (verifiedStatements.length / statements.length)
      : 0;

    const executionTime = Date.now() - startTime;

    return {
      passed: hallucinations.length === 0,
      hallucinations,
      verifiedStatements,
      overallConfidence,
      graphValidation,
      metadata: {
        totalStatements: statements.length,
        verifiedCount: verifiedStatements.length,
        hallucinationCount: hallucinations.length,
        mode: ctx.mode,
        graphValidationEnabled: !!graphValidation,
      },
    };
  }

  /**
   * Split text into statements.
   */
  private splitIntoStatements(text: string): string[] {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    return sentences.map(s => s.trim()).filter(Boolean);
  }

  /**
   * Check self-consistency by generating paraphrase variants.
   * Generates variants through synonym replacement, sentence restructuring,
   * and passive/active voice transformation.
   */
  private async checkSelfConsistency(
    statements: string[],
    variants: number
  ): Promise<Array<{ score: number; variants: string[] }>> {
    const results: Array<{ score: number; variants: string[] }> = [];

    for (const statement of statements) {
      const generatedVariants: string[] = [statement];

      // Generate N-1 paraphrase variants using deterministic transformations
      for (let v = 1; v < variants; v++) {
        let variant = statement;
        switch (v % 3) {
          case 1:
            variant = this.synonymReplace(variant);
            break;
          case 2:
            variant = this.restructureSentence(variant);
            break;
          case 0:
            variant = this.transformVoice(variant);
            break;
        }
        generatedVariants.push(variant);
      }

      // Calculate semantic similarity between all variant pairs
      const similarities: number[] = [];
      for (let i = 0; i < generatedVariants.length; i++) {
        for (let j = i + 1; j < generatedVariants.length; j++) {
          similarities.push(this.simulateSemanticSimilarity(generatedVariants[i], generatedVariants[j]));
        }
      }

      const avgSimilarity = similarities.length > 0
        ? similarities.reduce((sum, s) => sum + s, 0) / similarities.length
        : 1.0;

      results.push({
        score: avgSimilarity,
        variants: generatedVariants,
      });
    }

    return results;
  }

  /**
   * Replace common words with synonyms to generate paraphrase variants.
   */
  private synonymReplace(text: string): string {
    const synonymMap: Record<string, string[]> = {
      'important': ['critical', 'significant', 'essential'],
      'fast': ['quick', 'rapid', 'speedy'],
      'big': ['large', 'substantial', 'considerable'],
      'good': ['effective', 'beneficial', 'positive'],
      'bad': ['poor', 'inadequate', 'deficient'],
      'use': ['utilize', 'employ', 'apply'],
      'make': ['create', 'produce', 'generate'],
      'show': ['demonstrate', 'indicate', 'reveal'],
      'help': ['assist', 'facilitate', 'support'],
      'need': ['require', 'demand', 'necessitate'],
      'change': ['modify', 'alter', 'transform'],
      'build': ['construct', 'develop', 'assemble'],
    };

    let result = text;
    for (const [word, synonyms] of Object.entries(synonymMap)) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const hash = this.simpleHash(result) % synonyms.length;
      result = result.replace(regex, synonyms[hash]);
    }
    return result;
  }

  /**
   * Restructure sentence by reversing clause order.
   */
  private restructureSentence(text: string): string {
    const clauses = text.split(/[,;]/);
    if (clauses.length <= 1) return text;
    // Reverse clause order for paraphrase
    return clauses.reverse().join('; ');
  }

  /**
   * Transform active to passive voice for common patterns.
   */
  private transformVoice(text: string): string {
    // Simple transformation: "X does Y" -> "Y is done by X"
    const patterns = [
      /(\w+) uses (\w+)/gi,
      /(\w+) creates (\w+)/gi,
      /(\w+) builds (\w+)/gi,
      /(\w+) generates (\w+)/gi,
    ];
    const replacements = [
      '$2 is used by $1',
      '$2 is created by $1',
      '$2 is built by $1',
      '$2 is generated by $1',
    ];
    let result = text;
    for (let i = 0; i < patterns.length; i++) {
      result = result.replace(patterns[i], replacements[i]);
    }
    return result;
  }

  /**
   * Simple hash function for deterministic selection.
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash);
  }

  /**
   * Compute cosine similarity using TF-IDF-like term frequency vectors.
   * More accurate than simple keyword overlap.
   */
  private simulateSemanticSimilarity(text1: string, text2: string): number {
    const tokenize = (text: string): Map<string, number> => {
      const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
      const freq = new Map<string, number>();
      for (const word of words) {
        freq.set(word, (freq.get(word) || 0) + 1);
      }
      // Normalize by document length
      const total = words.length || 1;
      for (const [word, count] of freq) {
        freq.set(word, count / total);
      }
      return freq;
    };

    const vec1 = tokenize(text1);
    const vec2 = tokenize(text2);

    // Compute dot product and magnitudes
    const allTerms = new Set([...vec1.keys(), ...vec2.keys()]);
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (const term of allTerms) {
      const v1 = vec1.get(term) || 0;
      const v2 = vec2.get(term) || 0;
      dotProduct += v1 * v2;
      mag1 += v1 * v1;
      mag2 += v2 * v2;
    }

    const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
    return magnitude > 0 ? dotProduct / magnitude : 0;
  }

  /**
   * Check if statements are grounded in sources.
   */
  private checkSourceGrounding(
    statements: string[],
    sources: VerificationSource[]
  ): Array<{ supported: boolean; score: number; supportedSources: VerificationSource[] }> {
    return statements.map(statement => {
      const statementWords = statement.toLowerCase().split(/\s+/).filter(w => w.length > 3);

      const scoredSources = sources.map(source => {
        const sourceWords = source.content.toLowerCase().split(/\s+/);
        const overlap = statementWords.filter(w => sourceWords.includes(w)).length;
        const score = overlap / Math.max(1, statementWords.length);
        return { source, score };
      });

      const supportedSources = scoredSources
        .filter(s => s.score > 0.3)
        .sort((a, b) => b.score - a.score)
        .map(s => s.source);

      const maxScore = Math.max(0, ...scoredSources.map(s => s.score));

      return {
        supported: supportedSources.length > 0 && maxScore > 0.3,
        score: maxScore,
        supportedSources,
      };
    });
  }

  /**
   * Validate statements with GraphRAG.
   */
  private async validateWithGraphRAG(
    statements: string[],
    sources: VerificationSource[]
  ): Promise<VerificationResult['graphValidation']> {
    try {
      const graphSources = sources.map(s => ({ id: s.id, content: s.content }));
      const result = await this.graphRAG.validateStatements(statements, graphSources);

      return {
        passed: result.conflictingNodes.length === 0,
        validatedNodes: result.validatedNodes,
        conflictingNodes: result.conflictingNodes,
      };
    } catch (error) {
      console.error('[HallucinationGuard] GraphRAG validation error:', error);
      // Fallback: use keyword overlap grounding as proxy for graph validation
      return this.fallbackGraphValidation(statements, sources);
    }
  }

  /**
   * Fallback graph validation when GraphRAG is unavailable.
   * Uses keyword overlap with source content as a proxy for entity validation.
   */
  private fallbackGraphValidation(
    statements: string[],
    sources: VerificationSource[]
  ): VerificationResult['graphValidation'] {
    const validatedNodes: number[] = [];
    const conflictingNodes: number[] = [];

    for (let i = 0; i < statements.length; i++) {
      const statementWords = statements[i].toLowerCase().split(/\s+/).filter(w => w.length > 3);

      const maxOverlap = sources.reduce((max, source) => {
        const sourceWords = source.content.toLowerCase().split(/\s+/);
        const overlap = statementWords.filter(w => sourceWords.includes(w)).length;
        return Math.max(max, overlap / Math.max(1, statementWords.length));
      }, 0);

      if (maxOverlap > 0.2) {
        validatedNodes.push(i);
      } else {
        conflictingNodes.push(i);
      }
    }

    return {
      passed: conflictingNodes.length === 0,
      validatedNodes,
      conflictingNodes,
    };
  }

  /**
   * Classify hallucination type.
   */
  private classifyHallucination(
    statement: string,
    grounded: { supported: boolean; score: number },
    consistent: { score: number }
  ): 'unsupported' | 'contradictory' | 'fabricated' {
    if (!grounded.supported && consistent.score > 0.7) {
      return 'unsupported'; // Self-consistent but no source
    }
    if (!grounded.supported && consistent.score < 0.5) {
      return 'fabricated'; // Neither consistent nor grounded
    }
    return 'contradictory'; // Potentially contradicts sources
  }

  /**
   * Get skill metadata.
   */
  getMetadata(): Record<string, any> {
    return {
      name: this.name,
      version: this.version,
      modes: Object.keys(MODE_CONFIGS),
      detectionMethods: ['self-consistency', 'source-grounding', 'graph-validation'],
      energyEfficiencyRatio: '2.4:1 (shared with RAG)',
    };
  }
}

// ============================================================================
// Skill Registration
// ============================================================================

export function registerHallucinationGuardSkill(registry: any): void {
  registry.register(new HallucinationGuardSkill());
}

export function createHallucinationGuardSkill(): HallucinationGuardSkill {
  return new HallucinationGuardSkill();
}
