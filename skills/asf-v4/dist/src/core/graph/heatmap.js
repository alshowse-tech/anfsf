"use strict";
/**
 * ASF V4.0 Graph Kernel - Heatmap Generation
 *
 * Heat score calculation and heatmap data generation.
 * Version: v0.8.5
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeatmapGenerator = void 0;
exports.calculateHeatScore = calculateHeatScore;
exports.generateHeatmap = generateHeatmap;
exports.getTopHotNodes = getTopHotNodes;
exports.getNodeHeatScore = getNodeHeatScore;
exports.compareHeatScores = compareHeatScores;
const constants_1 = require("./constants");
const traversal_1 = require("./traversal");
/**
 * Calculate heat score for a node.
 *
 * Heat score represents how "hot" a node is in terms of:
 * - How frequently it changes
 * - How many downstream nodes it affects (blast radius)
 * - How risky the changes are
 * - What type of node it is
 *
 * Formula: heat = frequency × blastRadius × riskWeight × typeWeight
 *
 * @param params - Heat score parameters
 * @returns Heat score (higher = more impactful/hot)
 *
 * @example
 * ```typescript
 * const heatScore = calculateHeatScore({
 *   changeFrequency: 5,        // 5 changes per day
 *   blastRadius: 12,           // Affects 12 downstream nodes
 *   riskWeight: 1.5,           // High risk changes
 *   nodeType: 'APIContract',   // API contract type
 * });
 * // heatScore = 5 × 12 × 1.5 × 1.5 = 135
 * ```
 */
function calculateHeatScore(params) {
    const { changeFrequency, blastRadius, riskWeight, nodeType } = params;
    // Get type weight (default to 1.0 for unknown types)
    const typeWeight = constants_1.NODE_TYPE_WEIGHTS[nodeType] || 1.0;
    // Calculate heat score
    const heatScore = changeFrequency * blastRadius * riskWeight * typeWeight;
    // Round to 2 decimal places
    return Math.round(heatScore * 100) / 100;
}
/**
 * Heatmap generator class.
 *
 * Encapsulates heatmap generation logic with caching support.
 */
