"use strict";
/**
 * ASF V4.0 Role Synthesizer - Safe Online Optimizer
 *
 * Safe runtime optimization with knobs, rollback, and cooldown.
 * Version: v0.9.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SafeOnlineOptimizer = exports.FORBIDDEN_OPTIMIZATIONS = void 0;
exports.createSafeOptimizer = createSafeOptimizer;
/**
 * Forbidden optimizations (never modify these online).
 */
exports.FORBIDDEN_OPTIMIZATIONS = [
    'authorities',
    'ownershipRules',
    'vetoRules',
    'capabilities',
];
/**
 * Safe Online Optimizer.
 *
 * Features:
 * - Cooldown periods between optimizations
 * - Automatic rollback on failures
 * - Limited knob set (no governance changes)
 */
class SafeOnlineOptimizer {
    constructor(options) {
        this.cooldownUntil = 0;
        this.lastConfig = null;
        this.failureCount = 0;
        this.cooldownMs = options?.cooldownMs ?? 1800000; // 30 minutes
        this.failureThreshold = options?.failureThreshold ?? 2;
    }
    /**
     * Attempt safe optimization.
     */
    async optimize(current, metrics, projectId) {
        // 1. Cooldown check
        if (Date.now() < this.cooldownUntil) {
            return {
                optimized: current,
                knobApplied: { type: 'roleCountDelta', delta: 0 },
                rolledBack: false,
            };
        }
        // 2. Failure detection
        if (metrics.failureRate > 0.1 || metrics.previewFailures > 0) {
            this.failureCount++;
            if (this.failureCount >= this.failureThreshold && this.lastConfig) {
                // Rollback
                this.cooldownUntil = Date.now() + 3600000; // 1 hour cooldown
                this.failureCount = 0;
                return {
                    optimized: this.lastConfig,
                    knobApplied: { type: 'roleCountDelta', delta: 0 },
                    rolledBack: true,
                    cooldownUntil: this.cooldownUntil,
                };
            }
        }
        else {
            this.failureCount = 0;
        }
        // 3. Select safe knob
        const knob = this.selectSafeKnob(metrics);
        // 4. Apply adjustment
        const optimized = this.applyKnob(current, knob);
        // 5. Validate constraints
        if (this.validate(optimized, current)) {
            this.lastConfig = current;
            this.cooldownUntil = Date.now() + this.cooldownMs;
            return {
                optimized,
                knobApplied: knob,
                rolledBack: false,
                cooldownUntil: this.cooldownUntil,
            };
        }
        return {
            optimized: current,
            knobApplied: { type: 'roleCountDelta', delta: 0 },
            rolledBack: false,
        };
    }
    /**
     * Select safe knob based on metrics.
     */
    selectSafeKnob(metrics) {
        // Queue too long → expand roles
        if (metrics.queueLength > 8) {
            return { type: 'roleCountDelta', delta: 1 };
        }
        // Low utilization → shrink roles
        if (metrics.utilization < 0.3) {
            return { type: 'roleCountDelta', delta: -1 };
        }
        // High interface cost → increase budget
        if (metrics.interfaceCost > metrics.budget * 0.8) {
            return { type: 'budgetMultiplier', value: 1.2 };
        }
        // No change needed
        return { type: 'roleCountDelta', delta: 0 };
    }
    /**
     * Apply knob to synthesis result.
     */
    applyKnob(current, knob) {
        switch (knob.type) {
            case 'roleCountDelta':
                return this.applyRoleCountDelta(current, knob.delta);
            case 'budgetMultiplier':
                return this.applyBudgetMultiplier(current, knob.value);
            case 'assignmentSwap':
                return this.applyAssignmentSwap(current, knob);
            default:
                return current;
        }
    }
    /**
     * Apply role count delta.
     */
    applyRoleCountDelta(current, delta) {
        if (delta === 0)
            return current;
        const newConstraints = {
            ...current.constraints,
            kMax: Math.max(1, current.constraints.kMax + delta),
        };
        return {
            ...current,
            constraints: newConstraints,
        };
    }
    /**
     * Apply budget multiplier.
     */
    applyBudgetMultiplier(current, value) {
        const newConstraints = {
            ...current.constraints,
            budgetLimit: (current.constraints.budgetLimit ?? 100) * value,
        };
        return {
            ...current,
            constraints: newConstraints,
        };
    }
    /**
     * Apply assignment swap.
     */
    applyAssignmentSwap(current, knob) {
        const newAssignment = {
            ...current.assignment,
            taskToRole: {
                ...current.assignment.taskToRole,
                [knob.taskA]: current.assignment.taskToRole[knob.taskB],
                [knob.taskB]: current.assignment.taskToRole[knob.taskA],
            },
        };
        return {
            ...current,
            assignment: newAssignment,
        };
    }
    /**
     * Validate optimized result.
     */
    validate(optimized, original) {
        // Check role count is within bounds
        if (optimized.roles.length < 1 || optimized.roles.length > 20) {
            return false;
        }
        // Check all tasks are assigned
        const taskCount = Object.keys(original.assignment.taskToRole).length;
        const assignedTasks = Object.keys(optimized.assignment.taskToRole).length;
        if (assignedTasks !== taskCount) {
            return false;
        }
        // Check no forbidden changes
        if (JSON.stringify(optimized.roles.map((r) => r.authorities)) !==
            JSON.stringify(original.roles.map((r) => r.authorities))) {
            return false;
        }
        return true;
    }
    /**
     * Reset optimizer state.
     */
    reset() {
        this.cooldownUntil = 0;
        this.lastConfig = null;
        this.failureCount = 0;
    }
    /**
     * Get optimizer status.
     */
    getStatus() {
        const now = Date.now();
        return {
            inCooldown: now < this.cooldownUntil,
            cooldownRemaining: Math.max(0, this.cooldownUntil - now),
            failureCount: this.failureCount,
            hasLastConfig: this.lastConfig !== null,
        };
    }
}
exports.SafeOnlineOptimizer = SafeOnlineOptimizer;
/**
 * Create safe optimizer with default settings.
 */
