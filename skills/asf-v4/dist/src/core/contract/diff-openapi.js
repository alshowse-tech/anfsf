"use strict";
/**
 * ASF V4.0 Contract Pack - OpenAPI Diff Engine
 *
 * Semantic diff for OpenAPI/Swagger contracts.
 * Version: v0.8.5
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseOpenAPI = parseOpenAPI;
exports.diffOpenAPI = diffOpenAPI;
exports.canAutoApproveOpenAPI = canAutoApproveOpenAPI;
const semver_1 = require("./semver");
/**
 * Parse OpenAPI spec from JSON/YAML string.
 */
function parseOpenAPI(spec) {
    try {
        // Try JSON first
        return JSON.parse(spec);
    }
    catch {
        // Could try YAML parsing here if yaml library available
        throw new Error('Invalid OpenAPI spec: must be valid JSON');
    }
}
/**
 * Compare two OpenAPI schemas.
 */
function compareSchemas(before, after, path) {
    const diff = [];
    let breaking = false;
    if (!before || !after) {
        return { hasChanges: true, breaking: false, diff };
    }
    // Check for required field changes
    const beforeRequired = new Set(before.required || []);
    const afterRequired = new Set(after.required || []);
    // New required fields = breaking
    for (const field of afterRequired) {
        if (!beforeRequired.has(field)) {
            diff.push({
                path: `${path}.required.${field}`,
                type: 'required_add',
                description: `Added required field: ${field}`,
                severity: 'critical',
                details: { field, before: false, after: true },
            });
            breaking = true;
        }
    }
    // Removed required fields = non-breaking
    for (const field of beforeRequired) {
        if (!afterRequired.has(field)) {
            diff.push({
                path: `${path}.required.${field}`,
                type: 'required_remove',
                description: `Removed required constraint: ${field}`,
                severity: 'low',
                details: { field, before: true, after: false },
            });
        }
    }
    // Check for type changes
    if (before.type && after.type && before.type !== after.type) {
        diff.push({
            path: `${path}.type`,
            type: 'type_change',
            description: `Type changed: ${before.type} → ${after.type}`,
            severity: 'critical',
            details: { before: before.type, after: after.type },
        });
        breaking = true;
    }
    // Check for new properties (non-breaking if optional)
    const beforeProps = new Set(Object.keys(before.properties || {}));
    const afterProps = new Set(Object.keys(after.properties || {}));
    for (const prop of afterProps) {
        if (!beforeProps.has(prop)) {
            const isRequired = afterRequired.has(prop);
            diff.push({
                path: `${path}.properties.${prop}`,
                type: 'property_add',
                description: `Added ${isRequired ? 'required' : 'optional'} property: ${prop}`,
                severity: isRequired ? 'high' : 'low',
                details: { property: prop, required: isRequired },
            });
            if (isRequired)
                breaking = true;
        }
    }
    // Check for removed properties
    for (const prop of beforeProps) {
        if (!afterProps.has(prop)) {
            diff.push({
                path: `${path}.properties.${prop}`,
                type: 'property_remove',
                description: `Removed property: ${prop}`,
                severity: 'high',
                details: { property: prop },
            });
            breaking = true;
        }
    }
    // Check for enum changes
    if (before.enum && after.enum) {
        const beforeEnum = new Set(before.enum);
        const afterEnum = new Set(after.enum);
        for (const value of afterEnum) {
            if (!beforeEnum.has(value)) {
                diff.push({
                    path: `${path}.enum`,
                    type: 'enum_add',
                    description: `Added enum value: ${value}`,
                    severity: 'low',
                    details: { value },
                });
            }
        }
        for (const value of beforeEnum) {
            if (!afterEnum.has(value)) {
                diff.push({
                    path: `${path}.enum`,
                    type: 'enum_remove',
                    description: `Removed enum value: ${value}`,
                    severity: 'critical',
                    details: { value },
                });
                breaking = true;
            }
        }
    }
    return {
        hasChanges: diff.length > 0,
        breaking,
        diff,
    };
}
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
function diffOpenAPI(before, after, beforeVersion, afterVersion) {
    const beforeSpec = parseOpenAPI(before);
    const afterSpec = parseOpenAPI(after);
    const changes = {
        added: [],
        removed: [],
        modified: [],
    };
    let breaking = false;
    const allDiffItems = [];
    // Compare paths
    const beforePaths = new Set(Object.keys(beforeSpec.paths || {}));
    const afterPaths = new Set(Object.keys(afterSpec.paths || {}));
    // New paths/endpoints
    for (const path of afterPaths) {
        if (!beforePaths.has(path)) {
            const methods = Object.keys(afterSpec.paths[path]);
            for (const method of methods) {
                changes.added.push({
                    path,
                    method,
                    schema: afterSpec.paths[path][method],
                });
                allDiffItems.push({
                    path: `/paths/${path}/${method}`,
                    type: 'endpoint_add',
                    description: `Added ${method.toUpperCase()} ${path}`,
                    severity: 'low',
                    details: { method, path },
                });
            }
        }
    }
    // Removed paths/endpoints (breaking)
    for (const path of beforePaths) {
        if (!afterPaths.has(path)) {
            const methods = Object.keys(beforeSpec.paths[path]);
            for (const method of methods) {
                changes.removed.push({ path, method });
                allDiffItems.push({
                    path: `/paths/${path}/${method}`,
                    type: 'endpoint_remove',
                    description: `Removed ${method.toUpperCase()} ${path}`,
                    severity: 'critical',
                    details: { method, path },
                });
            }
            breaking = true;
        }
    }
    // Modified paths
    for (const path of afterPaths) {
        if (beforePaths.has(path)) {
            const beforeMethods = beforeSpec.paths[path];
            const afterMethods = afterSpec.paths[path];
            for (const method of Object.keys(afterMethods)) {
                if (beforeMethods[method]) {
                    // Compare request/response schemas
                    const beforeSchema = beforeMethods[method];
                    const afterSchema = afterMethods[method];
                    const schemaDiff = compareSchemas(beforeSchema, afterSchema, `/paths/${path}/${method}`);
                    if (schemaDiff.hasChanges) {
                        changes.modified.push({
                            path,
                            method,
                            schemaDiff: {
                                request: beforeSchema.requestBody,
                                response: beforeSchema.responses,
                            },
                        });
                        allDiffItems.push(...schemaDiff.diff);
                        if (schemaDiff.breaking) {
                            breaking = true;
                        }
                    }
                }
            }
        }
    }
    // Compare component schemas
    const beforeSchemas = beforeSpec.components?.schemas || {};
    const afterSchemas = afterSpec.components?.schemas || {};
    const beforeSchemaNames = new Set(Object.keys(beforeSchemas));
    const afterSchemaNames = new Set(Object.keys(afterSchemas));
    // New schemas
    for (const name of afterSchemaNames) {
        if (!beforeSchemaNames.has(name)) {
            allDiffItems.push({
                path: `/components/schemas/${name}`,
                type: 'schema_add',
                description: `Added schema: ${name}`,
                severity: 'low',
                details: { schema: name },
            });
        }
    }
    // Removed schemas (breaking)
    for (const name of beforeSchemaNames) {
        if (!afterSchemaNames.has(name)) {
            allDiffItems.push({
                path: `/components/schemas/${name}`,
                type: 'schema_remove',
                description: `Removed schema: ${name}`,
                severity: 'critical',
                details: { schema: name },
            });
            breaking = true;
        }
    }
    // Modified schemas
    for (const name of afterSchemaNames) {
        if (beforeSchemaNames.has(name)) {
            const schemaDiff = compareSchemas(beforeSchemas[name], afterSchemas[name], `/components/schemas/${name}`);
            allDiffItems.push(...schemaDiff.diff);
            if (schemaDiff.breaking)
                breaking = true;
        }
    }
    // Determine version bump
    const hasNewFeatures = changes.added.length > 0;
    const hasBugFixes = changes.modified.length > 0 && !breaking;
    const bumpType = (0, semver_1.determineBumpType)({
        currentVersion: beforeVersion,
        isBreaking: breaking,
        hasNewFeatures,
        hasBugFixes,
    });
    // Generate changelog
    const changelog = generateOpenAPIChangelog(changes, breaking, bumpType);
    // Calculate risk score
    const riskScore = calculateOpenAPIRiskScore(changes, breaking, allDiffItems);
    return {
        contractType: 'OpenAPI',
        version: {
            before: beforeVersion,
            after: afterVersion,
            bump: bumpType,
        },
        changes,
        breaking,
        requiresApproval: breaking || bumpType === 'major',
        changelog,
        riskScore,
    };
}
/**
 * Generate changelog for OpenAPI changes.
 */
