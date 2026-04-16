"use strict";
/**
 * ANFSF V4 Layer 8.5 - Canary Deployer Implementation
 *
 * Canary deployment orchestrator with progressive rollout and automatic rollback.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CanaryDeployer = void 0;
// ============================================================================
// Constants
// ============================================================================
const DEFAULT_CANARY_STAGES = [0.01, 0.05, 0.2, 0.5, 1.0];
const DEFAULT_STAGE_DURATION_MS = 300000; // 5 minutes
// ============================================================================
// Helper Functions
// ============================================================================
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
function now() {
    return Date.now();
}
// ============================================================================
// CanaryDeployer Class
// ============================================================================
/**
 * CanaryDeployer - Orchestrates canary deployments
 */
class CanaryDeployer {
    constructor(options = {}) {
        this.stages = options.stages || DEFAULT_CANARY_STAGES;
        this.stageDurationMs = options.stageDurationMs || DEFAULT_STAGE_DURATION_MS;
        this.monitorMetrics = options.monitorMetrics || ['error_rate', 'latency_p99'];
        this.autoPromote = options.autoPromote !== false;
        this.rollbackOnFailure = options.rollbackOnFailure !== false;
    }
    /**
     * Execute canary deployment
     */
    async deploy(policy, metricsCollector, healthCheck) {
        const deploymentId = generateUUID();
        const startTime = now();
        const deployment = {
            deploymentId,
            status: 'deploying',
            startTime,
            currentStage: 0,
            trafficPercentage: 0,
        };
        try {
            for (let i = 0; i < this.stages.length; i++) {
                deployment.currentStage = i + 1;
                deployment.trafficPercentage = this.stages[i] * 100;
                deployment.status = 'canary';
                // Wait for stage duration
                await this.sleep(this.stageDurationMs);
                // Health check
                const isHealthy = await healthCheck();
                if (!isHealthy && this.rollbackOnFailure) {
                    deployment.status = 'rolled_back';
                    deployment.rollbackInfo = {
                        triggered: true,
                        reason: 'Health check failed',
                        timestamp: now(),
                    };
                    return deployment;
                }
                // Collect metrics
                const metrics = await metricsCollector();
                deployment.metricsSummary = metrics;
                // Check metrics thresholds
                const metricsHealthy = this.checkMetricsHealth(metrics);
                if (!metricsHealthy && this.rollbackOnFailure) {
                    deployment.status = 'rolled_back';
                    deployment.rollbackInfo = {
                        triggered: true,
                        reason: 'Metrics exceeded threshold',
                        timestamp: now(),
                    };
                    return deployment;
                }
            }
            // Deployment complete
            deployment.status = 'complete';
            deployment.endTime = now();
            deployment.trafficPercentage = 100;
            return deployment;
        }
        catch (error) {
            deployment.status = 'failed';
            deployment.endTime = now();
            deployment.rollbackInfo = {
                triggered: this.rollbackOnFailure,
                reason: String(error),
                timestamp: now(),
            };
            return deployment;
        }
    }
    checkMetricsHealth(metrics) {
        // Default thresholds
        const thresholds = {
            error_rate: 0.05,
            latency_p99: 1000,
            success_rate: 0.95,
        };
        for (const [metric, value] of Object.entries(metrics)) {
            const threshold = thresholds[metric];
            if (threshold !== undefined) {
                // Boundary condition: value AT threshold is considered unhealthy for error/latency
                // and unhealthy for success rate (conservative approach)
                if (metric.includes('error') || metric.includes('latency')) {
                    if (value >= threshold)
                        return false;
                }
                else if (metric.includes('success') || metric.includes('rate')) {
                    if (value <= threshold)
                        return false;
                }
            }
        }
        return true;
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.CanaryDeployer = CanaryDeployer;
exports.default = CanaryDeployer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FuYXJ5LWRlcGxveWVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL2hhcm5lc3MvY2FuYXJ5LWRlcGxveWVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7OztHQUlHOzs7QUFTSCwrRUFBK0U7QUFDL0UsWUFBWTtBQUNaLCtFQUErRTtBQUUvRSxNQUFNLHFCQUFxQixHQUFHLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0FBQzFELE1BQU0seUJBQXlCLEdBQUcsTUFBTSxDQUFDLENBQUMsWUFBWTtBQUV0RCwrRUFBK0U7QUFDL0UsbUJBQW1CO0FBQ25CLCtFQUErRTtBQUUvRSxTQUFTLFlBQVk7SUFDbkIsT0FBTyxzQ0FBc0MsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7UUFDbkUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDO1FBQzFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUN4QixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRCxTQUFTLEdBQUc7SUFDVixPQUFPLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUNwQixDQUFDO0FBRUQsK0VBQStFO0FBQy9FLHVCQUF1QjtBQUN2QiwrRUFBK0U7QUFFL0U7O0dBRUc7QUFDSCxNQUFhLGNBQWM7SUFPekIsWUFBWSxVQUF5QixFQUFFO1FBQ3JDLElBQUksQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sSUFBSSxxQkFBcUIsQ0FBQztRQUN0RCxJQUFJLENBQUMsZUFBZSxHQUFHLE9BQU8sQ0FBQyxlQUFlLElBQUkseUJBQXlCLENBQUM7UUFDNUUsSUFBSSxDQUFDLGNBQWMsR0FBRyxPQUFPLENBQUMsY0FBYyxJQUFJLENBQUMsWUFBWSxFQUFFLGFBQWEsQ0FBQyxDQUFDO1FBQzlFLElBQUksQ0FBQyxXQUFXLEdBQUcsT0FBTyxDQUFDLFdBQVcsS0FBSyxLQUFLLENBQUM7UUFDakQsSUFBSSxDQUFDLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsS0FBSyxLQUFLLENBQUM7SUFDL0QsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLE1BQU0sQ0FDVixNQUFjLEVBQ2QsZ0JBQXVELEVBQ3ZELFdBQW1DO1FBRW5DLE1BQU0sWUFBWSxHQUFHLFlBQVksRUFBRSxDQUFDO1FBQ3BDLE1BQU0sU0FBUyxHQUFHLEdBQUcsRUFBRSxDQUFDO1FBRXhCLE1BQU0sVUFBVSxHQUFxQjtZQUNuQyxZQUFZO1lBQ1osTUFBTSxFQUFFLFdBQVc7WUFDbkIsU0FBUztZQUNULFlBQVksRUFBRSxDQUFDO1lBQ2YsaUJBQWlCLEVBQUUsQ0FBQztTQUNyQixDQUFDO1FBRUYsSUFBSSxDQUFDO1lBQ0gsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzVDLFVBQVUsQ0FBQyxZQUFZLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDaEMsVUFBVSxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDO2dCQUNwRCxVQUFVLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQztnQkFFN0IsMEJBQTBCO2dCQUMxQixNQUFNLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO2dCQUV2QyxlQUFlO2dCQUNmLE1BQU0sU0FBUyxHQUFHLE1BQU0sV0FBVyxFQUFFLENBQUM7Z0JBQ3RDLElBQUksQ0FBQyxTQUFTLElBQUksSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7b0JBQ3pDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsYUFBYSxDQUFDO29CQUNsQyxVQUFVLENBQUMsWUFBWSxHQUFHO3dCQUN4QixTQUFTLEVBQUUsSUFBSTt3QkFDZixNQUFNLEVBQUUscUJBQXFCO3dCQUM3QixTQUFTLEVBQUUsR0FBRyxFQUFFO3FCQUNqQixDQUFDO29CQUNGLE9BQU8sVUFBVSxDQUFDO2dCQUNwQixDQUFDO2dCQUVELGtCQUFrQjtnQkFDbEIsTUFBTSxPQUFPLEdBQUcsTUFBTSxnQkFBZ0IsRUFBRSxDQUFDO2dCQUN6QyxVQUFVLENBQUMsY0FBYyxHQUFHLE9BQU8sQ0FBQztnQkFFcEMsMkJBQTJCO2dCQUMzQixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ3hELElBQUksQ0FBQyxjQUFjLElBQUksSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7b0JBQzlDLFVBQVUsQ0FBQyxNQUFNLEdBQUcsYUFBYSxDQUFDO29CQUNsQyxVQUFVLENBQUMsWUFBWSxHQUFHO3dCQUN4QixTQUFTLEVBQUUsSUFBSTt3QkFDZixNQUFNLEVBQUUsNEJBQTRCO3dCQUNwQyxTQUFTLEVBQUUsR0FBRyxFQUFFO3FCQUNqQixDQUFDO29CQUNGLE9BQU8sVUFBVSxDQUFDO2dCQUNwQixDQUFDO1lBQ0gsQ0FBQztZQUVELHNCQUFzQjtZQUN0QixVQUFVLENBQUMsTUFBTSxHQUFHLFVBQVUsQ0FBQztZQUMvQixVQUFVLENBQUMsT0FBTyxHQUFHLEdBQUcsRUFBRSxDQUFDO1lBQzNCLFVBQVUsQ0FBQyxpQkFBaUIsR0FBRyxHQUFHLENBQUM7WUFFbkMsT0FBTyxVQUFVLENBQUM7UUFFcEIsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixVQUFVLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQztZQUM3QixVQUFVLENBQUMsT0FBTyxHQUFHLEdBQUcsRUFBRSxDQUFDO1lBQzNCLFVBQVUsQ0FBQyxZQUFZLEdBQUc7Z0JBQ3hCLFNBQVMsRUFBRSxJQUFJLENBQUMsaUJBQWlCO2dCQUNqQyxNQUFNLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQztnQkFDckIsU0FBUyxFQUFFLEdBQUcsRUFBRTthQUNqQixDQUFDO1lBQ0YsT0FBTyxVQUFVLENBQUM7UUFDcEIsQ0FBQztJQUNILENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxPQUErQjtRQUN4RCxxQkFBcUI7UUFDckIsTUFBTSxVQUFVLEdBQUc7WUFDakIsVUFBVSxFQUFFLElBQUk7WUFDaEIsV0FBVyxFQUFFLElBQUk7WUFDakIsWUFBWSxFQUFFLElBQUk7U0FDbkIsQ0FBQztRQUVGLEtBQUssTUFBTSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDdEQsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLE1BQWlDLENBQUMsQ0FBQztZQUNoRSxJQUFJLFNBQVMsS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDNUIsbUZBQW1GO2dCQUNuRix5REFBeUQ7Z0JBQ3pELElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7b0JBQzNELElBQUksS0FBSyxJQUFJLFNBQVM7d0JBQUUsT0FBTyxLQUFLLENBQUM7Z0JBQ3ZDLENBQUM7cUJBQU0sSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztvQkFDakUsSUFBSSxLQUFLLElBQUksU0FBUzt3QkFBRSxPQUFPLEtBQUssQ0FBQztnQkFDdkMsQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDO1FBRUQsT0FBTyxJQUFJLENBQUM7SUFDZCxDQUFDO0lBRU8sS0FBSyxDQUFDLEVBQVU7UUFDdEIsT0FBTyxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUN6RCxDQUFDO0NBQ0Y7QUF0SEQsd0NBc0hDO0FBRUQsa0JBQWUsY0FBYyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBBTkZTRiBWNCBMYXllciA4LjUgLSBDYW5hcnkgRGVwbG95ZXIgSW1wbGVtZW50YXRpb25cbiAqIFxuICogQ2FuYXJ5IGRlcGxveW1lbnQgb3JjaGVzdHJhdG9yIHdpdGggcHJvZ3Jlc3NpdmUgcm9sbG91dCBhbmQgYXV0b21hdGljIHJvbGxiYWNrLlxuICovXG5cbmltcG9ydCB7XG4gIFBvbGljeSxcbiAgRGVwbG95bWVudFJlc3VsdCxcbiAgQ2FuYXJ5T3B0aW9ucyxcbiAgRGVwbG95bWVudFN0YXR1cyxcbn0gZnJvbSAnLi90eXBlcyc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENvbnN0YW50c1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5jb25zdCBERUZBVUxUX0NBTkFSWV9TVEFHRVMgPSBbMC4wMSwgMC4wNSwgMC4yLCAwLjUsIDEuMF07XG5jb25zdCBERUZBVUxUX1NUQUdFX0RVUkFUSU9OX01TID0gMzAwMDAwOyAvLyA1IG1pbnV0ZXNcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSGVscGVyIEZ1bmN0aW9uc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5mdW5jdGlvbiBnZW5lcmF0ZVVVSUQoKTogc3RyaW5nIHtcbiAgcmV0dXJuICd4eHh4eHh4eC14eHh4LTR4eHgteXh4eC14eHh4eHh4eHh4eHgnLnJlcGxhY2UoL1t4eV0vZywgKGMpID0+IHtcbiAgICBjb25zdCByID0gKE1hdGgucmFuZG9tKCkgKiAxNikgfCAwO1xuICAgIGNvbnN0IHYgPSBjID09PSAneCcgPyByIDogKHIgJiAweDMpIHwgMHg4O1xuICAgIHJldHVybiB2LnRvU3RyaW5nKDE2KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIG5vdygpOiBudW1iZXIge1xuICByZXR1cm4gRGF0ZS5ub3coKTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ2FuYXJ5RGVwbG95ZXIgQ2xhc3Ncbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBDYW5hcnlEZXBsb3llciAtIE9yY2hlc3RyYXRlcyBjYW5hcnkgZGVwbG95bWVudHNcbiAqL1xuZXhwb3J0IGNsYXNzIENhbmFyeURlcGxveWVyIHtcbiAgcHJpdmF0ZSBzdGFnZXM6IG51bWJlcltdO1xuICBwcml2YXRlIHN0YWdlRHVyYXRpb25NczogbnVtYmVyO1xuICBwcml2YXRlIG1vbml0b3JNZXRyaWNzOiBzdHJpbmdbXTtcbiAgcHJpdmF0ZSBhdXRvUHJvbW90ZTogYm9vbGVhbjtcbiAgcHJpdmF0ZSByb2xsYmFja09uRmFpbHVyZTogYm9vbGVhbjtcblxuICBjb25zdHJ1Y3RvcihvcHRpb25zOiBDYW5hcnlPcHRpb25zID0ge30pIHtcbiAgICB0aGlzLnN0YWdlcyA9IG9wdGlvbnMuc3RhZ2VzIHx8IERFRkFVTFRfQ0FOQVJZX1NUQUdFUztcbiAgICB0aGlzLnN0YWdlRHVyYXRpb25NcyA9IG9wdGlvbnMuc3RhZ2VEdXJhdGlvbk1zIHx8IERFRkFVTFRfU1RBR0VfRFVSQVRJT05fTVM7XG4gICAgdGhpcy5tb25pdG9yTWV0cmljcyA9IG9wdGlvbnMubW9uaXRvck1ldHJpY3MgfHwgWydlcnJvcl9yYXRlJywgJ2xhdGVuY3lfcDk5J107XG4gICAgdGhpcy5hdXRvUHJvbW90ZSA9IG9wdGlvbnMuYXV0b1Byb21vdGUgIT09IGZhbHNlO1xuICAgIHRoaXMucm9sbGJhY2tPbkZhaWx1cmUgPSBvcHRpb25zLnJvbGxiYWNrT25GYWlsdXJlICE9PSBmYWxzZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBFeGVjdXRlIGNhbmFyeSBkZXBsb3ltZW50XG4gICAqL1xuICBhc3luYyBkZXBsb3koXG4gICAgcG9saWN5OiBQb2xpY3ksXG4gICAgbWV0cmljc0NvbGxlY3RvcjogKCkgPT4gUHJvbWlzZTxSZWNvcmQ8c3RyaW5nLCBudW1iZXI+PixcbiAgICBoZWFsdGhDaGVjazogKCkgPT4gUHJvbWlzZTxib29sZWFuPlxuICApOiBQcm9taXNlPERlcGxveW1lbnRSZXN1bHQ+IHtcbiAgICBjb25zdCBkZXBsb3ltZW50SWQgPSBnZW5lcmF0ZVVVSUQoKTtcbiAgICBjb25zdCBzdGFydFRpbWUgPSBub3coKTtcblxuICAgIGNvbnN0IGRlcGxveW1lbnQ6IERlcGxveW1lbnRSZXN1bHQgPSB7XG4gICAgICBkZXBsb3ltZW50SWQsXG4gICAgICBzdGF0dXM6ICdkZXBsb3lpbmcnLFxuICAgICAgc3RhcnRUaW1lLFxuICAgICAgY3VycmVudFN0YWdlOiAwLFxuICAgICAgdHJhZmZpY1BlcmNlbnRhZ2U6IDAsXG4gICAgfTtcblxuICAgIHRyeSB7XG4gICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuc3RhZ2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGRlcGxveW1lbnQuY3VycmVudFN0YWdlID0gaSArIDE7XG4gICAgICAgIGRlcGxveW1lbnQudHJhZmZpY1BlcmNlbnRhZ2UgPSB0aGlzLnN0YWdlc1tpXSAqIDEwMDtcbiAgICAgICAgZGVwbG95bWVudC5zdGF0dXMgPSAnY2FuYXJ5JztcblxuICAgICAgICAvLyBXYWl0IGZvciBzdGFnZSBkdXJhdGlvblxuICAgICAgICBhd2FpdCB0aGlzLnNsZWVwKHRoaXMuc3RhZ2VEdXJhdGlvbk1zKTtcblxuICAgICAgICAvLyBIZWFsdGggY2hlY2tcbiAgICAgICAgY29uc3QgaXNIZWFsdGh5ID0gYXdhaXQgaGVhbHRoQ2hlY2soKTtcbiAgICAgICAgaWYgKCFpc0hlYWx0aHkgJiYgdGhpcy5yb2xsYmFja09uRmFpbHVyZSkge1xuICAgICAgICAgIGRlcGxveW1lbnQuc3RhdHVzID0gJ3JvbGxlZF9iYWNrJztcbiAgICAgICAgICBkZXBsb3ltZW50LnJvbGxiYWNrSW5mbyA9IHtcbiAgICAgICAgICAgIHRyaWdnZXJlZDogdHJ1ZSxcbiAgICAgICAgICAgIHJlYXNvbjogJ0hlYWx0aCBjaGVjayBmYWlsZWQnLFxuICAgICAgICAgICAgdGltZXN0YW1wOiBub3coKSxcbiAgICAgICAgICB9O1xuICAgICAgICAgIHJldHVybiBkZXBsb3ltZW50O1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ29sbGVjdCBtZXRyaWNzXG4gICAgICAgIGNvbnN0IG1ldHJpY3MgPSBhd2FpdCBtZXRyaWNzQ29sbGVjdG9yKCk7XG4gICAgICAgIGRlcGxveW1lbnQubWV0cmljc1N1bW1hcnkgPSBtZXRyaWNzO1xuXG4gICAgICAgIC8vIENoZWNrIG1ldHJpY3MgdGhyZXNob2xkc1xuICAgICAgICBjb25zdCBtZXRyaWNzSGVhbHRoeSA9IHRoaXMuY2hlY2tNZXRyaWNzSGVhbHRoKG1ldHJpY3MpO1xuICAgICAgICBpZiAoIW1ldHJpY3NIZWFsdGh5ICYmIHRoaXMucm9sbGJhY2tPbkZhaWx1cmUpIHtcbiAgICAgICAgICBkZXBsb3ltZW50LnN0YXR1cyA9ICdyb2xsZWRfYmFjayc7XG4gICAgICAgICAgZGVwbG95bWVudC5yb2xsYmFja0luZm8gPSB7XG4gICAgICAgICAgICB0cmlnZ2VyZWQ6IHRydWUsXG4gICAgICAgICAgICByZWFzb246ICdNZXRyaWNzIGV4Y2VlZGVkIHRocmVzaG9sZCcsXG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5vdygpLFxuICAgICAgICAgIH07XG4gICAgICAgICAgcmV0dXJuIGRlcGxveW1lbnQ7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gRGVwbG95bWVudCBjb21wbGV0ZVxuICAgICAgZGVwbG95bWVudC5zdGF0dXMgPSAnY29tcGxldGUnO1xuICAgICAgZGVwbG95bWVudC5lbmRUaW1lID0gbm93KCk7XG4gICAgICBkZXBsb3ltZW50LnRyYWZmaWNQZXJjZW50YWdlID0gMTAwO1xuXG4gICAgICByZXR1cm4gZGVwbG95bWVudDtcblxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBkZXBsb3ltZW50LnN0YXR1cyA9ICdmYWlsZWQnO1xuICAgICAgZGVwbG95bWVudC5lbmRUaW1lID0gbm93KCk7XG4gICAgICBkZXBsb3ltZW50LnJvbGxiYWNrSW5mbyA9IHtcbiAgICAgICAgdHJpZ2dlcmVkOiB0aGlzLnJvbGxiYWNrT25GYWlsdXJlLFxuICAgICAgICByZWFzb246IFN0cmluZyhlcnJvciksXG4gICAgICAgIHRpbWVzdGFtcDogbm93KCksXG4gICAgICB9O1xuICAgICAgcmV0dXJuIGRlcGxveW1lbnQ7XG4gICAgfVxuICB9XG5cbiAgcHJpdmF0ZSBjaGVja01ldHJpY3NIZWFsdGgobWV0cmljczogUmVjb3JkPHN0cmluZywgbnVtYmVyPik6IGJvb2xlYW4ge1xuICAgIC8vIERlZmF1bHQgdGhyZXNob2xkc1xuICAgIGNvbnN0IHRocmVzaG9sZHMgPSB7XG4gICAgICBlcnJvcl9yYXRlOiAwLjA1LFxuICAgICAgbGF0ZW5jeV9wOTk6IDEwMDAsXG4gICAgICBzdWNjZXNzX3JhdGU6IDAuOTUsXG4gICAgfTtcblxuICAgIGZvciAoY29uc3QgW21ldHJpYywgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKG1ldHJpY3MpKSB7XG4gICAgICBjb25zdCB0aHJlc2hvbGQgPSB0aHJlc2hvbGRzW21ldHJpYyBhcyBrZXlvZiB0eXBlb2YgdGhyZXNob2xkc107XG4gICAgICBpZiAodGhyZXNob2xkICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgLy8gQm91bmRhcnkgY29uZGl0aW9uOiB2YWx1ZSBBVCB0aHJlc2hvbGQgaXMgY29uc2lkZXJlZCB1bmhlYWx0aHkgZm9yIGVycm9yL2xhdGVuY3lcbiAgICAgICAgLy8gYW5kIHVuaGVhbHRoeSBmb3Igc3VjY2VzcyByYXRlIChjb25zZXJ2YXRpdmUgYXBwcm9hY2gpXG4gICAgICAgIGlmIChtZXRyaWMuaW5jbHVkZXMoJ2Vycm9yJykgfHwgbWV0cmljLmluY2x1ZGVzKCdsYXRlbmN5JykpIHtcbiAgICAgICAgICBpZiAodmFsdWUgPj0gdGhyZXNob2xkKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIH0gZWxzZSBpZiAobWV0cmljLmluY2x1ZGVzKCdzdWNjZXNzJykgfHwgbWV0cmljLmluY2x1ZGVzKCdyYXRlJykpIHtcbiAgICAgICAgICBpZiAodmFsdWUgPD0gdGhyZXNob2xkKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIHByaXZhdGUgc2xlZXAobXM6IG51bWJlcik6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgbXMpKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBDYW5hcnlEZXBsb3llcjtcbiJdfQ==