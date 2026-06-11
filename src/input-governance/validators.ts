/**
 * ANFSF L1 - Structured Validators
 *
 * Validates PRD structure, API specs, constraints, and feature dependencies.
 */

import type { AINativePRD, APISpec, Feature, Constraint, AcceptanceCriterion } from '../prd/prd-parser';

// ============================================================================
// Validation Result
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// PRD Structure Validation
// ============================================================================

export function validatePRDStructure(prd: AINativePRD): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Cross-reference acceptance criteria feature IDs
  if (prd.acceptanceCriteria && prd.acceptanceCriteria.length > 0) {
    const featureIds = new Set(prd.features.map(f => f.id));
    for (const criterion of prd.acceptanceCriteria) {
      if (criterion.featureId && !featureIds.has(criterion.featureId)) {
        errors.push(`Acceptance criterion "${criterion.id}" references non-existent feature "${criterion.featureId}"`);
      }
    }
  }

  // Cross-reference dependency IDs
  const validation = validateFeatureDependencies(prd.features);
  errors.push(...validation.errors);
  warnings.push(...validation.warnings);

  // Check for empty PRD
  if (!prd.features || prd.features.length === 0) {
    errors.push('PRD has no features');
  }

  // Check for duplicate feature IDs
  const seenIds = new Set<string>();
  for (const feature of prd.features) {
    if (seenIds.has(feature.id)) {
      errors.push(`Duplicate feature ID: "${feature.id}"`);
    }
    seenIds.add(feature.id);
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ============================================================================
// API Spec Validation
// ============================================================================

const VALID_HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

export function validateAPISpecs(apiSpecs: APISpec[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < apiSpecs.length; i++) {
    const spec = apiSpecs[i];
    const specLabel = `API spec [${i}] (${spec.path || 'unknown'})`;

    if (!spec.path || spec.path.trim().length === 0) {
      errors.push(`${specLabel}: missing path`);
    } else if (!spec.path.startsWith('/')) {
      errors.push(`${specLabel}: path must start with "/" (got "${spec.path}")`);
    }

    if (!spec.method) {
      errors.push(`${specLabel}: missing HTTP method`);
    } else if (!VALID_HTTP_METHODS.has(spec.method.toUpperCase())) {
      errors.push(`${specLabel}: invalid HTTP method "${spec.method}"`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ============================================================================
// Constraint Validation
// ============================================================================

const VALID_CONSTRAINT_TYPES = new Set([
  'technical', 'performance', 'security', 'compliance',
  'business', 'dependency', 'quality', 'budget', 'regulatory',
]);

export function validateConstraints(constraints: Constraint[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const constraint of constraints) {
    if (!constraint.id || constraint.id.trim().length === 0) {
      errors.push('Constraint missing id');
    }

    if (!constraint.type) {
      errors.push(`Constraint "${constraint.id}": missing type`);
    } else if (!VALID_CONSTRAINT_TYPES.has(constraint.type)) {
      errors.push(`Constraint "${constraint.id}": invalid type "${constraint.type}"`);
    }

    if (!constraint.description || constraint.description.trim().length === 0) {
      warnings.push(`Constraint "${constraint.id}": missing description`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ============================================================================
// Feature Dependency Validation
// ============================================================================

export function validateFeatureDependencies(features: Feature[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const featureIds = new Set(features.map(f => f.id));

  for (const feature of features) {
    if (!feature.dependencies || feature.dependencies.length === 0) continue;

    for (const depId of feature.dependencies) {
      if (!featureIds.has(depId)) {
        errors.push(`Feature "${feature.id}" depends on non-existent feature "${depId}"`);
      }
    }

    // Warn about circular dependency potential (simple check: mutual dependencies)
    for (const depId of feature.dependencies) {
      const depFeature = features.find(f => f.id === depId);
      if (depFeature && depFeature.dependencies?.some(d => d === feature.id)) {
        warnings.push(`Potential circular dependency between "${feature.id}" and "${depId}"`);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
