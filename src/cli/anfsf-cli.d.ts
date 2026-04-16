/**
 * ANFSF V4 Layer 8.5 - CLI Implementation
 *
 * Command-line interface for ANFSF governance operations.
 * Commands: synthesize, preview, verify, role rebalance, ui gen, skill load, harness test, mcp inspect
 */
import { ChangeEvent } from '../core/graph/types';
interface CLIOptions {
    dryRun?: boolean;
    kAuto?: boolean;
    output?: 'table' | 'json';
    verbose?: boolean;
}
interface CommandResult {
    success: boolean;
    data?: any;
    error?: string;
    changeEvent?: ChangeEvent;
}
/**
 * Synthesize command - Trigger role synthesis and architecture generation
 */
export declare function synthesizeCommand(options: CLIOptions & {
    projectId?: string;
    k?: number;
}): Promise<CommandResult>;
/**
 * Preview command - Preview architecture changes
 */
export declare function previewCommand(options: CLIOptions & {
    changeId?: string;
}): Promise<CommandResult>;
/**
 * Verify command - Verify architecture consistency
 */
export declare function verifyCommand(options: CLIOptions & {
    projectId?: string;
}): Promise<CommandResult>;
/**
 * Role rebalance command - Rebalance role assignments
 */
export declare function roleRebalanceCommand(options: CLIOptions & {
    projectId?: string;
    algorithm?: string;
}): Promise<CommandResult>;
/**
 * UI gen command - Generate UI prototype
 */
export declare function uiGenCommand(options: CLIOptions & {
    prdId?: string;
    framework?: string;
}): Promise<CommandResult>;
/**
 * Skill load command - Load a skill
 */
export declare function skillLoadCommand(options: CLIOptions & {
    skillName: string;
    version?: string;
}): Promise<CommandResult>;
/**
 * Harness test command - Run tests
 */
export declare function harnessTestCommand(options: CLIOptions & {
    scenarioId?: string;
    testName?: string;
}): Promise<CommandResult>;
/**
 * MCP inspect command - Inspect MCP messages
 */
export declare function mcpInspectCommand(options: CLIOptions & {
    traceId?: string;
    limit?: number;
}): Promise<CommandResult>;
export interface CLIArgs {
    command: string;
    subcommand?: string;
    options: CLIOptions & Record<string, any>;
}
/**
 * Main CLI entry point
 */
export declare function runCLI(args: CLIArgs): Promise<number>;
/**
 * Print help message
 */
export declare function printHelp(): void;
declare const _default: {
    runCLI: typeof runCLI;
    printHelp: typeof printHelp;
    synthesizeCommand: typeof synthesizeCommand;
    previewCommand: typeof previewCommand;
    verifyCommand: typeof verifyCommand;
    roleRebalanceCommand: typeof roleRebalanceCommand;
    uiGenCommand: typeof uiGenCommand;
    skillLoadCommand: typeof skillLoadCommand;
    harnessTestCommand: typeof harnessTestCommand;
    mcpInspectCommand: typeof mcpInspectCommand;
};
export default _default;