function generateOpenAPIChangelog(changes, breaking, bumpType) {
    const lines = [];
    if (breaking) {
        lines.push('## ⚠️ BREAKING CHANGES\n');
    }
    if (changes.removed.length > 0) {
        lines.push('### Removed\n');
        for (const item of changes.removed) {
            lines.push(`- **${item.method.toUpperCase()}** \`${item.path}\``);
        }
        lines.push('');
    }
    if (changes.added.length > 0) {
        lines.push('### Added\n');
        for (const item of changes.added) {
            lines.push(`- **${item.method.toUpperCase()}** \`${item.path}\``);
        }
        lines.push('');
    }
    if (changes.modified.length > 0) {
        lines.push('### Modified\n');
        for (const item of changes.modified) {
            lines.push(`- **${item.method.toUpperCase()}** \`${item.path}\``);
        }
        lines.push('');
    }
    if (lines.length === 0) {
        return 'No significant changes detected.';
    }
    return lines.join('\n');
}
/**
 * Calculate risk score for OpenAPI changes.
 */
function calculateOpenAPIRiskScore(changes, breaking, allDiffItems) {
    let score = 50; // Base score
    // Breaking changes add significant risk
    if (breaking) {
        score += 30;
    }
    // Count critical severity items
    const criticalCount = allDiffItems.filter((d) => d.severity === 'critical').length;
    score += criticalCount * 5;
    // Removed endpoints add risk
    score += changes.removed.length * 10;
    // Cap at 100
    return Math.min(100, score);
}
/**
 * Check if OpenAPI diff can be auto-approved.
 */
