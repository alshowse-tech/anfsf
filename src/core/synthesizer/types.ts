/**
 * ASF V4.0 Role Synthesizer - Type Definitions
 * 
 * Core types for synthesizer modules.
 * Version: v0.9.0
 */

// ============================================================================
// Role Types
// ============================================================================

/**
 * Role definition.
 */
export interface Role {
  id: string;
  name: string;
  description?: string;
  capabilities?: string[];
  authorities?: ChangeAuthority[];
  sla?: {
    maxConcurrentTasks?: number;
    responseTime?: number;
  };
}

/**
 * Change authority types.
 */
export type ChangeAuthority =
  | 'architect'
  | 'security'
  | 'backend-lead'
  | 'frontend-lead'
  | 'devops'
  | 'product';

// ============================================================================
// Assignment Types
// ============================================================================

/**
 * Task assignment.
 */
export interface Assignment {
  taskToRole: Record<string, string>; // taskId -> roleId
}

// ============================================================================
// Approval Types
// ============================================================================

/**
 * Approval record.
 */
export interface ApprovalRecord {
  authority: ChangeAuthority;
  scope: string;
  status: 'approved' | 'rejected' | 'pending';
  approverRoleId: string;
  timestamp: number;
  comment?: string;
}

// ============================================================================
// Contract Types
// ============================================================================

/**
 * Contract definition.
 */
export interface Contract {
  id: string;
  type: 'OpenAPI' | 'DBSchema' | 'UIProps' | 'EventSchema';
  version: string;
  ownerRoleId?: string;
}

// ============================================================================
// Export All Types
// ============================================================================

export type {
  VetoRule,
  VetoResult,
  ChangeSet,
} from './veto/veto-enforcer';

export type {
  TaskDAG,
  Task,
  TaskEdge,
  RoleEconomics,
  RoleCostResult,
  EconomicsScore,
} from './economics/scoring';

export type {
  HotContract,
  ContractCouplingBound,
  RoleCountDecision,
  SynthConstraints,
  HistoricalData,
} from './analysis/hot-contract';

export type {
  ResourceKey,
  RawResource,
  Permission,
  OwnershipRule,
  OwnershipProof,
} from './ownership/proof-generator';

export type {
  ContractChange,
  ReworkRisk,
  HistoricalProject,
} from './analysis/rework-risk';

export type {
  RuntimeMetrics,
  SynthResult,
  SafeKnob,
  OptimizationResult,
} from './optimization/safe-optimizer';
