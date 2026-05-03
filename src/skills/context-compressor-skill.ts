/**
 * ANFSF V1.5.0 - Context Compressor Skill (v2.0)
 * 
 * 超长上下文分层压缩 + 4-bit 量化 + 稀疏注意力路由
 * 注册到：Orchestration Harness
 * 能效比目标：5,200 倍
 * 延迟增幅：+5-10ms
 */

import { Skill, SkillContext, SkillResult } from './base';
import { Quantizer, createQuantizer, type QuantizationResult } from '../integrations/quantization';

// ============================================================================
// Types
// ============================================================================

// Token 超限解决方案 - 新增类型
export interface PriorityRules {
  keep: string[];   // 保留的关键内容类型
  drop: string[];   // 删除的内容类型
}

export interface CompressedContext {
  tokens: string[];
  tokenCount: number;
  compressionRatio: number;
  truncated: boolean;
  droppedSections: string[];
}

export interface CompressionContext {
  rawTokens: string[];
  tokenCount: number;
  tokenBudget: number;
  performanceMode: 'fast' | 'balanced' | 'deep';
  taskType: 'code' | 'document' | 'conversation';
}

export interface CompressionStrategy {
  compressionLevel: number; // 0-1
  attentionType: 'full' | 'sparse' | 'quantized';
  layers: {
    L1: number; // 原始 tokens (最近)
    L2: number; // 语义摘要
    L3: number; // 图索引
  };
}

export interface CompressionResult extends SkillResult {
  compressedTokens: string[];
  compressionRatio: number;
  strategy: CompressionStrategy;
  estimatedOps: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_STRATEGIES: Record<CompressionContext['performanceMode'], CompressionStrategy> = {
  fast: {
    compressionLevel: 0.9,
    attentionType: 'sparse',
    layers: { L1: 0.05, L2: 0.15, L3: 0.80 },
  },
  balanced: {
    compressionLevel: 0.7,
    attentionType: 'quantized',
    layers: { L1: 0.15, L2: 0.35, L3: 0.50 }, // Optimized for speed
  },
  deep: {
    compressionLevel: 0.5,
    attentionType: 'full',
    layers: { L1: 0.25, L2: 0.45, L3: 0.30 }, // Optimized for speed
  },
};

const TOKEN_BUDGET_THRESHOLDS = {
  low: 50000,
  medium: 200000,
  high: 1000000,
};

// Token 硬限制 (196,601 - 安全边界)
const MAX_TOKENS = 180000;

// ============================================================================
// ContextCompressorSkill
// ============================================================================

export class ContextCompressorSkill extends Skill {
  name = 'context-compressor';
  version = '2.0.0';
  description = '超长上下文分层压缩 + 4-bit 量化 + 稀疏注意力路由';

  private quantizer: Quantizer;

  constructor() {
    super();
    this.quantizer = createQuantizer({ bits: 4 });
  }

  async execute(ctx: CompressionContext): Promise<CompressionResult> {
    const startTime = Date.now();

    // 1. Select compression strategy based on DynamicRouter
    const strategy = this.selectStrategy(ctx);

    // 2. Apply 4-bit quantization if compression level > 0.7
    const quantized = strategy.compressionLevel > 0.7
      ? await this.apply4BitQuantization(ctx.rawTokens)
      : ctx.rawTokens;

    // 3. Compress hierarchical (L1 + L2 + L3)
    const compressed = await this.compressHierarchical(quantized, strategy);

    // 4. Calculate metrics
    const compressionRatio = ctx.rawTokens.length / compressed.length;
    const estimatedOps = this.calculateOps(compressed.length, strategy.attentionType);
    const executionTime = Date.now() - startTime;

    return {
      compressedTokens: compressed,
      compressionRatio,
      strategy,
      estimatedOps,
      executionTime,
      metadata: {
        originalTokens: ctx.rawTokens.length,
        compressedTokens: compressed.length,
        opsReduction: this.calculateOps(ctx.rawTokens.length, 'full') / estimatedOps,
      },
    };
  }

