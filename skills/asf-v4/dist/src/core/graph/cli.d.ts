#!/usr/bin/env node
/**
 * ASF V4.0 Graph Kernel - CLI
 *
 * Command-line interface for graph operations.
 * Version: v0.8.5
 *
 * Commands:
 *   openclaw graph heatmap --window=7d --export=png
 *   openclaw graph trace --node=xxx --depth=3
 *   openclaw graph events --target=xxx --limit=50
 */
/**
 * Heatmap command options.
 */
interface HeatmapOptions {
    window: string;
    export?: string;
    output?: string;
    limit?: number;
    nodeTypes?: string;
}
/**
 * Generate and display heatmap.
 */
export declare function heatmapCommand(options: HeatmapOptions): Promise<void>;
/**
 * Trace command options.
 */
interface TraceOptions {
    node: string;
    depth?: number;
    export?: string;
    output?: string;
}
/**
 * Trace blast radius for a node.
 */
export declare function traceCommand(options: TraceOptions): Promise<void>;
/**
 * Events command options.
 */
interface EventsOptions {
    target?: string;
    role?: string;
    action?: string;
    limit?: number;
    since?: string;
}
/**
 * List change events.
 */
export declare function eventsCommand(options: EventsOptions): Promise<void>;
/**
 * Main CLI entry point.
 */
export declare function main(args: string[]): Promise<void>;
export {};
