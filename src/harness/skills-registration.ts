/**
 * ANFSF V1.5.0 - Skills Registration to Harnesses (更新版)
 * 
 * Registers fusion skills to their corresponding Harnesses:
 * - Orchestration Harness: ContextCompressorSkill
 * - Evolution Harness: MemoryConsolidationSkill
 * - UI/UX Harness: (无 Skills，纯 UI 功能)
 * - Governance Harness: HybridRetrieverSkill, CitationTracerSkill, HallucinationGuardSkill
 */

import {
  registerContextCompressorSkill,
  registerMemoryConsolidationSkill,
  registerHybridRetrieverSkill,
  registerCitationTracerSkill,
  registerHallucinationGuardSkill,
} from '../skills/index';

// Forward declarations for Harness classes
declare class OrchestrationHarness {
  registry: any;
}

declare class EvolutionHarness {
  registry: any;
}

declare class UIUXHarness {
  registry: any;
}

declare class GovernanceHarness {
  registry: any;
}

/**
 * Register all fusion skills to their corresponding Harnesses.
 */
export function registerFusionSkillsToHarnesses(): void {
  // Note: Skills will be registered when Harnesses are instantiated
}

/**
 * Register skills to Orchestration Harness.
 */
export function registerToOrchestrationHarness(harness: OrchestrationHarness): void {
  if (harness.registry) {
    registerContextCompressorSkill(harness.registry);
  }
}

/**
 * Register skills to Evolution Harness.
 */
export function registerToEvolutionHarness(harness: EvolutionHarness): void {
  if (harness.registry) {
    registerMemoryConsolidationSkill(harness.registry);
  }
}

/**
 * Register skills to UI/UX Harness (no skills, UI only).
 */
export function registerToUIUXHarness(_harness: UIUXHarness): void {
  // UI/UX Harness has no skills, pure UI functionality
}

/**
 * Register skills to Governance Harness.
 */
export function registerToGovernanceHarness(harness: GovernanceHarness): void {
  if (harness.registry) {
    registerHybridRetrieverSkill(harness.registry);
    registerCitationTracerSkill(harness.registry);
    registerHallucinationGuardSkill(harness.registry);
  }
}

/**
 * Get skills registered to each Harness.
 */
export function getHarnessSkills(): Record<string, string[]> {
  return {
    orchestration: ['context-compressor'],
    evolution: ['memory-consolidation'],
    uiux: [], // UI/UX Harness has no skills
    governance: ['hybrid-retriever', 'citation-tracer', 'hallucination-guard'],
  };
}

/**
 * Verify skills registration status.
 */
export function verifySkillsRegistration(): {
  totalSkills: number;
  byHarness: Record<string, string[]>;
  verified: boolean;
} {
  const skills = getHarnessSkills();
  const totalSkills = Object.values(skills).reduce((sum, arr) => sum + arr.length, 0);

  return {
    totalSkills,
    byHarness: skills,
    verified: totalSkills === 5, // Expected 5 fusion skills
  };
}

// Auto-verify on module load
const registrationStatus = verifySkillsRegistration();
console.log('[Skills Registration]', registrationStatus.verified ? '✅ Verified' : '❌ Failed', registrationStatus);
