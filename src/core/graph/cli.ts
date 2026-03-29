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

import type { HeatmapEntry, ChangeEvent, BlastRadiusResult } from './types';
import { generateHeatmap, getTopHotNodes, getNodeHeatScore } from './heatmap';
import { calculateBlastRadius } from './traversal';
import { getDefaultChangeLogStore } from '../../storage/change-log';
import { getGlobalEmitter } from './events';

// ============================================================================
// CLI Command Handlers
// ============================================================================

/**
 * Heatmap command options.
 */
interface HeatmapOptions {
  window: string;      // e.g., "7d", "24h", "1h"
  export?: string;     // "json", "png", "csv"
  output?: string;     // Output file path
  limit?: number;      // Max results
  nodeTypes?: string;  // Comma-separated node types
}

/**
 * Parse window string to milliseconds.
 */
function parseWindow(windowStr: string): number {
  const match = windowStr.match(/^(\d+)([dhms])$/);
  if (!match) {
    throw new Error(`Invalid window format: ${windowStr}. Use format like "7d", "24h", "30m"`);
  }

  const [, value, unit] = match;
  const num = parseInt(value, 10);

  switch (unit) {
    case 'd':
      return num * 24 * 60 * 60 * 1000;
    case 'h':
      return num * 60 * 60 * 1000;
    case 'm':
      return num * 60 * 1000;
    case 's':
      return num * 1000;
    default:
      throw new Error(`Unknown time unit: ${unit}`);
  }
}

/**
 * Generate and display heatmap.
 */
export async function heatmapCommand(options: HeatmapOptions): Promise<void> {
  const windowMs = parseWindow(options.window);
  const limit = options.limit || 100;
  
  console.log(`Generating heatmap for window: ${options.window} (${windowMs}ms)`);
  console.log(`Limit: ${limit}`);
  console.log('');

  // Get change events from store
  const store = getDefaultChangeLogStore();
  const changeEvents = await store.query({
    since: Date.now() - windowMs,
    limit: 10000,
  });

  console.log(`Found ${changeEvents.length} change events in window`);
  console.log('');

  // Note: For actual heatmap generation, we need a GraphStore implementation
  // This is a placeholder showing the CLI interface
  
  console.log('Heatmap generation requires GraphStore implementation.');
  console.log('');
  console.log('Example output format:');
  console.log('');
  console.log('┌──────┬─────────────────┬────────────┬───────────┬─────────────┐');
  console.log('│ Rank │ Node ID         │ Node Type  │ Heat Score│ Change Count│');
  console.log('├──────┼─────────────────┼────────────┼───────────┼─────────────┤');
  console.log('│  1   │ api-gateway-v1  │ APIContract│    245.50 │     15      │');
  console.log('│  2   │ user-service    │ Service    │    189.30 │     12      │');
  console.log('│  3   │ users-table     │ DBSchema   │    156.80 │      8      │');
  console.log('└──────┴─────────────────┴────────────┴───────────┴─────────────┘');
  console.log('');

  // Export if requested
  if (options.export === 'json') {
    const output = options.output || 'heatmap.json';
    console.log(`Would export to ${output}`);
  }
}

/**
 * Trace command options.
 */
interface TraceOptions {
  node: string;      // Node ID to trace
  depth?: number;    // Trace depth (default: 3)
  export?: string;   // "json", "dot" (Graphviz)
  output?: string;   // Output file path
}

/**
 * Trace blast radius for a node.
 */
export async function traceCommand(options: TraceOptions): Promise<void> {
  const depth = options.depth || 3;
  
  console.log(`Tracing blast radius for node: ${options.node}`);
  console.log(`Depth: ${depth}`);
  console.log('');

  // Note: For actual trace, we need a GraphStore implementation
  // This is a placeholder showing the CLI interface
  
  console.log('Blast radius calculation requires GraphStore implementation.');
  console.log('');
  console.log('Example output format:');
  console.log('');
  console.log('Blast Radius Report');
  console.log('===================');
  console.log('');
  console.log(`Node: ${options.node}`);
  console.log(`Direct Impact: 5 nodes`);
  console.log(`Indirect Impact: 12 nodes`);
  console.log(`Total Blast Radius: 17 nodes`);
  console.log('');
  console.log('Critical Path:');
  console.log('  └─ api-gateway-v1');
  console.log('     └─ user-service (CRITICAL)');
  console.log('        └─ users-table (CRITICAL)');
  console.log('           └─ auth-module (CRITICAL)');
  console.log('');

  // Export if requested
  if (options.export === 'dot') {
    const output = options.output || 'trace.dot';
    console.log(`Would export Graphviz DOT to ${output}`);
  }
}

/**
 * Events command options.
 */
interface EventsOptions {
  target?: string;   // Filter by target ID
  role?: string;     // Filter by role ID
  action?: string;   // Filter by action type
  limit?: number;    // Max results (default: 50)
  since?: string;    // Since when (e.g., "1h", "24h")
}

/**
 * List change events.
 */
