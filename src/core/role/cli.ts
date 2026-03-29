#!/usr/bin/env node
/**
 * ASF V4.0 Role Engine - CLI
 * 
 * Command-line interface for role operations.
 * Version: v0.8.5
 * 
 * Commands:
 *   openclaw role budget --role=xxx --export=json
 *   openclaw role kpi --role=xxx --window=1d --export=prometheus
 *   openclaw role kpi --triggers
 */

import type { BudgetMetrics } from './budget-types';
import { calculateInterfaceBudget, generateBudgetAlerts, getBudgetRecommendations } from './interface-budget';
import type { RoleKPISnapshot } from './kpi-types';
import { calculateRoleKPI, evaluateKPITriggers } from './kpi-engine';

// ============================================================================
// Budget Command
// ============================================================================

interface BudgetOptions {
  role?: string;
  all?: boolean;
  export?: 'json' | 'yaml' | 'prometheus';
  output?: string;
  compare?: boolean;
}

export async function budgetCommand(options: BudgetOptions): Promise<void> {
  console.log('Interface Budget Calculator');
  console.log('===========================');
  console.log('');

  if (options.role) {
    console.log(`Calculating budget for role: ${options.role}`);
  } else if (options.all) {
    console.log('Calculating budget for all roles');
  } else {
    console.log('Error: --role or --all is required');
    return;
  }

  console.log('');
  console.log('Note: Budget calculation requires GraphStore implementation.');
  console.log('');
  console.log('Example output format:');
  console.log('');
  console.log('Budget Report for: backend-team');
  console.log('================================');
  console.log('');
  console.log('Total Budget:       100.00');
  console.log('Used Budget:         67.50');
  console.log('Remaining Budget:    32.50');
  console.log('Utilization Rate:    67.5%');
  console.log('Status:              WARNING');
  console.log('');
  console.log('Cross-Role Edges:    15');
  console.log('Contract Touches:     8');
  console.log('');
  console.log('Cost Breakdown:');
  console.log('  Edge Cost:         45.20');
  console.log('  Contract Cost:     22.30');
  console.log('  Risk Multiplier:    1.1x');
  console.log('');
  console.log('Recommendations:');
  console.log('  - Review cross-role dependencies and consider refactoring');
  console.log('');

  if (options.export === 'json') {
    const output = options.output || 'budget.json';
    console.log(`Would export JSON to ${output}`);
  }
}

// ============================================================================
// KPI Command
// ============================================================================

interface KPIOptions {
  role?: string;
  all?: boolean;
  window?: string;
  export?: 'prometheus' | 'jsonl' | 'snapshot';
  output?: string;
  triggers?: boolean;
}

function parseWindow(windowStr: string): number {
  const match = windowStr.match(/^(\d+)([dhms])$/);
  if (!match) {
    return 24 * 60 * 60 * 1000; // Default 1 day
  }
  const [, value, unit] = match;
  const num = parseInt(value, 10);
  switch (unit) {
    case 'd': return num * 24 * 60 * 60 * 1000;
    case 'h': return num * 60 * 60 * 1000;
    case 'm': return num * 60 * 1000;
    case 's': return num * 1000;
    default: return 24 * 60 * 60 * 1000;
  }
}

