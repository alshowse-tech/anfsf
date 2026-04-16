"use strict";
/**
 * ANFSF V1.5.0 - Code Quality Guard Skill
 *
 * Inline guard for code quality checking.
 * Integrated into Governance Harness.
 * Target latency: <10ms
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeQualityGuardSkill = void 0;
exports.createCodeQualityGuardSkill = createCodeQualityGuardSkill;
const base_1 = require("./base");
// ============================================================================
// Constants
// ============================================================================
const QUALITY_THRESHOLD = 0.92;
const WEIGHTS = {
    static: 0.30,
    semantic: 0.30,
    performance: 0.20,
    policy: 0.20,
};
// ============================================================================
// CodeQualityGuardSkill
// ============================================================================
class CodeQualityGuardSkill extends base_1.Skill {
    constructor() {
        super(...arguments);
        this.name = 'code-quality-guard';
        this.version = '1.0.0';
        this.description = '代码质量守卫 Skill - 静态分析 + 语义验证 + 性能预测 + 策略检查';
        this.qualityThreshold = QUALITY_THRESHOLD;
    }
    /**
     * Execute code quality guard checks.
     * Target: <10ms (parallel execution)
     */
    async execute(ctx) {
        const generatedCode = typeof ctx === 'string' ? ctx : (ctx.code || ctx.generatedCode || '');
        const requirementGraph = ctx.requirementGraph || ctx.graph || { nodes: [], edges: [], quality: 1.0, completeness: 1.0, traceId: 'test' };
        const startTime = Date.now();
        try {
            // Parallel execution of all checks (<10ms target)
            const [staticResult, semanticResult, performanceResult, policyResult] = await Promise.all([
                this.runStaticAnalysis(generatedCode),
                this.runSemanticValidation(generatedCode, requirementGraph),
                this.runPerformancePrediction(generatedCode),
                this.runPolicyCheck(generatedCode),
            ]);
            // Calculate weighted overall score
            const overallScore = this.calculateWeightedScore([
                staticResult,
                semanticResult,
                performanceResult,
                policyResult,
            ]);
            // Check against threshold
            if (overallScore < this.qualityThreshold) {
                return {
                    passed: false,
                    score: overallScore,
                    reason: `quality_below_threshold: ${overallScore.toFixed(3)} < ${this.qualityThreshold}`,
                    details: { staticResult, semanticResult, performanceResult, policyResult },
                };
            }
            // Check individual failures
            if (!staticResult.passed || !semanticResult.passed || !performanceResult.passed || !policyResult.passed) {
                const failures = [];
                if (!staticResult.passed)
                    failures.push('static_analysis');
                if (!semanticResult.passed)
                    failures.push('semantic_validation');
                if (!performanceResult.passed)
                    failures.push('performance_prediction');
                if (!policyResult.passed)
                    failures.push('policy_check');
                return {
                    passed: false,
                    score: overallScore,
                    reason: `guard_failures: ${failures.join(', ')}`,
                    details: { staticResult, semanticResult, performanceResult, policyResult },
                };
            }
            return {
                passed: true,
                score: overallScore,
                details: { staticResult, semanticResult, performanceResult, policyResult },
            };
        }
        catch (error) {
            return {
                passed: false,
                reason: `guard_error: ${error}`,
            };
        }
    }
    /**
     * Run static analysis (complexity, readability, security scan).
     */
    async runStaticAnalysis(code) {
        const issues = [];
        let score = 1.0;
        // Check 1: Code length
        const lines = code.split('\n');
        if (lines.length > 500) {
            issues.push(`File too long: ${lines.length} lines (>500)`);
            score -= 0.20;
        }
        // Check 2: Function complexity (simplified cyclomatic)
        const functionMatches = code.match(/function\s+\w+\s*\([^)]*\)\s*\{/g) || [];
        const avgFunctionLength = lines.length / Math.max(1, functionMatches.length);
        if (avgFunctionLength > 100) {
            issues.push(`Functions too complex: avg ${avgFunctionLength.toFixed(0)} lines (>100)`);
            score -= 0.15;
        }
        // Check 3: Nesting depth
        const maxNesting = (code.match(/\{\s*\{/g) || []).length;
        if (maxNesting > 5) {
            issues.push(`Deep nesting detected: ${maxNesting} levels (>5)`);
            score -= 0.10;
        }
        // Check 4: TODO/FIXME comments
        const todoCount = (code.match(/TODO|FIXME/g) || []).length;
        if (todoCount > 5) {
            issues.push(`Too many TODO/FIXME: ${todoCount} (>5)`);
            score -= 0.05;
        }
        // Check 5: Console.log usage (production code)
        const consoleCount = (code.match(/console\.log/g) || []).length;
        if (consoleCount > 3) {
            issues.push(`Excessive console.log: ${consoleCount} (>3)`);
            score -= 0.05;
        }
        return {
            passed: score >= 0.70,
            score: Math.max(0, score),
            issues,
            complexity: avgFunctionLength,
            readability: 1.0 - (issues.length * 0.05),
        };
    }
    /**
     * Run semantic validation (cross-validate with requirement graph).
     */
    async runSemanticValidation(code, graph) {
        const mismatches = [];
        let score = 1.0;
        // Check if code implements required features
        for (const node of graph.nodes) {
            if (node.type === 'requirement') {
                const keywords = node.content.toLowerCase().split(' ').filter(w => w.length > 3);
                const hasMatch = keywords.some(kw => code.toLowerCase().includes(kw));
                if (!hasMatch) {
                    mismatches.push(`Requirement not implemented: ${node.content}`);
                    score -= 0.10;
                }
            }
        }
        // Check for undefined functions/APIs
        const undefinedPatterns = ['unknown_api', 'not_defined', 'placeholder', 'TODO_IMPLEMENT'];
        for (const pattern of undefinedPatterns) {
            if (code.includes(pattern)) {
                mismatches.push(`Undefined reference: ${pattern}`);
                score -= 0.15;
            }
        }
        return {
            passed: score >= 0.70,
            score: Math.max(0, score),
            mismatches,
        };
    }
    /**
     * Run performance prediction (estimate latency and memory).
     */
    async runPerformancePrediction(code) {
        const issues = [];
        let score = 1.0;
        let estimatedLatency = 10; // ms
        let estimatedMemory = 10; // MB
        // Check 1: Synchronous operations in async context
        if (code.includes('fs.readFileSync') || code.includes('fs.readSync')) {
            issues.push('Synchronous file I/O detected');
            score -= 0.20;
            estimatedLatency += 50;
        }
        // Check 2: Large loops
        const largeLoopMatches = code.match(/for\s*\(\s*let\s+\w+\s*=\s*0\s*;\s*\w+\s*<\s*(\d+)/g);
        if (largeLoopMatches) {
            const maxIterations = Math.max(...largeLoopMatches.map(m => {
                const match = m.match(/\d+/);
                return match ? parseInt(match[0]) : 0;
            }));
            if (maxIterations > 10000) {
                issues.push(`Large loop detected: ${maxIterations} iterations (>10000)`);
                score -= 0.15;
                estimatedLatency += maxIterations / 1000;
            }
        }
        // Check 3: Memory-intensive operations
        if (code.includes('new Array(') || code.includes('Array.from')) {
            issues.push('Large array allocation detected');
            score -= 0.10;
            estimatedMemory += 20;
        }
        return {
            passed: score >= 0.70,
            score: Math.max(0, score),
            issues,
            estimatedLatency,
            estimatedMemory,
        };
    }
    /**
     * Run policy check (ownership, security, compliance).
     */
    async runPolicyCheck(code) {
        const violations = [];
        let score = 1.0;
        // Check 1: Security - eval usage
        if (code.includes('eval(')) {
            violations.push('Security violation: eval() usage detected');
            score -= 0.30;
        }
        // Check 2: Security - new Function
        if (code.includes('new Function(')) {
            violations.push('Security violation: new Function() usage detected');
            score -= 0.30;
        }
        // Check 3: Security - child_process exec
        if (code.includes('exec(') || code.includes('execSync(')) {
            violations.push('Security violation: child_process exec usage detected');
            score -= 0.20;
        }
        // Check 4: Compliance - hardcoded secrets
        const secretPatterns = [/password\s*=\s*['"][^'"]+['"]/i, /api_key\s*=\s*['"][^'"]+['"]/i, /secret\s*=\s*['"][^'"]+['"]/i];
        for (const pattern of secretPatterns) {
            if (pattern.test(code)) {
                violations.push('Compliance violation: hardcoded secret detected');
                score -= 0.25;
            }
        }
        // Check 5: License headers
        if (!code.includes('MIT') && !code.includes('Apache') && !code.includes('GPL')) {
            // Optional check, don't penalize heavily
            // violations.push('Missing license header');
            // score -= 0.05;
        }
        return {
            passed: score >= 0.70 && violations.length === 0,
            score: Math.max(0, score),
            violations,
        };
    }
    /**
     * Calculate weighted overall score.
     */
    calculateWeightedScore(results) {
        const total = results.reduce((sum, result, index) => {
            const weight = Object.values(WEIGHTS)[index] || 0.25;
            return sum + result.score * weight;
        }, 0);
        return total;
    }
    /**
     * Get skill metadata.
     */
    getMetadata() {
        return {
            name: this.name,
            version: this.version,
            qualityThreshold: this.qualityThreshold,
            weights: WEIGHTS,
            targetLatency: '<10ms',
        };
    }
}
exports.CodeQualityGuardSkill = CodeQualityGuardSkill;
/**
 * Create CodeQualityGuardSkill instance.
 */
function createCodeQualityGuardSkill() {
    return new CodeQualityGuardSkill();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZS1xdWFsaXR5LWd1YXJkLXNraWxsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL3NraWxscy9jb2RlLXF1YWxpdHktZ3VhcmQtc2tpbGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7R0FNRzs7O0FBK1ZILGtFQUVDO0FBL1ZELGlDQUE0QztBQStDNUMsK0VBQStFO0FBQy9FLFlBQVk7QUFDWiwrRUFBK0U7QUFFL0UsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUM7QUFFL0IsTUFBTSxPQUFPLEdBQUc7SUFDZCxNQUFNLEVBQUUsSUFBSTtJQUNaLFFBQVEsRUFBRSxJQUFJO0lBQ2QsV0FBVyxFQUFFLElBQUk7SUFDakIsTUFBTSxFQUFFLElBQUk7Q0FDYixDQUFDO0FBRUYsK0VBQStFO0FBQy9FLHdCQUF3QjtBQUN4QiwrRUFBK0U7QUFFL0UsTUFBYSxxQkFBc0IsU0FBUSxZQUFLO0lBQWhEOztRQUNFLFNBQUksR0FBRyxvQkFBb0IsQ0FBQztRQUM1QixZQUFPLEdBQUcsT0FBTyxDQUFDO1FBQ2xCLGdCQUFXLEdBQUcsMENBQTBDLENBQUM7UUFFeEMscUJBQWdCLEdBQUcsaUJBQWlCLENBQUM7SUFtUnhELENBQUM7SUFqUkM7OztPQUdHO0lBQ0gsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFRO1FBQ3BCLE1BQU0sYUFBYSxHQUFHLE9BQU8sR0FBRyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksR0FBRyxDQUFDLGFBQWEsSUFBSSxFQUFFLENBQUMsQ0FBQztRQUM1RixNQUFNLGdCQUFnQixHQUFHLEdBQUcsQ0FBQyxnQkFBZ0IsSUFBSSxHQUFHLENBQUMsS0FBSyxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLEVBQUUsRUFBRSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsWUFBWSxFQUFFLEdB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TyxFQUFFLE9BQU87WUFDaEIsYUFBYSxFQUFFLE9BQU87U0FDdkIsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQXhSRCxzREF3UkM7QUFFRDs7R0FFRztBQUNILFNBQWdCLDJCQUEyQjtJQUN6QyxPQUFPLElBQUkscUJBQXFCLEVBQUUsQ0FBQztBQUNyQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBBTkZTRiBWMS41LjAgLSBDb2RlIFF1YWxpdHkgR3VhcmQgU2tpbGxcbiAqIFxuICogSW5saW5lIGd1YXJkIGZvciBjb2RlIHF1YWxpdHkgY2hlY2tpbmcuXG4gKiBJbnRlZ3JhdGVkIGludG8gR292ZXJuYW5jZSBIYXJuZXNzLlxuICogVGFyZ2V0IGxhdGVuY3k6IDwxMG1zXG4gKi9cblxuaW1wb3J0IHsgU2tpbGwsIFNraWxsUmVzdWx0IH0gZnJvbSAnLi9iYXNlJztcbmltcG9ydCB7IFJlZmluZWRHcmFwaCB9IGZyb20gJy4vcmVxdWlyZW1lbnQtcmVmaW5lci1za2lsbCc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFR5cGVzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBpbnRlcmZhY2UgR3VhcmRSZXN1bHQgZXh0ZW5kcyBTa2lsbFJlc3VsdCB7XG4gIHBhc3NlZDogYm9vbGVhbjtcbiAgc2NvcmU/OiBudW1iZXI7XG4gIHJlYXNvbj86IHN0cmluZztcbiAgZGV0YWlscz86IHtcbiAgICBzdGF0aWNSZXN1bHQ/OiBTdGF0aWNBbmFseXNpc1Jlc3VsdDtcbiAgICBzZW1hbnRpY1Jlc3VsdD86IFNlbWFudGljVmFsaWRhdGlvblJlc3VsdDtcbiAgICBwZXJmb3JtYW5jZVJlc3VsdD86IFBlcmZvcm1hbmNlUHJlZGljdGlvblJlc3VsdDtcbiAgICBwb2xpY3lSZXN1bHQ/OiBQb2xpY3lDaGVja1Jlc3VsdDtcbiAgfTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBTdGF0aWNBbmFseXNpc1Jlc3VsdCB7XG4gIHBhc3NlZDogYm9vbGVhbjtcbiAgc2NvcmU6IG51bWJlcjtcbiAgaXNzdWVzOiBzdHJpbmdbXTtcbiAgY29tcGxleGl0eT86IG51bWJlcjtcbiAgcmVhZGFiaWxpdHk/OiBudW1iZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VtYW50aWNWYWxpZGF0aW9uUmVzdWx0IHtcbiAgcGFzc2VkOiBib29sZWFuO1xuICBzY29yZTogbnVtYmVyO1xuICBtaXNtYXRjaGVzOiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQZXJmb3JtYW5jZVByZWRpY3Rpb25SZXN1bHQge1xuICBwYXNzZWQ6IGJvb2xlYW47XG4gIHNjb3JlOiBudW1iZXI7XG4gIGlzc3Vlczogc3RyaW5nW107XG4gIGVzdGltYXRlZExhdGVuY3k/OiBudW1iZXI7XG4gIGVzdGltYXRlZE1lbW9yeT86IG51bWJlcjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBQb2xpY3lDaGVja1Jlc3VsdCB7XG4gIHBhc3NlZDogYm9vbGVhbjtcbiAgc2NvcmU6IG51bWJlcjtcbiAgdmlvbGF0aW9uczogc3RyaW5nW107XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENvbnN0YW50c1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5jb25zdCBRVUFMSVRZX1RIUkVTSE9MRCA9IDAuOTI7XG5cbmNvbnN0IFdFSUdIVFMgPSB7XG4gIHN0YXRpYzogMC4zMCxcbiAgc2VtYW50aWM6IDAuMzAsXG4gIHBlcmZvcm1hbmNlOiAwLjIwLFxuICBwb2xpY3k6IDAuMjAsXG59O1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBDb2RlUXVhbGl0eUd1YXJkU2tpbGxcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGNsYXNzIENvZGVRdWFsaXR5R3VhcmRTa2lsbCBleHRlbmRzIFNraWxsIHtcbiAgbmFtZSA9ICdjb2RlLXF1YWxpdHktZ3VhcmQnO1xuICB2ZXJzaW9uID0gJzEuMC4wJztcbiAgZGVzY3JpcHRpb24gPSAn5Luj56CB6LSo6YeP5a6I5Y2rIFNraWxsIC0g6Z2Z5oCB5YiG5p6QICsg6K+t5LmJ6aqM6K+BICsg5oCn6IO96aKE5rWLICsg562W55Wl5qOA5p+lJztcblxuICBwcml2YXRlIHJlYWRvbmx5IHF1YWxpdHlUaHJlc2hvbGQgPSBRVUFMSVRZX1RIUkVTSE9MRDtcblxuICAvKipcbiAgICogRXhlY3V0ZSBjb2RlIHF1YWxpdHkgZ3VhcmQgY2hlY2tzLlxuICAgKiBUYXJnZXQ6IDwxMG1zIChwYXJhbGxlbCBleGVjdXRpb24pXG4gICAqL1xuICBhc3luYyBleGVjdXRlKGN0eDogYW55KTogUHJvbWlzZTxHdWFyZFJlc3VsdD4ge1xuICAgIGNvbnN0IGdlbmVyYXRlZENvZGUgPSB0eXBlb2YgY3R4ID09PSAnc3RyaW5nJyA/IGN0eCA6IChjdHguY29kZSB8fCBjdHguZ2VuZXJhdGVkQ29kZSB8fCAnJyk7XG4gICAgY29uc3QgcmVxdWlyZW1lbnRHcmFwaCA9IGN0eC5yZXF1aXJlbWVudEdyYXBoIHx8IGN0eC5ncmFwaCB8fCB7IG5vZGVzOiBbXSwgZWRnZXM6IFtdLCBxdWFsaXR5OiAxLjAsIGNvbXBsZXRlbmVzczogMS4wLCB0cmFjZUlkOiAndGVzdCcgfTtcbiAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xuXG4gICAgdHJ5IHtcbiAgICAgIC8vIFBhcmFsbGVsIGV4ZWN1dGlvbiBvZiBhbGwgY2hlY2tzICg8MTBtcyB0YXJnZXQpXG4gICAgICBjb25zdCBbc3RhdGljUmVzdWx0LCBzZW1hbnRpY1Jlc3VsdCwgcGVyZm9ybWFuY2VSZXN1bHQsIHBvbGljeVJlc3VsdF0gPSBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgICAgIHRoaXMucnVuU3RhdGljQW5hbHlzaXMoZ2VuZXJhdGVkQ29kZSksXG4gICAgICAgIHRoaXMucnVuU2VtYW50aWNWYWxpZGF0aW9uKGdlbmVyYXRlZENvZGUsIHJlcXVpcmVtZW50R3JhcGgpLFxuICAgICAgICB0aGlzLnJ1blBlcmZvcm1hbmNlUHJlZGljdGlvbihnZW5lcmF0ZWRDb2RlKSxcbiAgICAgICAgdGhpcy5ydW5Qb2xpY3lDaGVjayhnZW5lcmF0ZWRDb2RlKSxcbiAgICAgIF0pO1xuXG4gICAgICAvLyBDYWxjdWxhdGUgd2VpZ2h0ZWQgb3ZlcmFsbCBzY29yZVxuICAgICAgY29uc3Qgb3ZlcmFsbFNjb3JlID0gdGhpcy5jYWxjdWxhdGVXZWlnaHRlZFNjb3JlKFtcbiAgICAgICAgc3RhdGljUmVzdWx0LFxuICAgICAgICBzZW1hbnRpY1Jlc3VsdCxcbiAgICAgICAgcGVyZm9ybWFuY2VSZXN1bHQsXG4gICAgICAgIHBvbGljeVJlc3VsdCxcbiAgICAgIF0pO1xuXG4gICAgICAvLyBDaGVjayBhZ2FpbnN0IHRocmVzaG9sZFxuICAgICAgaWYgKG92ZXJhbGxTY29yZSA8IHRoaXMucXVhbGl0eVRocmVzaG9sZCkge1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgIHBhc3NlZDogZmFsc2UsXG4gICAgICAgICAgc2NvcmU6IG92ZXJhbGxTY29yZSxcbiAgICAgICAgICByZWFzb246IGBxdWFsaXR5X2JlbG93X3RocmVzaG9sZDogJHtvdmVyYWxsU2NvcmUudG9GaXhlZCgzKX0gPCAke3RoaXMucXVhbGl0eVRocmVzaG9sZH1gLFxuICAgICAgICAgIGRldGFpbHM6IHsgc3RhdGljUmVzdWx0LCBzZW1hbnRpY1Jlc3VsdCwgcGVyZm9ybWFuY2VSZXN1bHQsIHBvbGljeVJlc3VsdCB9LFxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICAvLyBDaGVjayBpbmRpdmlkdWFsIGZhaWx1cmVzXG4gICAgICBpZiAoIXN0YXRpY1Jlc3VsdC5wYXNzZWQgfHwgIXNlbWFudGljUmVzdWx0LnBhc3NlZCB8fCAhcGVyZm9ybWFuY2VSZXN1bHQucGFzc2VkIHx8ICFwb2xpY3lSZXN1bHQucGFzc2VkKSB7XG4gICAgICAgIGNvbnN0IGZhaWx1cmVzID0gW107XG4gICAgICAgIGlmICghc3RhdGljUmVzdWx0LnBhc3NlZCkgZmFpbHVyZXMucHVzaCgnc3RhdGljX2FuYWx5c2lzJyk7XG4gICAgICAgIGlmICghc2VtYW50aWNSZXN1bHQucGFzc2VkKSBmYWlsdXJlcy5wdXNoKCdzZW1hbnRpY192YWxpZGF0aW9uJyk7XG4gICAgICAgIGlmICghcGVyZm9ybWFuY2VSZXN1bHQucGFzc2VkKSBmYWlsdXJlcy5wdXNoKCdwZXJmb3JtYW5jZV9wcmVkaWN0aW9uJyk7XG4gICAgICAgIGlmICghcG9saWN5UmVzdWx0LnBhc3NlZCkgZmFpbHVyZXMucHVzaCgncG9saWN5X2NoZWNrJyk7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBwYXNzZWQ6IGZhbHNlLFxuICAgICAgICAgIHNjb3JlOiBvdmVyYWxsU2NvcmUsXG4gICAgICAgICAgcmVhc29uOiBgZ3VhcmRfZmFpbHVyZXM6ICR7ZmFpbHVyZXMuam9pbignLCAnKX1gLFxuICAgICAgICAgIGRldGFpbHM6IHsgc3RhdGljUmVzdWx0LCBzZW1hbnRpY1Jlc3VsdCwgcGVyZm9ybWFuY2VSZXN1bHQsIHBvbGljeVJlc3VsdCB9LFxuICAgICAgICB9O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBwYXNzZWQ6IHRydWUsXG4gICAgICAgIHNjb3JlOiBvdmVyYWxsU2NvcmUsXG4gICAgICAgIGRldGFpbHM6IHsgc3RhdGljUmVzdWx0LCBzZW1hbnRpY1Jlc3VsdCwgcGVyZm9ybWFuY2VSZXN1bHQsIHBvbGljeVJlc3VsdCB9LFxuICAgICAgfTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcGFzc2VkOiBmYWxzZSxcbiAgICAgICAgcmVhc29uOiBgZ3VhcmRfZXJyb3I6ICR7ZXJyb3J9YCxcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJ1biBzdGF0aWMgYW5hbHlzaXMgKGNvbXBsZXhpdHksIHJlYWRhYmlsaXR5LCBzZWN1cml0eSBzY2FuKS5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgcnVuU3RhdGljQW5hbHlzaXMoY29kZTogc3RyaW5nKTogUHJvbWlzZTxTdGF0aWNBbmFseXNpc1Jlc3VsdD4ge1xuICAgIGNvbnN0IGlzc3Vlczogc3RyaW5nW10gPSBbXTtcbiAgICBsZXQgc2NvcmUgPSAxLjA7XG5cbiAgICAvLyBDaGVjayAxOiBDb2RlIGxlbmd0aFxuICAgIGNvbnN0IGxpbmVzID0gY29kZS5zcGxpdCgnXFxuJyk7XG4gICAgaWYgKGxpbmVzLmxlbmd0aCA+IDUwMCkge1xuICAgICAgaXNzdWVzLnB1c2goYEZpbGUgdG9vIGxvbmc6ICR7bGluZXMubGVuZ3RofSBsaW5lcyAoPjUwMClgKTtcbiAgICAgIHNjb3JlIC09IDAuMjA7XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgMjogRnVuY3Rpb24gY29tcGxleGl0eSAoc2ltcGxpZmllZCBjeWNsb21hdGljKVxuICAgIGNvbnN0IGZ1bmN0aW9uTWF0Y2hlcyA9IGNvZGUubWF0Y2goL2Z1bmN0aW9uXFxzK1xcdytcXHMqXFwoW14pXSpcXClcXHMqXFx7L2cpIHx8IFtdO1xuICAgIGNvbnN0IGF2Z0Z1bmN0aW9uTGVuZ3RoID0gbGluZXMubGVuZ3RoIC8gTWF0aC5tYXgoMSwgZnVuY3Rpb25NYXRjaGVzLmxlbmd0aCk7XG4gICAgaWYgKGF2Z0Z1bmN0aW9uTGVuZ3RoID4gMTAwKSB7XG4gICAgICBpc3N1ZXMucHVzaChgRnVuY3Rpb25zIHRvbyBjb21wbGV4OiBhdmcgJHthdmdGdW5jdGlvbkxlbmd0aC50b0ZpeGVkKDApfSBsaW5lcyAoPjEwMClgKTtcbiAgICAgIHNjb3JlIC09IDAuMTU7XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgMzogTmVzdGluZyBkZXB0aFxuICAgIGNvbnN0IG1heE5lc3RpbmcgPSAoY29kZS5tYXRjaCgvXFx7XFxzKlxcey9nKSB8fCBbXSkubGVuZ3RoO1xuICAgIGlmIChtYXhOZXN0aW5nID4gNSkge1xuICAgICAgaXNzdWVzLnB1c2goYERlZXAgbmVzdGluZyBkZXRlY3RlZDogJHttYXhOZXN0aW5nfSBsZXZlbHMgKD41KWApO1xuICAgICAgc2NvcmUgLT0gMC4xMDtcbiAgICB9XG5cbiAgICAvLyBDaGVjayA0OiBUT0RPL0ZJWE1FIGNvbW1lbnRzXG4gICAgY29uc3QgdG9kb0NvdW50ID0gKGNvZGUubWF0Y2goL1RPRE98RklYTUUvZykgfHwgW10pLmxlbmd0aDtcbiAgICBpZiAodG9kb0NvdW50ID4gNSkge1xuICAgICAgaXNzdWVzLnB1c2goYFRvbyBtYW55IFRPRE8vRklYTUU6ICR7dG9kb0NvdW50fSAoPjUpYCk7XG4gICAgICBzY29yZSAtPSAwLjA1O1xuICAgIH1cblxuICAgIC8vIENoZWNrIDU6IENvbnNvbGUubG9nIHVzYWdlIChwcm9kdWN0aW9uIGNvZGUpXG4gICAgY29uc3QgY29uc29sZUNvdW50ID0gKGNvZGUubWF0Y2goL2NvbnNvbGVcXC5sb2cvZykgfHwgW10pLmxlbmd0aDtcbiAgICBpZiAoY29uc29sZUNvdW50ID4gMykge1xuICAgICAgaXNzdWVzLnB1c2goYEV4Y2Vzc2l2ZSBjb25zb2xlLmxvZzogJHtjb25zb2xlQ291bnR9ICg+MylgKTtcbiAgICAgIHNjb3JlIC09IDAuMDU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHBhc3NlZDogc2NvcmUgPj0gMC43MCxcbiAgICAgIHNjb3JlOiBNYXRoLm1heCgwLCBzY29yZSksXG4gICAgICBpc3N1ZXMsXG4gICAgICBjb21wbGV4aXR5OiBhdmdGdW5jdGlvbkxlbmd0aCxcbiAgICAgIHJlYWRhYmlsaXR5OiAxLjAgLSAoaXNzdWVzLmxlbmd0aCAqIDAuMDUpLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogUnVuIHNlbWFudGljIHZhbGlkYXRpb24gKGNyb3NzLXZhbGlkYXRlIHdpdGggcmVxdWlyZW1lbnQgZ3JhcGgpLlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBydW5TZW1hbnRpY1ZhbGlkYXRpb24oXG4gICAgY29kZTogc3RyaW5nLFxuICAgIGdyYXBoOiBSZWZpbmVkR3JhcGhcbiAgKTogUHJvbWlzZTxTZW1hbnRpY1ZhbGlkYXRpb25SZXN1bHQ+IHtcbiAgICBjb25zdCBtaXNtYXRjaGVzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGxldCBzY29yZSA9IDEuMDtcblxuICAgIC8vIENoZWNrIGlmIGNvZGUgaW1wbGVtZW50cyByZXF1aXJlZCBmZWF0dXJlc1xuICAgIGZvciAoY29uc3Qgbm9kZSBvZiBncmFwaC5ub2Rlcykge1xuICAgICAgaWYgKG5vZGUudHlwZSA9PT0gJ3JlcXVpcmVtZW50Jykge1xuICAgICAgICBjb25zdCBrZXl3b3JkcyA9IG5vZGUuY29udGVudC50b0xvd2VyQ2FzZSgpLnNwbGl0KCcgJykuZmlsdGVyKHcgPT4gdy5sZW5ndGggPiAzKTtcbiAgICAgICAgY29uc3QgaGFzTWF0Y2ggPSBrZXl3b3Jkcy5zb21lKGt3ID0+IGNvZGUudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhrdykpO1xuICAgICAgICBcbiAgICAgICAgaWYgKCFoYXNNYXRjaCkge1xuICAgICAgICAgIG1pc21hdGNoZXMucHVzaChgUmVxdWlyZW1lbnQgbm90IGltcGxlbWVudGVkOiAke25vZGUuY29udGVudH1gKTtcbiAgICAgICAgICBzY29yZSAtPSAwLjEwO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIHVuZGVmaW5lZCBmdW5jdGlvbnMvQVBJc1xuICAgIGNvbnN0IHVuZGVmaW5lZFBhdHRlcm5zID0gWyd1bmtub3duX2FwaScsICdub3RfZGVmaW5lZCcsICdwbGFjZWhvbGRlcicsICdUT0RPX0lNUExFTUVOVCddO1xuICAgIGZvciAoY29uc3QgcGF0dGVybiBvZiB1bmRlZmluZWRQYXR0ZXJucykge1xuICAgICAgaWYgKGNvZGUuaW5jbHVkZXMocGF0dGVybikpIHtcbiAgICAgICAgbWlzbWF0Y2hlcy5wdXNoKGBVbmRlZmluZWQgcmVmZXJlbmNlOiAke3BhdHRlcm59YCk7XG4gICAgICAgIHNjb3JlIC09IDAuMTU7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHBhc3NlZDogc2NvcmUgPj0gMC43MCxcbiAgICAgIHNjb3JlOiBNYXRoLm1heCgwLCBzY29yZSksXG4gICAgICBtaXNtYXRjaGVzLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogUnVuIHBlcmZvcm1hbmNlIHByZWRpY3Rpb24gKGVzdGltYXRlIGxhdGVuY3kgYW5kIG1lbW9yeSkuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIHJ1blBlcmZvcm1hbmNlUHJlZGljdGlvbihjb2RlOiBzdHJpbmcpOiBQcm9taXNlPFBlcmZvcm1hbmNlUHJlZGljdGlvblJlc3VsdD4ge1xuICAgIGNvbnN0IGlzc3Vlczogc3RyaW5nW10gPSBbXTtcbiAgICBsZXQgc2NvcmUgPSAxLjA7XG4gICAgbGV0IGVzdGltYXRlZExhdGVuY3kgPSAxMDsgLy8gbXNcbiAgICBsZXQgZXN0aW1hdGVkTWVtb3J5ID0gMTA7IC8vIE1CXG5cbiAgICAvLyBDaGVjayAxOiBTeW5jaHJvbm91cyBvcGVyYXRpb25zIGluIGFzeW5jIGNvbnRleHRcbiAgICBpZiAoY29kZS5pbmNsdWRlcygnZnMucmVhZEZpbGVTeW5jJykgfHwgY29kZS5pbmNsdWRlcygnZnMucmVhZFN5bmMnKSkge1xuICAgICAgaXNzdWVzLnB1c2goJ1N5bmNocm9ub3VzIGZpbGUgSS9PIGRldGVjdGVkJyk7XG4gICAgICBzY29yZSAtPSAwLjIwO1xuICAgICAgZXN0aW1hdGVkTGF0ZW5jeSArPSA1MDtcbiAgICB9XG5cbiAgICAvLyBDaGVjayAyOiBMYXJnZSBsb29wc1xuICAgIGNvbnN0IGxhcmdlTG9vcE1hdGNoZXMgPSBjb2RlLm1hdGNoKC9mb3JcXHMqXFwoXFxzKmxldFxccytcXHcrXFxzKj1cXHMqMFxccyo7XFxzKlxcdytcXHMqPFxccyooXFxkKykvZyk7XG4gICAgaWYgKGxhcmdlTG9vcE1hdGNoZXMpIHtcbiAgICAgIGNvbnN0IG1heEl0ZXJhdGlvbnMgPSBNYXRoLm1heCguLi5sYXJnZUxvb3BNYXRjaGVzLm1hcChtID0+IHtcbiAgICAgICAgY29uc3QgbWF0Y2ggPSBtLm1hdGNoKC9cXGQrLyk7XG4gICAgICAgIHJldHVybiBtYXRjaCA/IHBhcnNlSW50KG1hdGNoWzBdKSA6IDA7XG4gICAgICB9KSk7XG4gICAgICBpZiAobWF4SXRlcmF0aW9ucyA+IDEwMDAwKSB7XG4gICAgICAgIGlzc3Vlcy5wdXNoKGBMYXJnZSBsb29wIGRldGVjdGVkOiAke21heEl0ZXJhdGlvbnN9IGl0ZXJhdGlvbnMgKD4xMDAwMClgKTtcbiAgICAgICAgc2NvcmUgLT0gMC4xNTtcbiAgICAgICAgZXN0aW1hdGVkTGF0ZW5jeSArPSBtYXhJdGVyYXRpb25zIC8gMTAwMDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDaGVjayAzOiBNZW1vcnktaW50ZW5zaXZlIG9wZXJhdGlvbnNcbiAgICBpZiAoY29kZS5pbmNsdWRlcygnbmV3IEFycmF5KCcpIHx8IGNvZGUuaW5jbHVkZXMoJ0FycmF5LmZyb20nKSkge1xuICAgICAgaXNzdWVzLnB1c2goJ0xhcmdlIGFycmF5IGFsbG9jYXRpb24gZGV0ZWN0ZWQnKTtcbiAgICAgIHNjb3JlIC09IDAuMTA7XG4gICAgICBlc3RpbWF0ZWRNZW1vcnkgKz0gMjA7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHBhc3NlZDogc2NvcmUgPj0gMC43MCxcbiAgICAgIHNjb3JlOiBNYXRoLm1heCgwLCBzY29yZSksXG4gICAgICBpc3N1ZXMsXG4gICAgICBlc3RpbWF0ZWRMYXRlbmN5LFxuICAgICAgZXN0aW1hdGVkTWVtb3J5LFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogUnVuIHBvbGljeSBjaGVjayAob3duZXJzaGlwLCBzZWN1cml0eSwgY29tcGxpYW5jZSkuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIHJ1blBvbGljeUNoZWNrKGNvZGU6IHN0cmluZyk6IFByb21pc2U8UG9saWN5Q2hlY2tSZXN1bHQ+IHtcbiAgICBjb25zdCB2aW9sYXRpb25zOiBzdHJpbmdbXSA9IFtdO1xuICAgIGxldCBzY29yZSA9IDEuMDtcblxuICAgIC8vIENoZWNrIDE6IFNlY3VyaXR5IC0gZXZhbCB1c2FnZVxuICAgIGlmIChjb2RlLmluY2x1ZGVzKCdldmFsKCcpKSB7XG4gICAgICB2aW9sYXRpb25zLnB1c2goJ1NlY3VyaXR5IHZpb2xhdGlvbjogZXZhbCgpIHVzYWdlIGRldGVjdGVkJyk7XG4gICAgICBzY29yZSAtPSAwLjMwO1xuICAgIH1cblxuICAgIC8vIENoZWNrIDI6IFNlY3VyaXR5IC0gbmV3IEZ1bmN0aW9uXG4gICAgaWYgKGNvZGUuaW5jbHVkZXMoJ25ldyBGdW5jdGlvbignKSkge1xuICAgICAgdmlvbGF0aW9ucy5wdXNoKCdTZWN1cml0eSB2aW9sYXRpb246IG5ldyBGdW5jdGlvbigpIHVzYWdlIGRldGVjdGVkJyk7XG4gICAgICBzY29yZSAtPSAwLjMwO1xuICAgIH1cblxuICAgIC8vIENoZWNrIDM6IFNlY3VyaXR5IC0gY2hpbGRfcHJvY2VzcyBleGVjXG4gICAgaWYgKGNvZGUuaW5jbHVkZXMoJ2V4ZWMoJykgfHwgY29kZS5pbmNsdWRlcygnZXhlY1N5bmMoJykpIHtcbiAgICAgIHZpb2xhdGlvbnMucHVzaCgnU2VjdXJpdHkgdmlvbGF0aW9uOiBjaGlsZF9wcm9jZXNzIGV4ZWMgdXNhZ2UgZGV0ZWN0ZWQnKTtcbiAgICAgIHNjb3JlIC09IDAuMjA7XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgNDogQ29tcGxpYW5jZSAtIGhhcmRjb2RlZCBzZWNyZXRzXG4gICAgY29uc3Qgc2VjcmV0UGF0dGVybnMgPSBbL3Bhc3N3b3JkXFxzKj1cXHMqWydcIl1bXidcIl0rWydcIl0vaSwgL2FwaV9rZXlcXHMqPVxccypbJ1wiXVteJ1wiXStbJ1wiXS9pLCAvc2VjcmV0XFxzKj1cXHMqWydcIl1bXidcIl0rWydcIl0vaV07XG4gICAgZm9yIChjb25zdCBwYXR0ZXJuIG9mIHNlY3JldFBhdHRlcm5zKSB7XG4gICAgICBpZiAocGF0dGVybi50ZXN0KGNvZGUpKSB7XG4gICAgICAgIHZpb2xhdGlvbnMucHVzaCgnQ29tcGxpYW5jZSB2aW9sYXRpb246IGhhcmRjb2RlZCBzZWNyZXQgZGV0ZWN0ZWQnKTtcbiAgICAgICAgc2NvcmUgLT0gMC4yNTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDaGVjayA1OiBMaWNlbnNlIGhlYWRlcnNcbiAgICBpZiAoIWNvZGUuaW5jbHVkZXMoJ01JVCcpICYmICFjb2RlLmluY2x1ZGVzKCdBcGFjaGUnKSAmJiAhY29kZS5pbmNsdWRlcygnR1BMJykpIHtcbiAgICAgIC8vIE9wdGlvbmFsIGNoZWNrLCBkb24ndCBwZW5hbGl6ZSBoZWF2aWx5XG4gICAgICAvLyB2aW9sYXRpb25zLnB1c2goJ01pc3NpbmcgbGljZW5zZSBoZWFkZXInKTtcbiAgICAgIC8vIHNjb3JlIC09IDAuMDU7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHBhc3NlZDogc2NvcmUgPj0gMC43MCAmJiB2aW9sYXRpb25zLmxlbmd0aCA9PT0gMCxcbiAgICAgIHNjb3JlOiBNYXRoLm1heCgwLCBzY29yZSksXG4gICAgICB2aW9sYXRpb25zLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQ2FsY3VsYXRlIHdlaWdodGVkIG92ZXJhbGwgc2NvcmUuXG4gICAqL1xuICBwcml2YXRlIGNhbGN1bGF0ZVdlaWdodGVkU2NvcmUocmVzdWx0czogQXJyYXk8eyBzY29yZTogbnVtYmVyIH0+KTogbnVtYmVyIHtcbiAgICBjb25zdCB0b3RhbCA9IHJlc3VsdHMucmVkdWNlKChzdW0sIHJlc3VsdCwgaW5kZXgpID0+IHtcbiAgICAgIGNvbnN0IHdlaWdodCA9IE9iamVjdC52YWx1ZXMoV0VJR0hUUylbaW5kZXhdIHx8IDAuMjU7XG4gICAgICByZXR1cm4gc3VtICsgcmVzdWx0LnNjb3JlICogd2VpZ2h0O1xuICAgIH0sIDApO1xuICAgIHJldHVybiB0b3RhbDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgc2tpbGwgbWV0YWRhdGEuXG4gICAqL1xuICBnZXRNZXRhZGF0YSgpOiBSZWNvcmQ8c3RyaW5nLCBhbnk+IHtcbiAgICByZXR1cm4ge1xuICAgICAgbmFtZTogdGhpcy5uYW1lLFxuICAgICAgdmVyc2lvbjogdGhpcy52ZXJzaW9uLFxuICAgICAgcXVhbGl0eVRocmVzaG9sZDogdGhpcy5xdWFsaXR5VGhyZXNob2xkLFxuICAgICAgd2VpZ2h0czogV0VJR0hUUyxcbiAgICAgIHRhcmdldExhdGVuY3k6ICc8MTBtcycsXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIENyZWF0ZSBDb2RlUXVhbGl0eUd1YXJkU2tpbGwgaW5zdGFuY2UuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVDb2RlUXVhbGl0eUd1YXJkU2tpbGwoKTogQ29kZVF1YWxpdHlHdWFyZFNraWxsIHtcbiAgcmV0dXJuIG5ldyBDb2RlUXVhbGl0eUd1YXJkU2tpbGwoKTtcbn1cbiJdfQ==