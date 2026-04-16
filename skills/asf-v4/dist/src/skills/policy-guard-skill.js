"use strict";
/**
 * ANFSF V1.5.0 - Policy Guard Skill
 *
 * Policy enforcement guard for ownership, security, and compliance.
 * Integrated into Governance Harness.
 * Target latency: <10ms
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PolicyGuardSkill = void 0;
exports.createPolicyGuardSkill = createPolicyGuardSkill;
const base_1 = require("./base");
// ============================================================================
// Constants
// ============================================================================
const SECURITY_PATTERNS = [
    { pattern: /eval\s*\(/i, severity: 'critical', message: 'eval() usage detected' },
    { pattern: /new\s+Function\s*\(/i, severity: 'critical', message: 'new Function() usage detected' },
    { pattern: /exec\s*\(/i, severity: 'major', message: 'exec() usage detected' },
    { pattern: /execSync\s*\(/i, severity: 'major', message: 'execSync() usage detected' },
    { pattern: /spawn\s*\(/i, severity: 'major', message: 'spawn() usage detected' },
];
const COMPLIANCE_PATTERNS = [
    { pattern: /password\s*=\s*['"][^'"]+['"]/i, severity: 'critical', message: 'Hardcoded password detected' },
    { pattern: /api[_-]?key\s*=\s*['"][^'"]+['"]/i, severity: 'critical', message: 'Hardcoded API key detected' },
    { pattern: /secret\s*=\s*['"][^'"]+['"]/i, severity: 'critical', message: 'Hardcoded secret detected' },
    { pattern: /token\s*=\s*['"][^'"]+['"]/i, severity: 'major', message: 'Hardcoded token detected' },
    { pattern: /private[_-]?key/i, severity: 'critical', message: 'Private key reference detected' },
];
const OWNERSHIP_PATTERNS = [
    { pattern: /\/\/\s*Owner:\s*(.+)/i, type: 'owner' },
    { pattern: /\/\/\s*Copyright/i, type: 'copyright' },
    { pattern: /\/\/\s*License:\s*(.+)/i, type: 'license' },
];
// ============================================================================
// PolicyGuardSkill
// ============================================================================
class PolicyGuardSkill extends base_1.Skill {
    constructor() {
        super(...arguments);
        this.name = 'policy-guard';
        this.version = '1.0.0';
        this.description = '策略守卫 Skill - 所有权校验 + 安全策略 + 合规检查';
    }
    /**
     * Execute policy guard checks.
     * Target: <10ms
     */
    async execute(ctx) {
        const generatedCode = typeof ctx === 'string' ? ctx : (ctx.code || ctx.generatedCode || '');
        const violations = [];
        let score = 1.0;
        try {
            // Check 1: Security patterns
            const securityViolations = this.checkSecurityPatterns(generatedCode);
            violations.push(...securityViolations);
            // Check 2: Compliance patterns
            const complianceViolations = this.checkCompliancePatterns(generatedCode);
            violations.push(...complianceViolations);
            // Check 3: Ownership check
            const ownershipCheck = this.checkOwnership(generatedCode);
            if (!ownershipCheck.passed) {
                for (const conflict of ownershipCheck.conflicts) {
                    violations.push({
                        type: 'ownership',
                        severity: 'minor',
                        message: conflict,
                    });
                }
            }
            // Calculate score based on violations
            for (const violation of violations) {
                switch (violation.severity) {
                    case 'critical':
                        score -= 0.30;
                        break;
                    case 'major':
                        score -= 0.15;
                        break;
                    case 'minor':
                        score -= 0.05;
                        break;
                }
            }
            // Ensure score is within bounds
            score = Math.max(0, Math.min(1, score));
            // Critical violations always fail
            const hasCriticalViolations = violations.some(v => v.severity === 'critical');
            return {
                passed: !hasCriticalViolations && score >= 0.70,
                score,
                violations,
            };
        }
        catch (error) {
            return {
                passed: false,
                score: 0,
                violations: [{
                        type: 'security',
                        severity: 'critical',
                        message: `Policy check error: ${error}`,
                    }],
            };
        }
    }
    /**
     * Check security patterns.
     */
    checkSecurityPatterns(code) {
        const violations = [];
        for (const { pattern, severity, message } of SECURITY_PATTERNS) {
            if (pattern.test(code)) {
                violations.push({
                    type: 'security',
                    severity: severity,
                    message,
                    code: pattern.source,
                });
            }
        }
        return violations;
    }
    /**
     * Check compliance patterns.
     */
    checkCompliancePatterns(code) {
        const violations = [];
        for (const { pattern, severity, message } of COMPLIANCE_PATTERNS) {
            if (pattern.test(code)) {
                violations.push({
                    type: 'compliance',
                    severity: severity,
                    message,
                    code: pattern.source,
                });
            }
        }
        return violations;
    }
    /**
     * Check ownership metadata.
     */
    checkOwnership(code) {
        const conflicts = [];
        let owner;
        for (const { pattern, type } of OWNERSHIP_PATTERNS) {
            const match = code.match(pattern);
            if (match) {
                if (type === 'owner') {
                    owner = match[1]?.trim();
                }
            }
        }
        // Check for conflicting ownership
        const ownerMatches = code.match(/\/\/\s*Owner:\s*(.+)/gi) || [];
        if (ownerMatches.length > 1) {
            const owners = new Set(ownerMatches.map(m => m.split(':')[1]?.trim()));
            if (owners.size > 1) {
                conflicts.push(`Multiple owners detected: ${Array.from(owners).join(', ')}`);
            }
        }
        return {
            passed: conflicts.length === 0,
            owner,
            conflicts,
        };
    }
    /**
     * Get skill metadata.
     */
    getMetadata() {
        return {
            name: this.name,
            version: this.version,
            securityPatterns: SECURITY_PATTERNS.length,
            compliancePatterns: COMPLIANCE_PATTERNS.length,
            targetLatency: '<10ms',
        };
    }
}
exports.PolicyGuardSkill = PolicyGuardSkill;
/**
 * Create PolicyGuardSkill instance.
 */
