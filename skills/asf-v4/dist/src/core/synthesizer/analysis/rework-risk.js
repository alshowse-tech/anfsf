"use strict";
/**
 * ASF V4.0 Role Synthesizer - Rework Risk Predictor
 *
 * Predicts rework risk based on contract changes and historical data.
 * Version: v0.9.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.predictReworkRisk = predictReworkRisk;
exports.predictReworkRisks = predictReworkRisks;
exports.computeTotalReworkRisk = computeTotalReworkRisk;
exports.computeScoreWithRework = computeScoreWithRework;
exports.getHighRiskTasks = getHighRiskTasks;
exports.generateReworkRiskReport = generateReworkRiskReport;
/**
 * Predict rework risk for a task.
 *
 * Factors:
 * 1. Breaking contract changes (+0.4)
 * 2. Deprecated fields (+0.2)
 * 3. High risk task label (+0.3)
 * 4. Historical rework rate (avg × 0.5)
 */
function predictReworkRisk(task, contractChanges, historicalData = []) {
    let riskScore = 0;
    const factors = [];
    // 1. Contract change types
    for (const change of contractChanges) {
        if (change.breaking) {
            riskScore += 0.4;
            factors.push(`Breaking change in ${change.contractId}`);
        }
        if (change.deprecated) {
            riskScore += 0.2;
            factors.push(`Deprecated field in ${change.contractId}`);
        }
    }
    // 2. Risk label
    if (task.risk === 'high') {
        riskScore += 0.3;
        factors.push('High risk task');
    }
    // 3. Historical rework rate
    const history = historicalData.filter((p) => p.featureId === task.featureId);
    if (history.length > 0) {
        const avgRework = history.reduce((sum, p) => sum + p.reworkRate, 0) / history.length;
        riskScore += avgRework * 0.5;
        factors.push(`Historical rework rate: ${(avgRework * 100).toFixed(0)}%`);
    }
    // Cap at 1.0
    riskScore = Math.min(riskScore, 1.0);
    // Determine mitigation
    let mitigation;
    if (riskScore >= 0.7) {
        mitigation = 'Requires architect review + extended testing';
    }
    else if (riskScore >= 0.4) {
        mitigation = 'Requires peer review';
    }
    return {
        score: Math.round(riskScore * 100) / 100,
        factors,
        mitigation,
    };
}
/**
 * Predict rework risk for multiple tasks.
 */
function predictReworkRisks(tasks, contractChanges, historicalData = []) {
    const risks = new Map();
    for (const task of tasks) {
        risks.set(task.id, predictReworkRisk(task, contractChanges, historicalData));
    }
    return risks;
}
/**
 * Compute total rework risk for scoring.
 */
function computeTotalReworkRisk(risks) {
    if (risks.length === 0)
        return 0;
    return risks.reduce((sum, r) => sum + r.score, 0) / risks.length;
}
/**
 * Economics score with rework risk.
 *
 * Updated formula:
 * Score = -0.30 × interfaceCost + -0.20 × bottleneck + 0.20 × skillMatch + 0.15 × parallelismGain - 0.15 × reworkRisk
 */
function computeScoreWithRework(interfaceCost, bottleneck, skillMatch, parallelismGain, reworkRisks) {
    const totalReworkRisk = computeTotalReworkRisk(reworkRisks);
    return (-0.3 * normalize(interfaceCost, 0, 100) +
        -0.2 * bottleneck +
        0.2 * skillMatch +
        0.15 * parallelismGain +
        -0.15 * totalReworkRisk);
}
/**
 * Get high-risk tasks.
 */
function getHighRiskTasks(tasks, contractChanges, historicalData = [], threshold = 0.5) {
    const highRiskTasks = [];
    for (const task of tasks) {
        const risk = predictReworkRisk(task, contractChanges, historicalData);
        if (risk.score >= threshold) {
            highRiskTasks.push({ task, risk });
        }
    }
    return highRiskTasks.sort((a, b) => b.risk.score - a.risk.score);
}
/**
 * Normalize value to 0-1.
 */
