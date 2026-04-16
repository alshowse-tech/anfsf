"use strict";
/**
 * ANFSF V1.5.0 - Dynamic Router for Layer 8.5 Harness Selection
 *
 * Routes requests to appropriate Harness based on project complexity and token budget.
 * Enables on-demand activation of L13-L17 layers.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamicRouter = void 0;
exports.getDefaultRouter = getDefaultRouter;
exports.resetDefaultRouter = resetDefaultRouter;
const DEFAULT_CONFIG = {
    lightThreshold: 50000,
    standardThreshold: 200000,
    requireComplianceCheck: true,
};
/**
 * Dynamic Router - decides which Harnesses to activate based on project profile.
 */
class DynamicRouter {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }
    /**
     * Calculate project complexity score (0-1).
     */
    calculateComplexity(profile) {
        const featureScore = Math.min(profile.featureCount / 50, 1) * 0.25;
        const flowScore = Math.min(profile.userFlowCount / 20, 1) * 0.20;
        const entityScore = Math.min(profile.dataEntityCount / 30, 1) * 0.20;
        const integrationScore = Math.min(profile.integrationCount / 10, 1) * 0.20;
        const complianceScore = Math.min(profile.complianceRequirements.length / 5, 1) * 0.15;
        return featureScore + flowScore + entityScore + integrationScore + complianceScore;
    }
    /**
     * Determine activation mode based on token budget and complexity.
     */
    determineMode(profile) {
        if (profile.tokenBudget < this.config.lightThreshold) {
            return 'light';
        }
        else if (profile.tokenBudget < this.config.standardThreshold) {
            return 'standard';
        }
        else {
            return 'full';
        }
    }
    /**
     * Decide which Harnesses to activate.
     */
    activate(profile) {
        const mode = this.determineMode(profile);
        const complexity = this.calculateComplexity(profile);
        // Check compliance requirements
        const hasCompliance = profile.complianceRequirements.length > 0;
        const needsGovernance = hasCompliance || complexity > 0.6;
        // Base activation (always needed)
        const activation = {
            orchestration: true,
            governance: needsGovernance,
            uiux: mode !== 'light',
            evolution: mode === 'full',
            mode,
            reason: this.getActivationReason(mode, complexity, needsGovernance),
        };
        // Override for compliance
        if (this.config.requireComplianceCheck && hasCompliance) {
            activation.governance = true;
            activation.reason += ' (compliance required)';
        }
        return activation;
    }
    /**
     * Get human-readable activation reason.
     */
    getActivationReason(mode, complexity, needsGovernance) {
        const reasons = [];
        if (mode === 'light') {
            reasons.push('Low token budget');
        }
        else if (mode === 'standard') {
            reasons.push('Medium token budget');
        }
        else {
            reasons.push('High token budget');
        }
        if (complexity > 0.6) {
            reasons.push(`High complexity (${(complexity * 100).toFixed(0)}%)`);
        }
        if (needsGovernance) {
            reasons.push('Governance required');
        }
        return reasons.join(', ');
    }
    /**
     * Get L13-L17 activation status.
     */
    getLayerActivation(profile) {
        const activation = this.activate(profile);
        const layers = [];
        // L13-L17 activation rules
        if (activation.uiux) {
            layers.push(13); // Semantic Consistency
        }
        if (activation.uiux && activation.mode !== 'light') {
            layers.push(14); // Simulation
        }
        if (activation.mode === 'full') {
            layers.push(15, 16, 17); // Runtime + Evolution + Guard
        }
        return {
            layers,
            activated: layers.length > 0,
        };
    }
}
exports.DynamicRouter = DynamicRouter;
/**
 * Singleton router instance.
 */
