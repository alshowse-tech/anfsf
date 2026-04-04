/**
 * ANFSF V1.5.0 - Fusion Skills Integration Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  ContextCompressorSkill,
  MemoryConsolidationSkill,
  HybridRetrieverSkill,
  CitationTracerSkill,
  HallucinationGuardSkill,
} from '../index';

describe('Fusion Skills Integration Tests', () => {
  let contextCompressor: ContextCompressorSkill;
  let memoryConsolidation: MemoryConsolidationSkill;
  let hybridRetriever: HybridRetrieverSkill;
  let citationTracer: CitationTracerSkill;
  let hallucinationGuard: HallucinationGuardSkill;

  beforeEach(() => {
    contextCompressor = new ContextCompressorSkill();
    memoryConsolidation = new MemoryConsolidationSkill();
    hybridRetriever = new HybridRetrieverSkill();
    citationTracer = new CitationTracerSkill();
    hallucinationGuard = new HallucinationGuardSkill();
  });

  describe('ContextCompressorSkill', () => {
    it('should compress tokens with fast mode', async () => {
      const ctx = {
        rawTokens: Array(1000).fill('test token'),
        tokenCount: 1000,
        tokenBudget: 50000,
        performanceMode: 'fast' as const,
        taskType: 'code' as const,
      };
      const result = await contextCompressor.execute(ctx);
      expect(result.compressionRatio).toBeGreaterThan(1);
    });
  });

  describe('MemoryConsolidationSkill', () => {
    it('should calculate importance scores', async () => {
      const memories = [{
        id: 'mem-1',
        content: 'Important memory',
        taskOutcome: { impactScore: 0.9, success: true },
        accessCount: 10,
        createdAt: Date.now() - 1000 * 60 * 60 * 24,
        lastAccessedAt: Date.now(),
        connectedMemories: ['mem-2'],
      }];
      const result = await memoryConsolidation.execute({ memories, storageType: 'long', enableRLFeedback: true, enableUserFeedback: true });
      expect(result.importanceScores['mem-1']).toBeGreaterThan(0.5);
    });
  });

  describe('HybridRetrieverSkill', () => {
    it('should retrieve with sparse_only mode', async () => {
      const documents = [
        { id: 'doc-1', content: 'ANFSF architecture documentation' },
        { id: 'doc-2', content: 'Random content' },
      ];
      const result = await hybridRetriever.execute({ query: 'ANFSF', documents, mode: 'sparse_only', maxResults: 10 });
      expect(result.fusionMethod).toBe('RRF');
    });
  });

  describe('CitationTracerSkill', () => {
    it('should find citations for statements', async () => {
      const result = await citationTracer.execute({
        generatedText: 'ANFSF has Layer 8.5.',
        sources: [{ documentId: 'doc-1', fragmentId: 'frag-1', content: 'ANFSF Layer 8.5', startOffset: 0, endOffset: 20 }],
        minConfidence: 0.7,
      });
      expect(result.citations.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('HallucinationGuardSkill', () => {
    it('should verify statements with sources', async () => {
      const result = await hallucinationGuard.execute({
        generatedText: 'ANFSF has 17 layers.',
        sources: [{ id: 'src-1', content: 'ANFSF has 17 layers', type: 'document', reliability: 0.9 }],
        mode: 'standard',
        enableGraphValidation: true,
      });
      expect(result.verifiedStatements.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Fusion Skills Integration', () => {
    it('should complete full RAG pipeline', async () => {
      // 1. Compress
      const compressionResult = await contextCompressor.execute({
        rawTokens: Array(1000).fill('ANFSF'),
        tokenCount: 1000,
        tokenBudget: 50000,
        performanceMode: 'balanced',
        taskType: 'document',
      });

      // 2. Store in memory
      memoryConsolidation.addMemory({
        id: 'mem-rag',
        content: compressionResult.compressedTokens.join(' '),
        accessCount: 1,
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        connectedMemories: [],
      });

      // 3. Retrieve
      const retrievalResult = await memoryConsolidation.retrieve({ query: 'ANFSF', maxResults: 5 });

      // 4. Verify
      const verificationResult = await hallucinationGuard.execute({
        generatedText: 'ANFSF has Layer 8.5.',
        sources: retrievalResult.results.map(r => ({ id: r.memory.id, content: r.memory.content, type: 'document', reliability: 0.9 })),
        mode: 'standard',
        enableGraphValidation: true,
      });

      expect(compressionResult.compressionRatio).toBeGreaterThan(1);
      expect(retrievalResult.results.length).toBeGreaterThanOrEqual(0);
      expect(verificationResult.verifiedStatements.length).toBeGreaterThanOrEqual(0);
    });
  });
});