function normalize(value, min, max) {
    if (max === min)
        return 0.5;
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
}
/**
 * Generate rework risk report.
 */
function generateReworkRiskReport(tasks, contractChanges, historicalData = []) {
    const risks = predictReworkRisks(tasks, contractChanges, historicalData);
    const highRiskTasks = getHighRiskTasks(tasks, contractChanges, historicalData);
    const lines = [
        'Rework Risk Report',
        '==================',
        '',
        `Total tasks: ${tasks.length}`,
        `High risk tasks: ${highRiskTasks.length}`,
        '',
    ];
    if (highRiskTasks.length > 0) {
        lines.push('High Risk Tasks:');
        for (const { task, risk } of highRiskTasks.slice(0, 5)) {
            lines.push(`  - ${task.id}: ${(risk.score * 100).toFixed(0)}%`);
            for (const factor of risk.factors) {
                lines.push(`    • ${factor}`);
            }
            if (risk.mitigation) {
                lines.push(`    → ${risk.mitigation}`);
            }
        }
    }
    else {
        lines.push('No high-risk tasks detected.');
    }
    return lines.join('\n');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmV3b3JrLXJpc2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvY29yZS9zeW50aGVzaXplci9hbmFseXNpcy9yZXdvcmstcmlzay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7O0FBa0RILDhDQWtEQztBQUtELGdEQVlDO0FBS0Qsd0RBR0M7QUFRRCx3REFnQkM7QUFLRCw0Q0FnQkM7QUFhRCw0REFpQ0M7QUEvS0Q7Ozs7Ozs7O0dBUUc7QUFDSCxTQUFnQixpQkFBaUIsQ0FDL0IsSUFBVSxFQUNWLGVBQWlDLEVBQ2pDLGlCQUFzQyxFQUFFO0lBRXhDLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQztJQUNsQixNQUFNLE9BQU8sR0FBYSxFQUFFLENBQUM7SUFFN0IsMkJBQTJCO0lBQzNCLEtBQUssTUFBTSxNQUFNLElBQUksZUFBZSxFQUFFLENBQUM7UUFDckMsSUFBSSxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDcEIsU0FBUyxJQUFJLEdBQUcsQ0FBQztZQUNqQixPQUFPLENBQUMsSUFBSSxDQUFDLHNCQUFzQixNQUFNLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztRQUMxRCxDQUFDO1FBQ0QsSUFBSSxNQUFNLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDdEIsU0FBUyxJQUFJLEdBQUcsQ0FBQztZQUNqQixPQUFPLENBQUMsSUFBSSxDQUFDLHVCQUF1QixNQUFNLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztRQUMzRCxDQUFDO0lBQ0gsQ0FBQztJQUVELGdCQUFnQjtJQUNoQixJQUFJLElBQUksQ0FBQyxJQUFJLEtBQUssTUFBTSxFQUFFLENBQUM7UUFDekIsU0FBUyxJQUFJLEdBQUcsQ0FBQztRQUNqQixPQUFPLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7SUFDakMsQ0FBQztJQUVELDRCQUE0QjtJQUM1QixNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUMsTUFB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LE1BQU0sRUFBRTtRQUMxQyxFQUFFO0tBQ0gsQ0FBQztJQUVGLElBQUksYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUM3QixLQUFLLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDL0IsS0FBSyxNQUFNLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDdkQsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDaEUsS0FBSyxNQUFNLE1BQU0sSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ2xDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQ2hDLENBQUM7WUFDRCxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztnQkFDcEIsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO1lBQ3pDLENBQUM7UUFDSCxDQUFDO0lBQ0gsQ0FBQztTQUFNLENBQUM7UUFDTixLQUFLLENBQUMsSUFBSSxDQUFDLDhCQUE4QixDQUFDLENBQUM7SUFDN0MsQ0FBQztJQUVELE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMxQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBBU0YgVjQuMCBSb2xlIFN5bnRoZXNpemVyIC0gUmV3b3JrIFJpc2sgUHJlZGljdG9yXG4gKiBcbiAqIFByZWRpY3RzIHJld29yayByaXNrIGJhc2VkIG9uIGNvbnRyYWN0IGNoYW5nZXMgYW5kIGhpc3RvcmljYWwgZGF0YS5cbiAqIFZlcnNpb246IHYwLjkuMFxuICovXG5cbmltcG9ydCB0eXBlIHsgVGFzayB9IGZyb20gJy4uL2Vjb25vbWljcy9zY29yaW5nJztcblxuLyoqXG4gKiBDb250cmFjdCBjaGFuZ2UgcmVjb3JkLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIENvbnRyYWN0Q2hhbmdlIHtcbiAgY29udHJhY3RJZDogc3RyaW5nO1xuICBicmVha2luZzogYm9vbGVhbjtcbiAgZGVwcmVjYXRlZD86IGJvb2xlYW47XG4gIGFkZGVkPzogc3RyaW5nW107XG4gIHJlbW92ZWQ/OiBzdHJpbmdbXTtcbiAgbW9kaWZpZWQ/OiBzdHJpbmdbXTtcbn1cblxuLyoqXG4gKiBSZXdvcmsgcmlzayBhc3Nlc3NtZW50LlxuICovXG5leHBvcnQgaW50ZXJmYWNlIFJld29ya1Jpc2sge1xuICAvKiogUmlzayBzY29yZSAwLTEgKi9cbiAgc2NvcmU6IG51bWJlcjtcbiAgXG4gIC8qKiBSaXNrIGZhY3RvcnMgKi9cbiAgZmFjdG9yczogc3RyaW5nW107XG4gIFxuICAvKiogUmVjb21tZW5kZWQgbWl0aWdhdGlvbiAqL1xuICBtaXRpZ2F0aW9uPzogc3RyaW5nO1xufVxuXG4vKipcbiAqIEhpc3RvcmljYWwgcHJvamVjdCBkYXRhLlxuICovXG5leHBvcnQgaW50ZXJmYWNlIEhpc3RvcmljYWxQcm9qZWN0IHtcbiAgZmVhdHVyZUlkPzogc3RyaW5nO1xuICB0YXNrQ291bnQ6IG51bWJlcjtcbiAgcmV3b3JrUmF0ZTogbnVtYmVyOyAvLyAwLTFcbiAgY29udHJhY3RDaGFuZ2VzOiBudW1iZXI7XG4gIHN1Y2Nlc3M6IGJvb2xlYW47XG59XG5cbi8qKlxuICogUHJlZGljdCByZXdvcmsgcmlzayBmb3IgYSB0YXNrLlxuICogXG4gKiBGYWN0b3JzOlxuICogMS4gQnJlYWtpbmcgY29udHJhY3QgY2hhbmdlcyAoKzAuNClcbiAqIDIuIERlcHJlY2F0ZWQgZmllbGRzICgrMC4yKVxuICogMy4gSGlnaCByaXNrIHRhc2sgbGFiZWwgKCswLjMpXG4gKiA0LiBIaXN0b3JpY2FsIHJld29yayByYXRlIChhdmcgw5cgMC41KVxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJlZGljdFJld29ya1Jpc2soXG4gIHRhc2s6IFRhc2ssXG4gIGNvbnRyYWN0Q2hhbmdlczogQ29udHJhY3RDaGFuZ2VbXSxcbiAgaGlzdG9yaWNhbERhdGE6IEhpc3RvcmljYWxQcm9qZWN0W10gPSBbXVxuKTogUmV3b3JrUmlzayB7XG4gIGxldCByaXNrU2NvcmUgPSAwO1xuICBjb25zdCBmYWN0b3JzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIC8vIDEuIENvbnRyYWN0IGNoYW5nZSB0eXBlc1xuICBmb3IgKGNvbnN0IGNoYW5nZSBvZiBjb250cmFjdENoYW5nZXMpIHtcbiAgICBpZiAoY2hhbmdlLmJyZWFraW5nKSB7XG4gICAgICByaXNrU2NvcmUgKz0gMC40O1xuICAgICAgZmFjdG9ycy5wdXNoKGBCcmVha2luZyBjaGFuZ2UgaW4gJHtjaGFuZ2UuY29udHJhY3RJZH1gKTtcbiAgICB9XG4gICAgaWYgKGNoYW5nZS5kZXByZWNhdGVkKSB7XG4gICAgICByaXNrU2NvcmUgKz0gMC4yO1xuICAgICAgZmFjdG9ycy5wdXNoKGBEZXByZWNhdGVkIGZpZWxkIGluICR7Y2hhbmdlLmNvbnRyYWN0SWR9YCk7XG4gICAgfVxuICB9XG5cbiAgLy8gMi4gUmlzayBsYWJlbFxuICBpZiAodGFzay5yaXNrID09PSAnaGlnaCcpIHtcbiAgICByaXNrU2NvcmUgKz0gMC4zO1xuICAgIGZhY3RvcnMucHVzaCgnSGlnaCByaXNrIHRhc2snKTtcbiAgfVxuXG4gIC8vIDMuIEhpc3RvcmljYWwgcmV3b3JrIHJhdGVcbiAgY29uc3QgaGlzdG9yeSA9IGhpc3RvcmljYWxEYXRhLmZpbHRlcigocCkgPT4gcC5mZWF0dXJlSWQgPT09IHRhc2suZmVhdHVyZUlkKTtcbiAgaWYgKGhpc3RvcnkubGVuZ3RoID4gMCkge1xuICAgIGNvbnN0IGF2Z1Jld29yayA9IGhpc3RvcnkucmVkdWNlKChzdW0sIHApID0+IHN1bSArIHAucmV3b3JrUmF0ZSwgMCkgLyBoaXN0b3J5Lmxlbmd0aDtcbiAgICByaXNrU2NvcmUgKz0gYXZnUmV3b3JrICogMC41O1xuICAgIGZhY3RvcnMucHVzaChgSGlzdG9yaWNhbCByZXdvcmsgcmF0ZTogJHsoYXZnUmV3b3JrICogMTAwKS50b0ZpeGVkKDApfSVgKTtcbiAgfVxuXG4gIC8vIENhcCBhdCAxLjBcbiAgcmlza1Njb3JlID0gTWF0aC5taW4ocmlza1Njb3JlLCAxLjApO1xuXG4gIC8vIERldGVybWluZSBtaXRpZ2F0aW9uXG4gIGxldCBtaXRpZ2F0aW9uOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGlmIChyaXNrU2NvcmUgPj0gMC43KSB7XG4gICAgbWl0aWdhdGlvbiA9ICdSZXF1aXJlcyBhcmNoaXRlY3QgcmV2aWV3ICsgZXh0ZW5kZWQgdGVzdGluZyc7XG4gIH0gZWxzZSBpZiAocmlza1Njb3JlID49IDAuNCkge1xuICAgIG1pdGlnYXRpb24gPSAnUmVxdWlyZXMgcGVlciByZXZpZXcnO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBzY29yZTogTWF0aC5yb3VuZChyaXNrU2NvcmUgKiAxMDApIC8gMTAwLFxuICAgIGZhY3RvcnMsXG4gICAgbWl0aWdhdGlvbixcbiAgfTtcbn1cblxuLyoqXG4gKiBQcmVkaWN0IHJld29yayByaXNrIGZvciBtdWx0aXBsZSB0YXNrcy5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByZWRpY3RSZXdvcmtSaXNrcyhcbiAgdGFza3M6IFRhc2tbXSxcbiAgY29udHJhY3RDaGFuZ2VzOiBDb250cmFjdENoYW5nZVtdLFxuICBoaXN0b3JpY2FsRGF0YTogSGlzdG9yaWNhbFByb2plY3RbXSA9IFtdXG4pOiBNYXA8c3RyaW5nLCBSZXdvcmtSaXNrPiB7XG4gIGNvbnN0IHJpc2tzID0gbmV3IE1hcDxzdHJpbmcsIFJld29ya1Jpc2s+KCk7XG5cbiAgZm9yIChjb25zdCB0YXNrIG9mIHRhc2tzKSB7XG4gICAgcmlza3Muc2V0KHRhc2suaWQsIHByZWRpY3RSZXdvcmtSaXNrKHRhc2ssIGNvbnRyYWN0Q2hhbmdlcywgaGlzdG9yaWNhbERhdGEpKTtcbiAgfVxuXG4gIHJldHVybiByaXNrcztcbn1cblxuLyoqXG4gKiBDb21wdXRlIHRvdGFsIHJld29yayByaXNrIGZvciBzY29yaW5nLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcHV0ZVRvdGFsUmV3b3JrUmlzayhyaXNrczogUmV3b3JrUmlza1tdKTogbnVtYmVyIHtcbiAgaWYgKHJpc2tzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIDA7XG4gIHJldHVybiByaXNrcy5yZWR1Y2UoKHN1bSwgcikgPT4gc3VtICsgci5zY29yZSwgMCkgLyByaXNrcy5sZW5ndGg7XG59XG5cbi8qKlxuICogRWNvbm9taWNzIHNjb3JlIHdpdGggcmV3b3JrIHJpc2suXG4gKiBcbiAqIFVwZGF0ZWQgZm9ybXVsYTpcbiAqIFNjb3JlID0gLTAuMzAgw5cgaW50ZXJmYWNlQ29zdCArIC0wLjIwIMOXIGJvdHRsZW5lY2sgKyAwLjIwIMOXIHNraWxsTWF0Y2ggKyAwLjE1IMOXIHBhcmFsbGVsaXNtR2FpbiAtIDAuMTUgw5cgcmV3b3JrUmlza1xuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcHV0ZVNjb3JlV2l0aFJld29yayhcbiAgaW50ZXJmYWNlQ29zdDogbnVtYmVyLFxuICBib3R0bGVuZWNrOiBudW1iZXIsXG4gIHNraWxsTWF0Y2g6IG51bWJlcixcbiAgcGFyYWxsZWxpc21HYWluOiBudW1iZXIsXG4gIHJld29ya1Jpc2tzOiBSZXdvcmtSaXNrW11cbik6IG51bWJlciB7XG4gIGNvbnN0IHRvdGFsUmV3b3JrUmlzayA9IGNvbXB1dGVUb3RhbFJld29ya1Jpc2socmV3b3JrUmlza3MpO1xuXG4gIHJldHVybiAoXG4gICAgLTAuMyAqIG5vcm1hbGl6ZShpbnRlcmZhY2VDb3N0LCAwLCAxMDApICtcbiAgICAtMC4yICogYm90dGxlbmVjayArXG4gICAgMC4yICogc2tpbGxNYXRjaCArXG4gICAgMC4xNSAqIHBhcmFsbGVsaXNtR2FpbiArXG4gICAgLTAuMTUgKiB0b3RhbFJld29ya1Jpc2tcbiAgKTtcbn1cblxuLyoqXG4gKiBHZXQgaGlnaC1yaXNrIHRhc2tzLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0SGlnaFJpc2tUYXNrcyhcbiAgdGFza3M6IFRhc2tbXSxcbiAgY29udHJhY3RDaGFuZ2VzOiBDb250cmFjdENoYW5nZVtdLFxuICBoaXN0b3JpY2FsRGF0YTogSGlzdG9yaWNhbFByb2plY3RbXSA9IFtdLFxuICB0aHJlc2hvbGQ6IG51bWJlciA9IDAuNVxuKTogQXJyYXk8eyB0YXNrOiBUYXNrOyByaXNrOiBSZXdvcmtSaXNrIH0+IHtcbiAgY29uc3QgaGlnaFJpc2tUYXNrczogQXJyYXk8eyB0YXNrOiBUYXNrOyByaXNrOiBSZXdvcmtSaXNrIH0+ID0gW107XG5cbiAgZm9yIChjb25zdCB0YXNrIG9mIHRhc2tzKSB7XG4gICAgY29uc3QgcmlzayA9IHByZWRpY3RSZXdvcmtSaXNrKHRhc2ssIGNvbnRyYWN0Q2hhbmdlcywgaGlzdG9yaWNhbERhdGEpO1xuICAgIGlmIChyaXNrLnNjb3JlID49IHRocmVzaG9sZCkge1xuICAgICAgaGlnaFJpc2tUYXNrcy5wdXNoKHsgdGFzaywgcmlzayB9KTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gaGlnaFJpc2tUYXNrcy5zb3J0KChhLCBiKSA9PiBiLnJpc2suc2NvcmUgLSBhLnJpc2suc2NvcmUpO1xufVxuXG4vKipcbiAqIE5vcm1hbGl6ZSB2YWx1ZSB0byAwLTEuXG4gKi9cbmZ1bmN0aW9uIG5vcm1hbGl6ZSh2YWx1ZTogbnVtYmVyLCBtaW46IG51bWJlciwgbWF4OiBudW1iZXIpOiBudW1iZXIge1xuICBpZiAobWF4ID09PSBtaW4pIHJldHVybiAwLjU7XG4gIHJldHVybiBNYXRoLm1heCgwLCBNYXRoLm1pbigxLCAodmFsdWUgLSBtaW4pIC8gKG1heCAtIG1pbikpKTtcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSByZXdvcmsgcmlzayByZXBvcnQuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZVJld29ya1Jpc2tSZXBvcnQoXG4gIHRhc2tzOiBUYXNrW10sXG4gIGNvbnRyYWN0Q2hhbmdlczogQ29udHJhY3RDaGFuZ2VbXSxcbiAgaGlzdG9yaWNhbERhdGE6IEhpc3RvcmljYWxQcm9qZWN0W10gPSBbXVxuKTogc3RyaW5nIHtcbiAgY29uc3Qgcmlza3MgPSBwcmVkaWN0UmV3b3JrUmlza3ModGFza3MsIGNvbnRyYWN0Q2hhbmdlcywgaGlzdG9yaWNhbERhdGEpO1xuICBjb25zdCBoaWdoUmlza1Rhc2tzID0gZ2V0SGlnaFJpc2tUYXNrcyh0YXNrcywgY29udHJhY3RDaGFuZ2VzLCBoaXN0b3JpY2FsRGF0YSk7XG5cbiAgY29uc3QgbGluZXMgPSBbXG4gICAgJ1Jld29yayBSaXNrIFJlcG9ydCcsXG4gICAgJz09PT09PT09PT09PT09PT09PScsXG4gICAgJycsXG4gICAgYFRvdGFsIHRhc2tzOiAke3Rhc2tzLmxlbmd0aH1gLFxuICAgIGBIaWdoIHJpc2sgdGFza3M6ICR7aGlnaFJpc2tUYXNrcy5sZW5ndGh9YCxcbiAgICAnJyxcbiAgXTtcblxuICBpZiAoaGlnaFJpc2tUYXNrcy5sZW5ndGggPiAwKSB7XG4gICAgbGluZXMucHVzaCgnSGlnaCBSaXNrIFRhc2tzOicpO1xuICAgIGZvciAoY29uc3QgeyB0YXNrLCByaXNrIH0gb2YgaGlnaFJpc2tUYXNrcy5zbGljZSgwLCA1KSkge1xuICAgICAgbGluZXMucHVzaChgICAtICR7dGFzay5pZH06ICR7KHJpc2suc2NvcmUgKiAxMDApLnRvRml4ZWQoMCl9JWApO1xuICAgICAgZm9yIChjb25zdCBmYWN0b3Igb2Ygcmlzay5mYWN0b3JzKSB7XG4gICAgICAgIGxpbmVzLnB1c2goYCAgICDigKIgJHtmYWN0b3J9YCk7XG4gICAgICB9XG4gICAgICBpZiAocmlzay5taXRpZ2F0aW9uKSB7XG4gICAgICAgIGxpbmVzLnB1c2goYCAgICDihpIgJHtyaXNrLm1pdGlnYXRpb259YCk7XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGxpbmVzLnB1c2goJ05vIGhpZ2gtcmlzayB0YXNrcyBkZXRlY3RlZC4nKTtcbiAgfVxuXG4gIHJldHVybiBsaW5lcy5qb2luKCdcXG4nKTtcbn1cbiJdfQ==