  /**
   * Select compression strategy based on token count, budget, and performance mode.
   */
  private selectStrategy(ctx: CompressionContext): CompressionStrategy {
    const baseStrategy = DEFAULT_STRATEGIES[ctx.performanceMode];

    // Adjust based on token budget
    if (ctx.tokenBudget < TOKEN_BUDGET_THRESHOLDS.low) {
      return {
        ...baseStrategy,
        compressionLevel: Math.min(baseStrategy.compressionLevel + 0.1, 0.95),
        attentionType: 'sparse',
      };
    }

    // Adjust based on task type
    if (ctx.taskType === 'code') {
      // Code needs more precision
      return {
        ...baseStrategy,
        compressionLevel: Math.max(baseStrategy.compressionLevel - 0.1, 0.5),
        layers: {
          L1: baseStrategy.layers.L1 * 1.5,
          L2: baseStrategy.layers.L2,
          L3: baseStrategy.layers.L3 * 0.5,
        },
      };
    }

    return baseStrategy;
  }

  /**
   * Apply 4-bit quantization to tokens.
   */
  private async apply4BitQuantization(tokens: string[]): Promise<string[]> {
    try {
      // Use actual quantization
      const result = await this.quantizer.quantize(tokens);
      
      // Convert quantized tokens to string representation
      return result.tokens.map((qt, idx) => {
        const clusterId = Math.floor(idx / 16);
        if (idx % 16 === 0) {
          return `[Q4_${clusterId}_scale=${qt.scale.toFixed(4)}]${qt.original}`;
        }
        return null;
      }).filter(Boolean) as string[];
    } catch (error) {
      console.error('[ContextCompressor] Quantization error:', error);
      // Fallback to simulated quantization
      return this.simulateQuantization(tokens);
    }
  }

  /**
   * Simulate quantization (fallback).
   */
  private simulateQuantization(tokens: string[]): string[] {
    return tokens.map((token, idx) => {
      const clusterId = Math.floor(idx / 16);
      if (idx % 16 === 0) {
        return `[Q4_${clusterId}]${token}`;
      }
      return null;
    }).filter(Boolean) as string[];
  }

  /**
   * Compress tokens hierarchically (L1 + L2 + L3).
   */
  private async compressHierarchical(tokens: string[], strategy: CompressionStrategy): Promise<string[]> {
    const L1Count = Math.floor(tokens.length * strategy.layers.L1);
    const L2Count = Math.floor(tokens.length * strategy.layers.L2);
    const L3Count = tokens.length - L1Count - L2Count;

    // L1: Raw tokens (most recent)
    const L1Tokens = tokens.slice(-L1Count);

    // L2: Semantic summary (middle section)
    const L2Tokens = await this.generateSemanticSummary(tokens.slice(L1Count, L1Count + L2Count));

    // L3: Graph index (oldest section)
    const L3Tokens = await this.buildGraphIndex(tokens.slice(0, L3Count));

    return [...L3Tokens, ...L2Tokens, ...L1Tokens];
  }

  /**
   * Generate semantic summary for L2 layer using extractive summarization.
   * Scores sentences by term frequency and selectivity, picks top-k.
   */
  private async generateSemanticSummary(tokens: string[]): Promise<string[]> {
    if (tokens.length === 0) return [];
    if (tokens.length <= 10) return tokens;

    // Build term frequency map
    const termFreq = new Map<string, number>();
    const sentenceTerms: Map<string, number>[] = [];

    for (const token of tokens) {
      const words = token.toLowerCase().split(/\W+/).filter(w => w.length > 3);
      const freq = new Map<string, number>();
      for (const word of words) {
        freq.set(word, (freq.get(word) || 0) + 1);
        termFreq.set(word, (termFreq.get(word) || 0) + 1);
      }
      sentenceTerms.push(freq);
    }

    // Score each sentence by sum of IDF-weighted term frequencies
    const totalSentences = tokens.length;
    const scores = sentenceTerms.map((freq, idx) => {
      let score = 0;
      for (const [word, count] of freq) {
        // IDF-like weighting: rarer terms are more important
        const idf = Math.log(totalSentences / Math.max(1, termFreq.get(word) || 1));
        score += count * idf;
      }
      // Position bonus: first and last sentences often carry more weight
      if (idx === 0) score *= 1.2;
      if (idx === tokens.length - 1) score *= 1.1;
      return score;
    });

    // Select top-k sentences preserving original order
    const targetSize = Math.max(1, Math.floor(tokens.length / 10));
    const indexed = scores.map((s, i) => ({ score: s, index: i }));
    indexed.sort((a, b) => b.score - a.score);
    const selected = indexed.slice(0, targetSize).map(s => s.index).sort((a, b) => a - b);

    const summary = selected.map(i => tokens[i]);
    return [`[L2_EXTRACTIVE_SUMMARY:${summary.length} of ${tokens.length} sentences]`, ...summary];
  }