function createPolicyGuardSkill() {
    return new PolicyGuardSkill();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9saWN5LWd1YXJkLXNraWxsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL3NraWxscy9wb2xpY3ktZ3VhcmQtc2tpbGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBNE5ILHdEQUVDO0FBNU5ELGlDQUE0QztBQXlCNUMsK0VBQStFO0FBQy9FLFlBQVk7QUFDWiwrRUFBK0U7QUFFL0UsTUFBTSxpQkFBaUIsR0FBRztJQUN4QixFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUU7SUFDakYsRUFBRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsK0JBQStCLEVBQUU7SUFDbkcsRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFO0lBQzlFLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLDJCQUEyQixFQUFFO0lBQ3RGLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRTtDQUNqRixDQUFDO0FBRUYsTUFBTSxtQkFBbUIsR0FBRztJQUMxQixFQUFFLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRTtJQUMzRyxFQUFFLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRTtJQUM3RyxFQUFFLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRTtJQUN2RyxFQUFFLE9BQU8sRUFBRSw2QkFB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LEVBQUUsQ0FBQyxDQUFDO1lBQy9FLENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTztZQUNMLE1BQU0sRUFBRSxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUM7WUFDOUIsS0FBSztZQUNMLFNBQVM7U0FDVixDQUFDO0lBQ0osQ0FBQztJQUVEOztPQUVHO0lBQ0gsV0FBVztRQUNULE9BQU87WUFDTCxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7WUFDZixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87WUFDckIsZ0JBQWdCLEVBQUUsaUJBQWlCLENBQUMsTUFBTTtZQUMxQyxrQkFBa0IsRUFBRSxtQkFBbUIsQ0FBQyxNQUFNO1lBQzlDLGFBQWEsRUFBRSxPQUFPO1NBQ3ZCLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUE5SkQsNENBOEpDO0FBRUQ7O0dBRUc7QUFDSCxTQUFnQixzQkFBc0I7SUFDcEMsT0FBTyxJQUFJLGdCQUFnQixFQUFFLENBQUM7QUFDaEMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQU5GU0YgVjEuNS4wIC0gUG9saWN5IEd1YXJkIFNraWxsXG4gKiBcbiAqIFBvbGljeSBlbmZvcmNlbWVudCBndWFyZCBmb3Igb3duZXJzaGlwLCBzZWN1cml0eSwgYW5kIGNvbXBsaWFuY2UuXG4gKiBJbnRlZ3JhdGVkIGludG8gR292ZXJuYW5jZSBIYXJuZXNzLlxuICogVGFyZ2V0IGxhdGVuY3k6IDwxMG1zXG4gKi9cblxuaW1wb3J0IHsgU2tpbGwsIFNraWxsUmVzdWx0IH0gZnJvbSAnLi9iYXNlJztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gVHlwZXNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGludGVyZmFjZSBQb2xpY3lDaGVja1Jlc3VsdCBleHRlbmRzIFNraWxsUmVzdWx0IHtcbiAgcGFzc2VkOiBib29sZWFuO1xuICBzY29yZTogbnVtYmVyO1xuICB2aW9sYXRpb25zOiBQb2xpY3lWaW9sYXRpb25bXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQb2xpY3lWaW9sYXRpb24ge1xuICB0eXBlOiAnc2VjdXJpdHknIHwgJ2NvbXBsaWFuY2UnIHwgJ293bmVyc2hpcCc7XG4gIHNldmVyaXR5OiAnY3JpdGljYWwnIHwgJ21ham9yJyB8ICdtaW5vcic7XG4gIG1lc3NhZ2U6IHN0cmluZztcbiAgY29kZT86IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBPd25lcnNoaXBDaGVja1Jlc3VsdCB7XG4gIHBhc3NlZDogYm9vbGVhbjtcbiAgb3duZXI/OiBzdHJpbmc7XG4gIGNvbmZsaWN0czogc3RyaW5nW107XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENvbnN0YW50c1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5jb25zdCBTRUNVUklUWV9QQVRURVJOUyA9IFtcbiAgeyBwYXR0ZXJuOiAvZXZhbFxccypcXCgvaSwgc2V2ZXJpdHk6ICdjcml0aWNhbCcsIG1lc3NhZ2U6ICdldmFsKCkgdXNhZ2UgZGV0ZWN0ZWQnIH0sXG4gIHsgcGF0dGVybjogL25ld1xccytGdW5jdGlvblxccypcXCgvaSwgc2V2ZXJpdHk6ICdjcml0aWNhbCcsIG1lc3NhZ2U6ICduZXcgRnVuY3Rpb24oKSB1c2FnZSBkZXRlY3RlZCcgfSxcbiAgeyBwYXR0ZXJuOiAvZXhlY1xccypcXCgvaSwgc2V2ZXJpdHk6ICdtYWpvcicsIG1lc3NhZ2U6ICdleGVjKCkgdXNhZ2UgZGV0ZWN0ZWQnIH0sXG4gIHsgcGF0dGVybjogL2V4ZWNTeW5jXFxzKlxcKC9pLCBzZXZlcml0eTogJ21ham9yJywgbWVzc2FnZTogJ2V4ZWNTeW5jKCkgdXNhZ2UgZGV0ZWN0ZWQnIH0sXG4gIHsgcGF0dGVybjogL3NwYXduXFxzKlxcKC9pLCBzZXZlcml0eTogJ21ham9yJywgbWVzc2FnZTogJ3NwYXduKCkgdXNhZ2UgZGV0ZWN0ZWQnIH0sXG5dO1xuXG5jb25zdCBDT01QTElBTkNFX1BBVFRFUk5TID0gW1xuICB7IHBhdHRlcm46IC9wYXNzd29yZFxccyo9XFxzKlsnXCJdW14nXCJdK1snXCJdL2ksIHNldmVyaXR5OiAnY3JpdGljYWwnLCBtZXNzYWdlOiAnSGFyZGNvZGVkIHBhc3N3b3JkIGRldGVjdGVkJyB9LFxuICB7IHBhdHRlcm46IC9hcGlbXy1dP2tleVxccyo9XFxzKlsnXCJdW14nXCJdK1snXCJdL2ksIHNldmVyaXR5OiAnY3JpdGljYWwnLCBtZXNzYWdlOiAnSGFyZGNvZGVkIEFQSSBrZXkgZGV0ZWN0ZWQnIH0sXG4gIHsgcGF0dGVybjogL3NlY3JldFxccyo9XFxzKlsnXCJdW14nXCJdK1snXCJdL2ksIHNldmVyaXR5OiAnY3JpdGljYWwnLCBtZXNzYWdlOiAnSGFyZGNvZGVkIHNlY3JldCBkZXRlY3RlZCcgfSxcbiAgeyBwYXR0ZXJuOiAvdG9rZW5cXHMqPVxccypbJ1wiXVteJ1wiXStbJ1wiXS9pLCBzZXZlcml0eTogJ21ham9yJywgbWVzc2FnZTogJ0hhcmRjb2RlZCB0b2tlbiBkZXRlY3RlZCcgfSxcbiAgeyBwYXR0ZXJuOiAvcHJpdmF0ZVtfLV0/a2V5L2ksIHNldmVyaXR5OiAnY3JpdGljYWwnLCBtZXNzYWdlOiAnUHJpdmF0ZSBrZXkgcmVmZXJlbmNlIGRldGVjdGVkJyB9LFxuXTtcblxuY29uc3QgT1dORVJTSElQX1BBVFRFUk5TID0gW1xuICB7IHBhdHRlcm46IC9cXC9cXC9cXHMqT3duZXI6XFxzKiguKykvaSwgdHlwZTogJ293bmVyJyB9LFxuICB7IHBhdHRlcm46IC9cXC9cXC9cXHMqQ29weXJpZ2h0L2ksIHR5cGU6ICdjb3B5cmlnaHQnIH0sXG4gIHsgcGF0dGVybjogL1xcL1xcL1xccypMaWNlbnNlOlxccyooLispL2ksIHR5cGU6ICdsaWNlbnNlJyB9LFxuXTtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gUG9saWN5R3VhcmRTa2lsbFxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgY2xhc3MgUG9saWN5R3VhcmRTa2lsbCBleHRlbmRzIFNraWxsIHtcbiAgbmFtZSA9ICdwb2xpY3ktZ3VhcmQnO1xuICB2ZXJzaW9uID0gJzEuMC4wJztcbiAgZGVzY3JpcHRpb24gPSAn562W55Wl5a6I5Y2rIFNraWxsIC0g5omA5pyJ5p2D5qCh6aqMICsg5a6J5YWo562W55WlICsg5ZCI6KeE5qOA5p+lJztcblxuICAvKipcbiAgICogRXhlY3V0ZSBwb2xpY3kgZ3VhcmQgY2hlY2tzLlxuICAgKiBUYXJnZXQ6IDwxMG1zXG4gICAqL1xuICBhc3luYyBleGVjdXRlKGN0eDogYW55KTogUHJvbWlzZTxQb2xpY3lDaGVja1Jlc3VsdD4ge1xuICAgIGNvbnN0IGdlbmVyYXRlZENvZGUgPSB0eXBlb2YgY3R4ID09PSAnc3RyaW5nJyA/IGN0eCA6IChjdHguY29kZSB8fCBjdHguZ2VuZXJhdGVkQ29kZSB8fCAnJyk7XG4gICAgY29uc3QgdmlvbGF0aW9uczogUG9saWN5VmlvbGF0aW9uW10gPSBbXTtcbiAgICBsZXQgc2NvcmUgPSAxLjA7XG5cbiAgICB0cnkge1xuICAgICAgLy8gQ2hlY2sgMTogU2VjdXJpdHkgcGF0dGVybnNcbiAgICAgIGNvbnN0IHNlY3VyaXR5VmlvbGF0aW9ucyA9IHRoaXMuY2hlY2tTZWN1cml0eVBhdHRlcm5zKGdlbmVyYXRlZENvZGUpO1xuICAgICAgdmlvbGF0aW9ucy5wdXNoKC4uLnNlY3VyaXR5VmlvbGF0aW9ucyk7XG5cbiAgICAgIC8vIENoZWNrIDI6IENvbXBsaWFuY2UgcGF0dGVybnNcbiAgICAgIGNvbnN0IGNvbXBsaWFuY2VWaW9sYXRpb25zID0gdGhpcy5jaGVja0NvbXBsaWFuY2VQYXR0ZXJucyhnZW5lcmF0ZWRDb2RlKTtcbiAgICAgIHZpb2xhdGlvbnMucHVzaCguLi5jb21wbGlhbmNlVmlvbGF0aW9ucyk7XG5cbiAgICAgIC8vIENoZWNrIDM6IE93bmVyc2hpcCBjaGVja1xuICAgICAgY29uc3Qgb3duZXJzaGlwQ2hlY2sgPSB0aGlzLmNoZWNrT3duZXJzaGlwKGdlbmVyYXRlZENvZGUpO1xuICAgICAgaWYgKCFvd25lcnNoaXBDaGVjay5wYXNzZWQpIHtcbiAgICAgICAgZm9yIChjb25zdCBjb25mbGljdCBvZiBvd25lcnNoaXBDaGVjay5jb25mbGljdHMpIHtcbiAgICAgICAgICB2aW9sYXRpb25zLnB1c2goe1xuICAgICAgICAgICAgdHlwZTogJ293bmVyc2hpcCcsXG4gICAgICAgICAgICBzZXZlcml0eTogJ21pbm9yJyxcbiAgICAgICAgICAgIG1lc3NhZ2U6IGNvbmZsaWN0LFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIENhbGN1bGF0ZSBzY29yZSBiYXNlZCBvbiB2aW9sYXRpb25zXG4gICAgICBmb3IgKGNvbnN0IHZpb2xhdGlvbiBvZiB2aW9sYXRpb25zKSB7XG4gICAgICAgIHN3aXRjaCAodmlvbGF0aW9uLnNldmVyaXR5KSB7XG4gICAgICAgICAgY2FzZSAnY3JpdGljYWwnOlxuICAgICAgICAgICAgc2NvcmUgLT0gMC4zMDtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ21ham9yJzpcbiAgICAgICAgICAgIHNjb3JlIC09IDAuMTU7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBjYXNlICdtaW5vcic6XG4gICAgICAgICAgICBzY29yZSAtPSAwLjA1O1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gRW5zdXJlIHNjb3JlIGlzIHdpdGhpbiBib3VuZHNcbiAgICAgIHNjb3JlID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oMSwgc2NvcmUpKTtcblxuICAgICAgLy8gQ3JpdGljYWwgdmlvbGF0aW9ucyBhbHdheXMgZmFpbFxuICAgICAgY29uc3QgaGFzQ3JpdGljYWxWaW9sYXRpb25zID0gdmlvbGF0aW9ucy5zb21lKHYgPT4gdi5zZXZlcml0eSA9PT0gJ2NyaXRpY2FsJyk7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHBhc3NlZDogIWhhc0NyaXRpY2FsVmlvbGF0aW9ucyAmJiBzY29yZSA+PSAwLjcwLFxuICAgICAgICBzY29yZSxcbiAgICAgICAgdmlvbGF0aW9ucyxcbiAgICAgIH07XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHBhc3NlZDogZmFsc2UsXG4gICAgICAgIHNjb3JlOiAwLFxuICAgICAgICB2aW9sYXRpb25zOiBbe1xuICAgICAgICAgIHR5cGU6ICdzZWN1cml0eScsXG4gICAgICAgICAgc2V2ZXJpdHk6ICdjcml0aWNhbCcsXG4gICAgICAgICAgbWVzc2FnZTogYFBvbGljeSBjaGVjayBlcnJvcjogJHtlcnJvcn1gLFxuICAgICAgICB9XSxcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrIHNlY3VyaXR5IHBhdHRlcm5zLlxuICAgKi9cbiAgcHJpdmF0ZSBjaGVja1NlY3VyaXR5UGF0dGVybnMoY29kZTogc3RyaW5nKTogUG9saWN5VmlvbGF0aW9uW10ge1xuICAgIGNvbnN0IHZpb2xhdGlvbnM6IFBvbGljeVZpb2xhdGlvbltdID0gW107XG5cbiAgICBmb3IgKGNvbnN0IHsgcGF0dGVybiwgc2V2ZXJpdHksIG1lc3NhZ2UgfSBvZiBTRUNVUklUWV9QQVRURVJOUykge1xuICAgICAgaWYgKHBhdHRlcm4udGVzdChjb2RlKSkge1xuICAgICAgICB2aW9sYXRpb25zLnB1c2goe1xuICAgICAgICAgIHR5cGU6ICdzZWN1cml0eScsXG4gICAgICAgICAgc2V2ZXJpdHk6IHNldmVyaXR5IGFzICdjcml0aWNhbCcgfCAnbWFqb3InIHwgJ21pbm9yJyxcbiAgICAgICAgICBtZXNzYWdlLFxuICAgICAgICAgIGNvZGU6IHBhdHRlcm4uc291cmNlLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdmlvbGF0aW9ucztcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayBjb21wbGlhbmNlIHBhdHRlcm5zLlxuICAgKi9cbiAgcHJpdmF0ZSBjaGVja0NvbXBsaWFuY2VQYXR0ZXJucyhjb2RlOiBzdHJpbmcpOiBQb2xpY3lWaW9sYXRpb25bXSB7XG4gICAgY29uc3QgdmlvbGF0aW9uczogUG9saWN5VmlvbGF0aW9uW10gPSBbXTtcblxuICAgIGZvciAoY29uc3QgeyBwYXR0ZXJuLCBzZXZlcml0eSwgbWVzc2FnZSB9IG9mIENPTVBMSUFOQ0VfUEFUVEVSTlMpIHtcbiAgICAgIGlmIChwYXR0ZXJuLnRlc3QoY29kZSkpIHtcbiAgICAgICAgdmlvbGF0aW9ucy5wdXNoKHtcbiAgICAgICAgICB0eXBlOiAnY29tcGxpYW5jZScsXG4gICAgICAgICAgc2V2ZXJpdHk6IHNldmVyaXR5IGFzICdjcml0aWNhbCcgfCAnbWFqb3InIHwgJ21pbm9yJyxcbiAgICAgICAgICBtZXNzYWdlLFxuICAgICAgICAgIGNvZGU6IHBhdHRlcm4uc291cmNlLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdmlvbGF0aW9ucztcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayBvd25lcnNoaXAgbWV0YWRhdGEuXG4gICAqL1xuICBwcml2YXRlIGNoZWNrT3duZXJzaGlwKGNvZGU6IHN0cmluZyk6IE93bmVyc2hpcENoZWNrUmVzdWx0IHtcbiAgICBjb25zdCBjb25mbGljdHM6IHN0cmluZ1tdID0gW107XG4gICAgbGV0IG93bmVyOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG5cbiAgICBmb3IgKGNvbnN0IHsgcGF0dGVybiwgdHlwZSB9IG9mIE9XTkVSU0hJUF9QQVRURVJOUykge1xuICAgICAgY29uc3QgbWF0Y2ggPSBjb2RlLm1hdGNoKHBhdHRlcm4pO1xuICAgICAgaWYgKG1hdGNoKSB7XG4gICAgICAgIGlmICh0eXBlID09PSAnb3duZXInKSB7XG4gICAgICAgICAgb3duZXIgPSBtYXRjaFsxXT8udHJpbSgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIGNvbmZsaWN0aW5nIG93bmVyc2hpcFxuICAgIGNvbnN0IG93bmVyTWF0Y2hlcyA9IGNvZGUubWF0Y2goL1xcL1xcL1xccypPd25lcjpcXHMqKC4rKS9naSkgfHwgW107XG4gICAgaWYgKG93bmVyTWF0Y2hlcy5sZW5ndGggPiAxKSB7XG4gICAgICBjb25zdCBvd25lcnMgPSBuZXcgU2V0KG93bmVyTWF0Y2hlcy5tYXAobSA9PiBtLnNwbGl0KCc6JylbMV0/LnRyaW0oKSkpO1xuICAgICAgaWYgKG93bmVycy5zaXplID4gMSkge1xuICAgICAgICBjb25mbGljdHMucHVzaChgTXVsdGlwbGUgb3duZXJzIGRldGVjdGVkOiAke0FycmF5LmZyb20ob3duZXJzKS5qb2luKCcsICcpfWApO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBwYXNzZWQ6IGNvbmZsaWN0cy5sZW5ndGggPT09IDAsXG4gICAgICBvd25lcixcbiAgICAgIGNvbmZsaWN0cyxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBza2lsbCBtZXRhZGF0YS5cbiAgICovXG4gIGdldE1ldGFkYXRhKCk6IFJlY29yZDxzdHJpbmcsIGFueT4ge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICB2ZXJzaW9uOiB0aGlzLnZlcnNpb24sXG4gICAgICBzZWN1cml0eVBhdHRlcm5zOiBTRUNVUklUWV9QQVRURVJOUy5sZW5ndGgsXG4gICAgICBjb21wbGlhbmNlUGF0dGVybnM6IENPTVBMSUFOQ0VfUEFUVEVSTlMubGVuZ3RoLFxuICAgICAgdGFyZ2V0TGF0ZW5jeTogJzwxMG1zJyxcbiAgICB9O1xuICB9XG59XG5cbi8qKlxuICogQ3JlYXRlIFBvbGljeUd1YXJkU2tpbGwgaW5zdGFuY2UuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVQb2xpY3lHdWFyZFNraWxsKCk6IFBvbGljeUd1YXJkU2tpbGwge1xuICByZXR1cm4gbmV3IFBvbGljeUd1YXJkU2tpbGwoKTtcbn1cbiJdfQ==