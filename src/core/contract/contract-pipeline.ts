/**
 * ASF V4.0 Contract Pipeline
 *
 * Orchestrates IR → contract generation → diff detection → approval workflow.
 * Version: v0.9.0
 */

import type { IR } from '../../req-graph/graph-engine';
import type { ContractDiff, ContractProposal, AutoApproveRule } from './types';
import type { AnyContractDiff } from './contract-diff-router';
import { diffContract, canAutoApprove } from './contract-diff-router';
import { generateOpenAPISpec, generateOpenAPIWithDiff } from './api-contract-engine';
import { generateDBSchemaWithDiff, generateDBSchemaJSON } from './db-schema-generator';
import { generateEventSchemaWithDiff, generateEventSchemaJSON } from './event-schema-generator';
import { determineBumpType } from './semver';

// ============================================================================
// Generated Contract Set
// ============================================================================

/**
 * Complete set of contracts generated from IR.
 */
export interface GeneratedContracts {
  /** OpenAPI 3.0 specification */
  openapi: {
    spec: string;
    version: string;
  };
  /** Database schema */
  database: {
    json: string;
    ddl: string;
    prisma: string;
    version: string;
  };
  /** Event contracts */
  events: {
    json: string;
    version: string;
  };
  /** IR source */
  sourceIR: IR;
}

// ============================================================================
// Contract Pipeline
// ============================================================================

/**
 * Generate all contracts from IR.
 *
 * @param ir - Intermediate representation
 * @param metadata - API/project metadata
 * @returns Complete set of generated contracts
 *
 * @example
 * ```typescript
 * const contracts = generateContracts(ir, {
 *   title: 'Todo API',
 *   version: '1.0.0',
 *   description: 'Todo management API'
 * });
 *
 * console.log(contracts.openapi.spec);  // OpenAPI 3.0 JSON
 * console.log(contracts.database.ddl);   // SQL DDL
 * console.log(contracts.database.prisma); // Prisma schema
 * ```
 */
export function generateContracts(
  ir: IR,
  metadata: { title: string; version: string; description?: string }
): GeneratedContracts {
  const openapi = generateOpenAPIWithDiff(ir, {
    title: metadata.title,
    version: metadata.version,
    description: metadata.description,
  });

  const database = generateDBSchemaWithDiff(ir.data, metadata.version);

  const events = generateEventSchemaWithDiff(ir.workflow, metadata.version);

  return {
    openapi: {
      spec: openapi.spec,
      version: metadata.version,
    },
    database: {
      json: database.schemaJSON,
      ddl: database.ddl,
      prisma: database.prisma,
      version: metadata.version,
    },
    events: {
      json: events.schemaJSON,
      version: metadata.version,
    },
    sourceIR: ir,
  };
}

// ============================================================================
// Contract Diff Pipeline
// ============================================================================

/**
 * Compare generated contracts with previous versions.
 *
 * @param contracts - Current generated contracts
 * @param previous - Previous contract set
 * @param bumpType - Optional explicit version bump
 * @returns Array of contract diffs
 */
export function diffContracts(
  contracts: GeneratedContracts,
  previous: GeneratedContracts,
  bumpType?: string
): ContractDiffPipelineResult {
  const results: AnyContractDiff[] = [];
  let hasBreaking = false;
  let requiresApproval = false;

  // Diff OpenAPI
  const openapiDiff = diffContract(
    'OpenAPI',
    previous.openapi.spec,
    contracts.openapi.spec,
    { beforeVersion: previous.openapi.version, afterVersion: contracts.openapi.version }
  );
  results.push(openapiDiff);
  if ((openapiDiff as any).breaking) hasBreaking = true;
  if (openapiDiff.requiresApproval) requiresApproval = true;

  // Diff DB Schema
  const dbDiff = diffContract(
    'DBSchema',
    previous.database.json,
    contracts.database.json,
    { beforeVersion: previous.database.version, afterVersion: contracts.database.version }
  );
  results.push(dbDiff);
  if ((dbDiff as any).breaking) hasBreaking = true;
  if (dbDiff.requiresApproval) requiresApproval = true;

  // Diff Event Schema
  const eventDiff = diffContract(
    'EventSchema',
    previous.events.json,
    contracts.events.json,
    { beforeVersion: previous.events.version, afterVersion: contracts.events.version }
  );
  results.push(eventDiff);
  if ((eventDiff as any).breaking) hasBreaking = true;
  if (eventDiff.requiresApproval) requiresApproval = true;

  // Compute overall version bump
  const overallBump = bumpType || determineBumpType({
    currentVersion: contracts.openapi.version,
    isBreaking: hasBreaking,
    hasNewFeatures: results.some(r => (r as any).changes?.added?.length > 0),
    hasBugFixes: results.some(r => (r as any).changes?.modified?.length > 0),
  });

  return {
    diffs: results,
    hasBreaking,
    requiresApproval,
    overallBump,
  };
}

export interface ContractDiffPipelineResult {
  diffs: AnyContractDiff[];
  hasBreaking: boolean;
  requiresApproval: boolean;
  overallBump: string | null;
}