function createSafeOptimizer() {
    return new SafeOnlineOptimizer();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2FmZS1vcHRpbWl6ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi9zcmMvY29yZS9zeW50aGVzaXplci9vcHRpbWl6YXRpb24vc2FmZS1vcHRpbWl6ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7OztHQUtHOzs7QUE2U0gsa0RBRUM7QUE5UUQ7O0dBRUc7QUFDVSxRQUFBLHVCQUF1QixHQUFHO0lBQ3JDLGFBQWE7SUFDYixnQkFBZ0I7SUFDaEIsV0FBVztJQUNYLGNBQWM7Q0FDTixDQUFDO0FBY1g7Ozs7Ozs7R0FPRztBQUNILE1BQWEsbUJBQW1CO0lBTzlCLFlBQVksT0FHWDtRQVRPLGtCQUFhLEdBQVcsQ0FBQyxDQUFDO1FBQzFCLGVBQVUsR0FBdUIsSUFBSSxDQUFDO1FBQ3RDLGlCQUFZLEdBQVcsQ0FBQyxDQUFDO1FBUS9CLElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBTyxFQUFFLFVBQVUsSUFBSSxPQUFPLENBQUMsQ0FBQyxhQUFhO1FBQy9ELElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxPQUFPLEVBQUUsZ0JBQWdCLElBQUksQ0FBQyxDQUFDO0lBQ3pELENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxRQUFRLENBQ1osT0FBb0IsRUFDcEIsT0FBdUIsRUFDdkIsU0FBaUI7UUFFakIsb0JBQW9CO1FBQ3BCLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUNwQyxPQUFPO2dCQUNMLFNBQVMsRUFBRSxPQUFPO2dCQUNsQixXQUFXLEVBQUUsRUFBRSxJQUFJLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRTtnQkFDakQsVUFBVSxFQUFFLEtBQUs7YUFDbEIsQ0FBQztRQUNKLENBQUM7UUFFRCx1QkFBdUI7UUFDdkIsSUFBSSxPQUFPLENBQUMsV0FBVyxHQUFHLEdBQUcsSUFBSSxPQUFPLENBQUMsZUFBZSxHQUFH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RUFDeEQsQ0FBQztZQUNELE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUVELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSztRQUNILElBQUksQ0FBQyxhQUFhLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDO0lBQ3hCLENBQUM7SUFFRDs7T0FFRztJQUNILFNBQVM7UUFNUCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDdkIsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLGFBQWE7WUFDcEMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLGFBQWEsR0FBRyxHQUFHLENBQUM7WUFDeEQsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZO1lBQy9CLGFBQWEsRUFBRSxJQUFJLENBQUMsVUFBVSxLQUFLLElBQUk7U0FDeEMsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQXpPRCxrREF5T0M7QUFFRDs7R0FFRztBQUNILFNBQWdCLG1CQUFtQjtJQUNqQyxPQUFPLElBQUksbUJBQW1CLEVBQUUsQ0FBQztBQUNuQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBBU0YgVjQuMCBSb2xlIFN5bnRoZXNpemVyIC0gU2FmZSBPbmxpbmUgT3B0aW1pemVyXG4gKiBcbiAqIFNhZmUgcnVudGltZSBvcHRpbWl6YXRpb24gd2l0aCBrbm9icywgcm9sbGJhY2ssIGFuZCBjb29sZG93bi5cbiAqIFZlcnNpb246IHYwLjkuMFxuICovXG5cbmltcG9ydCB0eXBlIHsgUm9sZSwgQXNzaWdubWVudCB9IGZyb20gJy4uL3R5cGVzJztcblxuLyoqXG4gKiBSdW50aW1lIG1ldHJpY3MuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUnVudGltZU1ldHJpY3Mge1xuICBmYWlsdXJlUmF0ZTogbnVtYmVyOyAvLyAwLTFcbiAgcHJldmlld0ZhaWx1cmVzOiBudW1iZXI7XG4gIHF1ZXVlTGVuZ3RoOiBudW1iZXI7XG4gIHV0aWxpemF0aW9uOiBudW1iZXI7IC8vIDAtMVxuICBpbnRlcmZhY2VDb3N0OiBudW1iZXI7XG4gIGJ1ZGdldDogbnVtYmVyO1xufVxuXG4vKipcbiAqIFN5bnRoZXNpcyByZXN1bHQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU3ludGhSZXN1bHQge1xuICByb2xlczogUm9sZVtdO1xuICBhc3NpZ25tZW50OiBBc3NpZ25tZW50O1xuICBjb25zdHJhaW50czogYW55O1xufVxuXG4vKipcbiAqIFNhZmUgb3B0aW1pemF0aW9uIGtub2IuXG4gKi9cbmV4cG9ydCB0eXBlIFNhZmVLbm9iID1cbiAgfCB7IHR5cGU6ICdyb2xlQ291bnREZWx0YSc7IGRlbHRhOiAtMSB8IDAgfCAxIH1cbiAgfCB7IHR5cGU6ICdidWRnZXRNdWx0aXBsaWVyJzsgdmFsdWU6IDAuOCB8IDEuMCB8IDEuMiB9XG4gIHwgeyB0eXBlOiAnYXNzaWdubWVudFN3YXAnOyB0YXNrQTogc3RyaW5nOyB0YXNrQjogc3RyaW5nOyBjb3VwbGluZ1Njb3JlOiBudW1iZXIgfTtcblxuLyoqXG4gKiBGb3JiaWRkZW4gb3B0aW1pemF0aW9ucyAobmV2ZXIgbW9kaWZ5IHRoZXNlIG9ubGluZSkuXG4gKi9cbmV4cG9ydCBjb25zdCBGT1JCSURERU5fT1BUSU1JWkFUSU9OUyA9IFtcbiAgJ2F1dGhvcml0aWVzJyxcbiAgJ293bmVyc2hpcFJ1bGVzJyxcbiAgJ3ZldG9SdWxlcycsXG4gICdjYXBhYmlsaXRpZXMnLFxuXSBhcyBjb25zdDtcblxuZXhwb3J0IHR5cGUgRm9yYmlkZGVuT3B0aW1pemF0aW9uID0gdHlwZW9mIEZPUkJJRERFTl9PUFRJTUlaQVRJT05TW251bWJlcl07XG5cbi8qKlxuICogT3B0aW1pemF0aW9uIHJlc3VsdC5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBPcHRpbWl6YXRpb25SZXN1bHQge1xuICBvcHRpbWl6ZWQ6IFN5bnRoUmVzdWx0O1xuICBrbm9iQXBwbGllZDogU2FmZUtub2I7XG4gIHJvbGxlZEJhY2s6IGJvb2xlYW47XG4gIGNvb2xkb3duVW50aWw/OiBudW1iZXI7XG59XG5cbi8qKlxuICogU2FmZSBPbmxpbmUgT3B0aW1pemVyLlxuICogXG4gKiBGZWF0dXJlczpcbiAqIC0gQ29vbGRvd24gcGVyaW9kcyBiZXR3ZWVuIG9wdGltaXphdGlvbnNcbiAqIC0gQXV0b21hdGljIHJvbGxiYWNrIG9uIGZhaWx1cmVzXG4gKiAtIExpbWl0ZWQga25vYiBzZXQgKG5vIGdvdmVybmFuY2UgY2hhbmdlcylcbiAqL1xuZXhwb3J0IGNsYXNzIFNhZmVPbmxpbmVPcHRpbWl6ZXIge1xuICBwcml2YXRlIGNvb2xkb3duVW50aWw6IG51bWJlciA9IDA7XG4gIHByaXZhdGUgbGFzdENvbmZpZzogU3ludGhSZXN1bHQgfCBudWxsID0gbnVsbDtcbiAgcHJpdmF0ZSBmYWlsdXJlQ291bnQ6IG51bWJlciA9IDA7XG4gIHByaXZhdGUgcmVhZG9ubHkgY29vbGRvd25NczogbnVtYmVyO1xuICBwcml2YXRlIHJlYWRvbmx5IGZhaWx1cmVUaHJlc2hvbGQ6IG51bWJlcjtcblxuICBjb25zdHJ1Y3RvcihvcHRpb25zPzoge1xuICAgIGNvb2xkb3duTXM/OiBudW1iZXI7XG4gICAgZmFpbHVyZVRocmVzaG9sZD86IG51bWJlcjtcbiAgfSkge1xuICAgIHRoaXMuY29vbGRvd25NcyA9IG9wdGlvbnM/LmNvb2xkb3duTXMgPz8gMTgwMDAwMDsgLy8gMzAgbWludXRlc1xuICAgIHRoaXMuZmFpbHVyZVRocmVzaG9sZCA9IG9wdGlvbnM/LmZhaWx1cmVUaHJlc2hvbGQgPz8gMjtcbiAgfVxuXG4gIC8qKlxuICAgKiBBdHRlbXB0IHNhZmUgb3B0aW1pemF0aW9uLlxuICAgKi9cbiAgYXN5bmMgb3B0aW1pemUoXG4gICAgY3VycmVudDogU3ludGhSZXN1bHQsXG4gICAgbWV0cmljczogUnVudGltZU1ldHJpY3MsXG4gICAgcHJvamVjdElkOiBzdHJpbmdcbiAgKTogUHJvbWlzZTxPcHRpbWl6YXRpb25SZXN1bHQ+IHtcbiAgICAvLyAxLiBDb29sZG93biBjaGVja1xuICAgIGlmIChEYXRlLm5vdygpIDwgdGhpcy5jb29sZG93blVudGlsKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBvcHRpbWl6ZWQ6IGN1cnJlbnQsXG4gICAgICAgIGtub2JBcHBsaWVkOiB7IHR5cGU6ICdyb2xlQ291bnREZWx0YScsIGRlbHRhOiAwIH0sXG4gICAgICAgIHJvbGxlZEJhY2s6IGZhbHNlLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyAyLiBGYWlsdXJlIGRldGVjdGlvblxuICAgIGlmIChtZXRyaWNzLmZhaWx1cmVSYXRlID4gMC4xIHx8IG1ldHJpY3MucHJldmlld0ZhaWx1cmVzID4gMCkge1xuICAgICAgdGhpcy5mYWlsdXJlQ291bnQrKztcblxuICAgICAgaWYgKHRoaXMuZmFpbHVyZUNvdW50ID49IHRoaXMuZmFpbHVyZVRocmVzaG9sZCAmJiB0aGlzLmxhc3RDb25maWcpIHtcbiAgICAgICAgLy8gUm9sbGJhY2tcbiAgICAgICAgdGhpcy5jb29sZG93blVudGlsID0gRGF0ZS5ub3coKSArIDM2MDAwMDA7IC8vIDEgaG91ciBjb29sZG93blxuICAgICAgICB0aGlzLmZhaWx1cmVDb3VudCA9IDA7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBvcHRpbWl6ZWQ6IHRoaXMubGFzdENvbmZpZyxcbiAgICAgICAgICBrbm9iQXBwbGllZDogeyB0eXBlOiAncm9sZUNvdW50RGVsdGEnLCBkZWx0YTogMCB9LFxuICAgICAgICAgIHJvbGxlZEJhY2s6IHRydWUsXG4gICAgICAgICAgY29vbGRvd25VbnRpbDogdGhpcy5jb29sZG93blVudGlsLFxuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLmZhaWx1cmVDb3VudCA9IDA7XG4gICAgfVxuXG4gICAgLy8gMy4gU2VsZWN0IHNhZmUga25vYlxuICAgIGNvbnN0IGtub2IgPSB0aGlzLnNlbGVjdFNhZmVLbm9iKG1ldHJpY3MpO1xuXG4gICAgLy8gNC4gQXBwbHkgYWRqdXN0bWVudFxuICAgIGNvbnN0IG9wdGltaXplZCA9IHRoaXMuYXBwbHlLbm9iKGN1cnJlbnQsIGtub2IpO1xuXG4gICAgLy8gNS4gVmFsaWRhdGUgY29uc3RyYWludHNcbiAgICBpZiAodGhpcy52YWxpZGF0ZShvcHRpbWl6ZWQsIGN1cnJlbnQpKSB7XG4gICAgICB0aGlzLmxhc3RDb25maWcgPSBjdXJyZW50O1xuICAgICAgdGhpcy5jb29sZG93blVudGlsID0gRGF0ZS5ub3coKSArIHRoaXMuY29vbGRvd25NcztcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgb3B0aW1pemVkLFxuICAgICAgICBrbm9iQXBwbGllZDoga25vYixcbiAgICAgICAgcm9sbGVkQmFjazogZmFsc2UsXG4gICAgICAgIGNvb2xkb3duVW50aWw6IHRoaXMuY29vbGRvd25VbnRpbCxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIG9wdGltaXplZDogY3VycmVudCxcbiAgICAgIGtub2JBcHBsaWVkOiB7IHR5cGU6ICdyb2xlQ291bnREZWx0YScsIGRlbHRhOiAwIH0sXG4gICAgICByb2xsZWRCYWNrOiBmYWxzZSxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFNlbGVjdCBzYWZlIGtub2IgYmFzZWQgb24gbWV0cmljcy5cbiAgICovXG4gIHByaXZhdGUgc2VsZWN0U2FmZUtub2IobWV0cmljczogUnVudGltZU1ldHJpY3MpOiBTYWZlS25vYiB7XG4gICAgLy8gUXVldWUgdG9vIGxvbmcg4oaSIGV4cGFuZCByb2xlc1xuICAgIGlmIChtZXRyaWNzLnF1ZXVlTGVuZ3RoID4gOCkge1xuICAgICAgcmV0dXJuIHsgdHlwZTogJ3JvbGVDb3VudERlbHRhJywgZGVsdGE6IDEgfTtcbiAgICB9XG5cbiAgICAvLyBMb3cgdXRpbGl6YXRpb24g4oaSIHNocmluayByb2xlc1xuICAgIGlmIChtZXRyaWNzLnV0aWxpemF0aW9uIDwgMC4zKSB7XG4gICAgICByZXR1cm4geyB0eXBlOiAncm9sZUNvdW50RGVsdGEnLCBkZWx0YTogLTEgfTtcbiAgICB9XG5cbiAgICAvLyBIaWdoIGludGVyZmFjZSBjb3N0IOKGkiBpbmNyZWFzZSBidWRnZXRcbiAgICBpZiAobWV0cmljcy5pbnRlcmZhY2VDb3N0ID4gbWV0cmljcy5idWRnZXQgKiAwLjgpIHtcbiAgICAgIHJldHVybiB7IHR5cGU6ICdidWRnZXRNdWx0aXBsaWVyJywgdmFsdWU6IDEuMiB9O1xuICAgIH1cblxuICAgIC8vIE5vIGNoYW5nZSBuZWVkZWRcbiAgICByZXR1cm4geyB0eXBlOiAncm9sZUNvdW50RGVsdGEnLCBkZWx0YTogMCB9O1xuICB9XG5cbiAgLyoqXG4gICAqIEFwcGx5IGtub2IgdG8gc3ludGhlc2lzIHJlc3VsdC5cbiAgICovXG4gIHByaXZhdGUgYXBwbHlLbm9iKGN1cnJlbnQ6IFN5bnRoUmVzdWx0LCBrbm9iOiBTYWZlS25vYik6IFN5bnRoUmVzdWx0IHtcbiAgICBzd2l0Y2ggKGtub2IudHlwZSkge1xuICAgICAgY2FzZSAncm9sZUNvdW50RGVsdGEnOlxuICAgICAgICByZXR1cm4gdGhpcy5hcHBseVJvbGVDb3VudERlbHRhKGN1cnJlbnQsIGtub2IuZGVsdGEpO1xuXG4gICAgICBjYXNlICdidWRnZXRNdWx0aXBsaWVyJzpcbiAgICAgICAgcmV0dXJuIHRoaXMuYXBwbHlCdWRnZXRNdWx0aXBsaWVyKGN1cnJlbnQsIGtub2IudmFsdWUpO1xuXG4gICAgICBjYXNlICdhc3NpZ25tZW50U3dhcCc6XG4gICAgICAgIHJldHVybiB0aGlzLmFwcGx5QXNzaWdubWVudFN3YXAoY3VycmVudCwga25vYik7XG5cbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHJldHVybiBjdXJyZW50O1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBBcHBseSByb2xlIGNvdW50IGRlbHRhLlxuICAgKi9cbiAgcHJpdmF0ZSBhcHBseVJvbGVDb3VudERlbHRhKFxuICAgIGN1cnJlbnQ6IFN5bnRoUmVzdWx0LFxuICAgIGRlbHRhOiBudW1iZXJcbiAgKTogU3ludGhSZXN1bHQge1xuICAgIGlmIChkZWx0YSA9PT0gMCkgcmV0dXJuIGN1cnJlbnQ7XG5cbiAgICBjb25zdCBuZXdDb25zdHJhaW50cyA9IHtcbiAgICAgIC4uLmN1cnJlbnQuY29uc3RyYWludHMsXG4gICAgICBrTWF4OiBNYXRoLm1heCgxLCBjdXJyZW50LmNvbnN0cmFpbnRzLmtNYXggKyBkZWx0YSksXG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICAuLi5jdXJyZW50LFxuICAgICAgY29uc3RyYWludHM6IG5ld0NvbnN0cmFpbnRzLFxuICAgIH07XG4gIH1cblxuICAvKipcbiAgICogQXBwbHkgYnVkZ2V0IG11bHRpcGxpZXIuXG4gICAqL1xuICBwcml2YXRlIGFwcGx5QnVkZ2V0TXVsdGlwbGllcihcbiAgICBjdXJyZW50OiBTeW50aFJlc3VsdCxcbiAgICB2YWx1ZTogbnVtYmVyXG4gICk6IFN5bnRoUmVzdWx0IHtcbiAgICBjb25zdCBuZXdDb25zdHJhaW50cyA9IHtcbiAgICAgIC4uLmN1cnJlbnQuY29uc3RyYWludHMsXG4gICAgICBidWRnZXRMaW1pdDogKGN1cnJlbnQuY29uc3RyYWludHMuYnVkZ2V0TGltaXQgPz8gMTAwKSAqIHZhbHVlLFxuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgLi4uY3VycmVudCxcbiAgICAgIGNvbnN0cmFpbnRzOiBuZXdDb25zdHJhaW50cyxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIEFwcGx5IGFzc2lnbm1lbnQgc3dhcC5cbiAgICovXG4gIHByaXZhdGUgYXBwbHlBc3NpZ25tZW50U3dhcChcbiAgICBjdXJyZW50OiBTeW50aFJlc3VsdCxcbiAgICBrbm9iOiB7IHR5cGU6ICdhc3NpZ25tZW50U3dhcCc7IHRhc2tBOiBzdHJpbmc7IHRhc2tCOiBzdHJpbmc7IGNvdXBsaW5nU2NvcmU6IG51bWJlciB9XG4gICk6IFN5bnRoUmVzdWx0IHtcbiAgICBjb25zdCBuZXdBc3NpZ25tZW50ID0ge1xuICAgICAgLi4uY3VycmVudC5hc3NpZ25tZW50LFxuICAgICAgdGFza1RvUm9sZToge1xuICAgICAgICAuLi5jdXJyZW50LmFzc2lnbm1lbnQudGFza1RvUm9sZSxcbiAgICAgICAgW2tub2IudGFza0FdOiBjdXJyZW50LmFzc2lnbm1lbnQudGFza1RvUm9sZVtrbm9iLnRhc2tCXSxcbiAgICAgICAgW2tub2IudGFza0JdOiBjdXJyZW50LmFzc2lnbm1lbnQudGFza1RvUm9sZVtrbm9iLnRhc2tBXSxcbiAgICAgIH0sXG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICAuLi5jdXJyZW50LFxuICAgICAgYXNzaWdubWVudDogbmV3QXNzaWdubWVudCxcbiAgICB9O1xuICB9XG5cbiAgLyoqXG4gICAqIFZhbGlkYXRlIG9wdGltaXplZCByZXN1bHQuXG4gICAqL1xuICBwcml2YXRlIHZhbGlkYXRlKG9wdGltaXplZDogU3ludGhSZXN1bHQsIG9yaWdpbmFsOiBTeW50aFJlc3VsdCk6IGJvb2xlYW4ge1xuICAgIC8vIENoZWNrIHJvbGUgY291bnQgaXMgd2l0aGluIGJvdW5kc1xuICAgIGlmIChvcHRpbWl6ZWQucm9sZXMubGVuZ3RoIDwgMSB8fCBvcHRpbWl6ZWQucm9sZXMubGVuZ3RoID4gMjApIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBhbGwgdGFza3MgYXJlIGFzc2lnbmVkXG4gICAgY29uc3QgdGFza0NvdW50ID0gT2JqZWN0LmtleXMob3JpZ2luYWwuYXNzaWdubWVudC50YXNrVG9Sb2xlKS5sZW5ndGg7XG4gICAgY29uc3QgYXNzaWduZWRUYXNrcyA9IE9iamVjdC5rZXlzKG9wdGltaXplZC5hc3NpZ25tZW50LnRhc2tUb1JvbGUpLmxlbmd0aDtcbiAgICBpZiAoYXNzaWduZWRUYXNrcyAhPT0gdGFza0NvdW50KSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgbm8gZm9yYmlkZGVuIGNoYW5nZXNcbiAgICBpZiAoXG4gICAgICBKU09OLnN0cmluZ2lmeShvcHRpbWl6ZWQucm9sZXMubWFwKChyKSA9PiByLmF1dGhvcml0aWVzKSkgIT09XG4gICAgICBKU09OLnN0cmluZ2lmeShvcmlnaW5hbC5yb2xlcy5tYXAoKHIpID0+IHIuYXV0aG9yaXRpZXMpKVxuICAgICkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9XG5cbiAgLyoqXG4gICAqIFJlc2V0IG9wdGltaXplciBzdGF0ZS5cbiAgICovXG4gIHJlc2V0KCk6IHZvaWQge1xuICAgIHRoaXMuY29vbGRvd25VbnRpbCA9IDA7XG4gICAgdGhpcy5sYXN0Q29uZmlnID0gbnVsbDtcbiAgICB0aGlzLmZhaWx1cmVDb3VudCA9IDA7XG4gIH1cblxuICAvKipcbiAgICogR2V0IG9wdGltaXplciBzdGF0dXMuXG4gICAqL1xuICBnZXRTdGF0dXMoKToge1xuICAgIGluQ29vbGRvd246IGJvb2xlYW47XG4gICAgY29vbGRvd25SZW1haW5pbmc6IG51bWJlcjtcbiAgICBmYWlsdXJlQ291bnQ6IG51bWJlcjtcbiAgICBoYXNMYXN0Q29uZmlnOiBib29sZWFuO1xuICB9IHtcbiAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuICAgIHJldHVybiB7XG4gICAgICBpbkNvb2xkb3duOiBub3cgPCB0aGlzLmNvb2xkb3duVW50aWwsXG4gICAgICBjb29sZG93blJlbWFpbmluZzogTWF0aC5tYXgoMCwgdGhpcy5jb29sZG93blVudGlsIC0gbm93KSxcbiAgICAgIGZhaWx1cmVDb3VudDogdGhpcy5mYWlsdXJlQ291bnQsXG4gICAgICBoYXNMYXN0Q29uZmlnOiB0aGlzLmxhc3RDb25maWcgIT09IG51bGwsXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIENyZWF0ZSBzYWZlIG9wdGltaXplciB3aXRoIGRlZmF1bHQgc2V0dGluZ3MuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTYWZlT3B0aW1pemVyKCk6IFNhZmVPbmxpbmVPcHRpbWl6ZXIge1xuICByZXR1cm4gbmV3IFNhZmVPbmxpbmVPcHRpbWl6ZXIoKTtcbn1cbiJdfQ==