function canAutoApproveOpenAPI(diff) {
    // Must not be breaking
    if (diff.breaking)
        return false;
    // Must only add optional fields
    for (const item of diff.changes.added) {
        // Check if adding required fields (via details or schema)
        if (item.details?.required === true || item.schema?.required?.length > 0) {
            return false;
        }
    }
    // No removed items
    if (diff.changes.removed.length > 0)
        return false;
    // Risk score must be low
    if ((diff.riskScore || 50) >= 20)
        return false;
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZi1vcGVuYXBpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vc3JjL2NvcmUvY29udHJhY3QvZGlmZi1vcGVuYXBpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7R0FLRzs7QUF1Qkgsb0NBUUM7QUF5SkQsa0NBOEtDO0FBNEVELHNEQW1CQztBQWxjRCxxQ0FBNkM7QUFpQjdDOztHQUVHO0FBQ0gsU0FBZ0IsWUFBWSxDQUFDLElBQVk7SUFDdkMsSUFBSSxDQUFDO1FBQ0gsaUJBQWlCO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMxQixDQUFDO0lBQUMsTUFBTSxDQUFDO1FBQ1Asd0RBQXdEO1FBQ3hELE1BQU0sSUFBSSxLQUFLLENBQUMsMENBQTBDLENBQUMsQ0FBQztJQUM5RCxDQUFDO0FBQ0gsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBUyxjQUFjLENBQUMsTUFBVyxFQUFFLEtBQVUsRUFBRSxJQUFZO0lBSzNELE1BQU0sSUFBSSxHQUFlLEVBQUUsQ0FBQztJQUM1QixJQUFJLFFBQVEsR0FBRyxLQUFLLENBQUM7SUFFckIsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3RCLE9BQU8sRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUM7SUFDckQsQ0FBQztJQUVELG1DQUFtQztJQUNuQyxNQUFNLGNBQWMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBQ3RELE1BQU0sYUFBYSxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxRQUFRLElBQUksRUFBRSxDQUFDLENBQUM7SUFFcEQsaUNBQWlDO0lBQ2pDLEtBQUssTUFBTSxLQUFLLElBQUksYUFBYSxFQUFFLENBQUM7UUFDbEMsSUFBSSxDQUFDLGNBQWMs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QUFDLElBQUksRUFBRTtRQUFFLE9BQU8sS0FBSyxDQUFDO0lBRS9DLE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQVNGIFY0LjAgQ29udHJhY3QgUGFjayAtIE9wZW5BUEkgRGlmZiBFbmdpbmVcbiAqIFxuICogU2VtYW50aWMgZGlmZiBmb3IgT3BlbkFQSS9Td2FnZ2VyIGNvbnRyYWN0cy5cbiAqIFZlcnNpb246IHYwLjguNVxuICovXG5cbmltcG9ydCB0eXBlIHsgT3BlbkFQSURpZmYsIERpZmZJdGVtIH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBkZXRlcm1pbmVCdW1wVHlwZSB9IGZyb20gJy4vc2VtdmVyJztcblxuLyoqXG4gKiBQYXJzZWQgT3BlbkFQSSBzcGVjIHN0cnVjdHVyZS5cbiAqL1xuaW50ZXJmYWNlIFBhcnNlZE9wZW5BUEkge1xuICBvcGVuYXBpOiBzdHJpbmc7XG4gIGluZm86IHtcbiAgICB0aXRsZTogc3RyaW5nO1xuICAgIHZlcnNpb246IHN0cmluZztcbiAgfTtcbiAgcGF0aHM6IFJlY29yZDxzdHJpbmcsIGFueT47XG4gIGNvbXBvbmVudHM/OiB7XG4gICAgc2NoZW1hcz86IFJlY29yZDxzdHJpbmcsIGFueT47XG4gIH07XG59XG5cbi8qKlxuICogUGFyc2UgT3BlbkFQSSBzcGVjIGZyb20gSlNPTi9ZQU1MIHN0cmluZy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlT3BlbkFQSShzcGVjOiBzdHJpbmcpOiBQYXJzZWRPcGVuQVBJIHtcbiAgdHJ5IHtcbiAgICAvLyBUcnkgSlNPTiBmaXJzdFxuICAgIHJldHVybiBKU09OLnBhcnNlKHNwZWMpO1xuICB9IGNhdGNoIHtcbiAgICAvLyBDb3VsZCB0cnkgWUFNTCBwYXJzaW5nIGhlcmUgaWYgeWFtbCBsaWJyYXJ5IGF2YWlsYWJsZVxuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBPcGVuQVBJIHNwZWM6IG11c3QgYmUgdmFsaWQgSlNPTicpO1xuICB9XG59XG5cbi8qKlxuICogQ29tcGFyZSB0d28gT3BlbkFQSSBzY2hlbWFzLlxuICovXG5mdW5jdGlvbiBjb21wYXJlU2NoZW1hcyhiZWZvcmU6IGFueSwgYWZ0ZXI6IGFueSwgcGF0aDogc3RyaW5nKToge1xuICBoYXNDaGFuZ2VzOiBib29sZWFuO1xuICBicmVha2luZzogYm9vbGVhbjtcbiAgZGlmZjogRGlmZkl0ZW1bXTtcbn0ge1xuICBjb25zdCBkaWZmOiBEaWZmSXRlbVtdID0gW107XG4gIGxldCBicmVha2luZyA9IGZhbHNlO1xuXG4gIGlmICghYmVmb3JlIHx8ICFhZnRlcikge1xuICAgIHJldHVybiB7IGhhc0NoYW5nZXM6IHRydWUsIGJyZWFraW5nOiBmYWxzZSwgZGlmZiB9O1xuICB9XG5cbiAgLy8gQ2hlY2sgZm9yIHJlcXVpcmVkIGZpZWxkIGNoYW5nZXNcbiAgY29uc3QgYmVmb3JlUmVxdWlyZWQgPSBuZXcgU2V0KGJlZm9yZS5yZXF1aXJlZCB8fCBbXSk7XG4gIGNvbnN0IGFmdGVyUmVxdWlyZWQgPSBuZXcgU2V0KGFmdGVyLnJlcXVpcmVkIHx8IFtdKTtcblxuICAvLyBOZXcgcmVxdWlyZWQgZmllbGRzID0gYnJlYWtpbmdcbiAgZm9yIChjb25zdCBmaWVsZCBvZiBhZnRlclJlcXVpcmVkKSB7XG4gICAgaWYgKCFiZWZvcmVSZXF1aXJlZC5oYXMoZmllbGQpKSB7XG4gICAgICBkaWZmLnB1c2goe1xuICAgICAgICBwYXRoOiBgJHtwYXRofS5yZXF1aXJlZC4ke2ZpZWxkfWAsXG4gICAgICAgIHR5cGU6ICdyZXF1aXJlZF9hZGQnLFxuICAgICAgICBkZXNjcmlwdGlvbjogYEFkZGVkIHJlcXVpcmVkIGZpZWxkOiAke2ZpZWxkfWAsXG4gICAgICAgIHNldmVyaXR5OiAnY3JpdGljYWwnLFxuICAgICAgICBkZXRhaWxzOiB7IGZpZWxkLCBiZWZvcmU6IGZhbHNlLCBhZnRlcjogdHJ1ZSB9LFxuICAgICAgfSk7XG4gICAgICBicmVha2luZyA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgLy8gUmVtb3ZlZCByZXF1aXJlZCBmaWVsZHMgPSBub24tYnJlYWtpbmdcbiAgZm9yIChjb25zdCBmaWVsZCBvZiBiZWZvcmVSZXF1aXJlZCkge1xuICAgIGlmICghYWZ0ZXJSZXF1aXJlZC5oYXMoZmllbGQpKSB7XG4gICAgICBkaWZmLnB1c2goe1xuICAgICAgICBwYXRoOiBgJHtwYXRofS5yZXF1aXJlZC4ke2ZpZWxkfWAsXG4gICAgICAgIHR5cGU6ICdyZXF1aXJlZF9yZW1vdmUnLFxuICAgICAgICBkZXNjcmlwdGlvbjogYFJlbW92ZWQgcmVxdWlyZWQgY29uc3RyYWludDogJHtmaWVsZH1gLFxuICAgICAgICBzZXZlcml0eTogJ2xvdycsXG4gICAgICAgIGRldGFpbHM6IHsgZmllbGQsIGJlZm9yZTogdHJ1ZSwgYWZ0ZXI6IGZhbHNlIH0sXG4gICAgICB9KTtcbiAgICB9XG4gIH1cblxuICAvLyBDaGVjayBmb3IgdHlwZSBjaGFuZ2VzXG4gIGlmIChiZWZvcmUudHlwZSAmJiBhZnRlci50eXBlICYmIGJlZm9yZS50eXBlICE9PSBhZnRlci50eXBlKSB7XG4gICAgZGlmZi5wdXNoKHtcbiAgICAgIHBhdGg6IGAke3BhdGh9LnR5cGVgLFxuICAgICAgdHlwZTogJ3R5cGVfY2hhbmdlJyxcbiAgICAgIGRlc2NyaXB0aW9uOiBgVHlwZSBjaGFuZ2VkOiAke2JlZm9yZS50eXBlfSDihpIgJHthZnRlci50eXBlfWAsXG4gICAgICBzZXZlcml0eTogJ2NyaXRpY2FsJyxcbiAgICAgIGRldGFpbHM6IHsgYmVmb3JlOiBiZWZvcmUudHlwZSwgYWZ0ZXI6IGFmdGVyLnR5cGUgfSxcbiAgICB9KTtcbiAgICBicmVha2luZyA9IHRydWU7XG4gIH1cblxuICAvLyBDaGVjayBmb3IgbmV3IHByb3BlcnRpZXMgKG5vbi1icmVha2luZyBpZiBvcHRpb25hbClcbiAgY29uc3QgYmVmb3JlUHJvcHMgPSBuZXcgU2V0KE9iamVjdC5rZXlzKGJlZm9yZS5wcm9wZXJ0aWVzIHx8IHt9KSk7XG4gIGNvbnN0IGFmdGVyUHJvcHMgPSBuZXcgU2V0KE9iamVjdC5rZXlzKGFmdGVyLnByb3BlcnRpZXMgfHwge30pKTtcblxuICBmb3IgKGNvbnN0IHByb3Agb2YgYWZ0ZXJQcm9wcykge1xuICAgIGlmICghYmVmb3JlUHJvcHMuaGFzKHByb3ApKSB7XG4gICAgICBjb25zdCBpc1JlcXVpcmVkID0gYWZ0ZXJSZXF1aXJlZC5oYXMocHJvcCk7XG4gICAgICBkaWZmLnB1c2goe1xuICAgICAgICBwYXRoOiBgJHtwYXRofS5wcm9wZXJ0aWVzLiR7cHJvcH1gLFxuICAgICAgICB0eXBlOiAncHJvcGVydHlfYWRkJyxcbiAgICAgICAgZGVzY3JpcHRpb246IGBBZGRlZCAke2lzUmVxdWlyZWQgPyAncmVxdWlyZWQnIDogJ29wdGlvbmFsJ30gcHJvcGVydHk6ICR7cHJvcH1gLFxuICAgICAgICBzZXZlcml0eTogaXNSZXF1aXJlZCA/ICdoaWdoJyA6ICdsb3cnLFxuICAgICAgICBkZXRhaWxzOiB7IHByb3BlcnR5OiBwcm9wLCByZXF1aXJlZDogaXNSZXF1aXJlZCB9LFxuICAgICAgfSk7XG4gICAgICBpZiAoaXNSZXF1aXJlZCkgYnJlYWtpbmcgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIC8vIENoZWNrIGZvciByZW1vdmVkIHByb3BlcnRpZXNcbiAgZm9yIChjb25zdCBwcm9wIG9mIGJlZm9yZVByb3BzKSB7XG4gICAgaWYgKCFhZnRlclByb3BzLmhhcyhwcm9wKSkge1xuICAgICAgZGlmZi5wdXNoKHtcbiAgICAgICAgcGF0aDogYCR7cGF0aH0ucHJvcGVydGllcy4ke3Byb3B9YCxcbiAgICAgICAgdHlwZTogJ3Byb3BlcnR5X3JlbW92ZScsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBgUmVtb3ZlZCBwcm9wZXJ0eTogJHtwcm9wfWAsXG4gICAgICAgIHNldmVyaXR5OiAnaGlnaCcsXG4gICAgICAgIGRldGFpbHM6IHsgcHJvcGVydHk6IHByb3AgfSxcbiAgICAgIH0pO1xuICAgICAgYnJlYWtpbmcgPSB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIC8vIENoZWNrIGZvciBlbnVtIGNoYW5nZXNcbiAgaWYgKGJlZm9yZS5lbnVtICYmIGFmdGVyLmVudW0pIHtcbiAgICBjb25zdCBiZWZvcmVFbnVtID0gbmV3IFNldChiZWZvcmUuZW51bSk7XG4gICAgY29uc3QgYWZ0ZXJFbnVtID0gbmV3IFNldChhZnRlci5lbnVtKTtcblxuICAgIGZvciAoY29uc3QgdmFsdWUgb2YgYWZ0ZXJFbnVtKSB7XG4gICAgICBpZiAoIWJlZm9yZUVudW0uaGFzKHZhbHVlKSkge1xuICAgICAgICBkaWZmLnB1c2goe1xuICAgICAgICAgIHBhdGg6IGAke3BhdGh9LmVudW1gLFxuICAgICAgICAgIHR5cGU6ICdlbnVtX2FkZCcsXG4gICAgICAgICAgZGVzY3JpcHRpb246IGBBZGRlZCBlbnVtIHZhbHVlOiAke3ZhbHVlfWAsXG4gICAgICAgICAgc2V2ZXJpdHk6ICdsb3cnLFxuICAgICAgICAgIGRldGFpbHM6IHsgdmFsdWUgfSxcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZm9yIChjb25zdCB2YWx1ZSBvZiBiZWZvcmVFbnVtKSB7XG4gICAgICBpZiAoIWFmdGVyRW51bS5oYXModmFsdWUpKSB7XG4gICAgICAgIGRpZmYucHVzaCh7XG4gICAgICAgICAgcGF0aDogYCR7cGF0aH0uZW51bWAsXG4gICAgICAgICAgdHlwZTogJ2VudW1fcmVtb3ZlJyxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogYFJlbW92ZWQgZW51bSB2YWx1ZTogJHt2YWx1ZX1gLFxuICAgICAgICAgIHNldmVyaXR5OiAnY3JpdGljYWwnLFxuICAgICAgICAgIGRldGFpbHM6IHsgdmFsdWUgfSxcbiAgICAgICAgfSk7XG4gICAgICAgIGJyZWFraW5nID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4ge1xuICAgIGhhc0NoYW5nZXM6IGRpZmYubGVuZ3RoID4gMCxcbiAgICBicmVha2luZyxcbiAgICBkaWZmLFxuICB9O1xufVxuXG4vKipcbiAqIEdlbmVyYXRlIHNlbWFudGljIGRpZmYgZm9yIE9wZW5BUEkgc3BlY3MuXG4gKiBcbiAqIEBwYXJhbSBiZWZvcmUgLSBPcmlnaW5hbCBPcGVuQVBJIHNwZWMgKEpTT04gc3RyaW5nKVxuICogQHBhcmFtIGFmdGVyIC0gTmV3IE9wZW5BUEkgc3BlYyAoSlNPTiBzdHJpbmcpXG4gKiBAcGFyYW0gYmVmb3JlVmVyc2lvbiAtIEN1cnJlbnQgdmVyc2lvbiAoc2VtdmVyKVxuICogQHBhcmFtIGFmdGVyVmVyc2lvbiAtIFByb3Bvc2VkIHZlcnNpb24gKHNlbXZlcilcbiAqIEByZXR1cm5zIE9wZW5BUElEaWZmIHJlc3VsdFxuICogXG4gKiBAZXhhbXBsZVxuICogYGBgdHlwZXNjcmlwdFxuICogY29uc3QgZGlmZiA9IGRpZmZPcGVuQVBJKFxuICogICBvbGRTcGVjLFxuICogICBuZXdTcGVjLFxuICogICAnMS4wLjAnLFxuICogICAnMS4xLjAnXG4gKiApO1xuICogXG4gKiBpZiAoZGlmZi5icmVha2luZykge1xuICogICBjb25zb2xlLmxvZygnQnJlYWtpbmcgY2hhbmdlcyBkZXRlY3RlZCEnKTtcbiAqIH1cbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZGlmZk9wZW5BUEkoXG4gIGJlZm9yZTogc3RyaW5nLFxuICBhZnRlcjogc3RyaW5nLFxuICBiZWZvcmVWZXJzaW9uOiBzdHJpbmcsXG4gIGFmdGVyVmVyc2lvbjogc3RyaW5nXG4pOiBPcGVuQVBJRGlmZiB7XG4gIGNvbnN0IGJlZm9yZVNwZWMgPSBwYXJzZU9wZW5BUEkoYmVmb3JlKTtcbiAgY29uc3QgYWZ0ZXJTcGVjID0gcGFyc2VPcGVuQVBJKGFmdGVyKTtcblxuICBjb25zdCBjaGFuZ2VzOiBPcGVuQVBJRGlmZlsnY2hhbmdlcyddID0ge1xuICAgIGFkZGVkOiBbXSxcbiAgICByZW1vdmVkOiBbXSxcbiAgICBtb2RpZmllZDogW10sXG4gIH07XG5cbiAgbGV0IGJyZWFraW5nID0gZmFsc2U7XG4gIGNvbnN0IGFsbERpZmZJdGVtczogRGlmZkl0ZW1bXSA9IFtdO1xuXG4gIC8vIENvbXBhcmUgcGF0aHNcbiAgY29uc3QgYmVmb3JlUGF0aHMgPSBuZXcgU2V0KE9iamVjdC5rZXlzKGJlZm9yZVNwZWMucGF0aHMgfHwge30pKTtcbiAgY29uc3QgYWZ0ZXJQYXRocyA9IG5ldyBTZXQoT2JqZWN0LmtleXMoYWZ0ZXJTcGVjLnBhdGhzIHx8IHt9KSk7XG5cbiAgLy8gTmV3IHBhdGhzL2VuZHBvaW50c1xuICBmb3IgKGNvbnN0IHBhdGggb2YgYWZ0ZXJQYXRocykge1xuICAgIGlmICghYmVmb3JlUGF0aHMuaGFzKHBhdGgpKSB7XG4gICAgICBjb25zdCBtZXRob2RzID0gT2JqZWN0LmtleXMoYWZ0ZXJTcGVjLnBhdGhzW3BhdGhdKTtcbiAgICAgIGZvciAoY29uc3QgbWV0aG9kIG9mIG1ldGhvZHMpIHtcbiAgICAgICAgY2hhbmdlcy5hZGRlZC5wdXNoKHtcbiAgICAgICAgICBwYXRoLFxuICAgICAgICAgIG1ldGhvZCxcbiAgICAgICAgICBzY2hlbWE6IGFmdGVyU3BlYy5wYXRoc1twYXRoXVttZXRob2RdLFxuICAgICAgICB9KTtcbiAgICAgICAgYWxsRGlmZkl0ZW1zLnB1c2goe1xuICAgICAgICAgIHBhdGg6IGAvcGF0aHMvJHtwYXRofS8ke21ldGhvZH1gLFxuICAgICAgICAgIHR5cGU6ICdlbmRwb2ludF9hZGQnLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiBgQWRkZWQgJHttZXRob2QudG9VcHBlckNhc2UoKX0gJHtwYXRofWAsXG4gICAgICAgICAgc2V2ZXJpdHk6ICdsb3cnLFxuICAgICAgICAgIGRldGFpbHM6IHsgbWV0aG9kLCBwYXRoIH0sXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIFJlbW92ZWQgcGF0aHMvZW5kcG9pbnRzIChicmVha2luZylcbiAgZm9yIChjb25zdCBwYXRoIG9mIGJlZm9yZVBhdGhzKSB7XG4gICAgaWYgKCFhZnRlclBhdGhzLmhhcyhwYXRoKSkge1xuICAgICAgY29uc3QgbWV0aG9kcyA9IE9iamVjdC5rZXlzKGJlZm9yZVNwZWMucGF0aHNbcGF0aF0pO1xuICAgICAgZm9yIChjb25zdCBtZXRob2Qgb2YgbWV0aG9kcykge1xuICAgICAgICBjaGFuZ2VzLnJlbW92ZWQucHVzaCh7IHBhdGgsIG1ldGhvZCB9KTtcbiAgICAgICAgYWxsRGlmZkl0ZW1zLnB1c2goe1xuICAgICAgICAgIHBhdGg6IGAvcGF0aHMvJHtwYXRofS8ke21ldGhvZH1gLFxuICAgICAgICAgIHR5cGU6ICdlbmRwb2ludF9yZW1vdmUnLFxuICAgICAgICAgIGRlc2NyaXB0aW9uOiBgUmVtb3ZlZCAke21ldGhvZC50b1VwcGVyQ2FzZSgpfSAke3BhdGh9YCxcbiAgICAgICAgICBzZXZlcml0eTogJ2NyaXRpY2FsJyxcbiAgICAgICAgICBkZXRhaWxzOiB7IG1ldGhvZCwgcGF0aCB9LFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIGJyZWFraW5nID0gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICAvLyBNb2RpZmllZCBwYXRoc1xuICBmb3IgKGNvbnN0IHBhdGggb2YgYWZ0ZXJQYXRocykge1xuICAgIGlmIChiZWZvcmVQYXRocy5oYXMocGF0aCkpIHtcbiAgICAgIGNvbnN0IGJlZm9yZU1ldGhvZHMgPSBiZWZvcmVTcGVjLnBhdGhzW3BhdGhdO1xuICAgICAgY29uc3QgYWZ0ZXJNZXRob2RzID0gYWZ0ZXJTcGVjLnBhdGhzW3BhdGhdO1xuXG4gICAgICBmb3IgKGNvbnN0IG1ldGhvZCBvZiBPYmplY3Qua2V5cyhhZnRlck1ldGhvZHMpKSB7XG4gICAgICAgIGlmIChiZWZvcmVNZXRob2RzW21ldGhvZF0pIHtcbiAgICAgICAgICAvLyBDb21wYXJlIHJlcXVlc3QvcmVzcG9uc2Ugc2NoZW1hc1xuICAgICAgICAgIGNvbnN0IGJlZm9yZVNjaGVtYSA9IGJlZm9yZU1ldGhvZHNbbWV0aG9kXTtcbiAgICAgICAgICBjb25zdCBhZnRlclNjaGVtYSA9IGFmdGVyTWV0aG9kc1ttZXRob2RdO1xuXG4gICAgICAgICAgY29uc3Qgc2NoZW1hRGlmZiA9IGNvbXBhcmVTY2hlbWFzKFxuICAgICAgICAgICAgYmVmb3JlU2NoZW1hLFxuICAgICAgICAgICAgYWZ0ZXJTY2hlbWEsXG4gICAgICAgICAgICBgL3BhdGhzLyR7cGF0aH0vJHttZXRob2R9YFxuICAgICAgICAgICk7XG5cbiAgICAgICAgICBpZiAoc2NoZW1hRGlmZi5oYXNDaGFuZ2VzKSB7XG4gICAgICAgICAgICBjaGFuZ2VzLm1vZGlmaWVkLnB1c2goe1xuICAgICAgICAgICAgICBwYXRoLFxuICAgICAgICAgICAgICBtZXRob2QsXG4gICAgICAgICAgICAgIHNjaGVtYURpZmY6IHtcbiAgICAgICAgICAgICAgICByZXF1ZXN0OiBiZWZvcmVTY2hlbWEucmVxdWVzdEJvZHksXG4gICAgICAgICAgICAgICAgcmVzcG9uc2U6IGJlZm9yZVNjaGVtYS5yZXNwb25zZXMsXG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIGFsbERpZmZJdGVtcy5wdXNoKC4uLnNjaGVtYURpZmYuZGlmZik7XG5cbiAgICAgICAgICAgIGlmIChzY2hlbWFEaWZmLmJyZWFraW5nKSB7XG4gICAgICAgICAgICAgIGJyZWFraW5nID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBDb21wYXJlIGNvbXBvbmVudCBzY2hlbWFzXG4gIGNvbnN0IGJlZm9yZVNjaGVtYXMgPSBiZWZvcmVTcGVjLmNvbXBvbmVudHM/LnNjaGVtYXMgfHwge307XG4gIGNvbnN0IGFmdGVyU2NoZW1hcyA9IGFmdGVyU3BlYy5jb21wb25lbnRzPy5zY2hlbWFzIHx8IHt9O1xuICBjb25zdCBiZWZvcmVTY2hlbWFOYW1lcyA9IG5ldyBTZXQoT2JqZWN0LmtleXMoYmVmb3JlU2NoZW1hcykpO1xuICBjb25zdCBhZnRlclNjaGVtYU5hbWVzID0gbmV3IFNldChPYmplY3Qua2V5cyhhZnRlclNjaGVtYXMpKTtcblxuICAvLyBOZXcgc2NoZW1hc1xuICBmb3IgKGNvbnN0IG5hbWUgb2YgYWZ0ZXJTY2hlbWFOYW1lcykge1xuICAgIGlmICghYmVmb3JlU2NoZW1hTmFtZXMuaGFzKG5hbWUpKSB7XG4gICAgICBhbGxEaWZmSXRlbXMucHVzaCh7XG4gICAgICAgIHBhdGg6IGAvY29tcG9uZW50cy9zY2hlbWFzLyR7bmFtZX1gLFxuICAgICAgICB0eXBlOiAnc2NoZW1hX2FkZCcsXG4gICAgICAgIGRlc2NyaXB0aW9uOiBgQWRkZWQgc2NoZW1hOiAke25hbWV9YCxcbiAgICAgICAgc2V2ZXJpdHk6ICdsb3cnLFxuICAgICAgICBkZXRhaWxzOiB7IHNjaGVtYTogbmFtZSB9LFxuICAgICAgfSk7XG4gICAgfVxuICB9XG5cbiAgLy8gUmVtb3ZlZCBzY2hlbWFzIChicmVha2luZylcbiAgZm9yIChjb25zdCBuYW1lIG9mIGJlZm9yZVNjaGVtYU5hbWVzKSB7XG4gICAgaWYgKCFhZnRlclNjaGVtYU5hbWVzLmhhcyhuYW1lKSkge1xuICAgICAgYWxsRGlmZkl0ZW1zLnB1c2goe1xuICAgICAgICBwYXRoOiBgL2NvbXBvbmVudHMvc2NoZW1hcy8ke25hbWV9YCxcbiAgICAgICAgdHlwZTogJ3NjaGVtYV9yZW1vdmUnLFxuICAgICAgICBkZXNjcmlwdGlvbjogYFJlbW92ZWQgc2NoZW1hOiAke25hbWV9YCxcbiAgICAgICAgc2V2ZXJpdHk6ICdjcml0aWNhbCcsXG4gICAgICAgIGRldGFpbHM6IHsgc2NoZW1hOiBuYW1lIH0sXG4gICAgICB9KTtcbiAgICAgIGJyZWFraW5nID0gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICAvLyBNb2RpZmllZCBzY2hlbWFzXG4gIGZvciAoY29uc3QgbmFtZSBvZiBhZnRlclNjaGVtYU5hbWVzKSB7XG4gICAgaWYgKGJlZm9yZVNjaGVtYU5hbWVzLmhhcyhuYW1lKSkge1xuICAgICAgY29uc3Qgc2NoZW1hRGlmZiA9IGNvbXBhcmVTY2hlbWFzKFxuICAgICAgICBiZWZvcmVTY2hlbWFzW25hbWVdLFxuICAgICAgICBhZnRlclNjaGVtYXNbbmFtZV0sXG4gICAgICAgIGAvY29tcG9uZW50cy9zY2hlbWFzLyR7bmFtZX1gXG4gICAgICApO1xuICAgICAgYWxsRGlmZkl0ZW1zLnB1c2goLi4uc2NoZW1hRGlmZi5kaWZmKTtcbiAgICAgIGlmIChzY2hlbWFEaWZmLmJyZWFraW5nKSBicmVha2luZyA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgLy8gRGV0ZXJtaW5lIHZlcnNpb24gYnVtcFxuICBjb25zdCBoYXNOZXdGZWF0dXJlcyA9IGNoYW5nZXMuYWRkZWQubGVuZ3RoID4gMDtcbiAgY29uc3QgaGFzQnVnRml4ZXMgPSBjaGFuZ2VzLm1vZGlmaWVkLmxlbmd0aCA+IDAgJiYgIWJyZWFraW5nO1xuICBjb25zdCBidW1wVHlwZSA9IGRldGVybWluZUJ1bXBUeXBlKHtcbiAgICBjdXJyZW50VmVyc2lvbjogYmVmb3JlVmVyc2lvbixcbiAgICBpc0JyZWFraW5nOiBicmVha2luZyxcbiAgICBoYXNOZXdGZWF0dXJlcyxcbiAgICBoYXNCdWdGaXhlcyxcbiAgfSk7XG5cbiAgLy8gR2VuZXJhdGUgY2hhbmdlbG9nXG4gIGNvbnN0IGNoYW5nZWxvZyA9IGdlbmVyYXRlT3BlbkFQSUNoYW5nZWxvZyhjaGFuZ2VzLCBicmVha2luZywgYnVtcFR5cGUpO1xuXG4gIC8vIENhbGN1bGF0ZSByaXNrIHNjb3JlXG4gIGNvbnN0IHJpc2tTY29yZSA9IGNhbGN1bGF0ZU9wZW5BUElSaXNrU2NvcmUoY2hhbmdlcywgYnJlYWtpbmcsIGFsbERpZmZJdGVtcyk7XG5cbiAgcmV0dXJuIHtcbiAgICBjb250cmFjdFR5cGU6ICdPcGVuQVBJJyxcbiAgICB2ZXJzaW9uOiB7XG4gICAgICBiZWZvcmU6IGJlZm9yZVZlcnNpb24sXG4gICAgICBhZnRlcjogYWZ0ZXJWZXJzaW9uLFxuICAgICAgYnVtcDogYnVtcFR5cGUsXG4gICAgfSxcbiAgICBjaGFuZ2VzLFxuICAgIGJyZWFraW5nLFxuICAgIHJlcXVpcmVzQXBwcm92YWw6IGJyZWFraW5nIHx8IGJ1bXBUeXBlID09PSAnbWFqb3InLFxuICAgIGNoYW5nZWxvZyxcbiAgICByaXNrU2NvcmUsXG4gIH07XG59XG5cbi8qKlxuICogR2VuZXJhdGUgY2hhbmdlbG9nIGZvciBPcGVuQVBJIGNoYW5nZXMuXG4gKi9cbmZ1bmN0aW9uIGdlbmVyYXRlT3BlbkFQSUNoYW5nZWxvZyhcbiAgY2hhbmdlczogT3BlbkFQSURpZmZbJ2NoYW5nZXMnXSxcbiAgYnJlYWtpbmc6IGJvb2xlYW4sXG4gIGJ1bXBUeXBlOiBzdHJpbmcgfCBudWxsXG4pOiBzdHJpbmcge1xuICBjb25zdCBsaW5lczogc3RyaW5nW10gPSBbXTtcblxuICBpZiAoYnJlYWtpbmcpIHtcbiAgICBsaW5lcy5wdXNoKCcjIyDimqDvuI8gQlJFQUtJTkcgQ0hBTkdFU1xcbicpO1xuICB9XG5cbiAgaWYgKGNoYW5nZXMucmVtb3ZlZC5sZW5ndGggPiAwKSB7XG4gICAgbGluZXMucHVzaCgnIyMjIFJlbW92ZWRcXG4nKTtcbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgY2hhbmdlcy5yZW1vdmVkKSB7XG4gICAgICBsaW5lcy5wdXNoKGAtICoqJHtpdGVtLm1ldGhvZC50b1VwcGVyQ2FzZSgpfSoqIFxcYCR7aXRlbS5wYXRofVxcYGApO1xuICAgIH1cbiAgICBsaW5lcy5wdXNoKCcnKTtcbiAgfVxuXG4gIGlmIChjaGFuZ2VzLmFkZGVkLmxlbmd0aCA+IDApIHtcbiAgICBsaW5lcy5wdXNoKCcjIyMgQWRkZWRcXG4nKTtcbiAgICBmb3IgKGNvbnN0IGl0ZW0gb2YgY2hhbmdlcy5hZGRlZCkge1xuICAgICAgbGluZXMucHVzaChgLSAqKiR7aXRlbS5tZXRob2QudG9VcHBlckNhc2UoKX0qKiBcXGAke2l0ZW0ucGF0aH1cXGBgKTtcbiAgICB9XG4gICAgbGluZXMucHVzaCgnJyk7XG4gIH1cblxuICBpZiAoY2hhbmdlcy5tb2RpZmllZC5sZW5ndGggPiAwKSB7XG4gICAgbGluZXMucHVzaCgnIyMjIE1vZGlmaWVkXFxuJyk7XG4gICAgZm9yIChjb25zdCBpdGVtIG9mIGNoYW5nZXMubW9kaWZpZWQpIHtcbiAgICAgIGxpbmVzLnB1c2goYC0gKioke2l0ZW0ubWV0aG9kLnRvVXBwZXJDYXNlKCl9KiogXFxgJHtpdGVtLnBhdGh9XFxgYCk7XG4gICAgfVxuICAgIGxpbmVzLnB1c2goJycpO1xuICB9XG5cbiAgaWYgKGxpbmVzLmxlbmd0aCA9PT0gMCkge1xuICAgIHJldHVybiAnTm8gc2lnbmlmaWNhbnQgY2hhbmdlcyBkZXRlY3RlZC4nO1xuICB9XG5cbiAgcmV0dXJuIGxpbmVzLmpvaW4oJ1xcbicpO1xufVxuXG4vKipcbiAqIENhbGN1bGF0ZSByaXNrIHNjb3JlIGZvciBPcGVuQVBJIGNoYW5nZXMuXG4gKi9cbmZ1bmN0aW9uIGNhbGN1bGF0ZU9wZW5BUElSaXNrU2NvcmUoXG4gIGNoYW5nZXM6IE9wZW5BUElEaWZmWydjaGFuZ2VzJ10sXG4gIGJyZWFraW5nOiBib29sZWFuLFxuICBhbGxEaWZmSXRlbXM6IERpZmZJdGVtW11cbik6IG51bWJlciB7XG4gIGxldCBzY29yZSA9IDUwOyAvLyBCYXNlIHNjb3JlXG5cbiAgLy8gQnJlYWtpbmcgY2hhbmdlcyBhZGQgc2lnbmlmaWNhbnQgcmlza1xuICBpZiAoYnJlYWtpbmcpIHtcbiAgICBzY29yZSArPSAzMDtcbiAgfVxuXG4gIC8vIENvdW50IGNyaXRpY2FsIHNldmVyaXR5IGl0ZW1zXG4gIGNvbnN0IGNyaXRpY2FsQ291bnQgPSBhbGxEaWZmSXRlbXMuZmlsdGVyKChkKSA9PiBkLnNldmVyaXR5ID09PSAnY3JpdGljYWwnKS5sZW5ndGg7XG4gIHNjb3JlICs9IGNyaXRpY2FsQ291bnQgKiA1O1xuXG4gIC8vIFJlbW92ZWQgZW5kcG9pbnRzIGFkZCByaXNrXG4gIHNjb3JlICs9IGNoYW5nZXMucmVtb3ZlZC5sZW5ndGggKiAxMDtcblxuICAvLyBDYXAgYXQgMTAwXG4gIHJldHVybiBNYXRoLm1pbigxMDAsIHNjb3JlKTtcbn1cblxuLyoqXG4gKiBDaGVjayBpZiBPcGVuQVBJIGRpZmYgY2FuIGJlIGF1dG8tYXBwcm92ZWQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjYW5BdXRvQXBwcm92ZU9wZW5BUEkoZGlmZjogT3BlbkFQSURpZmYpOiBib29sZWFuIHtcbiAgLy8gTXVzdCBub3QgYmUgYnJlYWtpbmdcbiAgaWYgKGRpZmYuYnJlYWtpbmcpIHJldHVybiBmYWxzZTtcblxuICAvLyBNdXN0IG9ubHkgYWRkIG9wdGlvbmFsIGZpZWxkc1xuICBmb3IgKGNvbnN0IGl0ZW0gb2YgZGlmZi5jaGFuZ2VzLmFkZGVkKSB7XG4gICAgLy8gQ2hlY2sgaWYgYWRkaW5nIHJlcXVpcmVkIGZpZWxkcyAodmlhIGRldGFpbHMgb3Igc2NoZW1hKVxuICAgIGlmIChpdGVtLmRldGFpbHM/LnJlcXVpcmVkID09PSB0cnVlIHx8IGl0ZW0uc2NoZW1hPy5yZXF1aXJlZD8ubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIC8vIE5vIHJlbW92ZWQgaXRlbXNcbiAgaWYgKGRpZmYuY2hhbmdlcy5yZW1vdmVkLmxlbmd0aCA+IDApIHJldHVybiBmYWxzZTtcblxuICAvLyBSaXNrIHNjb3JlIG11c3QgYmUgbG93XG4gIGlmICgoZGlmZi5yaXNrU2NvcmUgfHwgNTApID49IDIwKSByZXR1cm4gZmFsc2U7XG5cbiAgcmV0dXJuIHRydWU7XG59XG4iXX0=