export async function kpiCommand(options: KPIOptions): Promise<void> {
  console.log('Role KPI Dashboard');
  console.log('==================');
  console.log('');

  const windowMs = options.window ? parseWindow(options.window) : 24 * 60 * 60 * 1000;

  if (options.triggers) {
    console.log('KPI Trigger Evaluation');
    console.log('----------------------');
    console.log('');
    console.log('Evaluating KPI-based action triggers...');
    console.log('');
    console.log('Example triggers:');
    console.log('');
    console.log('[HIGH] backend-team: Queue pressure 1.35 > 1.2 → Suggest Split');
    console.log('[HIGH] frontend-team: Drift index 0.42 > 0.35 → Suggest Reassign');
    console.log('[MED]  api-team: Conflict rate 0.18 > 0.15 → Alert: Tighten ownership');
    console.log('');
    return;
  }

  if (options.role) {
    console.log(`Calculating KPI for role: ${options.role}`);
    console.log(`Window: ${options.window || '1d'}`);
  } else if (options.all) {
    console.log('Calculating KPI for all roles');
  } else {
    console.log('Error: --role or --all is required (use --triggers for trigger evaluation)');
    return;
  }

  console.log('');
  console.log('Note: KPI calculation requires RoleStore implementation.');
  console.log('');
  console.log('Example output format:');
  console.log('');
  console.log('KPI Report for: backend-team');
  console.log('============================');
  console.log('');
  console.log('Throughput:       5.2 tasks/hour');
  console.log('Failure Rate:    12.5%');
  console.log('Rework Rate:     18.3%');
  console.log('Queue Pressure:   1.15 (queue_len / max)');
  console.log('Conflict Rate:    8.2%');
  console.log('Drift Index:      0.28');
  console.log('');
  console.log('Health Score:     72/100');
  console.log('Trend:            stable');
  console.log('');
  console.log('Export Formats:');
  console.log('  --export=prometheus  : Prometheus metrics format');
  console.log('  --export=jsonl       : JSONL time series');
  console.log('  --export=snapshot    : JSON snapshot');
  console.log('');

  if (options.export) {
    const output = options.output || `kpi.${options.export === 'prometheus' ? 'txt' : 'json'}`;
    console.log(`Would export ${options.export} to ${output}`);
  }
}

// ============================================================================
// Main CLI Entry Point
// ============================================================================

export async function main(args: string[]): Promise<void> {
  const command = args[0];
  const subcommand = args[1];

  if (!command) {
    printHelp();
    return;
  }

  switch (command) {
    case 'budget':
      await budgetCommand(parseBudgetOptions(args.slice(1)));
      break;

    case 'kpi':
      await kpiCommand(parseKPIOptions(args.slice(1)));
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

function parseBudgetOptions(args: string[]): BudgetOptions {
  const options: BudgetOptions = {};

  for (const arg of args) {
    if (arg.startsWith('--role=')) {
      options.role = arg.split('=')[1];
    } else if (arg === '--all') {
      options.all = true;
    } else if (arg.startsWith('--export=')) {
      options.export = arg.split('=')[1] as any;
    } else if (arg.startsWith('--output=')) {
      options.output = arg.split('=')[1];
    } else if (arg === '--compare') {
      options.compare = true;
    }
  }

  return options;
}

function parseKPIOptions(args: string[]): KPIOptions {
  const options: KPIOptions = {};

  for (const arg of args) {
    if (arg.startsWith('--role=')) {
      options.role = arg.split('=')[1];
    } else if (arg === '--all') {
      options.all = true;
    } else if (arg.startsWith('--window=')) {
      options.window = arg.split('=')[1];
    } else if (arg.startsWith('--export=')) {
      options.export = arg.split('=')[1] as any;
    } else if (arg.startsWith('--output=')) {
      options.output = arg.split('=')[1];
    } else if (arg === '--triggers') {
      options.triggers = true;
    }
  }

  return options;
}

// ============================================================================
// Help
// ============================================================================

function printHelp(): void {
  console.log(`
ASF V4.0 Role Engine CLI

Usage: openclaw role <command> [options]

Commands:
  budget      Calculate interface budget for roles
  kpi         Calculate and export role KPIs

Options:
  budget:
    --role=<id>           Calculate for specific role
    --all                 Calculate for all roles
    --export=<format>     Export format: json, yaml, prometheus
    --output=<path>       Output file path
    --compare             Compare with average across roles

  kpi:
    --role=<id>           Calculate for specific role
    --all                 Calculate for all roles
    --window=<duration>   Time window: 30m, 2h, 1d, 7d. Default: 1d
    --export=<format>     Export format: prometheus, jsonl, snapshot
    --output=<path>       Output file path
    --triggers            Evaluate KPI→action triggers

Examples:
  openclaw role budget --role=backend-team --export=json
  openclaw role budget --all --compare
  openclaw role kpi --role=backend-team --window=1d --export=prometheus
  openclaw role kpi --all --export=snapshot
  openclaw role kpi --triggers
`);
}

// Run CLI if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  main(process.argv.slice(2)).catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  });
}
