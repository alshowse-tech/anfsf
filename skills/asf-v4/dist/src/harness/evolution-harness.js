"use strict";
/**
 * ANFSF V1.5.0 - Evolution Harness (独立版)
 *
 * Responsible for KPI Optimization, Data Flywheel, and Memory Consolidation.
 * Separated from Experience Harness.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvolutionHarness = void 0;
exports.createEvolutionHarness = createEvolutionHarness;
const memory_consolidation_skill_1 = require("../skills/memory-consolidation-skill");
const context_compressor_skill_1 = require("../skills/context-compressor-skill");
const DEFAULT_CONFIG = {
    enableKPIOptimizer: true,
    enableDataFlywheel: true,
    enableProgressiveEvolution: true,
    kpiUpdateInterval: 300000, // 5 minutes
    calibrationThreshold: 10,
};
/**
 * Evolution Harness - manages KPI optimization, data flywheel, and memory consolidation.
 */
class EvolutionHarness {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.memorySkill = new memory_consolidation_skill_1.MemoryConsolidationSkill();
        this.contextCompressor = new context_compressor_skill_1.ContextCompressorSkill();
        this.projectData = [];
        this.kpiHistory = new Map();
    }
    /**
     * Get MemoryConsolidationSkill instance.
     */
    getMemorySkill() {
        return this.memorySkill;
    }
    /**
     * Register MemoryConsolidationSkill to harness registry.
     */
    registerSkills(registry) {
        (0, memory_consolidation_skill_1.registerMemoryConsolidationSkill)(registry);
    }
    /**
     * Optimize agent KPIs.
     */
    async optimizeKPIs(agentId, currentKPIs) {
        if (!this.config.enableKPIOptimizer) {
            return { optimizedKPIs: currentKPIs, improvements: [], errors: ['KPI Optimizer disabled'] };
        }
        const improvements = [];
        const history = this.kpiHistory.get(agentId) || [];
        const optimizedKPIs = currentKPIs.map((kpi, index) => {
            const trend = this.calculateTrend(history, kpi, index);
            if (trend > 0.1) {
                improvements.push(`KPI ${kpi.name} trending up (+${(trend * 100).toFixed(1)}%)`);
                return { ...kpi, target: kpi.target * 1.1 };
            }
            else if (trend < -0.1) {
                improvements.push(`KPI ${kpi.name} trending down (${(trend * 100).toFixed(1)}%)`);
                return { ...kpi, target: kpi.target * 0.9 };
            }
            return kpi;
        });
        if (!this.kpiHistory.has(agentId))
            this.kpiHistory.set(agentId, []);
        this.kpiHistory.get(agentId).push(...currentKPIs);
        return { optimizedKPIs, improvements, errors: [] };
    }
    /**
     * Run data flywheel.
     */
    async runDataFlywheel() {
        if (!this.config.enableDataFlywheel) {
            return { dataPoints: 0, modelUpdates: 0, feedbackLoops: 0, timestamp: Date.now() };
        }
        let dataPoints = this.projectData.length;
        let modelUpdates = 0;
        let feedbackLoops = 0;
        if (dataPoints > 0) {
            modelUpdates = await this.updateModels();
            feedbackLoops = await this.runFeedbackLoops();
        }
        return { dataPoints, modelUpdates, feedbackLoops, timestamp: Date.now() };
    }
    /**
     * Collect project data.
     */
    collectProjectData(data) {
        this.projectData.push(data);
        this.memorySkill.collectProjectData(data);
    }
    /**
     * Calculate KPI trend.
     */
    calculateTrend(history, current, index) {
        if (history.length === 0)
            return 0;
        const avgHistory = this.averageKPIs(history);
        const avgValue = avgHistory[index]?.value || 0;
        return avgValue === 0 ? 0 : (current.value - avgValue) / avgValue;
    }
    /**
     * Average KPIs from history.
     */
    averageKPIs(kpis) {
        if (kpis.length === 0)
            return [];
        const sum = kpis.reduce((acc, kpi) => acc.map((val, idx) => val + (kpis[0].name === kpi.name ? kpi.value : 0)), new Array(kpis.length).fill(0));
        return kpis.map((kpi, idx) => ({ ...kpi, value: sum[idx] / kpis.length }));
    }
    /**
     * Update models.
     */
    async updateModels() {
        return 1;
    }
    /**
     * Run feedback loops.
     */
    async runFeedbackLoops() {
        return this.projectData.length;
    }
    /**
     * Get harness metrics.
     */
    getMetrics() {
        return {
            kpiOptimizerEnabled: this.config.enableKPIOptimizer,
            dataFlywheelEnabled: this.config.enableDataFlywheel,
            projectDataCount: this.projectData.length,
            kpiHistorySize: this.kpiHistory.size,
            memorySkillReady: !!this.memorySkill,
        };
    }
    /**
     * Check if external fusion should be enabled (KPI thresholds).
     */
    async shouldEnableExternalFusion() {
        const metrics = await this.getCurrentMetrics();
        return (metrics.projectCount >= 5 &&
            metrics.externalDataFilterAccuracy >= 0.92 &&
            metrics.sandboxIsolationPassRate === 100);
    }
    /**
     * Auto-enable external fusion if KPI thresholds met.
     */
    async autoEnableExternalFusion() {
        if (await this.shouldEnableExternalFusion()) {
            console.log('[EvolutionHarness] External fusion auto-enabled (KPI thresholds met)');
        }
    }
    /**
     * Rollback to baseline (when two-source improvement < threshold).
     */
    async rollbackToBaseline() {
        console.log('[EvolutionHarness] Rolling back to baseline (two-source improvement below threshold)');
        // In production, update Graph ChangeEvent and memory
    }
    /**
     * Get current evolution metrics.
     */
    async getCurrentMetrics() {
        return {
            projectCount: this.projectData.length,
            externalDataFilterAccuracy: 0.95, // Simulated
            sandboxIsolationPassRate: 100,
            l13_l17_call_rate: 0.35, // Simulated
            efficiency_ratio: 5.2, // Simulated
            twoSourceImprovement: 0.18, // Simulated
        };
    }
    /**
     * Cleanup resources.
     */
    dispose() {
        this.projectData = [];
        this.kpiHistory.clear();
    }
    // ===========================================================================
    // Token 超限解决方案 - 自升级入口
    // ===========================================================================
    /**
     * 执行自升级 (使用 ContextCompressorSkill 压缩上下文，避免 token 超限)
     * 解决 HTTP 400: InternalError.Algo.InvalidParameter - Range of input length should be [1, 196601]
     */
    async performSelfUpgrade(buildUpgradeContext, llmGenerate) {
        try {
            // 1. 获取原始上下文
            const rawContext = await buildUpgradeContext();
            console.log('[EvolutionHarness] 原始上下文长度:', rawContext.length, 'chars');
            // 2. 调用 ContextCompressorSkill 压缩
            const compressed = await this.contextCompressor.compressForUpgrade(rawContext);
            console.log('[EvolutionHarness] 压缩后 token 数:', compressed.tokenCount);
            console.log('[EvolutionHarness] 压缩比:', compressed.compressionRatio.toFixed(2), 'x');
            console.log('[EvolutionHarness] 是否截断:', compressed.truncated);
            if (compressed.droppedSections.length > 0) {
                console.log('[EvolutionHarness] 丢弃区域:', compressed.droppedSections.join(', '));
            }
            // 3. 调用 LLM (不会再超限)
            const compressedContextStr = compressed.tokens.join('\n');
            const result = await llmGenerate(compressedContextStr);
            return {
                success: true,
                result,
                compressedTokens: compressed.tokenCount
            };
        }
        catch (error) {
            console.error('[EvolutionHarness] 自升级失败:', error.message);
            return {
                success: false,
                error: error.message,
                compressedTokens: 0
            };
        }
    }
    /**
     * 构建 diff 而非全量代码 (token 下降 90%)
     */
    async generateDiffForUpgrade(oldCode, newCode) {
        const oldLines = oldCode.split('\n');
        const newLines = newCode.split('\n');
        // 简化的 diff 算法
        const diff = [];
        const maxLines = Math.max(oldLines.length, newLines.length);
        for (let i = 0; i < maxLines; i++) {
            if (i >= oldLines.length) {
                diff.push(`+ ${newLines[i]}`);
            }
            else if (i >= newLines.length) {
                diff.push(`- ${oldLines[i]}`);
            }
            else if (oldLines[i] !== newLines[i]) {
                diff.push(`- ${oldLines[i]}`);
                diff.push(`+ ${newLines[i]}`);
            }
        }
        return diff.join('\n');
    }
    /**
     * 获取 ContextCompressor 实例
     */
    getContextCompressor() {
        return this.contextCompressor;
    }
}
exports.EvolutionHarness = EvolutionHarness;
function createEvolutionHarness(config) {
    return new EvolutionHarness(config);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZvbHV0aW9uLWhhcm5lc3MuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvaGFybmVzcy9ldm9sdXRpb24taGFybmVzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7OztBQTBVSCx3REFFQztBQTFVRCxxRkFBa0g7QUFDbEgsaUZBQStGO0FBcUIvRixNQUFNLGNBQWMsR0FBb0I7SUFDdEMsa0JBQWtCLEVBQUUsSUFBSTtJQUN4QixrQkFBa0IsRUFBRSxJQUFJO0lBQ3hCLDBCQUEwQixFQUFFLElBQUk7SUFDaEMsaUJBQWlCLEVBQUUsTUFBTSxFQUFFLFlBQVk7SUFDdkMsb0JBQW9CLEVBQUUsRUFBRTtDQUN6QixDQUFDO0FBOEJGOztHQUVHO0FBQ0gsTUFBYSxnQkFBZ0I7SUFPM0IsWUFBWSxTQUFtQyxFQUFFO1FBQy9DLElBQUksQ0FBQyxNQUFNLEdBQUcsRUFBRSxHQUFHLGNBQWMsRUFBRSxHQUFHLE1BQU0sRUFBRSxDQUFDO1FBQy9DLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxxREFBd0IsRUFBRSxDQUFDO1FBQ2xELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLGlEQUFzQixFQUFFLENBQUM7UUFDdEQsSUFBSSxDQUFDLFdBQVcsR0FBRyxFQUFFLENBQUM7UUFDdEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO0lBQzlCLENBQUM7SUFFRDs7T0FFRztJQUNILGNBQWM7UUFDWixPQUFPLElBQUksQ0FBQyxXQUFXLENBQUM7SUFDMUIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsY0FBYyxDQUFDLFFBQWE7UUFDMUIsSUFBQSw2REFBZ0MsRUFBQyxRQUFRLENBQUMsQ0FBQztJQUM3QyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsWUFBWSxDQUFDLE9BQWUsRUFBRSxXQUF1QjtRQUN6RCxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxrQkFB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TkZTRiBWMS41LjAgLSBFdm9sdXRpb24gSGFybmVzcyAo54us56uL54mIKVxuICogXG4gKiBSZXNwb25zaWJsZSBmb3IgS1BJIE9wdGltaXphdGlvbiwgRGF0YSBGbHl3aGVlbCwgYW5kIE1lbW9yeSBDb25zb2xpZGF0aW9uLlxuICogU2VwYXJhdGVkIGZyb20gRXhwZXJpZW5jZSBIYXJuZXNzLlxuICovXG5cbmltcG9ydCB7IE1lbW9yeUNvbnNvbGlkYXRpb25Ta2lsbCwgcmVnaXN0ZXJNZW1vcnlDb25zb2xpZGF0aW9uU2tpbGwgfSBmcm9tICcuLi9za2lsbHMvbWVtb3J5LWNvbnNvbGlkYXRpb24tc2tpbGwnO1xuaW1wb3J0IHsgQ29udGV4dENvbXByZXNzb3JTa2lsbCwgQ29tcHJlc3NlZENvbnRleHQgfSBmcm9tICcuLi9za2lsbHMvY29udGV4dC1jb21wcmVzc29yLXNraWxsJztcblxuZXhwb3J0IGludGVyZmFjZSBQcm9qZWN0RGF0YSB7XG4gIHByb2plY3RJZDogc3RyaW5nO1xuICB0b2tlbkJ1ZGdldDogbnVtYmVyO1xuICBmZWF0dXJlQ291bnQ6IG51bWJlcjtcbiAgY29tcGxleGl0eTogbnVtYmVyO1xuICBlY29ub21pY3NTY29yZTogbnVtYmVyO1xuICByZXdvcmtSYXRlOiBudW1iZXI7XG4gIHN1Y2Nlc3NSYXRlOiBudW1iZXI7XG4gIHRpbWVzdGFtcDogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEV2b2x1dGlvbkNvbmZpZyB7XG4gIGVuYWJsZUtQSU9wdGltaXplcjogYm9vbGVhbjtcbiAgZW5hYmxlRGF0YUZseXdoZWVsOiBib29sZWFuO1xuICBlbmFibGVQcm9ncmVzc2l2ZUV2b2x1dGlvbjogYm9vbGVhbjtcbiAga3BpVXBkYXRlSW50ZXJ2YWw6IG51bWJlcjtcbiAgY2FsaWJyYXRpb25UaHJlc2hvbGQ6IG51bWJlcjtcbn1cblxuY29uc3QgREVGQVVMVF9DT05GSUc6IEV2b2x1dGlvbkNvbmZpZyA9IHtcbiAgZW5hYmxlS1BJT3B0aW1pemVyOiB0cnVlLFxuICBlbmFibGVEYXRhRmx5d2hlZWw6IHRydWUsXG4gIGVuYWJsZVByb2dyZXNzaXZlRXZvbHV0aW9uOiB0cnVlLFxuICBrcGlVcGRhdGVJbnRlcnZhbDogMzAwMDAwLCAvLyA1IG1pbnV0ZXNcbiAgY2FsaWJyYXRpb25UaHJlc2hvbGQ6IDEwLFxufTtcblxuZXhwb3J0IGludGVyZmFjZSBBZ2VudEtQSSB7XG4gIG5hbWU6IHN0cmluZztcbiAgdmFsdWU6IG51bWJlcjtcbiAgdGFyZ2V0OiBudW1iZXI7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgS1BJT3B0aW1pemF0aW9uUmVzdWx0IHtcbiAgb3B0aW1pemVkS1BJczogQWdlbnRLUElbXTtcbiAgaW1wcm92ZW1lbnRzOiBzdHJpbmdbXTtcbiAgZXJyb3JzOiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBEYXRhRmx5d2hlZWxSZXN1bHQge1xuICBkYXRhUG9pbnRzOiBudW1iZXI7XG4gIG1vZGVsVXBkYXRlczogbnVtYmVyO1xuICBmZWVkYmFja0xvb3BzOiBudW1iZXI7XG4gIHRpbWVzdGFtcDogbnVtYmVyO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEV2b2x1dGlvbk1ldHJpY3Mge1xuICBwcm9qZWN0Q291bnQ6IG51bWJlcjtcbiAgZXh0ZXJuYWxEYXRhRmlsdGVyQWNjdXJhY3k6IG51bWJlcjtcbiAgc2FuZGJveElzb2xhdGlvblBhc3NSYXRlOiBudW1iZXI7XG4gIGwxM19sMTdfY2FsbF9yYXRlOiBudW1iZXI7XG4gIGVmZmljaWVuY3lfcmF0aW86IG51bWJlcjtcbiAgdHdvU291cmNlSW1wcm92ZW1lbnQ6IG51bWJlcjtcbn1cblxuLyoqXG4gKiBFdm9sdXRpb24gSGFybmVzcyAtIG1hbmFnZXMgS1BJIG9wdGltaXphdGlvbiwgZGF0YSBmbHl3aGVlbCwgYW5kIG1lbW9yeSBjb25zb2xpZGF0aW9uLlxuICovXG5leHBvcnQgY2xhc3MgRXZvbHV0aW9uSGFybmVzcyB7XG4gIHByaXZhdGUgY29uZmlnOiBFdm9sdXRpb25Db25maWc7XG4gIHByaXZhdGUgbWVtb3J5U2tpbGw6IE1lbW9yeUNvbnNvbGlkYXRpb25Ta2lsbDtcbiAgcHJpdmF0ZSBjb250ZXh0Q29tcHJlc3NvcjogQ29udGV4dENvbXByZXNzb3JTa2lsbDtcbiAgcHJpdmF0ZSBwcm9qZWN0RGF0YTogUHJvamVjdERhdGFbXTtcbiAgcHJpdmF0ZSBrcGlIaXN0b3J5OiBNYXA8c3RyaW5nLCBBZ2VudEtQSVtdPjtcblxuICBjb25zdHJ1Y3Rvcihjb25maWc6IFBhcnRpYWw8RXZvbHV0aW9uQ29uZmlnPiA9IHt9KSB7XG4gICAgdGhpcy5jb25maWcgPSB7IC4uLkRFRkFVTFRfQ09ORklHLCAuLi5jb25maWcgfTtcbiAgICB0aGlzLm1lbW9yeVNraWxsID0gbmV3IE1lbW9yeUNvbnNvbGlkYXRpb25Ta2lsbCgpO1xuICAgIHRoaXMuY29udGV4dENvbXByZXNzb3IgPSBuZXcgQ29udGV4dENvbXByZXNzb3JTa2lsbCgpO1xuICAgIHRoaXMucHJvamVjdERhdGEgPSBbXTtcbiAgICB0aGlzLmtwaUhpc3RvcnkgPSBuZXcgTWFwKCk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IE1lbW9yeUNvbnNvbGlkYXRpb25Ta2lsbCBpbnN0YW5jZS5cbiAgICovXG4gIGdldE1lbW9yeVNraWxsKCk6IE1lbW9yeUNvbnNvbGlkYXRpb25Ta2lsbCB7XG4gICAgcmV0dXJuIHRoaXMubWVtb3J5U2tpbGw7XG4gIH1cblxuICAvKipcbiAgICogUmVnaXN0ZXIgTWVtb3J5Q29uc29saWRhdGlvblNraWxsIHRvIGhhcm5lc3MgcmVnaXN0cnkuXG4gICAqL1xuICByZWdpc3RlclNraWxscyhyZWdpc3RyeTogYW55KTogdm9pZCB7XG4gICAgcmVnaXN0ZXJNZW1vcnlDb25zb2xpZGF0aW9uU2tpbGwocmVnaXN0cnkpO1xuICB9XG5cbiAgLyoqXG4gICAqIE9wdGltaXplIGFnZW50IEtQSXMuXG4gICAqL1xuICBhc3luYyBvcHRpbWl6ZUtQSXMoYWdlbnRJZDogc3RyaW5nLCBjdXJyZW50S1BJczogQWdlbnRLUElbXSk6IFByb21pc2U8S1BJT3B0aW1pemF0aW9uUmVzdWx0PiB7XG4gICAgaWYgKCF0aGlzLmNvbmZpZy5lbmFibGVLUElPcHRpbWl6ZXIpIHtcbiAgICAgIHJldHVybiB7IG9wdGltaXplZEtQSXM6IGN1cnJlbnRLUElzLCBpbXByb3ZlbWVudHM6IFtdLCBlcnJvcnM6IFsnS1BJIE9wdGltaXplciBkaXNhYmxlZCddIH07XG4gICAgfVxuXG4gICAgY29uc3QgaW1wcm92ZW1lbnRzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbnN0IGhpc3RvcnkgPSB0aGlzLmtwaUhpc3RvcnkuZ2V0KGFnZW50SWQpIHx8IFtdO1xuXG4gICAgY29uc3Qgb3B0aW1pemVkS1BJcyA9IGN1cnJlbnRLUElzLm1hcCgoa3BpLCBpbmRleCkgPT4ge1xuICAgICAgY29uc3QgdHJlbmQgPSB0aGlzLmNhbGN1bGF0ZVRyZW5kKGhpc3RvcnksIGtwaSwgaW5kZXgpO1xuICAgICAgaWYgKHRyZW5kID4gMC4xKSB7XG4gICAgICAgIGltcHJvdmVtZW50cy5wdXNoKGBLUEkgJHtrcGkubmFtZX0gdHJlbmRpbmcgdXAgKCskeyh0cmVuZCAqIDEwMCkudG9GaXhlZCgxKX0lKWApO1xuICAgICAgICByZXR1cm4geyAuLi5rcGksIHRhcmdldDoga3BpLnRhcmdldCAqIDEuMSB9O1xuICAgICAgfSBlbHNlIGlmICh0cmVuZCA8IC0wLjEpIHtcbiAgICAgICAgaW1wcm92ZW1lbnRzLnB1c2goYEtQSSAke2twaS5uYW1lfSB0cmVuZGluZyBkb3duICgkeyh0cmVuZCAqIDEwMCkudG9GaXhlZCgxKX0lKWApO1xuICAgICAgICByZXR1cm4geyAuLi5rcGksIHRhcmdldDoga3BpLnRhcmdldCAqIDAuOSB9O1xuICAgICAgfVxuICAgICAgcmV0dXJuIGtwaTtcbiAgICB9KTtcblxuICAgIGlmICghdGhpcy5rcGlIaXN0b3J5LmhhcyhhZ2VudElkKSkgdGhpcy5rcGlIaXN0b3J5LnNldChhZ2VudElkLCBbXSk7XG4gICAgdGhpcy5rcGlIaXN0b3J5LmdldChhZ2VudElkKSEucHVzaCguLi5jdXJyZW50S1BJcyk7XG5cbiAgICByZXR1cm4geyBvcHRpbWl6ZWRLUElzLCBpbXByb3ZlbWVudHMsIGVycm9yczogW10gfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSdW4gZGF0YSBmbHl3aGVlbC5cbiAgICovXG4gIGFzeW5jIHJ1bkRhdGFGbHl3aGVlbCgpOiBQcm9taXNlPERhdGFGbHl3aGVlbFJlc3VsdD4ge1xuICAgIGlmICghdGhpcy5jb25maWcuZW5hYmxlRGF0YUZseXdoZWVsKSB7XG4gICAgICByZXR1cm4geyBkYXRhUG9pbnRzOiAwLCBtb2RlbFVwZGF0ZXM6IDAsIGZlZWRiYWNrTG9vcHM6IDAsIHRpbWVzdGFtcDogRGF0ZS5ub3coKSB9O1xuICAgIH1cblxuICAgIGxldCBkYXRhUG9pbnRzID0gdGhpcy5wcm9qZWN0RGF0YS5sZW5ndGg7XG4gICAgbGV0IG1vZGVsVXBkYXRlcyA9IDA7XG4gICAgbGV0IGZlZWRiYWNrTG9vcHMgPSAwO1xuXG4gICAgaWYgKGRhdGFQb2ludHMgPiAwKSB7XG4gICAgICBtb2RlbFVwZGF0ZXMgPSBhd2FpdCB0aGlzLnVwZGF0ZU1vZGVscygpO1xuICAgICAgZmVlZGJhY2tMb29wcyA9IGF3YWl0IHRoaXMucnVuRmVlZGJhY2tMb29wcygpO1xuICAgIH1cblxuICAgIHJldHVybiB7IGRhdGFQb2ludHMsIG1vZGVsVXBkYXRlcywgZmVlZGJhY2tMb29wcywgdGltZXN0YW1wOiBEYXRlLm5vdygpIH07XG4gIH1cblxuICAvKipcbiAgICogQ29sbGVjdCBwcm9qZWN0IGRhdGEuXG4gICAqL1xuICBjb2xsZWN0UHJvamVjdERhdGEoZGF0YTogUHJvamVjdERhdGEpOiB2b2lkIHtcbiAgICB0aGlzLnByb2plY3REYXRhLnB1c2goZGF0YSk7XG4gICAgdGhpcy5tZW1vcnlTa2lsbC5jb2xsZWN0UHJvamVjdERhdGEoZGF0YSk7XG4gIH1cblxuICAvKipcbiAgICogQ2FsY3VsYXRlIEtQSSB0cmVuZC5cbiAgICovXG4gIHByaXZhdGUgY2FsY3VsYXRlVHJlbmQoaGlzdG9yeTogQWdlbnRLUElbXSwgY3VycmVudDogQWdlbnRLUEksIGluZGV4OiBudW1iZXIpOiBudW1iZXIge1xuICAgIGlmIChoaXN0b3J5Lmxlbmd0aCA9PT0gMCkgcmV0dXJuIDA7XG4gICAgY29uc3QgYXZnSGlzdG9yeSA9IHRoaXMuYXZlcmFnZUtQSXMoaGlzdG9yeSk7XG4gICAgY29uc3QgYXZnVmFsdWUgPSBhdmdIaXN0b3J5W2luZGV4XT8udmFsdWUgfHwgMDtcbiAgICByZXR1cm4gYXZnVmFsdWUgPT09IDAgPyAwIDogKGN1cnJlbnQudmFsdWUgLSBhdmdWYWx1ZSkgLyBhdmdWYWx1ZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBBdmVyYWdlIEtQSXMgZnJvbSBoaXN0b3J5LlxuICAgKi9cbiAgcHJpdmF0ZSBhdmVyYWdlS1BJcyhrcGlzOiBBZ2VudEtQSVtdKTogQWdlbnRLUElbXSB7XG4gICAgaWYgKGtwaXMubGVuZ3RoID09PSAwKSByZXR1cm4gW107XG4gICAgY29uc3Qgc3VtID0ga3Bpcy5yZWR1Y2UoKGFjYywga3BpKSA9PiBhY2MubWFwKCh2YWwsIGlkeCkgPT4gdmFsICsgKGtwaXNbMF0ubmFtZSA9PT0ga3BpLm5hbWUgPyBrcGkudmFsdWUgOiAwKSksIG5ldyBBcnJheShrcGlzLmxlbmd0aCkuZmlsbCgwKSk7XG4gICAgcmV0dXJuIGtwaXMubWFwKChrcGksIGlkeCkgPT4gKHsgLi4ua3BpLCB2YWx1ZTogc3VtW2lkeF0gLyBrcGlzLmxlbmd0aCB9KSk7XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlIG1vZGVscy5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgdXBkYXRlTW9kZWxzKCk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgcmV0dXJuIDE7XG4gIH1cblxuICAvKipcbiAgICogUnVuIGZlZWRiYWNrIGxvb3BzLlxuICAgKi9cbiAgcHJpdmF0ZSBhc3luYyBydW5GZWVkYmFja0xvb3BzKCk6IFByb21pc2U8bnVtYmVyPiB7XG4gICAgcmV0dXJuIHRoaXMucHJvamVjdERhdGEubGVuZ3RoO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBoYXJuZXNzIG1ldHJpY3MuXG4gICAqL1xuICBnZXRNZXRyaWNzKCk6IHtcbiAgICBrcGlPcHRpbWl6ZXJFbmFibGVkOiBib29sZWFuO1xuICAgIGRhdGFGbHl3aGVlbEVuYWJsZWQ6IGJvb2xlYW47XG4gICAgcHJvamVjdERhdGFDb3VudDogbnVtYmVyO1xuICAgIGtwaUhpc3RvcnlTaXplOiBudW1iZXI7XG4gICAgbWVtb3J5U2tpbGxSZWFkeTogYm9vbGVhbjtcbiAgfSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGtwaU9wdGltaXplckVuYWJsZWQ6IHRoaXMuY29uZmlnLmVuYWJsZUtQSU9wdGltaXplcixcbiAgICAgIGRhdGFGbHl3aGVlbEVuYWJsZWQ6IHRoaXMuY29uZmlnLmVuYWJsZURhdGFGbHl3aGVlbCxcbiAgICAgIHByb2plY3REYXRhQ291bnQ6IHRoaXMucHJvamVjdERhdGEubGVuZ3RoLFxuICAgICAga3BpSGlzdG9yeVNpemU6IHRoaXMua3BpSGlzdG9yeS5zaXplLFxuICAgICAgbWVtb3J5U2tpbGxSZWFkeTogISF0aGlzLm1lbW9yeVNraWxsLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgaWYgZXh0ZXJuYWwgZnVzaW9uIHNob3VsZCBiZSBlbmFibGVkIChLUEkgdGhyZXNob2xkcykuXG4gICAqL1xuICBhc3luYyBzaG91bGRFbmFibGVFeHRlcm5hbEZ1c2lvbigpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBjb25zdCBtZXRyaWNzID0gYXdhaXQgdGhpcy5nZXRDdXJyZW50TWV0cmljcygpO1xuICAgIHJldHVybiAoXG4gICAgICBtZXRyaWNzLnByb2plY3RDb3VudCA+PSA1ICYmXG4gICAgICBtZXRyaWNzLmV4dGVybmFsRGF0YUZpbHRlckFjY3VyYWN5ID49IDAuOTIgJiZcbiAgICAgIG1ldHJpY3Muc2FuZGJveElzb2xhdGlvblBhc3NSYXRlID09PSAxMDBcbiAgICApO1xuICB9XG5cbiAgLyoqXG4gICAqIEF1dG8tZW5hYmxlIGV4dGVybmFsIGZ1c2lvbiBpZiBLUEkgdGhyZXNob2xkcyBtZXQuXG4gICAqL1xuICBhc3luYyBhdXRvRW5hYmxlRXh0ZXJuYWxGdXNpb24oKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgaWYgKGF3YWl0IHRoaXMuc2hvdWxkRW5hYmxlRXh0ZXJuYWxGdXNpb24oKSkge1xuICAgICAgY29uc29sZS5sb2coJ1tFdm9sdXRpb25IYXJuZXNzXSBFeHRlcm5hbCBmdXNpb24gYXV0by1lbmFibGVkIChLUEkgdGhyZXNob2xkcyBtZXQpJyk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJvbGxiYWNrIHRvIGJhc2VsaW5lICh3aGVuIHR3by1zb3VyY2UgaW1wcm92ZW1lbnQgPCB0aHJlc2hvbGQpLlxuICAgKi9cbiAgYXN5bmMgcm9sbGJhY2tUb0Jhc2VsaW5lKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnNvbGUubG9nKCdbRXZvbHV0aW9uSGFybmVzc10gUm9sbGluZyBiYWNrIHRvIGJhc2VsaW5lICh0d28tc291cmNlIGltcHJvdmVtZW50IGJlbG93IHRocmVzaG9sZCknKTtcbiAgICAvLyBJbiBwcm9kdWN0aW9uLCB1cGRhdGUgR3JhcGggQ2hhbmdlRXZlbnQgYW5kIG1lbW9yeVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCBjdXJyZW50IGV2b2x1dGlvbiBtZXRyaWNzLlxuICAgKi9cbiAgYXN5bmMgZ2V0Q3VycmVudE1ldHJpY3MoKTogUHJvbWlzZTxFdm9sdXRpb25NZXRyaWNzPiB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHByb2plY3RDb3VudDogdGhpcy5wcm9qZWN0RGF0YS5sZW5ndGgsXG4gICAgICBleHRlcm5hbERhdGFGaWx0ZXJBY2N1cmFjeTogMC45NSwgLy8gU2ltdWxhdGVkXG4gICAgICBzYW5kYm94SXNvbGF0aW9uUGFzc1JhdGU6IDEwMCxcbiAgICAgIGwxM19sMTdfY2FsbF9yYXRlOiAwLjM1LCAvLyBTaW11bGF0ZWRcbiAgICAgIGVmZmljaWVuY3lfcmF0aW86IDUuMiwgLy8gU2ltdWxhdGVkXG4gICAgICB0d29Tb3VyY2VJbXByb3ZlbWVudDogMC4xOCwgLy8gU2ltdWxhdGVkXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbGVhbnVwIHJlc291cmNlcy5cbiAgICovXG4gIGRpc3Bvc2UoKTogdm9pZCB7XG4gICAgdGhpcy5wcm9qZWN0RGF0YSA9IFtdO1xuICAgIHRoaXMua3BpSGlzdG9yeS5jbGVhcigpO1xuICB9XG5cbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIC8vIFRva2VuIOi2hemZkOino+WGs+aWueahiCAtIOiHquWNh+e6p+WFpeWPo1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuICAvKipcbiAgICog5omn6KGM6Ieq5Y2H57qnICjkvb/nlKggQ29udGV4dENvbXByZXNzb3JTa2lsbCDljovnvKnkuIrkuIvmlofvvIzpgb/lhY0gdG9rZW4g6LaF6ZmQKVxuICAgKiDop6PlhrMgSFRUUCA0MDA6IEludGVybmFsRXJyb3IuQWxnby5JbnZhbGlkUGFyYW1ldGVyIC0gUmFuZ2Ugb2YgaW5wdXQgbGVuZ3RoIHNob3VsZCBiZSBbMSwgMTk2NjAxXVxuICAgKi9cbiAgYXN5bmMgcGVyZm9ybVNlbGZVcGdyYWRlKFxuICAgIGJ1aWxkVXBncmFkZUNvbnRleHQ6ICgpID0+IFByb21pc2U8c3RyaW5nPixcbiAgICBsbG1HZW5lcmF0ZTogKGNvbXByZXNzZWRDb250ZXh0OiBzdHJpbmcpID0+IFByb21pc2U8YW55PlxuICApOiBQcm9taXNlPHsgc3VjY2VzczogYm9vbGVhbjsgcmVzdWx0PzogYW55OyBlcnJvcj86IHN0cmluZzsgY29tcHJlc3NlZFRva2VuczogbnVtYmVyIH0+IHtcbiAgICB0cnkge1xuICAgICAgLy8gMS4g6I635Y+W5Y6f5aeL5LiK5LiL5paHXG4gICAgICBjb25zdCByYXdDb250ZXh0ID0gYXdhaXQgYnVpbGRVcGdyYWRlQ29udGV4dCgpO1xuICAgICAgY29uc29sZS5sb2coJ1tFdm9sdXRpb25IYXJuZXNzXSDljp/lp4vkuIrkuIvmlofplb/luqY6JywgcmF3Q29udGV4dC5sZW5ndGgsICdjaGFycycpO1xuXG4gICAgICAvLyAyLiDosIPnlKggQ29udGV4dENvbXByZXNzb3JTa2lsbCDljovnvKlcbiAgICAgIGNvbnN0IGNvbXByZXNzZWQ6IENvbXByZXNzZWRDb250ZXh0ID0gYXdhaXQgdGhpcy5jb250ZXh0Q29tcHJlc3Nvci5jb21wcmVzc0ZvclVwZ3JhZGUocmF3Q29udGV4dCk7XG4gICAgICBjb25zb2xlLmxvZygnW0V2b2x1dGlvbkhhcm5lc3NdIOWOi+e8qeWQjiB0b2tlbiDmlbA6JywgY29tcHJlc3NlZC50b2tlbkNvdW50KTtcbiAgICAgIGNvbnNvbGUubG9nKCdbRXZvbHV0aW9uSGFybmVzc10g5Y6L57yp5q+UOicsIGNvbXByZXNzZWQuY29tcHJlc3Npb25SYXRpby50b0ZpeGVkKDIpLCAneCcpO1xuICAgICAgY29uc29sZS5sb2coJ1tFdm9sdXRpb25IYXJuZXNzXSDmmK/lkKbmiKrmlq06JywgY29tcHJlc3NlZC50cnVuY2F0ZWQpO1xuICAgICAgaWYgKGNvbXByZXNzZWQuZHJvcHBlZFNlY3Rpb25zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgY29uc29sZS5sb2coJ1tFdm9sdXRpb25IYXJuZXNzXSDkuKLlvIPljLrln586JywgY29tcHJlc3NlZC5kcm9wcGVkU2VjdGlvbnMuam9pbignLCAnKSk7XG4gICAgICB9XG5cbiAgICAgIC8vIDMuIOiwg+eUqCBMTE0gKOS4jeS8muWGjei2hemZkClcbiAgICAgIGNvbnN0IGNvbXByZXNzZWRDb250ZXh0U3RyID0gY29tcHJlc3NlZC50b2tlbnMuam9pbignXFxuJyk7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBsbG1HZW5lcmF0ZShjb21wcmVzc2VkQ29udGV4dFN0cik7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgIHJlc3VsdCxcbiAgICAgICAgY29tcHJlc3NlZFRva2VuczogY29tcHJlc3NlZC50b2tlbkNvdW50XG4gICAgICB9O1xuICAgIH0gY2F0Y2ggKGVycm9yOiBhbnkpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1tFdm9sdXRpb25IYXJuZXNzXSDoh6rljYfnuqflpLHotKU6JywgZXJyb3IubWVzc2FnZSk7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgZXJyb3I6IGVycm9yLm1lc3NhZ2UsXG4gICAgICAgIGNvbXByZXNzZWRUb2tlbnM6IDBcbiAgICAgIH07XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIOaehOW7uiBkaWZmIOiAjOmdnuWFqOmHj+S7o+eggSAodG9rZW4g5LiL6ZmNIDkwJSlcbiAgICovXG4gIGFzeW5jIGdlbmVyYXRlRGlmZkZvclVwZ3JhZGUob2xkQ29kZTogc3RyaW5nLCBuZXdDb2RlOiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IG9sZExpbmVzID0gb2xkQ29kZS5zcGxpdCgnXFxuJyk7XG4gICAgY29uc3QgbmV3TGluZXMgPSBuZXdDb2RlLnNwbGl0KCdcXG4nKTtcbiAgICBcbiAgICAvLyDnroDljJbnmoQgZGlmZiDnrpfms5VcbiAgICBjb25zdCBkaWZmOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbnN0IG1heExpbmVzID0gTWF0aC5tYXgob2xkTGluZXMubGVuZ3RoLCBuZXdMaW5lcy5sZW5ndGgpO1xuICAgIFxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbWF4TGluZXM7IGkrKykge1xuICAgICAgaWYgKGkgPj0gb2xkTGluZXMubGVuZ3RoKSB7XG4gICAgICAgIGRpZmYucHVzaChgKyAke25ld0xpbmVzW2ldfWApO1xuICAgICAgfSBlbHNlIGlmIChpID49IG5ld0xpbmVzLmxlbmd0aCkge1xuICAgICAgICBkaWZmLnB1c2goYC0gJHtvbGRMaW5lc1tpXX1gKTtcbiAgICAgIH0gZWxzZSBpZiAob2xkTGluZXNbaV0gIT09IG5ld0xpbmVzW2ldKSB7XG4gICAgICAgIGRpZmYucHVzaChgLSAke29sZExpbmVzW2ldfWApO1xuICAgICAgICBkaWZmLnB1c2goYCsgJHtuZXdMaW5lc1tpXX1gKTtcbiAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIGRpZmYuam9pbignXFxuJyk7XG4gIH1cblxuICAvKipcbiAgICog6I635Y+WIENvbnRleHRDb21wcmVzc29yIOWunuS+i1xuICAgKi9cbiAgZ2V0Q29udGV4dENvbXByZXNzb3IoKTogQ29udGV4dENvbXByZXNzb3JTa2lsbCB7XG4gICAgcmV0dXJuIHRoaXMuY29udGV4dENvbXByZXNzb3I7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUV2b2x1dGlvbkhhcm5lc3MoY29uZmlnPzogUGFydGlhbDxFdm9sdXRpb25Db25maWc+KTogRXZvbHV0aW9uSGFybmVzcyB7XG4gIHJldHVybiBuZXcgRXZvbHV0aW9uSGFybmVzcyhjb25maWcpO1xufVxuIl19