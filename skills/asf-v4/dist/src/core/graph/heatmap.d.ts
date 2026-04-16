/**
 * ASF V4.0 Graph Kernel - Heatmap Generation
 *
 * Heat score calculation and heatmap data generation.
 * Version: v0.8.5
 */
import type { ChangeEvent, HeatmapEntry, HeatmapQuery, NodeType } from './types';
import { GraphStoreLike } from './traversal';
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
export declare function calculateHeatScore(params: {
    changeFrequency: number;
    blastRadius: number;
    riskWeight: number;
    nodeType: NodeType | string;
}): number;
/**
 * Heatmap generator class.
 *
 * Encapsulates heatmap generation logic with caching support.
 */
export declare class HeatmapGenerator {
    private graph;
    private changeEvents;
    private cache;
    private cacheTimestamp;
    private cacheTTL;
    constructor(graph: GraphStoreLike, changeEvents: ChangeEvent[], cacheTTL?: number);
    /**
     * Generate heatmap data.
     *
     * @param query - Query parameters
     * @returns Array of heatmap entries sorted by heat score
     */
    generate(query?: HeatmapQuery): HeatmapEntry[];
    /**
     * Aggregate change events by target node.
     */
    private aggregateChangesByNode;
    /**
     * Generate cache key from query parameters.
     */
    private getCacheKey;
    /**
     * Check if cache is still valid.
     */
    private isCacheValid;
    /**
     * Update cache with new result.
     */
    private updateCache;
    /**
     * Invalidate cache.
     */
    invalidateCache(): void;
}
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
export declare function generateHeatmap(graph: GraphStoreLike, changeEvents: ChangeEvent[], query?: HeatmapQuery): HeatmapEntry[];
/**
 * Get top hot nodes for dashboard display.
 *
 * @param graph - Graph store implementation
 * @param changeEvents - Array of change events
 * @param limit - Number of top nodes to return (default: 10)
 * @returns Top hot nodes
 */
export declare function getTopHotNodes(graph: GraphStoreLike, changeEvents: ChangeEvent[], limit?: number): HeatmapEntry[];
/**
 * Get heat score for a specific node.
 *
 * @param graph - Graph store implementation
 * @param changeEvents - Array of change events
 * @param nodeId - Node ID to get heat score for
 * @param window - Time window in ms (default: 7 days)
 * @returns Heat score for the node, or 0 if not found
 */
export declare function getNodeHeatScore(graph: GraphStoreLike, changeEvents: ChangeEvent[], nodeId: string, window?: number): number;
/**
 * Compare heat scores between two time periods.
 *
 * @param graph - Graph store implementation
 * @param changeEvents - Array of change events
 * @param currentWindow - Current period window in ms
 * @param previousWindow - Previous period window in ms
 * @returns Object with current, previous, and delta heat scores per node
 */
export declare function compareHeatScores(graph: GraphStoreLike, changeEvents: ChangeEvent[], currentWindow?: number, previousWindow?: number): Map<string, {
    nodeId: string;
    currentScore: number;
    previousScore: number;
    delta: number;
    trend: 'increasing' | 'decreasing' | 'stable';
}>;
