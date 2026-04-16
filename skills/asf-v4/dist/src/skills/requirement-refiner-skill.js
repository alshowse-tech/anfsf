"use strict";
/**
 * ANFSF V1.5.0 - Requirement Refiner Skill
 *
 * Core skill for refining simple requirements into complete, validated Requirement Graphs.
 * Implements two-source context (history + current) with A/B self-validation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequirementRefinerSkill = void 0;
exports.createRequirementRefinerSkill = createRequirementRefinerSkill;
const base_1 = require("./base");
/**
 * Requirement Refiner Skill - refines simple requirements into complete graphs.
 */
class RequirementRefinerSkill extends base_1.Skill {
    constructor(memorySkill, contextCompressor, hybridRetriever, hallucinationGuard, evolutionHarness, kpiDashboard) {
        super();
        this.name = 'requirement-refiner';
        this.version = '1.0.0';
        this.description = '需求精炼 Skill - 将简单需求转换为完整、验证的需求图谱';
        this.IMPROVEMENT_THRESHOLD = 0.20; // 20% 收益阈值 (优化后降低返工率)
        this.memorySkill = memorySkill;
        this.contextCompressor = contextCompressor;
        this.hybridRetriever = hybridRetriever;
        this.hallucinationGuard = hallucinationGuard;
        this.evolutionHarness = evolutionHarness;
        this.kpiDashboard = kpiDashboard;
    }
    /**
     * Execute requirement refinement with A/B self-validation.
     */
    async execute(ctx) {
        const traceId = this.generateTraceId();
        // Run two-source refinement (history + current)
        const twoSourceResult = await this.runTwoSource(ctx.rawRequirement, traceId);
        let usedBaseline = false;
        let improvement = 0;
        // A/B self-validation (if enabled)
        if (ctx.enableABValidation) {
            const baselineResult = await this.runBaselineOneSource(ctx.rawRequirement, traceId);
            improvement = this.calculateImprovement(twoSourceResult, baselineResult);
            // Record to KPI Dashboard
            await this.kpiDashboard.record('twoSourceImprovement', improvement);
            // Rollback if improvement < 15%
            if (improvement < this.IMPROVEMENT_THRESHOLD) {
                await this.evolutionHarness.rollbackToBaseline();
                usedBaseline = true;
            }
        }
        return {
            graph: usedBaseline ? await this.runBaselineOneSource(ctx.rawRequirement, traceId) : twoSourceResult,
            improvement,
            usedBaseline,
            traceId,
        };
    }
    /**
     * Run two-source context (history + current).
     */
    async runTwoSource(rawRequirement, traceId) {
        // 1. Retrieve internal history from memory
        const memoryContext = await this.memorySkill.retrieve({
            query: rawRequirement,
            maxResults: 5,
        });
        // 2. Compress current requirement
        const currentContext = await this.contextCompressor.execute({
            rawTokens: rawRequirement.split(' '),
            tokenCount: rawRequirement.split(' ').length,
            tokenBudget: 10000,
            performanceMode: 'balanced',
            taskType: 'document',
        });
        // 3. Combine contexts
        const combinedContext = [
            ...memoryContext.results.map(r => r.memory.content),
            ...currentContext.compressedTokens,
        ].join(' ');
        // 4. RAG hybrid retrieval + validation
        const ragResult = await this.hybridRetriever.execute({
            query: combinedContext,
            documents: [],
            mode: 'hybrid',
            maxResults: 10,
        });
        // 5. Hallucination guard verification
        const verification = await this.hallucinationGuard.execute({
            generatedText: rawRequirement,
            sources: ragResult.results.map(r => ({
                id: r.document.id,
                content: r.document.content,
                type: 'document',
                reliability: 0.9,
            })),
            mode: 'standard',
            enableGraphValidation: true,
        });
        // 6. Build Requirement Graph with enhanced quality check
        const graph = this.buildGraph(rawRequirement, verification.verifiedStatements, traceId);
        // Enhance quality if verification passed with high confidence
        if (verification.overallConfidence > 0.9) {
            graph.quality = Math.min(1.0, graph.quality + 0.1);
        }
        return graph;
    }
    /**
     * Run baseline one-source context (current only).
     */
    async runBaselineOneSource(rawRequirement, traceId) {
        // Compress current requirement only (no history)
        const currentContext = await this.contextCompressor.execute({
            rawTokens: rawRequirement.split(' '),
            tokenCount: rawRequirement.split(' ').length,
            tokenBudget: 10000,
            performanceMode: 'balanced',
            taskType: 'document',
        });
        // Build graph from current context only
        return this.buildGraph(rawRequirement, currentContext.compressedTokens, traceId);
    }
    /**
     * Calculate improvement between two-source and baseline.
     */
    calculateImprovement(twoSource, baseline) {
        const completenessDelta = twoSource.completeness - baseline.completeness;
        const qualityDelta = twoSource.quality - baseline.quality;
        const nodeDelta = (twoSource.nodes.length - baseline.nodes.length) / Math.max(1, baseline.nodes.length);
        return (completenessDelta + qualityDelta + nodeDelta) / 3;
    }
    /**
     * Build Requirement Graph from verified statements.
     */
    buildGraph(rawRequirement, verifiedStatements, traceId) {
        // Simple graph construction (in production, use Role Synthesizer)
        const nodes = verifiedStatements.map((stmt, idx) => ({
            id: `node-${idx}`,
            type: 'requirement',
            content: stmt,
        }));
        const edges = nodes.slice(1).map((node, idx) => ({
            from: nodes[idx].id,
            to: node.id,
            type: 'depends_on',
        }));
        return {
            nodes,
            edges,
            quality: 0.9,
            completeness: nodes.length / Math.max(1, verifiedStatements.length),
            traceId,
        };
    }
    /**
     * Generate trace ID.
     */
    generateTraceId() {
        return `trace_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    /**
     * Get skill metadata.
     */
    getMetadata() {
        return {
            name: this.name,
            version: this.version,
            improvementThreshold: this.IMPROVEMENT_THRESHOLD,
            abValidationEnabled: true,
        };
    }
}
exports.RequirementRefinerSkill = RequirementRefinerSkill;
/**
 * Create Requirement Refiner Skill.
 */
function createRequirementRefinerSkill(memorySkill, contextCompressor, hybridRetriever, hallucinationGuard, evolutionHarness, kpiDashboard) {
    return new RequirementRefinerSkill(memorySkill, contextCompressor, hybridRetriever, hallucinationGuard, evolutionHarness, kpiDashboard);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWlyZW1lbnQtcmVmaW5lci1za2lsbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9za2lsbHMvcmVxdWlyZW1lbnQtcmVmaW5lci1za2lsbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7OztBQTBPSCxzRUFnQkM7QUF4UEQsaUNBQTRDO0FBNkI1Qzs7R0FFRztBQUNILE1BQWEsdUJBQXdCLFNBQVEsWUFBSztJQWNoRCxZQUNFLFdBQXFDLEVBQ3JDLGlCQUF5QyxFQUN6QyxlQUFxQyxFQUNyQyxrQkFBMkMsRUFDM0MsZ0JBQWtDLEVBQ2xDLFlBQTBCO1FBRTFCLEtBQUssRUFBRSxDQUFDO1FBckJWLFNBQUksR0FBRyxxQkFBcUIsQ0FBQztRQUM3QixZQUFPLEdBQUcsT0FBTyxDQUFDO1FBQ2xCLGdCQUFXLEdBQUcsaUNBQWlDLENBQUM7UUFTL0IsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLENBQUMsc0JBQXNCO1FBV25FLElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1FBQy9CLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxpQkFBaUIsQ0FBQztRQUMzQyxJQUFJLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQztRQUN2QyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsa0JBQWtCLENBQUM7UUFDN0MsSUFBSSxDQUFDLGdCQUFnQixHQUFHLGdCQUFnQixDQUFDO1FBQ3pDLElBQUksQ0FBQyxZQUFZLEdBQUcsWUFBWSxDQUFDO0lBQ25DLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBOEI7UUFDMUMsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1FBRXZDLGdEQUFnRDtRQUNoRCxNQUFNLGVBQWUsR0FBRyxNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLGNBQWMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUU3RSxJQUFJLFlB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SSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztJQUM3RSxDQUFDO0lBRUQ7O09BRUc7SUFDSCxXQUFXO1FBQ1QsT0FBTztZQUNMLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtZQUNmLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztZQUNyQixvQkFBb0IsRUFBRSxJQUFJLENBQUMscUJBQXFCO1lBQ2hELG1CQUFtQixFQUFFLElBQUk7U0FDMUIsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQW5NRCwwREFtTUM7QUFFRDs7R0FFRztBQUNILFNBQWdCLDZCQUE2QixDQUMzQyxXQUFxQyxFQUNyQyxpQkFBeUMsRUFDekMsZUFBcUMsRUFDckMsa0JBQTJDLEVBQzNDLGdCQUFrQyxFQUNsQyxZQUEwQjtJQUUxQixPQUFPLElBQUksdUJBQXVCLENBQ2hDLFdBQVcsRUFDWCxpQkFBaUIsRUFDakIsZUFBZSxFQUNmLGtCQUFrQixFQUNsQixnQkFBZ0IsRUFDaEIsWUFBWSxDQUNiLENBQUM7QUFDSixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBBTkZTRiBWMS41LjAgLSBSZXF1aXJlbWVudCBSZWZpbmVyIFNraWxsXG4gKiBcbiAqIENvcmUgc2tpbGwgZm9yIHJlZmluaW5nIHNpbXBsZSByZXF1aXJlbWVudHMgaW50byBjb21wbGV0ZSwgdmFsaWRhdGVkIFJlcXVpcmVtZW50IEdyYXBocy5cbiAqIEltcGxlbWVudHMgdHdvLXNvdXJjZSBjb250ZXh0IChoaXN0b3J5ICsgY3VycmVudCkgd2l0aCBBL0Igc2VsZi12YWxpZGF0aW9uLlxuICovXG5cbmltcG9ydCB7IFNraWxsLCBTa2lsbFJlc3VsdCB9IGZyb20gJy4vYmFzZSc7XG5pbXBvcnQgeyBNZW1vcnlDb25zb2xpZGF0aW9uU2tpbGwgfSBmcm9tICcuL21lbW9yeS1jb25zb2xpZGF0aW9uLXNraWxsJztcbmltcG9ydCB7IENvbnRleHRDb21wcmVzc29yU2tpbGwgfSBmcm9tICcuL2NvbnRleHQtY29tcHJlc3Nvci1za2lsbCc7XG5pbXBvcnQgeyBIeWJyaWRSZXRyaWV2ZXJTa2lsbCB9IGZyb20gJy4vaHlicmlkLXJldHJpZXZlci1za2lsbCc7XG5pbXBvcnQgeyBIYWxsdWNpbmF0aW9uR3VhcmRTa2lsbCB9IGZyb20gJy4vaGFsbHVjaW5hdGlvbi1ndWFyZC1za2lsbCc7XG5pbXBvcnQgeyBFdm9sdXRpb25IYXJuZXNzIH0gZnJvbSAnLi4vaGFybmVzcy9ldm9sdXRpb24taGFybmVzcyc7XG5pbXBvcnQgeyBLUElEYXNoYm9hcmQgfSBmcm9tICcuLi9oYXJuZXNzL2twaS1kYXNoYm9hcmQnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFJlZmluZWRHcmFwaCB7XG4gIG5vZGVzOiBBcnJheTx7IGlkOiBzdHJpbmc7IHR5cGU6IHN0cmluZzsgY29udGVudDogc3RyaW5nIH0+O1xuICBlZGdlczogQXJyYXk8eyBmcm9tOiBzdHJpbmc7IHRvOiBzdHJpbmc7IHR5cGU6IHN0cmluZyB9PjtcbiAgcXVhbGl0eTogbnVtYmVyO1xuICBjb21wbGV0ZW5lc3M6IG51bWJlcjtcbiAgdHJhY2VJZDogc3RyaW5nO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFJlcXVpcmVtZW50UmVmaW5lckNvbnRleHQge1xuICByYXdSZXF1aXJlbWVudDogc3RyaW5nO1xuICBlbmFibGVUd29Tb3VyY2U6IGJvb2xlYW47XG4gIGVuYWJsZUFCVmFsaWRhdGlvbjogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZXF1aXJlbWVudFJlZmluZXJSZXN1bHQgZXh0ZW5kcyBTa2lsbFJlc3VsdCB7XG4gIGdyYXBoOiBSZWZpbmVkR3JhcGg7XG4gIGltcHJvdmVtZW50OiBudW1iZXI7XG4gIHVzZWRCYXNlbGluZTogYm9vbGVhbjtcbiAgdHJhY2VJZDogc3RyaW5nO1xufVxuXG4vKipcbiAqIFJlcXVpcmVtZW50IFJlZmluZXIgU2tpbGwgLSByZWZpbmVzIHNpbXBsZSByZXF1aXJlbWVudHMgaW50byBjb21wbGV0ZSBncmFwaHMuXG4gKi9cbmV4cG9ydCBjbGFzcyBSZXF1aXJlbWVudFJlZmluZXJTa2lsbCBleHRlbmRzIFNraWxsIHtcbiAgbmFtZSA9ICdyZXF1aXJlbWVudC1yZWZpbmVyJztcbiAgdmVyc2lvbiA9ICcxLjAuMCc7XG4gIGRlc2NyaXB0aW9uID0gJ+mcgOaxgueyvueCvCBTa2lsbCAtIOWwhueugOWNlemcgOaxgui9rOaNouS4uuWujOaVtOOAgemqjOivgeeahOmcgOaxguWbvuiwsSc7XG5cbiAgcHJpdmF0ZSBtZW1vcnlTa2lsbDogTWVtb3J5Q29uc29saWRhdGlvblNraWxsO1xuICBwcml2YXRlIGNvbnRleHRDb21wcmVzc29yOiBDb250ZXh0Q29tcHJlc3NvclNraWxsO1xuICBwcml2YXRlIGh5YnJpZFJldHJpZXZlcjogSHlicmlkUmV0cmlldmVyU2tpbGw7XG4gIHByaXZhdGUgaGFsbHVjaW5hdGlvbkd1YXJkOiBIYWxsdWNpbmF0aW9uR3VhcmRTa2lsbDtcbiAgcHJpdmF0ZSBldm9sdXRpb25IYXJuZXNzOiBFdm9sdXRpb25IYXJuZXNzO1xuICBwcml2YXRlIGtwaURhc2hib2FyZDogS1BJRGFzaGJvYXJkO1xuXG4gIHByaXZhdGUgcmVhZG9ubHkgSU1QUk9WRU1FTlRfVEhSRVNIT0xEID0gMC4yMDsgLy8gMjAlIOaUtuebiumYiOWAvCAo5LyY5YyW5ZCO6ZmN5L2O6L+U5bel546HKVxuXG4gIGNvbnN0cnVjdG9yKFxuICAgIG1lbW9yeVNraWxsOiBNZW1vcnlDb25zb2xpZGF0aW9uU2tpbGwsXG4gICAgY29udGV4dENvbXByZXNzb3I6IENvbnRleHRDb21wcmVzc29yU2tpbGwsXG4gICAgaHlicmlkUmV0cmlldmVyOiBIeWJyaWRSZXRyaWV2ZXJTa2lsbCxcbiAgICBoYWxsdWNpbmF0aW9uR3VhcmQ6IEhhbGx1Y2luYXRpb25HdWFyZFNraWxsLFxuICAgIGV2b2x1dGlvbkhhcm5lc3M6IEV2b2x1dGlvbkhhcm5lc3MsXG4gICAga3BpRGFzaGJvYXJkOiBLUElEYXNoYm9hcmRcbiAgKSB7XG4gICAgc3VwZXIoKTtcbiAgICB0aGlzLm1lbW9yeVNraWxsID0gbWVtb3J5U2tpbGw7XG4gICAgdGhpcy5jb250ZXh0Q29tcHJlc3NvciA9IGNvbnRleHRDb21wcmVzc29yO1xuICAgIHRoaXMuaHlicmlkUmV0cmlldmVyID0gaHlicmlkUmV0cmlldmVyO1xuICAgIHRoaXMuaGFsbHVjaW5hdGlvbkd1YXJkID0gaGFsbHVjaW5hdGlvbkd1YXJkO1xuICAgIHRoaXMuZXZvbHV0aW9uSGFybmVzcyA9IGV2b2x1dGlvbkhhcm5lc3M7XG4gICAgdGhpcy5rcGlEYXNoYm9hcmQgPSBrcGlEYXNoYm9hcmQ7XG4gIH1cblxuICAvKipcbiAgICogRXhlY3V0ZSByZXF1aXJlbWVudCByZWZpbmVtZW50IHdpdGggQS9CIHNlbGYtdmFsaWRhdGlvbi5cbiAgICovXG4gIGFzeW5jIGV4ZWN1dGUoY3R4OiBSZXF1aXJlbWVudFJlZmluZXJDb250ZXh0KTogUHJvbWlzZTxSZXF1aXJlbWVudFJlZmluZXJSZXN1bHQ+IHtcbiAgICBjb25zdCB0cmFjZUlkID0gdGhpcy5nZW5lcmF0ZVRyYWNlSWQoKTtcblxuICAgIC8vIFJ1biB0d28tc291cmNlIHJlZmluZW1lbnQgKGhpc3RvcnkgKyBjdXJyZW50KVxuICAgIGNvbnN0IHR3b1NvdXJjZVJlc3VsdCA9IGF3YWl0IHRoaXMucnVuVHdvU291cmNlKGN0eC5yYXdSZXF1aXJlbWVudCwgdHJhY2VJZCk7XG5cbiAgICBsZXQgdXNlZEJhc2VsaW5lID0gZmFsc2U7XG4gICAgbGV0IGltcHJvdmVtZW50ID0gMDtcblxuICAgIC8vIEEvQiBzZWxmLXZhbGlkYXRpb24gKGlmIGVuYWJsZWQpXG4gICAgaWYgKGN0eC5lbmFibGVBQlZhbGlkYXRpb24pIHtcbiAgICAgIGNvbnN0IGJhc2VsaW5lUmVzdWx0ID0gYXdhaXQgdGhpcy5ydW5CYXNlbGluZU9uZVNvdXJjZShjdHgucmF3UmVxdWlyZW1lbnQsIHRyYWNlSWQpO1xuICAgICAgaW1wcm92ZW1lbnQgPSB0aGlzLmNhbGN1bGF0ZUltcHJvdmVtZW50KHR3b1NvdXJjZVJlc3VsdCwgYmFzZWxpbmVSZXN1bHQpO1xuXG4gICAgICAvLyBSZWNvcmQgdG8gS1BJIERhc2hib2FyZFxuICAgICAgYXdhaXQgdGhpcy5rcGlEYXNoYm9hcmQucmVjb3JkKCd0d29Tb3VyY2VJbXByb3ZlbWVudCcsIGltcHJvdmVtZW50KTtcblxuICAgICAgLy8gUm9sbGJhY2sgaWYgaW1wcm92ZW1lbnQgPCAxNSVcbiAgICAgIGlmIChpbXByb3ZlbWVudCA8IHRoaXMuSU1QUk9WRU1FTlRfVEhSRVNIT0xEKSB7XG4gICAgICAgIGF3YWl0IHRoaXMuZXZvbHV0aW9uSGFybmVzcy5yb2xsYmFja1RvQmFzZWxpbmUoKTtcbiAgICAgICAgdXNlZEJhc2VsaW5lID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgZ3JhcGg6IHVzZWRCYXNlbGluZSA/IGF3YWl0IHRoaXMucnVuQmFzZWxpbmVPbmVTb3VyY2UoY3R4LnJhd1JlcXVpcmVtZW50LCB0cmFjZUlkKSA6IHR3b1NvdXJjZVJlc3VsdCxcbiAgICAgIGltcHJvdmVtZW50LFxuICAgICAgdXNlZEJhc2VsaW5lLFxuICAgICAgdHJhY2VJZCxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFJ1biB0d28tc291cmNlIGNvbnRleHQgKGhpc3RvcnkgKyBjdXJyZW50KS5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgcnVuVHdvU291cmNlKHJhd1JlcXVpcmVtZW50OiBzdHJpbmcsIHRyYWNlSWQ6IHN0cmluZyk6IFByb21pc2U8UmVmaW5lZEdyYXBoPiB7XG4gICAgLy8gMS4gUmV0cmlldmUgaW50ZXJuYWwgaGlzdG9yeSBmcm9tIG1lbW9yeVxuICAgIGNvbnN0IG1lbW9yeUNvbnRleHQgPSBhd2FpdCB0aGlzLm1lbW9yeVNraWxsLnJldHJpZXZlKHtcbiAgICAgIHF1ZXJ5OiByYXdSZXF1aXJlbWVudCxcbiAgICAgIG1heFJlc3VsdHM6IDUsXG4gICAgfSk7XG5cbiAgICAvLyAyLiBDb21wcmVzcyBjdXJyZW50IHJlcXVpcmVtZW50XG4gICAgY29uc3QgY3VycmVudENvbnRleHQgPSBhd2FpdCB0aGlzLmNvbnRleHRDb21wcmVzc29yLmV4ZWN1dGUoe1xuICAgICAgcmF3VG9rZW5zOiByYXdSZXF1aXJlbWVudC5zcGxpdCgnICcpLFxuICAgICAgdG9rZW5Db3VudDogcmF3UmVxdWlyZW1lbnQuc3BsaXQoJyAnKS5sZW5ndGgsXG4gICAgICB0b2tlbkJ1ZGdldDogMTAwMDAsXG4gICAgICBwZXJmb3JtYW5jZU1vZGU6ICdiYWxhbmNlZCcsXG4gICAgICB0YXNrVHlwZTogJ2RvY3VtZW50JyxcbiAgICB9KTtcblxuICAgIC8vIDMuIENvbWJpbmUgY29udGV4dHNcbiAgICBjb25zdCBjb21iaW5lZENvbnRleHQgPSBbXG4gICAgICAuLi5tZW1vcnlDb250ZXh0LnJlc3VsdHMubWFwKHIgPT4gci5tZW1vcnkuY29udGVudCksXG4gICAgICAuLi5jdXJyZW50Q29udGV4dC5jb21wcmVzc2VkVG9rZW5zLFxuICAgIF0uam9pbignICcpO1xuXG4gICAgLy8gNC4gUkFHIGh5YnJpZCByZXRyaWV2YWwgKyB2YWxpZGF0aW9uXG4gICAgY29uc3QgcmFnUmVzdWx0ID0gYXdhaXQgdGhpcy5oeWJyaWRSZXRyaWV2ZXIuZXhlY3V0ZSh7XG4gICAgICBxdWVyeTogY29tYmluZWRDb250ZXh0LFxuICAgICAgZG9jdW1lbnRzOiBbXSxcbiAgICAgIG1vZGU6ICdoeWJyaWQnLFxuICAgICAgbWF4UmVzdWx0czogMTAsXG4gICAgfSk7XG5cbiAgICAvLyA1LiBIYWxsdWNpbmF0aW9uIGd1YXJkIHZlcmlmaWNhdGlvblxuICAgIGNvbnN0IHZlcmlmaWNhdGlvbiA9IGF3YWl0IHRoaXMuaGFsbHVjaW5hdGlvbkd1YXJkLmV4ZWN1dGUoe1xuICAgICAgZ2VuZXJhdGVkVGV4dDogcmF3UmVxdWlyZW1lbnQsXG4gICAgICBzb3VyY2VzOiByYWdSZXN1bHQucmVzdWx0cy5tYXAociA9PiAoe1xuICAgICAgICBpZDogci5kb2N1bWVudC5pZCxcbiAgICAgICAgY29udGVudDogci5kb2N1bWVudC5jb250ZW50LFxuICAgICAgICB0eXBlOiAnZG9jdW1lbnQnLFxuICAgICAgICByZWxpYWJpbGl0eTogMC45LFxuICAgICAgfSkpLFxuICAgICAgbW9kZTogJ3N0YW5kYXJkJyxcbiAgICAgIGVuYWJsZUdyYXBoVmFsaWRhdGlvbjogdHJ1ZSxcbiAgICB9KTtcblxuICAgIC8vIDYuIEJ1aWxkIFJlcXVpcmVtZW50IEdyYXBoIHdpdGggZW5oYW5jZWQgcXVhbGl0eSBjaGVja1xuICAgIGNvbnN0IGdyYXBoID0gdGhpcy5idWlsZEdyYXBoKHJhd1JlcXVpcmVtZW50LCB2ZXJpZmljYXRpb24udmVyaWZpZWRTdGF0ZW1lbnRzLCB0cmFjZUlkKTtcbiAgICBcbiAgICAvLyBFbmhhbmNlIHF1YWxpdHkgaWYgdmVyaWZpY2F0aW9uIHBhc3NlZCB3aXRoIGhpZ2ggY29uZmlkZW5jZVxuICAgIGlmICh2ZXJpZmljYXRpb24ub3ZlcmFsbENvbmZpZGVuY2UgPiAwLjkpIHtcbiAgICAgIGdyYXBoLnF1YWxpdHkgPSBNYXRoLm1pbigxLjAsIGdyYXBoLnF1YWxpdHkgKyAwLjEpO1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gZ3JhcGg7XG4gIH1cblxuICAvKipcbiAgICogUnVuIGJhc2VsaW5lIG9uZS1zb3VyY2UgY29udGV4dCAoY3VycmVudCBvbmx5KS5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgcnVuQmFzZWxpbmVPbmVTb3VyY2UocmF3UmVxdWlyZW1lbnQ6IHN0cmluZywgdHJhY2VJZDogc3RyaW5nKTogUHJvbWlzZTxSZWZpbmVkR3JhcGg+IHtcbiAgICAvLyBDb21wcmVzcyBjdXJyZW50IHJlcXVpcmVtZW50IG9ubHkgKG5vIGhpc3RvcnkpXG4gICAgY29uc3QgY3VycmVudENvbnRleHQgPSBhd2FpdCB0aGlzLmNvbnRleHRDb21wcmVzc29yLmV4ZWN1dGUoe1xuICAgICAgcmF3VG9rZW5zOiByYXdSZXF1aXJlbWVudC5zcGxpdCgnICcpLFxuICAgICAgdG9rZW5Db3VudDogcmF3UmVxdWlyZW1lbnQuc3BsaXQoJyAnKS5sZW5ndGgsXG4gICAgICB0b2tlbkJ1ZGdldDogMTAwMDAsXG4gICAgICBwZXJmb3JtYW5jZU1vZGU6ICdiYWxhbmNlZCcsXG4gICAgICB0YXNrVHlwZTogJ2RvY3VtZW50JyxcbiAgICB9KTtcblxuICAgIC8vIEJ1aWxkIGdyYXBoIGZyb20gY3VycmVudCBjb250ZXh0IG9ubHlcbiAgICByZXR1cm4gdGhpcy5idWlsZEdyYXBoKHJhd1JlcXVpcmVtZW50LCBjdXJyZW50Q29udGV4dC5jb21wcmVzc2VkVG9rZW5zLCB0cmFjZUlkKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxjdWxhdGUgaW1wcm92ZW1lbnQgYmV0d2VlbiB0d28tc291cmNlIGFuZCBiYXNlbGluZS5cbiAgICovXG4gIHByaXZhdGUgY2FsY3VsYXRlSW1wcm92ZW1lbnQodHdvU291cmNlOiBSZWZpbmVkR3JhcGgsIGJhc2VsaW5lOiBSZWZpbmVkR3JhcGgpOiBudW1iZXIge1xuICAgIGNvbnN0IGNvbXBsZXRlbmVzc0RlbHRhID0gdHdvU291cmNlLmNvbXBsZXRlbmVzcyAtIGJhc2VsaW5lLmNvbXBsZXRlbmVzcztcbiAgICBjb25zdCBxdWFsaXR5RGVsdGEgPSB0d29Tb3VyY2UucXVhbGl0eSAtIGJhc2VsaW5lLnF1YWxpdHk7XG4gICAgY29uc3Qgbm9kZURlbHRhID0gKHR3b1NvdXJjZS5ub2Rlcy5sZW5ndGggLSBiYXNlbGluZS5ub2Rlcy5sZW5ndGgpIC8gTWF0aC5tYXgoMSwgYmFzZWxpbmUubm9kZXMubGVuZ3RoKTtcblxuICAgIHJldHVybiAoY29tcGxldGVuZXNzRGVsdGEgKyBxdWFsaXR5RGVsdGEgKyBub2RlRGVsdGEpIC8gMztcbiAgfVxuXG4gIC8qKlxuICAgKiBCdWlsZCBSZXF1aXJlbWVudCBHcmFwaCBmcm9tIHZlcmlmaWVkIHN0YXRlbWVudHMuXG4gICAqL1xuICBwcml2YXRlIGJ1aWxkR3JhcGgocmF3UmVxdWlyZW1lbnQ6IHN0cmluZywgdmVyaWZpZWRTdGF0ZW1lbnRzOiBzdHJpbmdbXSwgdHJhY2VJZDogc3RyaW5nKTogUmVmaW5lZEdyYXBoIHtcbiAgICAvLyBTaW1wbGUgZ3JhcGggY29uc3RydWN0aW9uIChpbiBwcm9kdWN0aW9uLCB1c2UgUm9sZSBTeW50aGVzaXplcilcbiAgICBjb25zdCBub2RlcyA9IHZlcmlmaWVkU3RhdGVtZW50cy5tYXAoKHN0bXQsIGlkeCkgPT4gKHtcbiAgICAgIGlkOiBgbm9kZS0ke2lkeH1gLFxuICAgICAgdHlwZTogJ3JlcXVpcmVtZW50JyxcbiAgICAgIGNvbnRlbnQ6IHN0bXQsXG4gICAgfSkpO1xuXG4gICAgY29uc3QgZWRnZXMgPSBub2Rlcy5zbGljZSgxKS5tYXAoKG5vZGUsIGlkeCkgPT4gKHtcbiAgICAgIGZyb206IG5vZGVzW2lkeF0uaWQsXG4gICAgICB0bzogbm9kZS5pZCxcbiAgICAgIHR5cGU6ICdkZXBlbmRzX29uJyxcbiAgICB9KSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgbm9kZXMsXG4gICAgICBlZGdlcyxcbiAgICAgIHF1YWxpdHk6IDAuOSxcbiAgICAgIGNvbXBsZXRlbmVzczogbm9kZXMubGVuZ3RoIC8gTWF0aC5tYXgoMSwgdmVyaWZpZWRTdGF0ZW1lbnRzLmxlbmd0aCksXG4gICAgICB0cmFjZUlkLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogR2VuZXJhdGUgdHJhY2UgSUQuXG4gICAqL1xuICBwcml2YXRlIGdlbmVyYXRlVHJhY2VJZCgpOiBzdHJpbmcge1xuICAgIHJldHVybiBgdHJhY2VfJHtEYXRlLm5vdygpfV8ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cmluZygyLCA5KX1gO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBza2lsbCBtZXRhZGF0YS5cbiAgICovXG4gIGdldE1ldGFkYXRhKCk6IFJlY29yZDxzdHJpbmcsIGFueT4ge1xuICAgIHJldHVybiB7XG4gICAgICBuYW1lOiB0aGlzLm5hbWUsXG4gICAgICB2ZXJzaW9uOiB0aGlzLnZlcnNpb24sXG4gICAgICBpbXByb3ZlbWVudFRocmVzaG9sZDogdGhpcy5JTVBST1ZFTUVOVF9USFJFU0hPTEQsXG4gICAgICBhYlZhbGlkYXRpb25FbmFibGVkOiB0cnVlLFxuICAgIH07XG4gIH1cbn1cblxuLyoqXG4gKiBDcmVhdGUgUmVxdWlyZW1lbnQgUmVmaW5lciBTa2lsbC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVJlcXVpcmVtZW50UmVmaW5lclNraWxsKFxuICBtZW1vcnlTa2lsbDogTWVtb3J5Q29uc29saWRhdGlvblNraWxsLFxuICBjb250ZXh0Q29tcHJlc3NvcjogQ29udGV4dENvbXByZXNzb3JTa2lsbCxcbiAgaHlicmlkUmV0cmlldmVyOiBIeWJyaWRSZXRyaWV2ZXJTa2lsbCxcbiAgaGFsbHVjaW5hdGlvbkd1YXJkOiBIYWxsdWNpbmF0aW9uR3VhcmRTa2lsbCxcbiAgZXZvbHV0aW9uSGFybmVzczogRXZvbHV0aW9uSGFybmVzcyxcbiAga3BpRGFzaGJvYXJkOiBLUElEYXNoYm9hcmRcbik6IFJlcXVpcmVtZW50UmVmaW5lclNraWxsIHtcbiAgcmV0dXJuIG5ldyBSZXF1aXJlbWVudFJlZmluZXJTa2lsbChcbiAgICBtZW1vcnlTa2lsbCxcbiAgICBjb250ZXh0Q29tcHJlc3NvcixcbiAgICBoeWJyaWRSZXRyaWV2ZXIsXG4gICAgaGFsbHVjaW5hdGlvbkd1YXJkLFxuICAgIGV2b2x1dGlvbkhhcm5lc3MsXG4gICAga3BpRGFzaGJvYXJkXG4gICk7XG59XG4iXX0=