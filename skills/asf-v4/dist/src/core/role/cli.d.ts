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
interface BudgetOptions {
    role?: string;
    all?: boolean;
    export?: 'json' | 'yaml' | 'prometheus';
    output?: string;
    compare?: boolean;
}
export declare function budgetCommand(options: BudgetOptions): Promise<void>;
interface KPIOptions {
    role?: string;
    all?: boolean;
    window?: string;
    export?: 'prometheus' | 'jsonl' | 'snapshot';
    output?: string;
    triggers?: boolean;
}
export declare function kpiCommand(options: KPIOptions): Promise<void>;
export declare function main(args: string[]): Promise<void>;
export {};