export async function eventsCommand(options: EventsOptions): Promise<void> {
  const limit = options.limit || 50;
  
  console.log('Change Events');
  console.log('=============');
  console.log('');

  // Build query
  const query: { limit: number; since?: number; targetId?: string; actorRoleId?: string; action?: any } = {
    limit,
  };

  if (options.since) {
    query.since = Date.now() - parseWindow(options.since);
  }
  if (options.target) {
    query.targetId = options.target;
  }
  if (options.role) {
    query.actorRoleId = options.role;
  }
  if (options.action) {
    query.action = options.action as any;
  }

  // Get events from store
  const store = getDefaultChangeLogStore();
  const events = await store.query(query);

  if (events.length === 0) {
    console.log('No events found.');
    return;
  }

  console.log(`Found ${events.length} events:`);
  console.log('');

  for (const event of events) {
    const date = new Date(event.ts).toISOString();
    console.log(`[${date}] ${event.action.toUpperCase()}`);
    console.log(`  Target: ${event.target.kind}/${event.target.idOrPath}`);
    console.log(`  Role: ${event.actorRoleId}`);
    console.log(`  Rule: ${event.ownershipRuleId}`);
    if (event.riskScore !== undefined) {
      console.log(`  Risk: ${event.riskScore}`);
    }
    console.log('');
  }
}

/**
 * Main CLI entry point.
 */
export async function main(args: string[]): Promise<void> {
  const command = args[0];

  switch (command) {
    case 'heatmap':
      await heatmapCommand(parseHeatmapOptions(args.slice(1)));
      break;

    case 'trace':
      await traceCommand(parseTraceOptions(args.slice(1)));
      break;

    case 'events':
      await eventsCommand(parseEventsOptions(args.slice(1)));
      break;

    case 'help':
    case '--help':
    case '-h':
      printHelp();
      break;

    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

// ============================================================================
// Option Parsers
// ============================================================================

function parseHeatmapOptions(args: string[]): HeatmapOptions {
  const options: HeatmapOptions = { window: '7d' };

  for (const arg of args) {
    if (arg.startsWith('--window=')) {
      options.window = arg.split('=')[1];
    } else if (arg.startsWith('--export=')) {
      options.export = arg.split('=')[1] as any;
    } else if (arg.startsWith('--output=')) {
      options.output = arg.split('=')[1];
    } else if (arg.startsWith('--limit=')) {
      options.limit = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--node-types=')) {
      options.nodeTypes = arg.split('=')[1];
    }
  }

  return options;
}

function parseTraceOptions(args: string[]): TraceOptions {
  const options: TraceOptions = { node: '' };

  for (const arg of args) {
    if (arg.startsWith('--node=')) {
      options.node = arg.split('=')[1];
    } else if (arg.startsWith('--depth=')) {
      options.depth = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--export=')) {
      options.export = arg.split('=')[1] as any;
    } else if (arg.startsWith('--output=')) {
      options.output = arg.split('=')[1];
    }
  }

  if (!options.node) {
    throw new Error('--node is required');
  }

  return options;
}

function parseEventsOptions(args: string[]): EventsOptions {
  const options: EventsOptions = {};

  for (const arg of args) {
    if (arg.startsWith('--target=')) {
      options.target = arg.split('=')[1];
    } else if (arg.startsWith('--role=')) {
      options.role = arg.split('=')[1];
    } else if (arg.startsWith('--action=')) {
      options.action = arg.split('=')[1];
    } else if (arg.startsWith('--limit=')) {
      options.limit = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--since=')) {
      options.since = arg.split('=')[1];
    }
  }

  return options;
}

// ============================================================================
// Help
// ============================================================================

function printHelp(): void {
  console.log(`
ASF V4.0 Graph Kernel CLI

Usage: openclaw graph <command> [options]

Commands:
  heatmap     Generate change heatmap visualization
  trace       Trace blast radius for a node
  events      List change events

Options:
  heatmap:
    --window=<duration>   Time window (e.g., 7d, 24h, 1h). Default: 7d
    --export=<format>     Export format: json, png, csv
    --output=<path>       Output file path
    --limit=<number>      Max results. Default: 100
    --node-types=<types>  Filter by node types (comma-separated)

  trace:
    --node=<id>           Node ID to trace (required)
    --depth=<number>      Trace depth. Default: 3
    --export=<format>     Export format: json, dot (Graphviz)
    --output=<path>       Output file path

  events:
    --target=<id>         Filter by target ID
    --role=<id>           Filter by role ID
    --action=<type>       Filter by action: create, update, delete, approve, reject
    --limit=<number>      Max results. Default: 50
    --since=<duration>    Show events since (e.g., 1h, 24h)

Examples:
  openclaw graph heatmap --window=7d --export=json
  openclaw graph trace --node=api-gateway-v1 --depth=5
  openclaw graph events --target=user-service --limit=20
  openclaw graph events --action=approve --since=24h
`);
}

// Run CLI if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  main(process.argv.slice(2)).catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}