class HeatmapGenerator {
    constructor(graph, changeEvents, cacheTTL = 5 * 60 * 1000 // 5 minutes default
    ) {
        this.cache = null;
        this.cacheTimestamp = 0;
        this.graph = graph;
        this.changeEvents = changeEvents;
        this.cacheTTL = cacheTTL;
    }
    /**
     * Generate heatmap data.
     *
     * @param query - Query parameters
     * @returns Array of heatmap entries sorted by heat score
     */
    generate(query = {}) {
        const { window = constants_1.HEATMAP_DEFAULTS.WINDOW_MS, nodeTypes, minHeatScore = constants_1.HEATMAP_DEFAULTS.MIN_HEAT_SCORE, limit = constants_1.HEATMAP_DEFAULTS.LIMIT, } = query;
        // Check cache
        const cacheKey = this.getCacheKey(query);
        if (this.isCacheValid(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (cached) {
                return [cached];
            }
        }
        // Filter change events by time window
        const cutoff = Date.now() - window;
        const filteredEvents = this.changeEvents.filter((event) => event.ts >= cutoff);
        // Aggregate changes by node
        const nodeChanges = this.aggregateChangesByNode(filteredEvents);
        // Calculate heat scores
        const heatmap = [];
        for (const [nodeId, data] of nodeChanges.entries()) {
            // Get node type
            const node = this.graph.getNode(nodeId);
            if (!node)
                continue;
            const nodeType = node.type;
            // Filter by node type if specified
            if (nodeTypes && !nodeTypes.includes(nodeType)) {
                continue;
            }
            // Calculate blast radius
            const blastResult = (0, traversal_1.calculateBlastRadius)(this.graph, nodeId);
            // Calculate average risk weight
            const avgRiskScore = data.riskSum / data.count;
            const riskWeight = (0, constants_1.getRiskWeight)(avgRiskScore);
            // Calculate change frequency (per day)
            const days = window / (24 * 60 * 60 * 1000);
            const changeFrequency = data.count / days;
            // Calculate heat score
            const heatScore = calculateHeatScore({
                changeFrequency,
                blastRadius: blastResult.totalBlastRadius,
                riskWeight,
                nodeType,
            });
            // Skip if below threshold
            if (heatScore < minHeatScore) {
                continue;
            }
            heatmap.push({
                nodeId,
                nodeType,
                heatScore,
                rank: 0, // Will be set after sorting
                changeCount: data.count,
                blastRadius: blastResult.totalBlastRadius,
                riskWeight,
            });
        }
        // Sort by heat score (descending) and assign ranks
        heatmap.sort((a, b) => b.heatScore - a.heatScore);
        heatmap.forEach((entry, index) => {
            entry.rank = index + 1;
        });
        // Apply limit
        const result = heatmap.slice(0, limit);
        // Update cache
        this.updateCache(cacheKey, result[0]);
        return result;
    }
    /**
     * Aggregate change events by target node.
     */
    aggregateChangesByNode(events) {
        const aggregation = new Map();
        for (const event of events) {
            const targetId = event.target.idOrPath;
            const existing = aggregation.get(targetId) || {
                count: 0,
                riskSum: 0,
                lastChange: 0,
            };
            existing.count++;
            existing.riskSum += event.riskScore || 50;
            existing.lastChange = Math.max(existing.lastChange, event.ts);
            aggregation.set(targetId, existing);
        }
        return aggregation;
    }
    /**
     * Generate cache key from query parameters.
     */
    getCacheKey(query) {
        return JSON.stringify({
            window: query.window,
            nodeTypes: query.nodeTypes?.sort(),
            minHeatScore: query.minHeatScore,
            limit: query.limit,
        });
    }
    /**
     * Check if cache is still valid.
     */
    isCacheValid(cacheKey) {
        if (!this.cache)
            return false;
        if (!this.cache.has(cacheKey))
            return false;
        const now = Date.now();
        return now - this.cacheTimestamp < this.cacheTTL;
    }
    /**
     * Update cache with new result.
     */
    updateCache(cacheKey, entry) {
        if (!entry)
            return;
        this.cache = new Map();
        this.cache.set(cacheKey, entry);
        this.cacheTimestamp = Date.now();
    }
    /**
     * Invalidate cache.
     */
    invalidateCache() {
        this.cache = null;
        this.cacheTimestamp = 0;
    }
}
exports.HeatmapGenerator = HeatmapGenerator;
/**
 * Generate heatmap from graph and change events.
 *
 * Convenience function that creates a HeatmapGenerator internally.
 *
 * @param graph - Graph store implementation
 * @param changeEvents - Array of change events
 * @param query - Query parameters
 * @returns Heatmap entries sorted by heat score
 */
function generateHeatmap(graph, changeEvents, query = {}) {
    const generator = new HeatmapGenerator(graph, changeEvents);
    return generator.generate(query);
}
/**
 * Get top hot nodes for dashboard display.
 *
 * @param graph - Graph store implementation
 * @param changeEvents - Array of change events
 * @param limit - Number of top nodes to return (default: 10)
 * @returns Top hot nodes
 */
function getTopHotNodes(graph, changeEvents, limit = 10) {
    return generateHeatmap(graph, changeEvents, { limit });
}
/**
 * Get heat score for a specific node.
 *
 * @param graph - Graph store implementation
 * @param changeEvents - Array of change events
 * @param nodeId - Node ID to get heat score for
 * @param window - Time window in ms (default: 7 days)
 * @returns Heat score for the node, or 0 if not found
 */
function getNodeHeatScore(graph, changeEvents, nodeId, window = constants_1.HEATMAP_DEFAULTS.WINDOW_MS) {
    const heatmap = generateHeatmap(graph, changeEvents, {
        window,
        limit: 1000, // Get all to ensure we find the node
    });
    const entry = heatmap.find((e) => e.nodeId === nodeId);
    return entry?.heatScore || 0;
}
/**
 * Compare heat scores between two time periods.
 *
 * @param graph - Graph store implementation
 * @param changeEvents - Array of change events
 * @param currentWindow - Current period window in ms
 * @param previousWindow - Previous period window in ms
 * @returns Object with current, previous, and delta heat scores per node
 */
function compareHeatScores(graph, changeEvents, currentWindow = 7 * 24 * 60 * 60 * 1000, previousWindow = 7 * 24 * 60 * 60 * 1000) {
    const now = Date.now();
    // Get current period events
    const currentCutoff = now - currentWindow;
    const currentEvents = changeEvents.filter((e) => e.ts >= currentCutoff);
    // Get previous period events
    const previousCutoff = currentCutoff - previousWindow;
    const previousEvents = changeEvents.filter((e) => e.ts >= previousCutoff && e.ts < currentCutoff);
    // Generate heatmaps for both periods
    const currentHeatmap = generateHeatmap(graph, currentEvents);
    const previousHeatmap = generateHeatmap(graph, previousEvents);
    // Create maps for easy lookup
    const currentMap = new Map(currentHeatmap.map((e) => [e.nodeId, e.heatScore]));
    const previousMap = new Map(previousHeatmap.map((e) => [e.nodeId, e.heatScore]));
    // Get all unique node IDs
    const allNodeIds = new Set([...currentMap.keys(), ...previousMap.keys()]);
    // Compare scores
    const comparison = new Map();
    for (const nodeId of allNodeIds) {
        const currentScore = currentMap.get(nodeId) || 0;
        const previousScore = previousMap.get(nodeId) || 0;
        const delta = currentScore - previousScore;
        let trend;
        if (delta > 10) {
            trend = 'increasing';
        }
        else if (delta < -10) {
            trend = 'decreasing';
        }
        else {
            trend = 'stable';
        }
        comparison.set(nodeId, {
            nodeId,
            currentScore,
            previousScore,
            delta: Math.round(delta * 100) / 100,
            trend,
        });
    }
    return comparison;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVhdG1hcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9jb3JlL2dyYXBoL2hlYXRtYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7OztHQUtHOzs7QUEwQ0gsZ0RBaUJDO0FBOE1ELDBDQU9DO0FBVUQsd0NBTUM7QUFXRCw0Q0FhQztBQVdELDhDQTBFQztBQXBZRCwyQ0FLcUI7QUFDckIsMkNBQW1FO0FBRW5FOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0F3Qkc7QUFDSCxTQUFnQixrQkFBa0IsQ0FBQyxNQUtsQztJQUNDLE1BQU0sRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsR0FBRyxNQUFNLENBQUM7SUFFdEUscURBQXFEO0lBQ3JELE1BQU0sVUFBVSxHQUFHLDZCQUFpQixDQUFDLFFBQW9CLENBQUMsSUFBSSxHQUFHLENBQUM7SUFFbEUsdUJBQXVCO0lBQ3ZCLE1BQU0sU0FBUyxHQUNiLGVBQWUsR0FBRyxXQUFXLEdBQUcsVUFBVSxHQUFHLFVBQVUsQ0FBQztJQUUxRCw0QkFBNEI7SUFDNUIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUM7QUFDM0MsQ0FBQztBQUVEOzs7O0dBSUc7QUFDSCxNQUFhLGdCQUFnQjtJQU8zQixZQUNFLEtBQXFCLEVBQ3JCLFlBQTJCLEVBQzNCLFdBQW1CLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLG9CQUFvQjs7UUFQL0MsVUFBSyxHQUFxQyxJQUFJLENBQUM7UUFDL0MsbUJBQWMsR0FBVyxDQUFDLENBQUM7UUFRakMsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUM7UUFDbkIsSUFBSSxDQUFDLFlBQVksR0FBRyxZQUFZLENBQUM7UUFDakMsSUFBSSxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUM7SUFDM0IsQ0FBQztJQUVEOzs7OztPQUtHO0lB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R0FBRyxVQUFVLENBQUMsSUFBSSxFQUFFLEVBQUUsR0FBRyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBRTFFLGlCQUFpQjtJQUNqQixNQUFNLFVBQVUsR0FBRyxJQUFJLEdBQUcsRUFTdkIsQ0FBQztJQUVKLEtBQUssTUFBTSxNQUFNLElBQUksVUFBVSxFQUFFLENBQUM7UUFDaEMsTUFBTSxZQUFZLEdBQUcsVUFBVSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDakQsTUFBTSxhQUFhLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkQsTUFBTSxLQUFLLEdBQUcsWUFBWSxHQUFHLGFBQWEsQ0FBQztRQUUzQyxJQUFJLEtBQTZDLENBQUM7UUFDbEQsSUFBSSxLQUFLLEdBQUcsRUFBRSxFQUFFLENBQUM7WUFDZixLQUFLLEdBQUcsWUFBWSxDQUFDO1FBQ3ZCLENBQUM7YUFBTSxJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3ZCLEtBQUssR0FBRyxZQUFZLENBQUM7UUFDdkIsQ0FBQzthQUFNLENBQUM7WUFDTixLQUFLLEdBQUcsUUFBUSxDQUFDO1FBQ25CLENBQUM7UUFFRCxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRTtZQUNyQixNQUFNO1lBQ04sWUFBWTtZQUNaLGFBQWE7WUFDYixLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRztZQUNwQyxLQUFLO1NBQ04sQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELE9BQU8sVUFBVSxDQUFDO0FBQ3BCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEFTRiBWNC4wIEdyYXBoIEtlcm5lbCAtIEhlYXRtYXAgR2VuZXJhdGlvblxuICogXG4gKiBIZWF0IHNjb3JlIGNhbGN1bGF0aW9uIGFuZCBoZWF0bWFwIGRhdGEgZ2VuZXJhdGlvbi5cbiAqIFZlcnNpb246IHYwLjguNVxuICovXG5cbmltcG9ydCB0eXBlIHtcbiAgQ2hhbmdlRXZlbnQsXG4gIEhlYXRtYXBFbnRyeSxcbiAgSGVhdG1hcFF1ZXJ5LFxuICBHcmFwaE5vZGUsXG4gIE5vZGVUeXBlLFxufSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7XG4gIE5PREVfVFlQRV9XRUlHSFRTLFxuICBnZXRSaXNrV2VpZ2h0LFxuICBIRUFUTUFQX0RFRkFVTFRTLFxuICBOT0RFX1RZUEVTLFxufSBmcm9tICcuL2NvbnN0YW50cyc7XG5pbXBvcnQgeyBjYWxjdWxhdGVCbGFzdFJhZGl1cywgR3JhcGhTdG9yZUxpa2UgfSBmcm9tICcuL3RyYXZlcnNhbCc7XG5cbi8qKlxuICogQ2FsY3VsYXRlIGhlYXQgc2NvcmUgZm9yIGEgbm9kZS5cbiAqIFxuICogSGVhdCBzY29yZSByZXByZXNlbnRzIGhvdyBcImhvdFwiIGEgbm9kZSBpcyBpbiB0ZXJtcyBvZjpcbiAqIC0gSG93IGZyZXF1ZW50bHkgaXQgY2hhbmdlc1xuICogLSBIb3cgbWFueSBkb3duc3RyZWFtIG5vZGVzIGl0IGFmZmVjdHMgKGJsYXN0IHJhZGl1cylcbiAqIC0gSG93IHJpc2t5IHRoZSBjaGFuZ2VzIGFyZVxuICogLSBXaGF0IHR5cGUgb2Ygbm9kZSBpdCBpc1xuICogXG4gKiBGb3JtdWxhOiBoZWF0ID0gZnJlcXVlbmN5IMOXIGJsYXN0UmFkaXVzIMOXIHJpc2tXZWlnaHQgw5cgdHlwZVdlaWdodFxuICogXG4gKiBAcGFyYW0gcGFyYW1zIC0gSGVhdCBzY29yZSBwYXJhbWV0ZXJzXG4gKiBAcmV0dXJucyBIZWF0IHNjb3JlIChoaWdoZXIgPSBtb3JlIGltcGFjdGZ1bC9ob3QpXG4gKiBcbiAqIEBleGFtcGxlXG4gKiBgYGB0eXBlc2NyaXB0XG4gKiBjb25zdCBoZWF0U2NvcmUgPSBjYWxjdWxhdGVIZWF0U2NvcmUoe1xuICogICBjaGFuZ2VGcmVxdWVuY3k6IDUsICAgICAgICAvLyA1IGNoYW5nZXMgcGVyIGRheVxuICogICBibGFzdFJhZGl1czogMTIsICAgICAgICAgICAvLyBBZmZlY3RzIDEyIGRvd25zdHJlYW0gbm9kZXNcbiAqICAgcmlza1dlaWdodDogMS41LCAgICAgICAgICAgLy8gSGlnaCByaXNrIGNoYW5nZXNcbiAqICAgbm9kZVR5cGU6ICdBUElDb250cmFjdCcsICAgLy8gQVBJIGNvbnRyYWN0IHR5cGVcbiAqIH0pO1xuICogLy8gaGVhdFNjb3JlID0gNSDDlyAxMiDDlyAxLjUgw5cgMS41ID0gMTM1XG4gKiBgYGBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNhbGN1bGF0ZUhlYXRTY29yZShwYXJhbXM6IHtcbiAgY2hhbmdlRnJlcXVlbmN5OiBudW1iZXI7XG4gIGJsYXN0UmFkaXVzOiBudW1iZXI7XG4gIHJpc2tXZWlnaHQ6IG51bWJlcjtcbiAgbm9kZVR5cGU6IE5vZGVUeXBlIHwgc3RyaW5nO1xufSk6IG51bWJlciB7XG4gIGNvbnN0IHsgY2hhbmdlRnJlcXVlbmN5LCBibGFzdFJhZGl1cywgcmlza1dlaWdodCwgbm9kZVR5cGUgfSA9IHBhcmFtcztcbiAgXG4gIC8vIEdldCB0eXBlIHdlaWdodCAoZGVmYXVsdCB0byAxLjAgZm9yIHVua25vd24gdHlwZXMpXG4gIGNvbnN0IHR5cGVXZWlnaHQgPSBOT0RFX1RZUEVfV0VJR0hUU1tub2RlVHlwZSBhcyBOb2RlVHlwZV0gfHwgMS4wO1xuICBcbiAgLy8gQ2FsY3VsYXRlIGhlYXQgc2NvcmVcbiAgY29uc3QgaGVhdFNjb3JlID1cbiAgICBjaGFuZ2VGcmVxdWVuY3kgKiBibGFzdFJhZGl1cyAqIHJpc2tXZWlnaHQgKiB0eXBlV2VpZ2h0O1xuICBcbiAgLy8gUm91bmQgdG8gMiBkZWNpbWFsIHBsYWNlc1xuICByZXR1cm4gTWF0aC5yb3VuZChoZWF0U2NvcmUgKiAxMDApIC8gMTAwO1xufVxuXG4vKipcbiAqIEhlYXRtYXAgZ2VuZXJhdG9yIGNsYXNzLlxuICogXG4gKiBFbmNhcHN1bGF0ZXMgaGVhdG1hcCBnZW5lcmF0aW9uIGxvZ2ljIHdpdGggY2FjaGluZyBzdXBwb3J0LlxuICovXG5leHBvcnQgY2xhc3MgSGVhdG1hcEdlbmVyYXRvciB7XG4gIHByaXZhdGUgZ3JhcGg6IEdyYXBoU3RvcmVMaWtlO1xuICBwcml2YXRlIGNoYW5nZUV2ZW50czogQ2hhbmdlRXZlbnRbXTtcbiAgcHJpdmF0ZSBjYWNoZTogTWFwPHN0cmluZywgSGVhdG1hcEVudHJ5PiB8IG51bGwgPSBudWxsO1xuICBwcml2YXRlIGNhY2hlVGltZXN0YW1wOiBudW1iZXIgPSAwO1xuICBwcml2YXRlIGNhY2hlVFRMOiBudW1iZXI7XG5cbiAgY29uc3RydWN0b3IoXG4gICAgZ3JhcGg6IEdyYXBoU3RvcmVMaWtlLFxuICAgIGNoYW5nZUV2ZW50czogQ2hhbmdlRXZlbnRbXSxcbiAgICBjYWNoZVRUTDogbnVtYmVyID0gNSAqIDYwICogMTAwMCAvLyA1IG1pbnV0ZXMgZGVmYXVsdFxuICApIHtcbiAgICB0aGlzLmdyYXBoID0gZ3JhcGg7XG4gICAgdGhpcy5jaGFuZ2VFdmVudHMgPSBjaGFuZ2VFdmVudHM7XG4gICAgdGhpcy5jYWNoZVRUTCA9IGNhY2hlVFRMO1xuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGhlYXRtYXAgZGF0YS5cbiAgICogXG4gICAqIEBwYXJhbSBxdWVyeSAtIFF1ZXJ5IHBhcmFtZXRlcnNcbiAgICogQHJldHVybnMgQXJyYXkgb2YgaGVhdG1hcCBlbnRyaWVzIHNvcnRlZCBieSBoZWF0IHNjb3JlXG4gICAqL1xuICBnZW5lcmF0ZShxdWVyeTogSGVhdG1hcFF1ZXJ5ID0ge30pOiBIZWF0bWFwRW50cnlbXSB7XG4gICAgY29uc3Qge1xuICAgICAgd2luZG93ID0gSEVBVE1BUF9ERUZBVUxUUy5XSU5ET1dfTVMsXG4gICAgICBub2RlVHlwZXMsXG4gICAgICBtaW5IZWF0U2NvcmUgPSBIRUFUTUFQX0RFRkFVTFRTLk1JTl9IRUFUX1NDT1JFLFxuICAgICAgbGltaXQgPSBIRUFUTUFQX0RFRkFVTFRTLkxJTUlULFxuICAgIH0gPSBxdWVyeTtcblxuICAgIC8vIENoZWNrIGNhY2hlXG4gICAgY29uc3QgY2FjaGVLZXkgPSB0aGlzLmdldENhY2hlS2V5KHF1ZXJ5KTtcbiAgICBpZiAodGhpcy5pc0NhY2hlVmFsaWQoY2FjaGVLZXkpKSB7XG4gICAgICBjb25zdCBjYWNoZWQgPSB0aGlzLmNhY2hlIS5nZXQoY2FjaGVLZXkpO1xuICAgICAgaWYgKGNhY2hlZCkge1xuICAgICAgICByZXR1cm4gW2NhY2hlZF07XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gRmlsdGVyIGNoYW5nZSBldmVudHMgYnkgdGltZSB3aW5kb3dcbiAgICBjb25zdCBjdXRvZmYgPSBEYXRlLm5vdygpIC0gd2luZG93O1xuICAgIGNvbnN0IGZpbHRlcmVkRXZlbnRzID0gdGhpcy5jaGFuZ2VFdmVudHMuZmlsdGVyKFxuICAgICAgKGV2ZW50KSA9PiBldmVudC50cyA+PSBjdXRvZmZcbiAgICApO1xuXG4gICAgLy8gQWdncmVnYXRlIGNoYW5nZXMgYnkgbm9kZVxuICAgIGNvbnN0IG5vZGVDaGFuZ2VzID0gdGhpcy5hZ2dyZWdhdGVDaGFuZ2VzQnlOb2RlKGZpbHRlcmVkRXZlbnRzKTtcblxuICAgIC8vIENhbGN1bGF0ZSBoZWF0IHNjb3Jlc1xuICAgIGNvbnN0IGhlYXRtYXA6IEhlYXRtYXBFbnRyeVtdID0gW107XG5cbiAgICBmb3IgKGNvbnN0IFtub2RlSWQsIGRhdGFdIG9mIG5vZGVDaGFuZ2VzLmVudHJpZXMoKSkge1xuICAgICAgLy8gR2V0IG5vZGUgdHlwZVxuICAgICAgY29uc3Qgbm9kZSA9IHRoaXMuZ3JhcGguZ2V0Tm9kZShub2RlSWQpO1xuICAgICAgaWYgKCFub2RlKSBjb250aW51ZTtcblxuICAgICAgY29uc3Qgbm9kZVR5cGUgPSBub2RlLnR5cGU7XG5cbiAgICAgIC8vIEZpbHRlciBieSBub2RlIHR5cGUgaWYgc3BlY2lmaWVkXG4gICAgICBpZiAobm9kZVR5cGVzICYmICFub2RlVHlwZXMuaW5jbHVkZXMobm9kZVR5cGUpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICAvLyBDYWxjdWxhdGUgYmxhc3QgcmFkaXVzXG4gICAgICBjb25zdCBibGFzdFJlc3VsdCA9IGNhbGN1bGF0ZUJsYXN0UmFkaXVzKHRoaXMuZ3JhcGgsIG5vZGVJZCk7XG5cbiAgICAgIC8vIENhbGN1bGF0ZSBhdmVyYWdlIHJpc2sgd2VpZ2h0XG4gICAgICBjb25zdCBhdmdSaXNrU2NvcmUgPSBkYXRhLnJpc2tTdW0gLyBkYXRhLmNvdW50O1xuICAgICAgY29uc3Qgcmlza1dlaWdodCA9IGdldFJpc2tXZWlnaHQoYXZnUmlza1Njb3JlKTtcblxuICAgICAgLy8gQ2FsY3VsYXRlIGNoYW5nZSBmcmVxdWVuY3kgKHBlciBkYXkpXG4gICAgICBjb25zdCBkYXlzID0gd2luZG93IC8gKDI0ICogNjAgKiA2MCAqIDEwMDApO1xuICAgICAgY29uc3QgY2hhbmdlRnJlcXVlbmN5ID0gZGF0YS5jb3VudCAvIGRheXM7XG5cbiAgICAgIC8vIENhbGN1bGF0ZSBoZWF0IHNjb3JlXG4gICAgICBjb25zdCBoZWF0U2NvcmUgPSBjYWxjdWxhdGVIZWF0U2NvcmUoe1xuICAgICAgICBjaGFuZ2VGcmVxdWVuY3ksXG4gICAgICAgIGJsYXN0UmFkaXVzOiBibGFzdFJlc3VsdC50b3RhbEJsYXN0UmFkaXVzLFxuICAgICAgICByaXNrV2VpZ2h0LFxuICAgICAgICBub2RlVHlwZSxcbiAgICAgIH0pO1xuXG4gICAgICAvLyBTa2lwIGlmIGJlbG93IHRocmVzaG9sZFxuICAgICAgaWYgKGhlYXRTY29yZSA8IG1pbkhlYXRTY29yZSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgaGVhdG1hcC5wdXNoKHtcbiAgICAgICAgbm9kZUlkLFxuICAgICAgICBub2RlVHlwZSxcbiAgICAgICAgaGVhdFNjb3JlLFxuICAgICAgICByYW5rOiAwLCAvLyBXaWxsIGJlIHNldCBhZnRlciBzb3J0aW5nXG4gICAgICAgIGNoYW5nZUNvdW50OiBkYXRhLmNvdW50LFxuICAgICAgICBibGFzdFJhZGl1czogYmxhc3RSZXN1bHQudG90YWxCbGFzdFJhZGl1cyxcbiAgICAgICAgcmlza1dlaWdodCxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIFNvcnQgYnkgaGVhdCBzY29yZSAoZGVzY2VuZGluZykgYW5kIGFzc2lnbiByYW5rc1xuICAgIGhlYXRtYXAuc29ydCgoYSwgYikgPT4gYi5oZWF0U2NvcmUgLSBhLmhlYXRTY29yZSk7XG4gICAgaGVhdG1hcC5mb3JFYWNoKChlbnRyeSwgaW5kZXgpID0+IHtcbiAgICAgIGVudHJ5LnJhbmsgPSBpbmRleCArIDE7XG4gICAgfSk7XG5cbiAgICAvLyBBcHBseSBsaW1pdFxuICAgIGNvbnN0IHJlc3VsdCA9IGhlYXRtYXAuc2xpY2UoMCwgbGltaXQpO1xuXG4gICAgLy8gVXBkYXRlIGNhY2hlXG4gICAgdGhpcy51cGRhdGVDYWNoZShjYWNoZUtleSwgcmVzdWx0WzBdKTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH1cblxuICAvKipcbiAgICogQWdncmVnYXRlIGNoYW5nZSBldmVudHMgYnkgdGFyZ2V0IG5vZGUuXG4gICAqL1xuICBwcml2YXRlIGFnZ3JlZ2F0ZUNoYW5nZXNCeU5vZGUoXG4gICAgZXZlbnRzOiBDaGFuZ2VFdmVudFtdXG4gICk6IE1hcDxcbiAgICBzdHJpbmcsXG4gICAgeyBjb3VudDogbnVtYmVyOyByaXNrU3VtOiBudW1iZXI7IGxhc3RDaGFuZ2U6IG51bWJlciB9XG4gID4ge1xuICAgIGNvbnN0IGFnZ3JlZ2F0aW9uID0gbmV3IE1hcDxcbiAgICAgIHN0cmluZyxcbiAgICAgIHsgY291bnQ6IG51bWJlcjsgcmlza1N1bTogbnVtYmVyOyBsYXN0Q2hhbmdlOiBudW1iZXIgfVxuICAgID4oKTtcblxuICAgIGZvciAoY29uc3QgZXZlbnQgb2YgZXZlbnRzKSB7XG4gICAgICBjb25zdCB0YXJnZXRJZCA9IGV2ZW50LnRhcmdldC5pZE9yUGF0aDtcbiAgICAgIGNvbnN0IGV4aXN0aW5nID0gYWdncmVnYXRpb24uZ2V0KHRhcmdldElkKSB8fCB7XG4gICAgICAgIGNvdW50OiAwLFxuICAgICAgICByaXNrU3VtOiAwLFxuICAgICAgICBsYXN0Q2hhbmdlOiAwLFxuICAgICAgfTtcblxuICAgICAgZXhpc3RpbmcuY291bnQrKztcbiAgICAgIGV4aXN0aW5nLnJpc2tTdW0gKz0gZXZlbnQucmlza1Njb3JlIHx8IDUwO1xuICAgICAgZXhpc3RpbmcubGFzdENoYW5nZSA9IE1hdGgubWF4KGV4aXN0aW5nLmxhc3RDaGFuZ2UsIGV2ZW50LnRzKTtcblxuICAgICAgYWdncmVnYXRpb24uc2V0KHRhcmdldElkLCBleGlzdGluZyk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGFnZ3JlZ2F0aW9uO1xuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIGNhY2hlIGtleSBmcm9tIHF1ZXJ5IHBhcmFtZXRlcnMuXG4gICAqL1xuICBwcml2YXRlIGdldENhY2hlS2V5KHF1ZXJ5OiBIZWF0bWFwUXVlcnkpOiBzdHJpbmcge1xuICAgIHJldHVybiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICB3aW5kb3c6IHF1ZXJ5LndpbmRvdyxcbiAgICAgIG5vZGVUeXBlczogcXVlcnkubm9kZVR5cGVzPy5zb3J0KCksXG4gICAgICBtaW5IZWF0U2NvcmU6IHF1ZXJ5Lm1pbkhlYXRTY29yZSxcbiAgICAgIGxpbWl0OiBxdWVyeS5saW1pdCxcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayBpZiBjYWNoZSBpcyBzdGlsbCB2YWxpZC5cbiAgICovXG4gIHByaXZhdGUgaXNDYWNoZVZhbGlkKGNhY2hlS2V5OiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICBpZiAoIXRoaXMuY2FjaGUpIHJldHVybiBmYWxzZTtcbiAgICBpZiAoIXRoaXMuY2FjaGUuaGFzKGNhY2hlS2V5KSkgcmV0dXJuIGZhbHNlO1xuICAgIFxuICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gICAgcmV0dXJuIG5vdyAtIHRoaXMuY2FjaGVUaW1lc3RhbXAgPCB0aGlzLmNhY2hlVFRMO1xuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZSBjYWNoZSB3aXRoIG5ldyByZXN1bHQuXG4gICAqL1xuICBwcml2YXRlIHVwZGF0ZUNhY2hlKGNhY2hlS2V5OiBzdHJpbmcsIGVudHJ5OiBIZWF0bWFwRW50cnkgfCB1bmRlZmluZWQpOiB2b2lkIHtcbiAgICBpZiAoIWVudHJ5KSByZXR1cm47XG4gICAgXG4gICAgdGhpcy5jYWNoZSA9IG5ldyBNYXAoKTtcbiAgICB0aGlzLmNhY2hlLnNldChjYWNoZUtleSwgZW50cnkpO1xuICAgIHRoaXMuY2FjaGVUaW1lc3RhbXAgPSBEYXRlLm5vdygpO1xuICB9XG5cbiAgLyoqXG4gICAqIEludmFsaWRhdGUgY2FjaGUuXG4gICAqL1xuICBpbnZhbGlkYXRlQ2FjaGUoKTogdm9pZCB7XG4gICAgdGhpcy5jYWNoZSA9IG51bGw7XG4gICAgdGhpcy5jYWNoZVRpbWVzdGFtcCA9IDA7XG4gIH1cbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSBoZWF0bWFwIGZyb20gZ3JhcGggYW5kIGNoYW5nZSBldmVudHMuXG4gKiBcbiAqIENvbnZlbmllbmNlIGZ1bmN0aW9uIHRoYXQgY3JlYXRlcyBhIEhlYXRtYXBHZW5lcmF0b3IgaW50ZXJuYWxseS5cbiAqIFxuICogQHBhcmFtIGdyYXBoIC0gR3JhcGggc3RvcmUgaW1wbGVtZW50YXRpb25cbiAqIEBwYXJhbSBjaGFuZ2VFdmVudHMgLSBBcnJheSBvZiBjaGFuZ2UgZXZlbnRzXG4gKiBAcGFyYW0gcXVlcnkgLSBRdWVyeSBwYXJhbWV0ZXJzXG4gKiBAcmV0dXJucyBIZWF0bWFwIGVudHJpZXMgc29ydGVkIGJ5IGhlYXQgc2NvcmVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlSGVhdG1hcChcbiAgZ3JhcGg6IEdyYXBoU3RvcmVMaWtlLFxuICBjaGFuZ2VFdmVudHM6IENoYW5nZUV2ZW50W10sXG4gIHF1ZXJ5OiBIZWF0bWFwUXVlcnkgPSB7fVxuKTogSGVhdG1hcEVudHJ5W10ge1xuICBjb25zdCBnZW5lcmF0b3IgPSBuZXcgSGVhdG1hcEdlbmVyYXRvcihncmFwaCwgY2hhbmdlRXZlbnRzKTtcbiAgcmV0dXJuIGdlbmVyYXRvci5nZW5lcmF0ZShxdWVyeSk7XG59XG5cbi8qKlxuICogR2V0IHRvcCBob3Qgbm9kZXMgZm9yIGRhc2hib2FyZCBkaXNwbGF5LlxuICogXG4gKiBAcGFyYW0gZ3JhcGggLSBHcmFwaCBzdG9yZSBpbXBsZW1lbnRhdGlvblxuICogQHBhcmFtIGNoYW5nZUV2ZW50cyAtIEFycmF5IG9mIGNoYW5nZSBldmVudHNcbiAqIEBwYXJhbSBsaW1pdCAtIE51bWJlciBvZiB0b3Agbm9kZXMgdG8gcmV0dXJuIChkZWZhdWx0OiAxMClcbiAqIEByZXR1cm5zIFRvcCBob3Qgbm9kZXNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFRvcEhvdE5vZGVzKFxuICBncmFwaDogR3JhcGhTdG9yZUxpa2UsXG4gIGNoYW5nZUV2ZW50czogQ2hhbmdlRXZlbnRbXSxcbiAgbGltaXQ6IG51bWJlciA9IDEwXG4pOiBIZWF0bWFwRW50cnlbXSB7XG4gIHJldHVybiBnZW5lcmF0ZUhlYXRtYXAoZ3JhcGgsIGNoYW5nZUV2ZW50cywgeyBsaW1pdCB9KTtcbn1cblxuLyoqXG4gKiBHZXQgaGVhdCBzY29yZSBmb3IgYSBzcGVjaWZpYyBub2RlLlxuICogXG4gKiBAcGFyYW0gZ3JhcGggLSBHcmFwaCBzdG9yZSBpbXBsZW1lbnRhdGlvblxuICogQHBhcmFtIGNoYW5nZUV2ZW50cyAtIEFycmF5IG9mIGNoYW5nZSBldmVudHNcbiAqIEBwYXJhbSBub2RlSWQgLSBOb2RlIElEIHRvIGdldCBoZWF0IHNjb3JlIGZvclxuICogQHBhcmFtIHdpbmRvdyAtIFRpbWUgd2luZG93IGluIG1zIChkZWZhdWx0OiA3IGRheXMpXG4gKiBAcmV0dXJucyBIZWF0IHNjb3JlIGZvciB0aGUgbm9kZSwgb3IgMCBpZiBub3QgZm91bmRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldE5vZGVIZWF0U2NvcmUoXG4gIGdyYXBoOiBHcmFwaFN0b3JlTGlrZSxcbiAgY2hhbmdlRXZlbnRzOiBDaGFuZ2VFdmVudFtdLFxuICBub2RlSWQ6IHN0cmluZyxcbiAgd2luZG93OiBudW1iZXIgPSBIRUFUTUFQX0RFRkFVTFRTLldJTkRPV19NU1xuKTogbnVtYmVyIHtcbiAgY29uc3QgaGVhdG1hcCA9IGdlbmVyYXRlSGVhdG1hcChncmFwaCwgY2hhbmdlRXZlbnRzLCB7XG4gICAgd2luZG93LFxuICAgIGxpbWl0OiAxMDAwLCAvLyBHZXQgYWxsIHRvIGVuc3VyZSB3ZSBmaW5kIHRoZSBub2RlXG4gIH0pO1xuXG4gIGNvbnN0IGVudHJ5ID0gaGVhdG1hcC5maW5kKChlKSA9PiBlLm5vZGVJZCA9PT0gbm9kZUlkKTtcbiAgcmV0dXJuIGVudHJ5Py5oZWF0U2NvcmUgfHwgMDtcbn1cblxuLyoqXG4gKiBDb21wYXJlIGhlYXQgc2NvcmVzIGJldHdlZW4gdHdvIHRpbWUgcGVyaW9kcy5cbiAqIFxuICogQHBhcmFtIGdyYXBoIC0gR3JhcGggc3RvcmUgaW1wbGVtZW50YXRpb25cbiAqIEBwYXJhbSBjaGFuZ2VFdmVudHMgLSBBcnJheSBvZiBjaGFuZ2UgZXZlbnRzXG4gKiBAcGFyYW0gY3VycmVudFdpbmRvdyAtIEN1cnJlbnQgcGVyaW9kIHdpbmRvdyBpbiBtc1xuICogQHBhcmFtIHByZXZpb3VzV2luZG93IC0gUHJldmlvdXMgcGVyaW9kIHdpbmRvdyBpbiBtc1xuICogQHJldHVybnMgT2JqZWN0IHdpdGggY3VycmVudCwgcHJldmlvdXMsIGFuZCBkZWx0YSBoZWF0IHNjb3JlcyBwZXIgbm9kZVxuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcGFyZUhlYXRTY29yZXMoXG4gIGdyYXBoOiBHcmFwaFN0b3JlTGlrZSxcbiAgY2hhbmdlRXZlbnRzOiBDaGFuZ2VFdmVudFtdLFxuICBjdXJyZW50V2luZG93OiBudW1iZXIgPSA3ICogMjQgKiA2MCAqIDYwICogMTAwMCxcbiAgcHJldmlvdXNXaW5kb3c6IG51bWJlciA9IDcgKiAyNCAqIDYwICogNjAgKiAxMDAwXG4pOiBNYXA8XG4gIHN0cmluZyxcbiAge1xuICAgIG5vZGVJZDogc3RyaW5nO1xuICAgIGN1cnJlbnRTY29yZTogbnVtYmVyO1xuICAgIHByZXZpb3VzU2NvcmU6IG51bWJlcjtcbiAgICBkZWx0YTogbnVtYmVyO1xuICAgIHRyZW5kOiAnaW5jcmVhc2luZycgfCAnZGVjcmVhc2luZycgfCAnc3RhYmxlJztcbiAgfVxuPiB7XG4gIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gIFxuICAvLyBHZXQgY3VycmVudCBwZXJpb2QgZXZlbnRzXG4gIGNvbnN0IGN1cnJlbnRDdXRvZmYgPSBub3cgLSBjdXJyZW50V2luZG93O1xuICBjb25zdCBjdXJyZW50RXZlbnRzID0gY2hhbmdlRXZlbnRzLmZpbHRlcigoZSkgPT4gZS50cyA+PSBjdXJyZW50Q3V0b2ZmKTtcbiAgXG4gIC8vIEdldCBwcmV2aW91cyBwZXJpb2QgZXZlbnRzXG4gIGNvbnN0IHByZXZpb3VzQ3V0b2ZmID0gY3VycmVudEN1dG9mZiAtIHByZXZpb3VzV2luZG93O1xuICBjb25zdCBwcmV2aW91c0V2ZW50cyA9IGNoYW5nZUV2ZW50cy5maWx0ZXIoXG4gICAgKGUpID0+IGUudHMgPj0gcHJldmlvdXNDdXRvZmYgJiYgZS50cyA8IGN1cnJlbnRDdXRvZmZcbiAgKTtcblxuICAvLyBHZW5lcmF0ZSBoZWF0bWFwcyBmb3IgYm90aCBwZXJpb2RzXG4gIGNvbnN0IGN1cnJlbnRIZWF0bWFwID0gZ2VuZXJhdGVIZWF0bWFwKGdyYXBoLCBjdXJyZW50RXZlbnRzKTtcbiAgY29uc3QgcHJldmlvdXNIZWF0bWFwID0gZ2VuZXJhdGVIZWF0bWFwKGdyYXBoLCBwcmV2aW91c0V2ZW50cyk7XG5cbiAgLy8gQ3JlYXRlIG1hcHMgZm9yIGVhc3kgbG9va3VwXG4gIGNvbnN0IGN1cnJlbnRNYXAgPSBuZXcgTWFwKGN1cnJlbnRIZWF0bWFwLm1hcCgoZSkgPT4gW2Uubm9kZUlkLCBlLmhlYXRTY29yZV0pKTtcbiAgY29uc3QgcHJldmlvdXNNYXAgPSBuZXcgTWFwKHByZXZpb3VzSGVhdG1hcC5tYXAoKGUpID0+IFtlLm5vZGVJZCwgZS5oZWF0U2NvcmVdKSk7XG5cbiAgLy8gR2V0IGFsbCB1bmlxdWUgbm9kZSBJRHNcbiAgY29uc3QgYWxsTm9kZUlkcyA9IG5ldyBTZXQoWy4uLmN1cnJlbnRNYXAua2V5cygpLCAuLi5wcmV2aW91c01hcC5rZXlzKCldKTtcblxuICAvLyBDb21wYXJlIHNjb3Jlc1xuICBjb25zdCBjb21wYXJpc29uID0gbmV3IE1hcDxcbiAgICBzdHJpbmcsXG4gICAge1xuICAgICAgbm9kZUlkOiBzdHJpbmc7XG4gICAgICBjdXJyZW50U2NvcmU6IG51bWJlcjtcbiAgICAgIHByZXZpb3VzU2NvcmU6IG51bWJlcjtcbiAgICAgIGRlbHRhOiBudW1iZXI7XG4gICAgICB0cmVuZDogJ2luY3JlYXNpbmcnIHwgJ2RlY3JlYXNpbmcnIHwgJ3N0YWJsZSc7XG4gICAgfVxuICA+KCk7XG5cbiAgZm9yIChjb25zdCBub2RlSWQgb2YgYWxsTm9kZUlkcykge1xuICAgIGNvbnN0IGN1cnJlbnRTY29yZSA9IGN1cnJlbnRNYXAuZ2V0KG5vZGVJZCkgfHwgMDtcbiAgICBjb25zdCBwcmV2aW91c1Njb3JlID0gcHJldmlvdXNNYXAuZ2V0KG5vZGVJZCkgfHwgMDtcbiAgICBjb25zdCBkZWx0YSA9IGN1cnJlbnRTY29yZSAtIHByZXZpb3VzU2NvcmU7XG5cbiAgICBsZXQgdHJlbmQ6ICdpbmNyZWFzaW5nJyB8ICdkZWNyZWFzaW5nJyB8ICdzdGFibGUnO1xuICAgIGlmIChkZWx0YSA+IDEwKSB7XG4gICAgICB0cmVuZCA9ICdpbmNyZWFzaW5nJztcbiAgICB9IGVsc2UgaWYgKGRlbHRhIDwgLTEwKSB7XG4gICAgICB0cmVuZCA9ICdkZWNyZWFzaW5nJztcbiAgICB9IGVsc2Uge1xuICAgICAgdHJlbmQgPSAnc3RhYmxlJztcbiAgICB9XG5cbiAgICBjb21wYXJpc29uLnNldChub2RlSWQsIHtcbiAgICAgIG5vZGVJZCxcbiAgICAgIGN1cnJlbnRTY29yZSxcbiAgICAgIHByZXZpb3VzU2NvcmUsXG4gICAgICBkZWx0YTogTWF0aC5yb3VuZChkZWx0YSAqIDEwMCkgLyAxMDAsXG4gICAgICB0cmVuZCxcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiBjb21wYXJpc29uO1xufVxuIl19