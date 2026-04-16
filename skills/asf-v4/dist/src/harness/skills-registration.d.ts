/**
 * ANFSF V1.5.0 - Skills Registration to Harnesses (更新版)
 *
 * Registers fusion skills to their corresponding Harnesses:
 * - Orchestration Harness: ContextCompressorSkill
 * - Evolution Harness: MemoryConsolidationSkill
 * - UI/UX Harness: (无 Skills，纯 UI 功能)
 * - Governance Harness: HybridRetrieverSkill, CitationTracerSkill, HallucinationGuardSkill
 */
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
export declare function registerFusionSkillsToHarnesses(): void;
/**
 * Register skills to Orchestration Harness.
 */
export declare function registerToOrchestrationHarness(harness: OrchestrationHarness): void;
/**
 * Register skills to Evolution Harness.
 */
export declare function registerToEvolutionHarness(harness: EvolutionHarness): void;
/**
 * Register skills to UI/UX Harness (no skills, UI only).
 */
export declare function registerToUIUXHarness(_harness: UIUXHarness): void;
/**
 * Register skills to Governance Harness.
 */
export declare function registerToGovernanceHarness(harness: GovernanceHarness): void;
/**
 * Get skills registered to each Harness.
 */
export declare function getHarnessSkills(): Record<string, string[]>;
/**
 * Verify skills registration status.
 */
export declare function verifySkillsRegistration(): {
    totalSkills: number;
    byHarness: Record<string, string[]>;
    verified: boolean;
};
export {};
