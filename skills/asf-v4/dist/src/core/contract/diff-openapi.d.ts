/**
 * ASF V4.0 Contract Pack - OpenAPI Diff Engine
 *
 * Semantic diff for OpenAPI/Swagger contracts.
 * Version: v0.8.5
 */
import type { OpenAPIDiff } from './types';
/**
 * Parsed OpenAPI spec structure.
 */
interface ParsedOpenAPI {
    openapi: string;
    info: {
        title: string;
        version: string;
    };
    paths: Record<string, any>;
    components?: {
        schemas?: Record<string, any>;
    };
}
/**
 * Parse OpenAPI spec from JSON/YAML string.
 */
export declare function parseOpenAPI(spec: string): ParsedOpenAPI;
/**
 * Generate semantic diff for OpenAPI specs.
 *
 * @param before - Original OpenAPI spec (JSON string)
 * @param after - New OpenAPI spec (JSON string)
 * @param beforeVersion - Current version (semver)
 * @param afterVersion - Proposed version (semver)
 * @returns OpenAPIDiff result
 *
 * @example
 * ```typescript
 * const diff = diffOpenAPI(
 *   oldSpec,
 *   newSpec,
 *   '1.0.0',
 *   '1.1.0'
 * );
 *
 * if (diff.breaking) {
 *   console.log('Breaking changes detected!');
 * }
 * ```
 */
export declare function diffOpenAPI(before: string, after: string, beforeVersion: string, afterVersion: string): OpenAPIDiff;
/**
 * Check if OpenAPI diff can be auto-approved.
 */
export declare function canAutoApproveOpenAPI(diff: OpenAPIDiff): boolean;
export {};