// ============================================================================
// Approval Pipeline
// ============================================================================

/**
 * Evaluate auto-approve rules against contract diffs.
 *
 * @param diffs - Contract diffs to evaluate
 * @param rules - Auto-approve rules
 * @returns Approval decision per contract
 */
export function evaluateAutoApprove(
  diffs: AnyContractDiff[],
  rules: AutoApproveRule[]
): Array<{ contractType: string; approved: boolean; reason: string }> {
  const results: Array<{ contractType: string; approved: boolean; reason: string }> = [];

  for (const diff of diffs) {
    const matchingRules = rules.filter(r => r.contractType === diff.contractType);
    let approved = false;
    let reason = 'no matching rules';

    if (matchingRules.length > 0) {
      for (const rule of matchingRules) {
        const { passed, reason: ruleReason } = evaluateRule(diff, rule);
        if (passed) {
          approved = true;
          reason = ruleReason;
          break;
        } else {
          reason = ruleReason;
        }
      }
    }

    // Also run the built-in auto-approve check as a fallback
    if (!approved && canAutoApprove(diff)) {
      approved = true;
      reason = 'passes built-in auto-approve criteria';
    }

    results.push({
      contractType: diff.contractType,
      approved,
      reason,
    });
  }

  return results;
}

/**
 * Evaluate a single auto-approve rule against a diff.
 */
function evaluateRule(
  diff: AnyContractDiff,
  rule: AutoApproveRule
): { passed: boolean; reason: string } {
  const conditions = rule.conditions;

  // Check risk score
  if (conditions.riskScoreBelow !== undefined) {
    const riskScore = diff.riskScore ?? 50;
    if (riskScore >= conditions.riskScoreBelow) {
      return { passed: false, reason: `risk score ${riskScore} >= ${conditions.riskScoreBelow}` };
    }
  }

  // Check for type changes
  if (conditions.noTypeChanges) {
    const hasTypeChanges = (diff as any).changes?.modified?.length > 0;
    if (hasTypeChanges) {
      return { passed: false, reason: 'type changes detected' };
    }
  }

  // Check for new required fields
  if (conditions.onlyAddOptionalFields) {
    const addedItems = (diff as any).changes?.added || [];
    for (const item of addedItems) {
      if (item.details?.required === true) {
        return { passed: false, reason: 'added required field' };
      }
    }
  }

  if (rule.autoApprove) {
    return { passed: true, reason: 'all conditions satisfied' };
  }

  return { passed: false, reason: 'rule does not auto-approve' };
}

// ============================================================================
// Proposal Pipeline
// ============================================================================

/**
 * Create contract proposals from diffs.
 *
 * @param diffs - Contract diffs
 * @param proposerRoleId - Role submitting the proposal
 * @returns Array of contract proposals
 */
export function createProposals(
  diffs: AnyContractDiff[],
  proposerRoleId: string
): ContractProposal[] {
  return diffs.map((diff, index) => ({
    id: `proposal-${Date.now()}-${index}`,
    contractId: `${diff.contractType.toLowerCase()}-v${(diff as any).version?.after || '1.0.0'}`,
    proposerRoleId,
    state: 'pending' as const,
    diff: diff as ContractDiff,
    submittedAt: Date.now(),
  }));
}

/**
 * Full contract pipeline: generate → diff → approve → propose.
 *
 * @param ir - Intermediate representation
 * @param metadata - API/project metadata
 * @param previous - Optional previous contracts for diff
 * @param rules - Auto-approve rules
 * @param proposerRoleId - Role submitting proposals
 * @returns Complete pipeline result
 */
export function runContractPipeline(
  ir: IR,
  metadata: { title: string; version: string; description?: string },
  previous?: GeneratedContracts,
  rules: AutoApproveRule[] = [],
  proposerRoleId: string = 'system'
): ContractPipelineResult {
  // Step 1: Generate contracts
  const contracts = generateContracts(ir, metadata);

  let diffResult: ContractDiffPipelineResult | undefined;
  let approvalResults: Array<{ contractType: string; approved: boolean; reason: string }> = [];
  let proposals: ContractProposal[] = [];

  // Step 2: Diff (if previous version exists)
  if (previous) {
    diffResult = diffContracts(contracts, previous);

    // Step 3: Auto-approve evaluation
    approvalResults = evaluateAutoApprove(diffResult.diffs, rules);

    // Step 4: Create proposals for non-auto-approved diffs
    const pendingDiffs = diffResult.diffs.filter((_, i) => !approvalResults[i]?.approved);
    if (pendingDiffs.length > 0) {
      proposals = createProposals(pendingDiffs, proposerRoleId);
    }
  }

  return {
    contracts,
    diff: diffResult,
    approvals: approvalResults,
    proposals,
  };
}

export interface ContractPipelineResult {
  contracts: GeneratedContracts;
  diff?: ContractDiffPipelineResult;
  approvals: Array<{ contractType: string; approved: boolean; reason: string }>;
  proposals: ContractProposal[];
}