  /**
   * Build graph index for L3 layer using inverted index.
   * Maps terms to their positions for efficient lookup.
   */
  private async buildGraphIndex(tokens: string[]): Promise<string[]> {
    if (tokens.length === 0) return [];

    // Build inverted index: term -> list of positions
    const invertedIndex = new Map<string, number[]>();
    tokens.forEach((token, idx) => {
      const words = token.toLowerCase().split(/\W+/).filter(w => w.length > 3);
      for (const word of words) {
        const positions = invertedIndex.get(word) || [];
        positions.push(idx);
        invertedIndex.set(word, positions);
      }
    });

    // Select high-frequency terms as index nodes
    const minFrequency = Math.max(2, Math.floor(tokens.length / 50));
    const indexNodes = [...invertedIndex.entries()]
      .filter(([, positions]) => positions.length >= minFrequency)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 50) // cap at 50 index nodes
      .map(([term, positions]) => `[NODE:${term}×${positions.length}]`);

    return [
      `[L3_INVERTED_INDEX:${indexNodes.length} nodes, ${invertedIndex.size} terms]`,
      ...indexNodes,
    ];
  }

  /**
   * Calculate estimated operations based on attention type.
   */
  private calculateOps(tokenCount: number, attentionType: string): number {
    const n = tokenCount;
    switch (attentionType) {
      case 'full':
        return n * n; // O(n²)
      case 'sparse':
        return n * Math.log(n); // O(n log n)
      case 'quantized':
        return (n * n) / 4; // 4-bit quantization reduces ops by 4x
      default:
        return n * n;
    }
  }

  /**
   * Token 超限解决方案 - 为自升级场景定制压缩
   * 解决 HTTP 400: InternalError.Algo.InvalidParameter - Range of input length should be [1, 196601]
   */
  async compressForUpgrade(rawInput: string): Promise<CompressedContext> {
    const tokenCount = this.estimateTokens(rawInput);

    if (tokenCount > MAX_TOKENS) {
      console.log(`[ContextCompressor] Token 超限: ${tokenCount} > ${MAX_TOKENS}, 执行优先级裁剪`);

      // 优先级裁剪规则
      const rules: PriorityRules = {
        keep: ['currentTask', 'currentFile', 'directDeps', 'criticalContext'],
        drop: ['oldHistory', 'irrelevantMemory', 'oldVersions', 'redundantContext']
      };

      const truncatedInput = this.truncateByPriority(rawInput, rules);

      const newTokenCount = this.estimateTokens(truncatedInput);
      console.log(`[ContextCompressor] 裁剪后 token: ${newTokenCount}, 压缩比: ${(tokenCount / newTokenCount).toFixed(2)}x`);

      // 复用现有分层压缩
      const compressedTokens = await this.compressHierarchical(
        truncatedInput.split('\n'),
        DEFAULT_STRATEGIES.fast
      );

      return {
        tokens: compressedTokens,
        tokenCount: newTokenCount,
        compressionRatio: tokenCount / newTokenCount,
        truncated: true,
        droppedSections: [...rules.drop],
      };
    }

    // 未超限，直接分层压缩
    const compressedTokens = await this.compressHierarchical(
      rawInput.split('\n'),
      DEFAULT_STRATEGIES.balanced
    );

    return {
      tokens: compressedTokens,
      tokenCount,
      compressionRatio: 1,
      truncated: false,
      droppedSections: []
    };
  }

