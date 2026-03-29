/**
 * ASF V4.0 Graph Kernel - Heatmap Generation
 * 
 * Heat score calculation and heatmap data generation.
 * Version: v0.8.5
 */

import type {
  ChangeEvent,
  HeatmapEntry,
  HeatmapQuery,
  GraphNode,
  NodeType,
} from './types';
import {
  NODE_TYPE_WEIGHTS,
  getRiskWeight,
  HEATMAP_DEFAULTS,
  NODE_TYPES,
} from './constants';
import { calculateBlastRadius, GraphStoreLike } from './traversal';

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
export function calculateHeatScore(params: {
  changeFrequency: number;
  blastRadius: number;
  riskWeight: number;
  nodeType: NodeType | string;
}): number {
  const { changeFrequency, blastRadius, riskWeight, nodeType } = params;
  
  // Get type weight (default to 1.0 for unknown types)
  const typeWeight = NODE_TYPE_WEIGHTS[nodeType as NodeType] || 1.0;
  
  // Calculate heat score
  const heatScore =
    changeFrequency * blastRadius * riskWeight * typeWeight;
  
  // Round to 2 decimal places
  return Math.round(heatScore * 100) / 100;
}

/**
 * Heatmap generator class.
 * 
 * Encapsulates heatmap generation logic with caching support.
 */
export class HeatmapGenerator {
  private graph: GraphStoreLike;
  private changeEvents: ChangeEvent[];
  private cache: Map<string, HeatmapEntry> | null = null;
  private cacheTimestamp: number = 0;
  private cacheTTL: number;

  constructor(
    graph: GraphStoreLike,
    changeEvents: ChangeEvent[],
    cacheTTL: number = 5 * 60 * 1000 // 5 minutes default
  ) {
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
  generate(query: HeatmapQuery = {}): HeatmapEntry[] {
    const {
      window = HEATMAP_DEFAULTS.WINDOW_MS,
      nodeTypes,
      minHeatScore = HEATMAP_DEFAULTS.MIN_HEAT_SCORE,
      limit = HEATMAP_DEFAULTS.LIMIT,
    } = query;

    // Check cache
    const cacheKey = this.getCacheKey(query);
    if (this.isCacheValid(cacheKey)) {
      const cached = this.cache!.get(cacheKey);
      if (cached) {
        return [cached];
      }
    }

    // Filter change events by time window
    const cutoff = Date.now() - window;
    const filteredEvents = this.changeEvents.filter(
      (event) => event.ts >= cutoff
    );

    // Aggregate changes by node
    const nodeChanges = this.aggregateChangesByNode(filteredEvents);

    // Calculate heat scores
    const heatmap: HeatmapEntry[] = [];

    for (const [nodeId, data] of nodeChanges.entries()) {
      // Get node type
      const node = this.graph.getNode(nodeId);
      if (!node) continue;

      const nodeType = node.type;

      // Filter by node type if specified
      if (nodeTypes && !nodeTypes.includes(nodeType)) {
        continue;
      }

      // Calculate blast radius
      const blastResult = calculateBlastRadius(this.graph, nodeId);

      // Calculate average risk weight
      const avgRiskScore = data.riskSum / data.count;
      const riskWeight = getRiskWeight(avgRiskScore);

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
  private aggregateChangesByNode(
    events: ChangeEvent[]
  ): Map<
    string,
    { count: number; riskSum: number; lastChange: number }
  > {
    const aggregation = new Map<
      string,
      { count: number; riskSum: number; lastChange: number }
    >();

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
  private getCacheKey(query: HeatmapQuery): string {
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
  private isCacheValid(cacheKey: string): boolean {
    if (!this.cache) return false;
    if (!this.cache.has(cacheKey)) return false;
    
    const now = Date.now();
    return now - this.cacheTimestamp < this.cacheTTL;
  }

  /**
   * Update cache with new result.
   */
  private updateCache(cacheKey: string, entry: HeatmapEntry | undefined): void {
    if (!entry) return;
    
    this.cache = new Map();
    this.cache.set(cacheKey, entry);
    this.cacheTimestamp = Date.now();
  }

  /**
   * Invalidate cache.
   */
  invalidateCache(): void {
    this.cache = null;
    this.cacheTimestamp = 0;
  }
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
export function generateHeatmap(
  graph: GraphStoreLike,
  changeEvents: ChangeEvent[],
  query: HeatmapQuery = {}
): HeatmapEntry[] {
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
export function getTopHotNodes(
  graph: GraphStoreLike,
  changeEvents: ChangeEvent[],
  limit: number = 10
): HeatmapEntry[] {
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
export function getNodeHeatScore(
  graph: GraphStoreLike,
  changeEvents: ChangeEvent[],
  nodeId: string,
  window: number = HEATMAP_DEFAULTS.WINDOW_MS
): number {
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
export function compareHeatScores(
  graph: GraphStoreLike,
  changeEvents: ChangeEvent[],
  currentWindow: number = 7 * 24 * 60 * 60 * 1000,
  previousWindow: number = 7 * 24 * 60 * 60 * 1000
): Map<
  string,
  {
    nodeId: string;
    currentScore: number;
    previousScore: number;
    delta: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  }
> {
  const now = Date.now();
  
  // Get current period events
  const currentCutoff = now - currentWindow;
  const currentEvents = changeEvents.filter((e) => e.ts >= currentCutoff);
  
  // Get previous period events
  const previousCutoff = currentCutoff - previousWindow;
  const previousEvents = changeEvents.filter(
    (e) => e.ts >= previousCutoff && e.ts < currentCutoff
  );

  // Generate heatmaps for both periods
  const currentHeatmap = generateHeatmap(graph, currentEvents);
  const previousHeatmap = generateHeatmap(graph, previousEvents);

  // Create maps for easy lookup
  const currentMap = new Map(currentHeatmap.map((e) => [e.nodeId, e.heatScore]));
  const previousMap = new Map(previousHeatmap.map((e) => [e.nodeId, e.heatScore]));

  // Get all unique node IDs
  const allNodeIds = new Set([...currentMap.keys(), ...previousMap.keys()]);

  // Compare scores
  const comparison = new Map<
    string,
    {
      nodeId: string;
      currentScore: number;
      previousScore: number;
      delta: number;
      trend: 'increasing' | 'decreasing' | 'stable';
    }
  >();

  for (const nodeId of allNodeIds) {
    const currentScore = currentMap.get(nodeId) || 0;
    const previousScore = previousMap.get(nodeId) || 0;
    const delta = currentScore - previousScore;

    let trend: 'increasing' | 'decreasing' | 'stable';
    if (delta > 10) {
      trend = 'increasing';
    } else if (delta < -10) {
      trend = 'decreasing';
    } else {
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
