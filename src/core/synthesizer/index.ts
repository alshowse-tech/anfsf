/**
 * ASF V4.0 Role Synthesizer - Industrial Enhancement Modules
 * 
 * Export all synthesizer modules.
 * Version: v0.9.0
 */

// ============================================================================
// Veto Enforcement
// ============================================================================
export {
  VetoEnforcer,
  createDefaultVetoEnforcer,
  DEFAULT_VETO_RULES,
} from './veto/veto-enforcer';

export type {
  VetoRule,
  VetoResult,
  ChangeSet,
} from './veto/veto-enforcer';

// ============================================================================
// Economics Scoring
// ============================================================================
export {
  computeRoleCost,
  computeTotalAssignmentCost,
  computeInterfaceCost,
  computeParallelismGain,
  computeEconomicsScore,
} from './economics/scoring';

export type {
  TaskDAG,
  Task,
  TaskEdge,
  RoleEconomics,
  RoleCostResult,
  EconomicsScore,
} from './economics/scoring';

// ============================================================================
// Hot Contract Analysis
// ============================================================================
export {
  computeContractCouplingBound,
  determineOptimalRoleCount,
  detectNaturalCommunities,
  learnOptimalKFromHistory,
  getHotContractReport,
} from './analysis/hot-contract';

export type {
  HotContract,
  ContractCouplingBound,
  RoleCountDecision,
  SynthConstraints,
  HistoricalData,
} from './analysis/hot-contract';

// ============================================================================
// Ownership Proof
// ============================================================================
export {
  canonicalizeResource,
  matchesSelector,
  generateOwnershipProof,
  validateProofs,
  generateDefaultProofs,
  DEFAULT_OWNERSHIP_RULES,
} from './ownership/proof-generator';

export type {
  ResourceKey,
  RawResource,
  Permission,
  OwnershipRule,
  OwnershipProof,
} from './ownership/proof-generator';

// ============================================================================
// Rework Risk
// ============================================================================
export {
  predictReworkRisk,
  predictReworkRisks,
  computeTotalReworkRisk,
  computeScoreWithRework,
  getHighRiskTasks,
  generateReworkRiskReport,
} from './analysis/rework-risk';

export type {
  ContractChange,
  ReworkRisk,
  HistoricalProject,
} from './analysis/rework-risk';

// ============================================================================
// Safe Optimizer
// ============================================================================
export {
  SafeOnlineOptimizer,
  createSafeOptimizer,
  FORBIDDEN_OPTIMIZATIONS,
} from './optimization/safe-optimizer';

export type {
  RuntimeMetrics,
  SynthResult,
  SafeKnob,
  OptimizationResult,
} from './optimization/safe-optimizer';

// ============================================================================
// Conflict Resolver
// ============================================================================
export {
  estimateContractCost,
  generateContractBetween,
  resolveOwnershipConflict,
  resolveConflicts,
  generateConflictReport,
} from './analysis/conflict-resolver';

export type {
  ConflictResource,
  ResolutionAction,
  Resolution,
  ConflictBatch,
} from './analysis/conflict-resolver';

// ============================================================================
// Core Types
// ============================================================================
export type {
  Role,
  ChangeAuthority,
  Assignment,
  ApprovalRecord,
  Contract,
} from './types';
