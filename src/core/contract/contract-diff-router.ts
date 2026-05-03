/**
 * ASF V4.0 Contract Pack - Contract Diff Router
 *
 * Unified entry point for all contract diff operations.
 * Dispatches to the appropriate diff engine based on ContractType.
 * Version: v0.8.5
 */

import type { ContractDiff, ContractType, OpenAPIDiff, DBSchemaDiff, UIPropsDiff } from './types';

export type AnyContractDiff = ContractDiff | OpenAPIDiff | DBSchemaDiff | UIPropsDiff;
import { diffOpenAPI, canAutoApproveOpenAPI } from './diff-openapi';
import { diffDBSchema, canAutoApproveDBSchema } from './diff-dbschema';
import { diffUIProps, canAutoApproveUIProps } from './diff-uiprops';
import { diffEventSchema, canAutoApproveEventSchema } from './diff-event-schema';
import { diffConfigSchema, canAutoApproveConfigSchema } from './diff-config-schema';

/**
 * Options for contract diff.
 */
export interface ContractDiffOptions {
  beforeVersion: string;
  afterVersion: string;
}

/**
 * Unified contract diff dispatcher.
 *
 * Routes the diff request to the appropriate engine based on contract type.
 *
 * @param type - Contract type to diff
 * @param before - Original contract spec (JSON string)
 * @param after - New contract spec (JSON string)
 * @param options - Version information
 * @returns ContractDiff result
 *
 * @example
 * ```typescript
 * const diff = diffContract(
 *   'OpenAPI',
 *   oldSpec,
 *   newSpec,
 *   { beforeVersion: '1.0.0', afterVersion: '1.1.0' }
 * );
 *
 * if (diff.breaking) {
 *   console.log('Breaking changes detected!');
 * }
 * ```
 */
export function diffContract(
  type: ContractType,
  before: string,
  after: string,
  options: ContractDiffOptions
): AnyContractDiff {
  switch (type) {
    case 'OpenAPI':
      return diffOpenAPI(before, after, options.beforeVersion, options.afterVersion);

    case 'DBSchema':
      return diffDBSchema(before, after, options.beforeVersion, options.afterVersion);

    case 'UIProps':
      return diffUIProps(before, after, options.beforeVersion, options.afterVersion);

    case 'EventSchema':
      return diffEventSchema(before, after, options.beforeVersion, options.afterVersion);

    case 'ConfigSchema':
      return diffConfigSchema(before, after, options.beforeVersion, options.afterVersion);

    default:
      throw new Error(`Unknown contract type: ${type}`);
  }
}

/**
 * Check if a contract diff can be auto-approved.
 *
 * @param diff - The contract diff result
 * @returns Whether the diff qualifies for auto-approval
 */
export function canAutoApprove(diff: AnyContractDiff): boolean {
  switch (diff.contractType) {
    case 'OpenAPI':
      return canAutoApproveOpenAPI(diff as any);

    case 'DBSchema':
      return canAutoApproveDBSchema(diff as any);

    case 'UIProps':
      return canAutoApproveUIProps(diff as any);

    case 'EventSchema':
      return canAutoApproveEventSchema(diff);

    case 'ConfigSchema':
      return canAutoApproveConfigSchema(diff);

    default:
      return false;
  }
}