let defaultRouter = null;
function getDefaultRouter() {
    if (!defaultRouter) {
        defaultRouter = new DynamicRouter();
    }
    return defaultRouter;
}
function resetDefaultRouter() {
    defaultRouter = null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHluYW1pYy1yb3V0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi9zcmMvZ292ZXJuYW5jZS9keW5hbWljLXJvdXRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7OztBQThKSCw0Q0FLQztBQUVELGdEQUVDO0FBN0lELE1BQU0sY0FBYyxHQUFpQjtJQUNuQyxjQUFjLEVBQUUsS0FBSztJQUNyQixpQkFBaUIsRUFBRSxNQUFNO0lBQ3pCLHNCQUFzQixFQUFFLElBQUk7Q0FDN0IsQ0FBQztBQUVGOztHQUVHO0FBQ0gsTUFBYSxhQUFhO0lBR3hCLFlBQVksU0FBZ0MsRUFBRTtRQUM1QyxJQUFJLENBQUMsTUFBTSxHQUFHLEVBQUUsR0FBRyxjQUFjLEVBQUUsR0FBRyxNQUFNLEVBQUUsQ0FBQztJQUNqRCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxtQkFBbUIsQ0FBQyxPQUF1QjtRQUN6QyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxZQUFZLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztRQUNuRSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxhQUFhLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztRQUNqRSxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxlQUFlLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQztRQUNyRSxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLGdCQUFnQixHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7UUFDM0UsTUFBTSxlQUFlLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsc0JBQXNCLENBQUMsTUFBTSxHQUFH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RSxDQUFDO1FBRTVCLDJCQUEyQjtRQUMzQixJQUFJLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNwQixNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsdUJBQXVCO1FBQzFDLENBQUM7UUFDRCxJQUFJLFVBQVUsQ0FBQyxJQUFJLElBQUksVUFBVSxDQUFDLElBQUksS0FBSyxPQUFPLEVBQUUsQ0FBQztZQUNuRCxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsYUFBYTtRQUNoQyxDQUFDO1FBQ0QsSUFBSSxVQUFVLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQy9CLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLDhCQUE4QjtRQUN6RCxDQUFDO1FBRUQsT0FBTztZQUNMLE1BQU07WUFDTixTQUFTLEVBQUUsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDO1NBQzdCLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUFwSEQsc0NBb0hDO0FBRUQ7O0dBRUc7QUFDSCxJQUFJLGFBQWEsR0FBeUIsSUFBSSxDQUFDO0FBRS9DLFNBQWdCLGdCQUFnQjtJQUM5QixJQUFJLENBQUMsYUFBYSxFQUFFLENBQUM7UUFDbkIsYUFBYSxHQUFHLElBQUksYUFBYSxFQUFFLENBQUM7SUFDdEMsQ0FBQztJQUNELE9BQU8sYUFBYSxDQUFDO0FBQ3ZCLENBQUM7QUFFRCxTQUFnQixrQkFBa0I7SUFDaEMsYUFBYSxHQUFHLElBQUksQ0FBQztBQUN2QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBBTkZTRiBWMS41LjAgLSBEeW5hbWljIFJvdXRlciBmb3IgTGF5ZXIgOC41IEhhcm5lc3MgU2VsZWN0aW9uXG4gKiBcbiAqIFJvdXRlcyByZXF1ZXN0cyB0byBhcHByb3ByaWF0ZSBIYXJuZXNzIGJhc2VkIG9uIHByb2plY3QgY29tcGxleGl0eSBhbmQgdG9rZW4gYnVkZ2V0LlxuICogRW5hYmxlcyBvbi1kZW1hbmQgYWN0aXZhdGlvbiBvZiBMMTMtTDE3IGxheWVycy5cbiAqL1xuXG5leHBvcnQgaW50ZXJmYWNlIFByb2plY3RQcm9maWxlIHtcbiAgdG9rZW5CdWRnZXQ6IG51bWJlcjtcbiAgZmVhdHVyZUNvdW50OiBudW1iZXI7XG4gIHVzZXJGbG93Q291bnQ6IG51bWJlcjtcbiAgZGF0YUVudGl0eUNvdW50OiBudW1iZXI7XG4gIGludGVncmF0aW9uQ291bnQ6IG51bWJlcjtcbiAgY29tcGxpYW5jZVJlcXVpcmVtZW50czogc3RyaW5nW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgSGFybmVzc0FjdGl2YXRpb24ge1xuICBvcmNoZXN0cmF0aW9uOiBib29sZWFuO1xuICBnb3Zlcm5hbmNlOiBib29sZWFuO1xuICB1aXV4OiBib29sZWFuO1xuICBldm9sdXRpb246IGJvb2xlYW47XG4gIG1vZGU6ICdsaWdodCcgfCAnc3RhbmRhcmQnIHwgJ2Z1bGwnO1xuICByZWFzb246IHN0cmluZztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSb3V0ZXJDb25maWcge1xuICBsaWdodFRocmVzaG9sZDogbnVtYmVyOyAgICAgIC8vIFRva2VuIGJ1ZGdldCB0aHJlc2hvbGQgZm9yIGxpZ2h0IG1vZGVcbiAgc3RhbmRhcmRUaHJlc2hvbGQ6IG51bWJlcjsgICAvLyBUb2tlbiBidWRnZXQgdGhyZXNob2xkIGZvciBzdGFuZGFyZCBtb2RlXG4gIHJlcXVpcmVDb21wbGlhbmNlQ2hlY2s6IGJvb2xlYW47XG59XG5cbmNvbnN0IERFRkFVTFRfQ09ORklHOiBSb3V0ZXJDb25maWcgPSB7XG4gIGxpZ2h0VGhyZXNob2xkOiA1MDAwMCxcbiAgc3RhbmRhcmRUaHJlc2hvbGQ6IDIwMDAwMCxcbiAgcmVxdWlyZUNvbXBsaWFuY2VDaGVjazogdHJ1ZSxcbn07XG5cbi8qKlxuICogRHluYW1pYyBSb3V0ZXIgLSBkZWNpZGVzIHdoaWNoIEhhcm5lc3NlcyB0byBhY3RpdmF0ZSBiYXNlZCBvbiBwcm9qZWN0IHByb2ZpbGUuXG4gKi9cbmV4cG9ydCBjbGFzcyBEeW5hbWljUm91dGVyIHtcbiAgcHJpdmF0ZSBjb25maWc6IFJvdXRlckNvbmZpZztcblxuICBjb25zdHJ1Y3Rvcihjb25maWc6IFBhcnRpYWw8Um91dGVyQ29uZmlnPiA9IHt9KSB7XG4gICAgdGhpcy5jb25maWcgPSB7IC4uLkRFRkFVTFRfQ09ORklHLCAuLi5jb25maWcgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxjdWxhdGUgcHJvamVjdCBjb21wbGV4aXR5IHNjb3JlICgwLTEpLlxuICAgKi9cbiAgY2FsY3VsYXRlQ29tcGxleGl0eShwcm9maWxlOiBQcm9qZWN0UHJvZmlsZSk6IG51bWJlciB7XG4gICAgY29uc3QgZmVhdHVyZVNjb3JlID0gTWF0aC5taW4ocHJvZmlsZS5mZWF0dXJlQ291bnQgLyA1MCwgMSkgKiAwLjI1O1xuICAgIGNvbnN0IGZsb3dTY29yZSA9IE1hdGgubWluKHByb2ZpbGUudXNlckZsb3dDb3VudCAvIDIwLCAxKSAqIDAuMjA7XG4gICAgY29uc3QgZW50aXR5U2NvcmUgPSBNYXRoLm1pbihwcm9maWxlLmRhdGFFbnRpdHlDb3VudCAvIDMwLCAxKSAqIDAuMjA7XG4gICAgY29uc3QgaW50ZWdyYXRpb25TY29yZSA9IE1hdGgubWluKHByb2ZpbGUuaW50ZWdyYXRpb25Db3VudCAvIDEwLCAxKSAqIDAuMjA7XG4gICAgY29uc3QgY29tcGxpYW5jZVNjb3JlID0gTWF0aC5taW4ocHJvZmlsZS5jb21wbGlhbmNlUmVxdWlyZW1lbnRzLmxlbmd0aCAvIDUsIDEpICogMC4xNTtcblxuICAgIHJldHVybiBmZWF0dXJlU2NvcmUgKyBmbG93U2NvcmUgKyBlbnRpdHlTY29yZSArIGludGVncmF0aW9uU2NvcmUgKyBjb21wbGlhbmNlU2NvcmU7XG4gIH1cblxuICAvKipcbiAgICogRGV0ZXJtaW5lIGFjdGl2YXRpb24gbW9kZSBiYXNlZCBvbiB0b2tlbiBidWRnZXQgYW5kIGNvbXBsZXhpdHkuXG4gICAqL1xuICBkZXRlcm1pbmVNb2RlKHByb2ZpbGU6IFByb2plY3RQcm9maWxlKTogJ2xpZ2h0JyB8ICdzdGFuZGFyZCcgfCAnZnVsbCcge1xuICAgIGlmIChwcm9maWxlLnRva2VuQnVkZ2V0IDwgdGhpcy5jb25maWcubGlnaHRUaHJlc2hvbGQpIHtcbiAgICAgIHJldHVybiAnbGlnaHQnO1xuICAgIH0gZWxzZSBpZiAocHJvZmlsZS50b2tlbkJ1ZGdldCA8IHRoaXMuY29uZmlnLnN0YW5kYXJkVGhyZXNob2xkKSB7XG4gICAgICByZXR1cm4gJ3N0YW5kYXJkJztcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuICdmdWxsJztcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRGVjaWRlIHdoaWNoIEhhcm5lc3NlcyB0byBhY3RpdmF0ZS5cbiAgICovXG4gIGFjdGl2YXRlKHByb2ZpbGU6IFByb2plY3RQcm9maWxlKTogSGFybmVzc0FjdGl2YXRpb24ge1xuICAgIGNvbnN0IG1vZGUgPSB0aGlzLmRldGVybWluZU1vZGUocHJvZmlsZSk7XG4gICAgY29uc3QgY29tcGxleGl0eSA9IHRoaXMuY2FsY3VsYXRlQ29tcGxleGl0eShwcm9maWxlKTtcblxuICAgIC8vIENoZWNrIGNvbXBsaWFuY2UgcmVxdWlyZW1lbnRzXG4gICAgY29uc3QgaGFzQ29tcGxpYW5jZSA9IHByb2ZpbGUuY29tcGxpYW5jZVJlcXVpcmVtZW50cy5sZW5ndGggPiAwO1xuICAgIGNvbnN0IG5lZWRzR292ZXJuYW5jZSA9IGhhc0NvbXBsaWFuY2UgfHwgY29tcGxleGl0eSA+IDAuNjtcblxuICAgIC8vIEJhc2UgYWN0aXZhdGlvbiAoYWx3YXlzIG5lZWRlZClcbiAgICBjb25zdCBhY3RpdmF0aW9uOiBIYXJuZXNzQWN0aXZhdGlvbiA9IHtcbiAgICAgIG9yY2hlc3RyYXRpb246IHRydWUsXG4gICAgICBnb3Zlcm5hbmNlOiBuZWVkc0dvdmVybmFuY2UsXG4gICAgICB1aXV4OiBtb2RlICE9PSAnbGlnaHQnLFxuICAgICAgZXZvbHV0aW9uOiBtb2RlID09PSAnZnVsbCcsXG4gICAgICBtb2RlLFxuICAgICAgcmVhc29uOiB0aGlzLmdldEFjdGl2YXRpb25SZWFzb24obW9kZSwgY29tcGxleGl0eSwgbmVlZHNHb3Zlcm5hbmNlKSxcbiAgICB9O1xuXG4gICAgLy8gT3ZlcnJpZGUgZm9yIGNvbXBsaWFuY2VcbiAgICBpZiAodGhpcy5jb25maWcucmVxdWlyZUNvbXBsaWFuY2VDaGVjayAmJiBoYXNDb21wbGlhbmNlKSB7XG4gICAgICBhY3RpdmF0aW9uLmdvdmVybmFuY2UgPSB0cnVlO1xuICAgICAgYWN0aXZhdGlvbi5yZWFzb24gKz0gJyAoY29tcGxpYW5jZSByZXF1aXJlZCknO1xuICAgIH1cblxuICAgIHJldHVybiBhY3RpdmF0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBodW1hbi1yZWFkYWJsZSBhY3RpdmF0aW9uIHJlYXNvbi5cbiAgICovXG4gIHByaXZhdGUgZ2V0QWN0aXZhdGlvblJlYXNvbihcbiAgICBtb2RlOiBzdHJpbmcsXG4gICAgY29tcGxleGl0eTogbnVtYmVyLFxuICAgIG5lZWRzR292ZXJuYW5jZTogYm9vbGVhblxuICApOiBzdHJpbmcge1xuICAgIGNvbnN0IHJlYXNvbnM6IHN0cmluZ1tdID0gW107XG5cbiAgICBpZiAobW9kZSA9PT0gJ2xpZ2h0Jykge1xuICAgICAgcmVhc29ucy5wdXNoKCdMb3cgdG9rZW4gYnVkZ2V0Jyk7XG4gICAgfSBlbHNlIGlmIChtb2RlID09PSAnc3RhbmRhcmQnKSB7XG4gICAgICByZWFzb25zLnB1c2goJ01lZGl1bSB0b2tlbiBidWRnZXQnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVhc29ucy5wdXNoKCdIaWdoIHRva2VuIGJ1ZGdldCcpO1xuICAgIH1cblxuICAgIGlmIChjb21wbGV4aXR5ID4gMC42KSB7XG4gICAgICByZWFzb25zLnB1c2goYEhpZ2ggY29tcGxleGl0eSAoJHsoY29tcGxleGl0eSAqIDEwMCkudG9GaXhlZCgwKX0lKWApO1xuICAgIH1cblxuICAgIGlmIChuZWVkc0dvdmVybmFuY2UpIHtcbiAgICAgIHJlYXNvbnMucHVzaCgnR292ZXJuYW5jZSByZXF1aXJlZCcpO1xuICAgIH1cblxuICAgIHJldHVybiByZWFzb25zLmpvaW4oJywgJyk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IEwxMy1MMTcgYWN0aXZhdGlvbiBzdGF0dXMuXG4gICAqL1xuICBnZXRMYXllckFjdGl2YXRpb24ocHJvZmlsZTogUHJvamVjdFByb2ZpbGUpOiB7IGxheWVyczogbnVtYmVyW107IGFjdGl2YXRlZDogYm9vbGVhbiB9IHtcbiAgICBjb25zdCBhY3RpdmF0aW9uID0gdGhpcy5hY3RpdmF0ZShwcm9maWxlKTtcbiAgICBcbiAgICBjb25zdCBsYXllcnM6IG51bWJlcltdID0gW107XG4gICAgXG4gICAgLy8gTDEzLUwxNyBhY3RpdmF0aW9uIHJ1bGVzXG4gICAgaWYgKGFjdGl2YXRpb24udWl1eCkge1xuICAgICAgbGF5ZXJzLnB1c2goMTMpOyAvLyBTZW1hbnRpYyBDb25zaXN0ZW5jeVxuICAgIH1cbiAgICBpZiAoYWN0aXZhdGlvbi51aXV4ICYmIGFjdGl2YXRpb24ubW9kZSAhPT0gJ2xpZ2h0Jykge1xuICAgICAgbGF5ZXJzLnB1c2goMTQpOyAvLyBTaW11bGF0aW9uXG4gICAgfVxuICAgIGlmIChhY3RpdmF0aW9uLm1vZGUgPT09ICdmdWxsJykge1xuICAgICAgbGF5ZXJzLnB1c2goMTUsIDE2LCAxNyk7IC8vIFJ1bnRpbWUgKyBFdm9sdXRpb24gKyBHdWFyZFxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBsYXllcnMsXG4gICAgICBhY3RpdmF0ZWQ6IGxheWVycy5sZW5ndGggPiAwLFxuICAgIH07XG4gIH1cbn1cblxuLyoqXG4gKiBTaW5nbGV0b24gcm91dGVyIGluc3RhbmNlLlxuICovXG5sZXQgZGVmYXVsdFJvdXRlcjogRHluYW1pY1JvdXRlciB8IG51bGwgPSBudWxsO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGVmYXVsdFJvdXRlcigpOiBEeW5hbWljUm91dGVyIHtcbiAgaWYgKCFkZWZhdWx0Um91dGVyKSB7XG4gICAgZGVmYXVsdFJvdXRlciA9IG5ldyBEeW5hbWljUm91dGVyKCk7XG4gIH1cbiAgcmV0dXJuIGRlZmF1bHRSb3V0ZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNldERlZmF1bHRSb3V0ZXIoKTogdm9pZCB7XG4gIGRlZmF1bHRSb3V0ZXIgPSBudWxsO1xufVxuIl19