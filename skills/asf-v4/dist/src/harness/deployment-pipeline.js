"use strict";
/**
 * ANFSF V1.5.0 - Deployment Pipeline with External Review
 *
 * Integrates Inline Guard + External Review Agent双层审核架构.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeploymentPipeline = void 0;
exports.createDeploymentPipeline = createDeploymentPipeline;
// ============================================================================
// Deployment Pipeline
// ============================================================================
class DeploymentPipeline {
    constructor(inlineGuard, hallucinationGuard, externalReviewAgent) {
        this.inlineGuard = inlineGuard;
        this.hallucinationGuard = hallucinationGuard;
        this.externalReviewAgent = externalReviewAgent;
    }
    /**
     * Deploy generated code through双层审核.
     */
    async deploy(generatedCode, requirementGraph) {
        const traceId = this.generateTraceId();
        // ========== 阶段 1: Inline Guard (实时约束，<10ms) ==========
        const guardResult = await this.runInlineGuard(generatedCode, requirementGraph, traceId);
        if (!guardResult.passed) {
            await this.triggerSelfHealing(generatedCode, guardResult, traceId);
            return {
                success: false,
                stage: 'inline_guard',
                reason: guardResult.reason,
                traceId,
            };
        }
        // ========== 阶段 2: External Review Agent (最终仲裁，50-300ms) ==========
        const reviewPayload = {
            generatedCode,
            requirementGraph,
            traceId,
            timestamp: Date.now(),
        };
        const reviewResult = await this.externalReviewAgent.review(reviewPayload);
        if (!reviewResult.passed) {
            // External review failed → veto deployment
            await this.graphAddEvent({
                type: 'ExternalReviewFailed',
                traceId,
                issues: reviewResult.issues,
                score: reviewResult.score,
                hasVeto: reviewResult.hasVeto,
                timestamp: Date.now(),
            });
            return {
                success: false,
                stage: 'external_review',
                reason: reviewResult.hasVeto ? 'veto' : `score_below_threshold: ${reviewResult.score}`,
                traceId,
            };
        }
        // ========== 阶段 3: 金丝雀部署 ==========
        return this.canaryDeploy(generatedCode, traceId);
    }
    /**
     * Run inline guard checks.
     */
    async runInlineGuard(code, graph, traceId) {
        // Parallel execution of all inline guards (<10ms target)
        const [qualityResult, hallucinationResult] = await Promise.all([
            this.inlineGuard.execute(code, graph),
            this.hallucinationGuard.execute({
                generatedText: code,
                sources: graph.nodes.map(n => ({ id: n.id, content: n.content, type: 'requirement', reliability: 0.9 })),
                mode: 'standard',
                enableGraphValidation: true,
            }),
        ]);
        // Combine results
        if (!qualityResult.passed) {
            return {
                passed: false,
                reason: `quality_guard_failed: ${qualityResult.reason}`,
                details: qualityResult,
            };
        }
        if (!hallucinationResult.passed) {
            return {
                passed: false,
                reason: `hallucination_guard_failed: confidence ${hallucinationResult.overallConfidence}`,
                details: hallucinationResult,
            };
        }
        return { passed: true };
    }
    /**
     * Trigger self-healing when inline guard fails.
     */
    async triggerSelfHealing(code, guardResult, traceId) {
        await this.graphAddEvent({
            type: 'SelfHealingTriggered',
            traceId,
            reason: guardResult.reason,
            timestamp: Date.now(),
        });
        // In production, trigger code regeneration
        console.log('[DeploymentPipeline] Self-healing triggered:', guardResult.reason);
    }
    /**
     * Add event to graph (simulated).
     */
    async graphAddEvent(event) {
        // In production, add to GraphRAG event log
        console.log('[DeploymentPipeline] Graph event:', event);
    }
    /**
     * Canary deployment.
     */
    async canaryDeploy(code, traceId) {
        // In production, integrate with existing CanaryDeployer
        console.log('[DeploymentPipeline] Canary deployment started:', traceId);
        // Simulated canary deployment
        return {
            success: true,
            stage: 'canary',
            traceId,
        };
    }
    /**
     * Generate trace ID.
     */
    generateTraceId() {
        return `trace_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
}
exports.DeploymentPipeline = DeploymentPipeline;
// ============================================================================
// Factory
// ============================================================================
function createDeploymentPipeline(inlineGuard, hallucinationGuard, externalReviewAgent) {
    return new DeploymentPipeline(inlineGuard, hallucinationGuard, externalReviewAgent);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVwbG95bWVudC1waXBlbGluZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9oYXJuZXNzL2RlcGxveW1lbnQtcGlwZWxpbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7O0dBSUc7OztBQStMSCw0REFNQztBQTVLRCwrRUFBK0U7QUFDL0Usc0JBQXNCO0FBQ3RCLCtFQUErRTtBQUUvRSxNQUFhLGtCQUFrQjtJQUs3QixZQUNFLFdBQWtDLEVBQ2xDLGtCQUEyQyxFQUMzQyxtQkFBd0M7UUFFeEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7UUFDL0IsSUFBSSxDQUFDLGtCQUFrQixHQUFHLGtCQUFrQixDQUFDO1FBQzdDLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxtQkFBbUIsQ0FBQztJQUNqRCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsTUFBTSxDQUNWLGFBQXFCLEVBQ3JCLGdCQUE4QjtRQUU5QixNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7UUFFdkMsd0RBQXdEO1FBQ3hELE1BQU0sV0FBVyxHQUFHLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxhQUFhLEVBQUUsZ0JBQWdCLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDeEYsSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN4QixNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxhQUFhLEVBQUUsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1lBQ25FLE9BQU87Z0JBQ0wsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsS0FBSyxFQUFFLGNBQWM7Z0JBQ3JCLE1BQU0sRUFBRSxXQUFXLENBQUMsTUFBTTtnQkFDMUIsT0FBTzthQUNSLENBQUM7UUFDSixDQUFDO1FBRUQsb0VBQW9FO1FBQ3BFLE1BQU0sYUFBYSxHQUFrQjtZQUNuQyxhQUFhO1lBQ2IsZ0JBQWdCO1lBQ2hCLE9BQU87WUFDUCxT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QThDLEVBQUUsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ2xGLENBQUM7SUFFRDs7T0FFRztJQUNLLEtBQUssQ0FBQyxhQUFhLENBQUMsS0FBVTtRQUNwQywyQ0FBMkM7UUFDM0MsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQ0FBbUMsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBRUQ7O09BRUc7SUFDSyxLQUFLLENBQUMsWUFBWSxDQUFDLElBQVksRUFBRSxPQUFlO1FBQ3RELHdEQUF3RDtRQUN4RCxPQUFPLENBQUMsR0FBRyxDQUFDLGlEQUFpRCxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRXhFLDhCQUE4QjtRQUM5QixPQUFPO1lBQ0wsT0FBTyxFQUFFLElBQUk7WUFDYixLQUFLLEVBQUUsUUFBUTtZQUNmLE9BQU87U0FDUixDQUFDO0lBQ0osQ0FBQztJQUVEOztPQUVHO0lBQ0ssZUFBZTtRQUNyQixPQUFPLFNBQVMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDO0lBQzdFLENBQUM7Q0FDRjtBQTVKRCxnREE0SkM7QUFFRCwrRUFBK0U7QUFDL0UsVUFBVTtBQUNWLCtFQUErRTtBQUUvRSxTQUFnQix3QkFBd0IsQ0FDdEMsV0FBa0MsRUFDbEMsa0JBQTJDLEVBQzNDLG1CQUF3QztJQUV4QyxPQUFPLElBQUksa0JBQWtCLENBQUMsV0FBVyxFQUFFLGtCQUFrQixFQUFFLG1CQUFtQixDQUFDLENBQUM7QUFDdEYsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQU5GU0YgVjEuNS4wIC0gRGVwbG95bWVudCBQaXBlbGluZSB3aXRoIEV4dGVybmFsIFJldmlld1xuICogXG4gKiBJbnRlZ3JhdGVzIElubGluZSBHdWFyZCArIEV4dGVybmFsIFJldmlldyBBZ2VudOWPjOWxguWuoeaguOaetuaehC5cbiAqL1xuXG5pbXBvcnQgeyBFeHRlcm5hbFJldmlld0FnZW50LCBSZXZpZXdQYXlsb2FkIH0gZnJvbSAnLi4vYWdlbnRzL2V4dGVybmFsLXJldmlldy1hZ2VudCc7XG5pbXBvcnQgeyBDb2RlUXVhbGl0eUd1YXJkU2tpbGwgfSBmcm9tICcuLi9za2lsbHMvY29kZS1xdWFsaXR5LWd1YXJkLXNraWxsJztcbmltcG9ydCB7IEhhbGx1Y2luYXRpb25HdWFyZFNraWxsIH0gZnJvbSAnLi4vc2tpbGxzL2hhbGx1Y2luYXRpb24tZ3VhcmQtc2tpbGwnO1xuaW1wb3J0IHsgUmVmaW5lZEdyYXBoIH0gZnJvbSAnLi4vc2tpbGxzL3JlcXVpcmVtZW50LXJlZmluZXItc2tpbGwnO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBUeXBlc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgaW50ZXJmYWNlIERlcGxveW1lbnRSZXN1bHQge1xuICBzdWNjZXNzOiBib29sZWFuO1xuICBzdGFnZTogJ2lubGluZV9ndWFyZCcgfCAnZXh0ZXJuYWxfcmV2aWV3JyB8ICdjYW5hcnknIHwgJ3Byb2R1Y3Rpb24nO1xuICByZWFzb24/OiBzdHJpbmc7XG4gIHRyYWNlSWQ/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgR3VhcmRSZXN1bHQge1xuICBwYXNzZWQ6IGJvb2xlYW47XG4gIHNjb3JlPzogbnVtYmVyO1xuICByZWFzb24/OiBzdHJpbmc7XG4gIGRldGFpbHM/OiBhbnk7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIERlcGxveW1lbnQgUGlwZWxpbmVcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGNsYXNzIERlcGxveW1lbnRQaXBlbGluZSB7XG4gIHByaXZhdGUgaW5saW5lR3VhcmQ6IENvZGVRdWFsaXR5R3VhcmRTa2lsbDtcbiAgcHJpdmF0ZSBoYWxsdWNpbmF0aW9uR3VhcmQ6IEhhbGx1Y2luYXRpb25HdWFyZFNraWxsO1xuICBwcml2YXRlIGV4dGVybmFsUmV2aWV3QWdlbnQ6IEV4dGVybmFsUmV2aWV3QWdlbnQ7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgaW5saW5lR3VhcmQ6IENvZGVRdWFsaXR5R3VhcmRTa2lsbCxcbiAgICBoYWxsdWNpbmF0aW9uR3VhcmQ6IEhhbGx1Y2luYXRpb25HdWFyZFNraWxsLFxuICAgIGV4dGVybmFsUmV2aWV3QWdlbnQ6IEV4dGVybmFsUmV2aWV3QWdlbnRcbiAgKSB7XG4gICAgdGhpcy5pbmxpbmVHdWFyZCA9IGlubGluZUd1YXJkO1xuICAgIHRoaXMuaGFsbHVjaW5hdGlvbkd1YXJkID0gaGFsbHVjaW5hdGlvbkd1YXJkO1xuICAgIHRoaXMuZXh0ZXJuYWxSZXZpZXdBZ2VudCA9IGV4dGVybmFsUmV2aWV3QWdlbnQ7XG4gIH1cblxuICAvKipcbiAgICogRGVwbG95IGdlbmVyYXRlZCBjb2RlIHRocm91Z2jlj4zlsYLlrqHmoLguXG4gICAqL1xuICBhc3luYyBkZXBsb3koXG4gICAgZ2VuZXJhdGVkQ29kZTogc3RyaW5nLFxuICAgIHJlcXVpcmVtZW50R3JhcGg6IFJlZmluZWRHcmFwaFxuICApOiBQcm9taXNlPERlcGxveW1lbnRSZXN1bHQ+IHtcbiAgICBjb25zdCB0cmFjZUlkID0gdGhpcy5nZW5lcmF0ZVRyYWNlSWQoKTtcblxuICAgIC8vID09PT09PT09PT0g6Zi25q61IDE6IElubGluZSBHdWFyZCAo5a6e5pe257qm5p2f77yMPDEwbXMpID09PT09PT09PT1cbiAgICBjb25zdCBndWFyZFJlc3VsdCA9IGF3YWl0IHRoaXMucnVuSW5saW5lR3VhcmQoZ2VuZXJhdGVkQ29kZSwgcmVxdWlyZW1lbnRHcmFwaCwgdHJhY2VJZCk7XG4gICAgaWYgKCFndWFyZFJlc3VsdC5wYXNzZWQpIHtcbiAgICAgIGF3YWl0IHRoaXMudHJpZ2dlclNlbGZIZWFsaW5nKGdlbmVyYXRlZENvZGUsIGd1YXJkUmVzdWx0LCB0cmFjZUlkKTtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICBzdGFnZTogJ2lubGluZV9ndWFyZCcsXG4gICAgICAgIHJlYXNvbjogZ3VhcmRSZXN1bHQucmVhc29uLFxuICAgICAgICB0cmFjZUlkLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyA9PT09PT09PT09IOmYtuautSAyOiBFeHRlcm5hbCBSZXZpZXcgQWdlbnQgKOacgOe7iOS7suijge+8jDUwLTMwMG1zKSA9PT09PT09PT09XG4gICAgY29uc3QgcmV2aWV3UGF5bG9hZDogUmV2aWV3UGF5bG9hZCA9IHtcbiAgICAgIGdlbmVyYXRlZENvZGUsXG4gICAgICByZXF1aXJlbWVudEdyYXBoLFxuICAgICAgdHJhY2VJZCxcbiAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKSxcbiAgICB9O1xuXG4gICAgY29uc3QgcmV2aWV3UmVzdWx0ID0gYXdhaXQgdGhpcy5leHRlcm5hbFJldmlld0FnZW50LnJldmlldyhyZXZpZXdQYXlsb2FkKTtcblxuICAgIGlmICghcmV2aWV3UmVzdWx0LnBhc3NlZCkge1xuICAgICAgLy8gRXh0ZXJuYWwgcmV2aWV3IGZhaWxlZCDihpIgdmV0byBkZXBsb3ltZW50XG4gICAgICBhd2FpdCB0aGlzLmdyYXBoQWRkRXZlbnQoe1xuICAgICAgICB0eXBlOiAnRXh0ZXJuYWxSZXZpZXdGYWlsZWQnLFxuICAgICAgICB0cmFjZUlkLFxuICAgICAgICBpc3N1ZXM6IHJldmlld1Jlc3VsdC5pc3N1ZXMsXG4gICAgICAgIHNjb3JlOiByZXZpZXdSZXN1bHQuc2NvcmUsXG4gICAgICAgIGhhc1ZldG86IHJldmlld1Jlc3VsdC5oYXNWZXRvLFxuICAgICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgIHN0YWdlOiAnZXh0ZXJuYWxfcmV2aWV3JyxcbiAgICAgICAgcmVhc29uOiByZXZpZXdSZXN1bHQuaGFzVmV0byA/ICd2ZXRvJyA6IGBzY29yZV9iZWxvd190aHJlc2hvbGQ6ICR7cmV2aWV3UmVzdWx0LnNjb3JlfWAsXG4gICAgICAgIHRyYWNlSWQsXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vID09PT09PT09PT0g6Zi25q61IDM6IOmHkeS4nembgOmDqOe9siA9PT09PT09PT09XG4gICAgcmV0dXJuIHRoaXMuY2FuYXJ5RGVwbG95KGdlbmVyYXRlZENvZGUsIHRyYWNlSWQpO1xuICB9XG5cbiAgLyoqXG4gICAqIFJ1biBpbmxpbmUgZ3VhcmQgY2hlY2tzLlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBydW5JbmxpbmVHdWFyZChcbiAgICBjb2RlOiBzdHJpbmcsXG4gICAgZ3JhcGg6IFJlZmluZWRHcmFwaCxcbiAgICB0cmFjZUlkOiBzdHJpbmdcbiAgKTogUHJvbWlzZTxHdWFyZFJlc3VsdD4ge1xuICAgIC8vIFBhcmFsbGVsIGV4ZWN1dGlvbiBvZiBhbGwgaW5saW5lIGd1YXJkcyAoPDEwbXMgdGFyZ2V0KVxuICAgIGNvbnN0IFtxdWFsaXR5UmVzdWx0LCBoYWxsdWNpbmF0aW9uUmVzdWx0XSA9IGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICAgIHRoaXMuaW5saW5lR3VhcmQuZXhlY3V0ZShjb2RlLCBncmFwaCksXG4gICAgICB0aGlzLmhhbGx1Y2luYXRpb25HdWFyZC5leGVjdXRlKHtcbiAgICAgICAgZ2VuZXJhdGVkVGV4dDogY29kZSxcbiAgICAgICAgc291cmNlczogZ3JhcGgubm9kZXMubWFwKG4gPT4gKHsgaWQ6IG4uaWQsIGNvbnRlbnQ6IG4uY29udGVudCwgdHlwZTogJ3JlcXVpcmVtZW50JywgcmVsaWFiaWxpdHk6IDAuOSB9KSksXG4gICAgICAgIG1vZGU6ICdzdGFuZGFyZCcsXG4gICAgICAgIGVuYWJsZUdyYXBoVmFsaWRhdGlvbjogdHJ1ZSxcbiAgICAgIH0pLFxuICAgIF0pO1xuXG4gICAgLy8gQ29tYmluZSByZXN1bHRzXG4gICAgaWYgKCFxdWFsaXR5UmVzdWx0LnBhc3NlZCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcGFzc2VkOiBmYWxzZSxcbiAgICAgICAgcmVhc29uOiBgcXVhbGl0eV9ndWFyZF9mYWlsZWQ6ICR7cXVhbGl0eVJlc3VsdC5yZWFzb259YCxcbiAgICAgICAgZGV0YWlsczogcXVhbGl0eVJlc3VsdCxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKCFoYWxsdWNpbmF0aW9uUmVzdWx0LnBhc3NlZCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcGFzc2VkOiBmYWxzZSxcbiAgICAgICAgcmVhc29uOiBgaGFsbHVjaW5hdGlvbl9ndWFyZF9mYWlsZWQ6IGNvbmZpZGVuY2UgJHtoYWxsdWNpbmF0aW9uUmVzdWx0Lm92ZXJhbGxDb25maWRlbmNlfWAsXG4gICAgICAgIGRldGFpbHM6IGhhbGx1Y2luYXRpb25SZXN1bHQsXG4gICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiB7IHBhc3NlZDogdHJ1ZSB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFRyaWdnZXIgc2VsZi1oZWFsaW5nIHdoZW4gaW5saW5lIGd1YXJkIGZhaWxzLlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyB0cmlnZ2VyU2VsZkhlYWxpbmcoXG4gICAgY29kZTogc3RyaW5nLFxuICAgIGd1YXJkUmVzdWx0OiBHdWFyZFJlc3VsdCxcbiAgICB0cmFjZUlkOiBzdHJpbmdcbiAgKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgYXdhaXQgdGhpcy5ncmFwaEFkZEV2ZW50KHtcbiAgICAgIHR5cGU6ICdTZWxmSGVhbGluZ1RyaWdnZXJlZCcsXG4gICAgICB0cmFjZUlkLFxuICAgICAgcmVhc29uOiBndWFyZFJlc3VsdC5yZWFzb24sXG4gICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXG4gICAgfSk7XG5cbiAgICAvLyBJbiBwcm9kdWN0aW9uLCB0cmlnZ2VyIGNvZGUgcmVnZW5lcmF0aW9uXG4gICAgY29uc29sZS5sb2coJ1tEZXBsb3ltZW50UGlwZWxpbmVdIFNlbGYtaGVhbGluZyB0cmlnZ2VyZWQ6JywgZ3VhcmRSZXN1bHQucmVhc29uKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgZXZlbnQgdG8gZ3JhcGggKHNpbXVsYXRlZCkuXG4gICAqL1xuICBwcml2YXRlIGFzeW5jIGdyYXBoQWRkRXZlbnQoZXZlbnQ6IGFueSk6IFByb21pc2U8dm9pZD4ge1xuICAgIC8vIEluIHByb2R1Y3Rpb24sIGFkZCB0byBHcmFwaFJBRyBldmVudCBsb2dcbiAgICBjb25zb2xlLmxvZygnW0RlcGxveW1lbnRQaXBlbGluZV0gR3JhcGggZXZlbnQ6JywgZXZlbnQpO1xuICB9XG5cbiAgLyoqXG4gICAqIENhbmFyeSBkZXBsb3ltZW50LlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBjYW5hcnlEZXBsb3koY29kZTogc3RyaW5nLCB0cmFjZUlkOiBzdHJpbmcpOiBQcm9taXNlPERlcGxveW1lbnRSZXN1bHQ+IHtcbiAgICAvLyBJbiBwcm9kdWN0aW9uLCBpbnRlZ3JhdGUgd2l0aCBleGlzdGluZyBDYW5hcnlEZXBsb3llclxuICAgIGNvbnNvbGUubG9nKCdbRGVwbG95bWVudFBpcGVsaW5lXSBDYW5hcnkgZGVwbG95bWVudCBzdGFydGVkOicsIHRyYWNlSWQpO1xuXG4gICAgLy8gU2ltdWxhdGVkIGNhbmFyeSBkZXBsb3ltZW50XG4gICAgcmV0dXJuIHtcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICBzdGFnZTogJ2NhbmFyeScsXG4gICAgICB0cmFjZUlkLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGUgdHJhY2UgSUQuXG4gICAqL1xuICBwcml2YXRlIGdlbmVyYXRlVHJhY2VJZCgpOiBzdHJpbmcge1xuICAgIHJldHVybiBgdHJhY2VfJHtEYXRlLm5vdygpfV8ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZygyLCA5KX1gO1xuICB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEZhY3Rvcnlcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZURlcGxveW1lbnRQaXBlbGluZShcbiAgaW5saW5lR3VhcmQ6IENvZGVRdWFsaXR5R3VhcmRTa2lsbCxcbiAgaGFsbHVjaW5hdGlvbkd1YXJkOiBIYWxsdWNpbmF0aW9uR3VhcmRTa2lsbCxcbiAgZXh0ZXJuYWxSZXZpZXdBZ2VudDogRXh0ZXJuYWxSZXZpZXdBZ2VudFxuKTogRGVwbG95bWVudFBpcGVsaW5lIHtcbiAgcmV0dXJuIG5ldyBEZXBsb3ltZW50UGlwZWxpbmUoaW5saW5lR3VhcmQsIGhhbGx1Y2luYXRpb25HdWFyZCwgZXh0ZXJuYWxSZXZpZXdBZ2VudCk7XG59XG4iXX0=