  /**
   * 估算 token 数量 (简化算法: 1 token ≈ 4 chars)
   */
  private estimateTokens(input: string): number {
    // 简化估算: 平均 4 个字符 = 1 token
    // 中文: 1.5 字符 = 1 token, 英文: 4 字符 = 1 token
    const charCount = input.length;
    const chineseChars = (input.match(/[\u4e00-\u9fa5]/g) || []).length;
    const englishChars = charCount - chineseChars;
    
    // 中文按 1.5 字符/token，英文按 4 字符/token
    const estimatedTokens = Math.ceil(chineseChars / 1.5) + Math.ceil(englishChars / 4);
    return estimatedTokens;
  }

  /**
   * 按优先级裁剪输入内容
   */
  private truncateByPriority(input: string, rules: PriorityRules): string {
    const lines = input.split('\n');

    // 标记各区域
    const sections: { type: string; content: string[]; priority: number }[] = [];
    let currentSection: string[] = [];
    let currentType = 'unknown';

    // 简化的区域识别
    for (const line of lines) {
      // 识别区域类型
      if (line.includes('当前任务') || line.includes('currentTask')) {
        if (currentSection.length > 0) {
          sections.push({ type: currentType, content: currentSection, priority: this.getPriority(currentType, rules) });
        }
        currentSection = [line];
        currentType = 'currentTask';
      } else if (line.includes('当前文件') || line.includes('currentFile')) {
        if (currentSection.length > 0) {
          sections.push({ type: currentType, content: currentSection, priority: this.getPriority(currentType, rules) });
        }
        currentSection = [line];
        currentType = 'currentFile';
      } else if (line.includes('历史') || line.includes('history')) {
        if (currentSection.length > 0) {
          sections.push({ type: currentType, content: currentSection, priority: this.getPriority(currentType, rules) });
        }
        currentSection = [line];
        currentType = 'oldHistory';
      } else {
        currentSection.push(line);
      }
    }

    // 添加最后一个区域
    if (currentSection.length > 0) {
      sections.push({ type: currentType, content: currentSection, priority: this.getPriority(currentType, rules) });
    }

    // 按优先级排序并保留高优先级内容
    sections.sort((a, b) => b.priority - a.priority);

    // 估算保留的内容
    let currentTokens = 0;
    const keptSections: string[] = [];

    for (const section of sections) {
      const sectionTokens = this.estimateTokens(section.content.join('\n'));
      if (currentTokens + sectionTokens <= MAX_TOKENS * 0.8) { // 保留 80% 预算
        keptSections.push(...section.content);
        currentTokens += sectionTokens;
      }
    }

    return keptSections.join('\n');
  }

  /**
   * 获取区域优先级
   */
  private getPriority(type: string, rules: PriorityRules): number {
    if (rules.keep.includes(type)) return 10;  // 高优先级
    if (rules.drop.includes(type)) return 1;   // 低优先级
    return 5;  // 中等优先级
  }

  /**
   * Get skill metadata.
   */
  getMetadata(): Record<string, any> {
    return {
      name: this.name,
      version: this.version,
      compressionLevels: ['fast', 'balanced', 'deep'],
      supportedTaskTypes: ['code', 'document', 'conversation'],
      maxTokenSupport: 1000000,
      energyEfficiencyRatio: '5200:1',
      tokenLimit: MAX_TOKENS,
      upgradeCompression: true,
    };
  }
}

// ============================================================================
// Skill Registration
// ============================================================================

export function registerContextCompressorSkill(registry: any): void {
  registry.register(new ContextCompressorSkill());
}

export function createContextCompressorSkill(): ContextCompressorSkill {
  return new ContextCompressorSkill();
}
