/**
 * ANFSF V1.5.0 - Fusion Skills Index
 */
import { ContextCompressorSkill } from './context-compressor-skill';
import { MemoryConsolidationSkill } from './memory-consolidation-skill';
import { HybridRetrieverSkill } from './hybrid-retriever-skill';
import { CitationTracerSkill } from './citation-tracer-skill';
import { HallucinationGuardSkill } from './hallucination-guard-skill';
export { ContextCompressorSkill, type CompressionContext, type CompressionResult, type CompressionStrategy, } from './context-compressor-skill';
export { CodeQualityGuardSkill, type GuardResult, type StaticAnalysisResult, type SemanticValidationResult, type PerformancePredictionResult, type PolicyCheckResult, } from './code-quality-guard-skill';
export { PolicyGuardSkill, type PolicyCheckResult as PolicyGuardResult, type PolicyViolation, type OwnershipCheckResult, } from './policy-guard-skill';
export declare function registerContextCompressorSkill(registry: any): void;
export declare function createContextCompressorSkill(): ContextCompressorSkill;
export { MemoryConsolidationSkill, type MemoryData, type ConsolidationContext, type ConsolidationResult, type RetrievalContext as MemoryRetrievalContext, type RetrievalResult as MemoryRetrievalResult, } from './memory-consolidation-skill';
export declare function registerMemoryConsolidationSkill(registry: any): void;
export declare function createMemoryConsolidationSkill(): MemoryConsolidationSkill;
export { HybridRetrieverSkill, type Document, type RetrievalContext as HybridRetrievalContext, type RetrievalResult as HybridRetrievalResult, } from './hybrid-retriever-skill';
export declare function registerHybridRetrieverSkill(registry: any): void;
export declare function createHybridRetrieverSkill(): HybridRetrieverSkill;
export { CitationTracerSkill, type CitationSource, type CitationContext, type CitationResult, } from './citation-tracer-skill';
export declare function registerCitationTracerSkill(registry: any): void;
export declare function createCitationTracerSkill(): CitationTracerSkill;
export { HallucinationGuardSkill, type VerificationSource, type VerificationContext, type VerificationResult, } from './hallucination-guard-skill';
export declare function registerHallucinationGuardSkill(registry: any): void;
export declare function createHallucinationGuardSkill(): HallucinationGuardSkill;
/**
 * Register all fusion skills to registry.
 */
export declare function registerAllFusionSkills(registry: any): void;
/**
 * Get all fusion skills metadata.
 */
export declare function getFusionSkillsMetadata(): Record<string, any>[];
export declare const FUSION_SKILLS_SUMMARY: {
    totalSkills: number;
    totalCodeLines: number;
    energyEfficiencyRatio: string;
    latencyIncrease: string;
    harnesses: {
        orchestration: string[];
        evolution: string[];
        governance: string[];
    };
};
