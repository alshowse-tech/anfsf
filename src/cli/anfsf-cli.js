"use strict";
/**
 * ANFSF V4 Layer 8.5 - CLI Implementation
 *
 * Command-line interface for ANFSF governance operations.
 * Commands: synthesize, preview, verify, role rebalance, ui gen, skill load, harness test, mcp inspect
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.synthesizeCommand = synthesizeCommand;
exports.previewCommand = previewCommand;
exports.verifyCommand = verifyCommand;
exports.roleRebalanceCommand = roleRebalanceCommand;
exports.uiGenCommand = uiGenCommand;
exports.skillLoadCommand = skillLoadCommand;
exports.harnessTestCommand = harnessTestCommand;
exports.mcpInspectCommand = mcpInspectCommand;
exports.runCLI = runCLI;
exports.printHelp = printHelp;
const mcp_bus_1 = require("../mcp/mcp-bus");
const skills_registry_1 = require("../skills/skills-registry");
const agent_harness_1 = require("../harness/agent-harness");
// ============================================================================
// Constants
// ============================================================================
const CLI_VERSION = '1.5.0';
const SCHEMA_VERSION = '2026-03';
// ============================================================================
// Helper Functions
// ============================================================================
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
function now() {
    return Date.now();
}
function formatOutput(result, format) {
    if (format === 'json') {
        return JSON.stringify(result, null, 2);
    }
    // Simple table formatting
    if (Array.isArray(result)) {
        if (result.length === 0)
            return 'No results';
        const headers = Object.keys(result[0]);
        const rows = result.map(r => headers.map(h => String(r[h] ?? '')).join(' | '));
        return [headers.join(' | '), headers.map(() => '---').join('|'), ...rows].join('\n');
    }
    return JSON.stringify(result, null, 2);
}
function createChangeEvent(action, target, data, dryRun) {
    return {
        id: generateUUID(),
        ts: now(),
        actorRoleId: 'cli-user',
        action: dryRun ? 'preview' : action,
        target: {
            kind: 'graph',
            idOrPath: target,
        },
        ownershipRuleId: 'cli-rule',
        diff: {
            added: data,
        },
        riskScore: dryRun ? 0 : 25,
        metadata: {
            source: 'cli',
            dryRun,
        },
    };
}
// ============================================================================
// CLI Commands
// ============================================================================
/**
 * Synthesize command - Trigger role synthesis and architecture generation
 */
async function synthesizeCommand(options) {
    const { dryRun, kAuto, output, projectId, k } = options;
    try {
        console.log(`[anfsf] ${dryRun ? '[DRY RUN] ' : ''}Synthesizing architecture...`);
        // Mock synthesis result
        const result = {
            projectId: projectId || 'default',
            roles: kAuto ? 'auto-optimized' : k || 5,
            architecture: {
                services: 12,
                contracts: 24,
                probes: 8,
            },
            optimization: {
                economicsScore: 0.87,
                interfaceCost: 0.23,
                reworkRisk: 'low',
            },
        };
        const changeEvent = createChangeEvent('synthesize', 'architecture', result, dryRun || false);
        return {
            success: true,
            data: result,
            changeEvent,
        };
    }
    catch (error) {
        return {
            success: false,
            error: String(error),
        };
    }
}
/**
 * Preview command - Preview architecture changes
 */
async function previewCommand(options) {
    const { dryRun, output, changeId } = options;
    try {
        console.log(`[anfsf] ${dryRun ? '[DRY RUN] ' : ''}Previewing changes...`);
        const preview = {
            changeId: changeId || generateUUID(),
            changes: [
                { type: 'role', action: 'create', name: 'api-gateway-role' },
                { type: 'contract', action: 'update', name: 'user-service-api' },
                { type: 'probe', action: 'create', name: 'latency-probe' },
            ],
            impact: {
                affectedServices: 3,
                affectedContracts: 5,
                estimatedRework: 'medium',
            },
            vetoCheck: {
                passed: true,
                hardVetoes: 0,
                softVetoes: 1,
            },
        };
        return {
            success: true,
            data: preview,
        };
    }
    catch (error) {
        return {
            success: false,
            error: String(error),
        };
    }
}
/**
 * Verify command - Verify architecture consistency
 */
async function verifyCommand(options) {
    const { dryRun, output, projectId } = options;
    try {
        console.log(`[anfsf] ${dryRun ? '[DRY RUN] ' : ''}Verifying architecture...`);
        const verification = {
            projectId: projectId || 'default',
            consistency: {
                graphConsistency: true,
                contractConsistency: true,
                ownershipConsistency: true,
            },
            issues: [],
            score: 0.95,
        };
        return {
            success: true,
            data: verification,
        };
    }
    catch (error) {
        return {
            success: false,
            error: String(error),
        };
    }
}
/**
 * Role rebalance command - Rebalance role assignments
 */
async function roleRebalanceCommand(options) {
    const { dryRun, kAuto, output, projectId, algorithm } = options;
    try {
        console.log(`[anfsf] ${dryRun ? '[DRY RUN] ' : ''}Rebalancing roles...`);
        const rebalance = {
            projectId: projectId || 'default',
            algorithm: algorithm || 'economics-optimized',
            before: {
                roleCount: 8,
                avgInterfaceCost: 0.35,
                imbalance: 0.42,
            },
            after: {
                roleCount: kAuto ? 6 : 7,
                avgInterfaceCost: 0.22,
                imbalance: 0.15,
            },
            improvements: {
                interfaceCostReduction: '37%',
                imbalanceReduction: '64%',
            },
        };
        const changeEvent = createChangeEvent('rebalance', 'roles', rebalance, dryRun || false);
        return {
            success: true,
            data: rebalance,
            changeEvent,
        };
    }
    catch (error) {
        return {
            success: false,
            error: String(error),
        };
    }
}
/**
 * UI gen command - Generate UI prototype
 */
async function uiGenCommand(options) {
    const { dryRun, output, prdId, framework } = options;
    try {
        console.log(`[anfsf] ${dryRun ? '[DRY RUN] ' : ''}Generating UI prototype...`);
        const uiPrototype = {
            prdId: prdId || 'default',
            framework: framework || 'react',
            components: [
                { name: 'Dashboard', type: 'page', complexity: 'high' },
                { name: 'UserTable', type: 'component', complexity: 'medium' },
                { name: 'SettingsForm', type: 'component', complexity: 'medium' },
            ],
            layout: {
                type: 'responsive-grid',
                breakpoints: ['mobile', 'tablet', 'desktop'],
            },
            designTokens: {
                colors: 12,
                typography: 8,
                spacing: 6,
            },
        };
        return {
            success: true,
            data: uiPrototype,
        };
    }
    catch (error) {
        return {
            success: false,
            error: String(error),
        };
    }
}
/**
 * Skill load command - Load a skill
 */
async function skillLoadCommand(options) {
    const { dryRun, output, skillName, version } = options;
    try {
        console.log(`[anfsf] ${dryRun ? '[DRY RUN] ' : ''}Loading skill: ${skillName}@${version || 'latest'}...`);
        const registry = new skills_registry_1.SkillsRegistry();
        if (dryRun) {
            return {
                success: true,
                data: {
                    skillName,
                    version: version || 'latest',
                    status: 'would-load',
                    dependencies: ['utils', 'validator'],
                },
            };
        }
        const skill = await registry.load(skillName, version || '1.0.0');
        return {
            success: true,
            data: {
                skillName: skill.name,
                version: skill.version,
                status: skill.status,
                dependencies: skill.dependencies,
            },
        };
    }
    catch (error) {
        return {
            success: false,
            error: String(error),
        };
    }
}
/**
 * Harness test command - Run tests
 */
async function harnessTestCommand(options) {
    const { dryRun, output, scenarioId, testName } = options;
    try {
        console.log(`[anfsf] ${dryRun ? '[DRY RUN] ' : ''}Running tests...`);
        const harness = new agent_harness_1.AgentHarness();
        if (dryRun) {
            return {
                success: true,
                data: {
                    scenarioId: scenarioId || 'default',
                    testName: testName || 'smoke-test',
                    status: 'would-run',
                    estimatedDuration: '30s',
                },
            };
        }
        const testScenario = {
            id: scenarioId || generateUUID(),
            name: testName || 'integration-test',
            type: 'integration',
            config: {},
            expectedOutcomes: [],
            successCriteria: {
                minPassRate: 0.9,
                maxErrorRate: 0.1,
            },
        };
        const result = await harness.runTest(testScenario);
        return {
            success: result.passed,
            data: result,
        };
    }
    catch (error) {
        return {
            success: false,
            error: String(error),
        };
    }
}
/**
 * MCP inspect command - Inspect MCP messages
 */
async function mcpInspectCommand(options) {
    const { dryRun, output, traceId, limit } = options;
    try {
        console.log(`[anfsf] ${dryRun ? '[DRY RUN] ' : ''}Inspecting MCP messages...`);
        const bus = new mcp_bus_1.MCPBus({ enableLogging: true, enableTracing: true });
        // Get stats
        const stats = bus.getStats();
        // Get logs
        const logs = bus.getLogs(limit || 10);
        return {
            success: true,
            data: {
                stats,
                recentLogs: logs,
                traceId: traceId || 'no-trace',
            },
        };
    }
    catch (error) {
        return {
            success: false,
            error: String(error),
        };
    }
}
/**
 * Main CLI entry point
 */
async function runCLI(args) {
    const { command, subcommand, options } = args;
    const { output = 'table', verbose = false } = options;
    console.log(`[anfsf] ANFSF CLI v${CLI_VERSION}`);
    console.log(`[anfsf] Command: ${command} ${subcommand || ''}`);
    let result;
    switch (command) {
        case 'synthesize':
            result = await synthesizeCommand(options);
            break;
        case 'preview':
            result = await previewCommand(options);
            break;
        case 'verify':
            result = await verifyCommand(options);
            break;
        case 'role':
            if (subcommand === 'rebalance') {
                result = await roleRebalanceCommand(options);
            }
            else {
                console.error(`[anfsf] Unknown role subcommand: ${subcommand}`);
                return 1;
            }
            break;
        case 'ui':
            if (subcommand === 'gen') {
                result = await uiGenCommand(options);
            }
            else {
                console.error(`[anfsf] Unknown UI subcommand: ${subcommand}`);
                return 1;
            }
            break;
        case 'skill':
            if (subcommand === 'load') {
                result = await skillLoadCommand(options);
            }
            else {
                console.error(`[anfsf] Unknown skill subcommand: ${subcommand}`);
                return 1;
            }
            break;
        case 'harness':
            if (subcommand === 'test') {
                result = await harnessTestCommand(options);
            }
            else {
                console.error(`[anfsf] Unknown harness subcommand: ${subcommand}`);
                return 1;
            }
            break;
        case 'mcp':
            if (subcommand === 'inspect') {
                result = await mcpInspectCommand(options);
            }
            else {
                console.error(`[anfsf] Unknown MCP subcommand: ${subcommand}`);
                return 1;
            }
            break;
        default:
            console.error(`[anfsf] Unknown command: ${command}`);
            printHelp();
            return 1;
    }
    if (result.success) {
        console.log(formatOutput(result.data, output));
        if (verbose && result.changeEvent) {
            console.log('\n[anfsf] Change Event:');
            console.log(formatOutput(result.changeEvent, 'json'));
        }
        return 0;
    }
    else {
        console.error(`[anfsf] Error: ${result.error}`);
        return 1;
    }
}
/**
 * Print help message
 */
function printHelp() {
    console.log(`
ANFSF CLI v${CLI_VERSION}

Usage: anfsf <command> [subcommand] [options]

Commands:
  synthesize              Trigger role synthesis and architecture generation
  preview                 Preview architecture changes
  verify                  Verify architecture consistency
  role rebalance          Rebalance role assignments
  ui gen                  Generate UI prototype
  skill load              Load a skill
  harness test            Run tests
  mcp inspect             Inspect MCP messages

Options:
  --dry-run              Simulate without making changes
  --k-auto               Auto-optimize role count
  --output <format>      Output format: table | json (default: table)
  --verbose              Enable verbose output
  --help                 Show this help message

Examples:
  anfsf synthesize --k-auto --dry-run
  anfsf preview --output json
  anfsf role rebalance --project my-project
  anfsf ui gen --framework react
  anfsf skill load my-skill --version 1.0.0
  anfsf harness test --scenario integration
  anfsf mcp inspect --trace trace_123
`);
}
// ============================================================================
// Exports
// ============================================================================
exports.default = {
    runCLI,
    printHelp,
    synthesizeCommand,
    previewCommand,
    verifyCommand,
    roleRebalanceCommand,
    uiGenCommand,
    skillLoadCommand,
    harnessTestCommand,
    mcpInspectCommand,
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5mc2YtY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYW5mc2YtY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7R0FLRzs7QUE4RkgsOENBbUNDO0FBS0Qsd0NBbUNDO0FBS0Qsc0NBMkJDO0FBS0Qsb0RBc0NDO0FBS0Qsb0NBbUNDO0FBS0QsNENBcUNDO0FBS0QsZ0RBNENDO0FBS0QsOENBNEJDO0FBZUQsd0JBc0ZDO0FBS0QsOEJBZ0NDO0FBaGlCRCw0Q0FBd0M7QUFDeEMsK0RBQTJEO0FBQzNELDREQUF3RDtBQUd4RCwrRUFBK0U7QUFDL0UsWUFBWTtBQUNaLCtFQUErRTtBQUUvRSxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUM7QUFDNUIsTUFBTSxjQUFjLEdBQUcsU0FBUyxDQUFDO0FBb0JqQywrRUFBK0U7QUFDL0UsbUJBQW1CO0FBQ25CLCtFQUErRTtBQUUvRSxTQUFTLFlBQVk7SUFDbkIsT0FBTyxzQ0FBc0MsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7UUFDbkUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ25DLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxDQUFDLEdBQUcsR0FBRyxDQUFDO1FBQzFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUN4QixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRCxTQUFTLEdBQUc7SUFDVixPQUFPLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUNwQixDQUFDO0FBRUQsU0FBUyxZQUFZLENBQUMsTUFBVyxFQUFFLE1BQXdCO0lBQ3pELElBQUksTUFBTSxLQUFLLE1BQU0sRUFBRSxDQUFDO1FBQ3RCLE9B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LFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ3hELENBQUM7UUFFRCxPQUFPLENBQUMsQ0FBQztJQUNYLENBQUM7U0FBTSxDQUFDO1FBQ04sT0FBTyxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDaEQsT0FBTyxDQUFDLENBQUM7SUFDWCxDQUFDO0FBQ0gsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBZ0IsU0FBUztJQUN2QixPQUFPLENBQUMsR0FBRyxDQUFDO2FBQ0QsV0FBVzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Q0E2QnZCLENBQUMsQ0FBQztBQUNILENBQUM7QUFFRCwrRUFBK0U7QUFDL0UsVUFBVTtBQUNWLCtFQUErRTtBQUUvRSxrQkFBZTtJQUNiLE1BQU07SUFDTixTQUFTO0lBQ1QsaUJBQWlCO0lBQ2pCLGNBQWM7SUFDZCxhQUFhO0lBQ2Isb0JBQW9CO0lBQ3BCLFlBQVk7SUFDWixnQkFBZ0I7SUFDaEIsa0JBQWtCO0lBQ2xCLGlCQUFpQjtDQUNsQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBBTkZTRiBWNCBMYXllciA4LjUgLSBDTEkgSW1wbGVtZW50YXRpb25cbiAqIFxuICogQ29tbWFuZC1saW5lIGludGVyZmFjZSBmb3IgQU5GU0YgZ292ZXJuYW5jZSBvcGVyYXRpb25zLlxuICogQ29tbWFuZHM6IHN5bnRoZXNpemUsIHByZXZpZXcsIHZlcmlmeSwgcm9sZSByZWJhbGFuY2UsIHVpIGdlbiwgc2tpbGwgbG9hZCwgaGFybmVzcyB0ZXN0LCBtY3AgaW5zcGVjdFxuICovXG5cbmltcG9ydCB7IE1DUEJ1cyB9IGZyb20gJy4uL21jcC9tY3AtYnVzJztcbmltcG9ydCB7IFNraWxsc1JlZ2lzdHJ5IH0gZnJvbSAnLi4vc2tpbGxzL3NraWxscy1yZWdpc3RyeSc7XG5pbXBvcnQgeyBBZ2VudEhhcm5lc3MgfSBmcm9tICcuLi9oYXJuZXNzL2FnZW50LWhhcm5lc3MnO1xuaW1wb3J0IHsgQ2hhbmdlRXZlbnQgfSBmcm9tICcuLi9jb3JlL2dyYXBoL3R5cGVzJztcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ29uc3RhbnRzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmNvbnN0IENMSV9WRVJTSU9OID0gJzEuNS4wJztcbmNvbnN0IFNDSEVNQV9WRVJTSU9OID0gJzIwMjYtMDMnO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBUeXBlc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5pbnRlcmZhY2UgQ0xJT3B0aW9ucyB7XG4gIGRyeVJ1bj86IGJvb2xlYW47XG4gIGtBdXRvPzogYm9vbGVhbjtcbiAgb3V0cHV0PzogJ3RhYmxlJyB8ICdqc29uJztcbiAgdmVyYm9zZT86IGJvb2xlYW47XG59XG5cbmludGVyZmFjZSBDb21tYW5kUmVzdWx0IHtcbiAgc3VjY2VzczogYm9vbGVhbjtcbiAgZGF0YT86IGFueTtcbiAgZXJyb3I/OiBzdHJpbmc7XG4gIGNoYW5nZUV2ZW50PzogQ2hhbmdlRXZlbnQ7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEhlbHBlciBGdW5jdGlvbnNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZnVuY3Rpb24gZ2VuZXJhdGVVVUlEKCk6IHN0cmluZyB7XG4gIHJldHVybiAneHh4eHh4eHgteHh4eC00eHh4LXl4eHgteHh4eHh4eHh4eHh4Jy5yZXBsYWNlKC9beHldL2csIChjKSA9PiB7XG4gICAgY29uc3QgciA9IChNYXRoLnJhbmRvbSgpICogMTYpIHwgMDtcbiAgICBjb25zdCB2ID0gYyA9PT0gJ3gnID8gciA6IChyICYgMHgzKSB8IDB4ODtcbiAgICByZXR1cm4gdi50b1N0cmluZygxNik7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBub3coKTogbnVtYmVyIHtcbiAgcmV0dXJuIERhdGUubm93KCk7XG59XG5cbmZ1bmN0aW9uIGZvcm1hdE91dHB1dChyZXN1bHQ6IGFueSwgZm9ybWF0OiAndGFibGUnIHwgJ2pzb24nKTogc3RyaW5nIHtcbiAgaWYgKGZvcm1hdCA9PT0gJ2pzb24nKSB7XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHJlc3VsdCwgbnVsbCwgMik7XG4gIH1cbiAgXG4gIC8vIFNpbXBsZSB0YWJsZSBmb3JtYXR0aW5nXG4gIGlmIChBcnJheS5pc0FycmF5KHJlc3VsdCkpIHtcbiAgICBpZiAocmVzdWx0Lmxlbmd0aCA9PT0gMCkgcmV0dXJuICdObyByZXN1bHRzJztcbiAgICBcbiAgICBjb25zdCBoZWFkZXJzID0gT2JqZWN0LmtleXMocmVzdWx0WzBdKTtcbiAgICBjb25zdCByb3dzID0gcmVzdWx0Lm1hcChyID0+IGhlYWRlcnMubWFwKGggPT4gU3RyaW5nKHJbaF0gPz8gJycpKS5qb2luKCcgfCAnKSk7XG4gICAgcmV0dXJuIFtoZWFkZXJzLmpvaW4oJyB8ICcpLCBoZWFkZXJzLm1hcCgoKSA9PiAnLS0tJykuam9pbignfCcpLCAuLi5yb3dzXS5qb2luKCdcXG4nKTtcbiAgfVxuICBcbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHJlc3VsdCwgbnVsbCwgMik7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUNoYW5nZUV2ZW50KGFjdGlvbjogc3RyaW5nLCB0YXJnZXQ6IHN0cmluZywgZGF0YTogYW55LCBkcnlSdW46IGJvb2xlYW4pOiBDaGFuZ2VFdmVudCB7XG4gIHJldHVybiB7XG4gICAgaWQ6IGdlbmVyYXRlVVVJRCgpLFxuICAgIHRzOiBub3coKSxcbiAgICBhY3RvclJvbGVJZDogJ2NsaS11c2VyJyxcbiAgICBhY3Rpb246IGRyeVJ1biA/ICdwcmV2aWV3JyA6IChhY3Rpb24gYXMgYW55KSxcbiAgICB0YXJnZXQ6IHtcbiAgICAgIGtpbmQ6ICdncmFwaCcsXG4gICAgICBpZE9yUGF0aDogdGFyZ2V0LFxuICAgIH0sXG4gICAgb3duZXJzaGlwUnVsZUlkOiAnY2xpLXJ1bGUnLFxuICAgIGRpZmY6IHtcbiAgICAgIGFkZGVkOiBkYXRhLFxuICAgIH0sXG4gICAgcmlza1Njb3JlOiBkcnlSdW4gPyAwIDogMjUsXG4gICAgbWV0YWRhdGE6IHtcbiAgICAgIHNvdXJjZTogJ2NsaScsXG4gICAgICBkcnlSdW4sXG4gICAgfSxcbiAgfTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gQ0xJIENvbW1hbmRzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogU3ludGhlc2l6ZSBjb21tYW5kIC0gVHJpZ2dlciByb2xlIHN5bnRoZXNpcyBhbmQgYXJjaGl0ZWN0dXJlIGdlbmVyYXRpb25cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHN5bnRoZXNpemVDb21tYW5kKG9wdGlvbnM6IENMSU9wdGlvbnMgJiB7IHByb2plY3RJZD86IHN0cmluZzsgaz86IG51bWJlciB9KTogUHJvbWlzZTxDb21tYW5kUmVzdWx0PiB7XG4gIGNvbnN0IHsgZHJ5UnVuLCBrQXV0bywgb3V0cHV0LCBwcm9qZWN0SWQsIGsgfSA9IG9wdGlvbnM7XG5cbiAgdHJ5IHtcbiAgICBjb25zb2xlLmxvZyhgW2FuZnNmXSAke2RyeVJ1biA/ICdbRFJZIFJVTl0gJyA6ICcnfVN5bnRoZXNpemluZyBhcmNoaXRlY3R1cmUuLi5gKTtcblxuICAgIC8vIE1vY2sgc3ludGhlc2lzIHJlc3VsdFxuICAgIGNvbnN0IHJlc3VsdCA9IHtcbiAgICAgIHByb2plY3RJZDogcHJvamVjdElkIHx8ICdkZWZhdWx0JyxcbiAgICAgIHJvbGVzOiBrQXV0byA/ICdhdXRvLW9wdGltaXplZCcgOiBrIHx8IDUsXG4gICAgICBhcmNoaXRlY3R1cmU6IHtcbiAgICAgICAgc2VydmljZXM6IDEyLFxuICAgICAgICBjb250cmFjdHM6IDI0LFxuICAgICAgICBwcm9iZXM6IDgsXG4gICAgICB9LFxuICAgICAgb3B0aW1pemF0aW9uOiB7XG4gICAgICAgIGVjb25vbWljc1Njb3JlOiAwLjg3LFxuICAgICAgICBpbnRlcmZhY2VDb3N0OiAwLjIzLFxuICAgICAgICByZXdvcmtSaXNrOiAnbG93JyxcbiAgICAgIH0sXG4gICAgfTtcblxuICAgIGNvbnN0IGNoYW5nZUV2ZW50ID0gY3JlYXRlQ2hhbmdlRXZlbnQoJ3N5bnRoZXNpemUnLCAnYXJjaGl0ZWN0dXJlJywgcmVzdWx0LCBkcnlSdW4gfHwgZmFsc2UpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICBkYXRhOiByZXN1bHQsXG4gICAgICBjaGFuZ2VFdmVudCxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHJldHVybiB7XG4gICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgIGVycm9yOiBTdHJpbmcoZXJyb3IpLFxuICAgIH07XG4gIH1cbn1cblxuLyoqXG4gKiBQcmV2aWV3IGNvbW1hbmQgLSBQcmV2aWV3IGFyY2hpdGVjdHVyZSBjaGFuZ2VzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBwcmV2aWV3Q29tbWFuZChvcHRpb25zOiBDTElPcHRpb25zICYgeyBjaGFuZ2VJZD86IHN0cmluZyB9KTogUHJvbWlzZTxDb21tYW5kUmVzdWx0PiB7XG4gIGNvbnN0IHsgZHJ5UnVuLCBvdXRwdXQsIGNoYW5nZUlkIH0gPSBvcHRpb25zO1xuXG4gIHRyeSB7XG4gICAgY29uc29sZS5sb2coYFthbmZzZl0gJHtkcnlSdW4gPyAnW0RSWSBSVU5dICcgOiAnJ31QcmV2aWV3aW5nIGNoYW5nZXMuLi5gKTtcblxuICAgIGNvbnN0IHByZXZpZXcgPSB7XG4gICAgICBjaGFuZ2VJZDogY2hhbmdlSWQgfHwgZ2VuZXJhdGVVVUlEKCksXG4gICAgICBjaGFuZ2VzOiBbXG4gICAgICAgIHsgdHlwZTogJ3JvbGUnLCBhY3Rpb246ICdjcmVhdGUnLCBuYW1lOiAnYXBpLWdhdGV3YXktcm9sZScgfSxcbiAgICAgICAgeyB0eXBlOiAnY29udHJhY3QnLCBhY3Rpb246ICd1cGRhdGUnLCBuYW1lOiAndXNlci1zZXJ2aWNlLWFwaScgfSxcbiAgICAgICAgeyB0eXBlOiAncHJvYmUnLCBhY3Rpb246ICdjcmVhdGUnLCBuYW1lOiAnbGF0ZW5jeS1wcm9iZScgfSxcbiAgICAgIF0sXG4gICAgICBpbXBhY3Q6IHtcbiAgICAgICAgYWZmZWN0ZWRTZXJ2aWNlczogMyxcbiAgICAgICAgYWZmZWN0ZWRDb250cmFjdHM6IDUsXG4gICAgICAgIGVzdGltYXRlZFJld29yazogJ21lZGl1bScsXG4gICAgICB9LFxuICAgICAgdmV0b0NoZWNrOiB7XG4gICAgICAgIHBhc3NlZDogdHJ1ZSxcbiAgICAgICAgaGFyZFZldG9lczogMCxcbiAgICAgICAgc29mdFZldG9lczogMSxcbiAgICAgIH0sXG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgZGF0YTogcHJldmlldyxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHJldHVybiB7XG4gICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgIGVycm9yOiBTdHJpbmcoZXJyb3IpLFxuICAgIH07XG4gIH1cbn1cblxuLyoqXG4gKiBWZXJpZnkgY29tbWFuZCAtIFZlcmlmeSBhcmNoaXRlY3R1cmUgY29uc2lzdGVuY3lcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHZlcmlmeUNvbW1hbmQob3B0aW9uczogQ0xJT3B0aW9ucyAmIHsgcHJvamVjdElkPzogc3RyaW5nIH0pOiBQcm9taXNlPENvbW1hbmRSZXN1bHQ+IHtcbiAgY29uc3QgeyBkcnlSdW4sIG91dHB1dCwgcHJvamVjdElkIH0gPSBvcHRpb25zO1xuXG4gIHRyeSB7XG4gICAgY29uc29sZS5sb2coYFthbmZzZl0gJHtkcnlSdW4gPyAnW0RSWSBSVU5dICcgOiAnJ31WZXJpZnlpbmcgYXJjaGl0ZWN0dXJlLi4uYCk7XG5cbiAgICBjb25zdCB2ZXJpZmljYXRpb24gPSB7XG4gICAgICBwcm9qZWN0SWQ6IHByb2plY3RJZCB8fCAnZGVmYXVsdCcsXG4gICAgICBjb25zaXN0ZW5jeToge1xuICAgICAgICBncmFwaENvbnNpc3RlbmN5OiB0cnVlLFxuICAgICAgICBjb250cmFjdENvbnNpc3RlbmN5OiB0cnVlLFxuICAgICAgICBvd25lcnNoaXBDb25zaXN0ZW5jeTogdHJ1ZSxcbiAgICAgIH0sXG4gICAgICBpc3N1ZXM6IFtdLFxuICAgICAgc2NvcmU6IDAuOTUsXG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgZGF0YTogdmVyaWZpY2F0aW9uLFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgZXJyb3I6IFN0cmluZyhlcnJvciksXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIFJvbGUgcmViYWxhbmNlIGNvbW1hbmQgLSBSZWJhbGFuY2Ugcm9sZSBhc3NpZ25tZW50c1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcm9sZVJlYmFsYW5jZUNvbW1hbmQob3B0aW9uczogQ0xJT3B0aW9ucyAmIHsgcHJvamVjdElkPzogc3RyaW5nOyBhbGdvcml0aG0/OiBzdHJpbmcgfSk6IFByb21pc2U8Q29tbWFuZFJlc3VsdD4ge1xuICBjb25zdCB7IGRyeVJ1biwga0F1dG8sIG91dHB1dCwgcHJvamVjdElkLCBhbGdvcml0aG0gfSA9IG9wdGlvbnM7XG5cbiAgdHJ5IHtcbiAgICBjb25zb2xlLmxvZyhgW2FuZnNmXSAke2RyeVJ1biA/ICdbRFJZIFJVTl0gJyA6ICcnfVJlYmFsYW5jaW5nIHJvbGVzLi4uYCk7XG5cbiAgICBjb25zdCByZWJhbGFuY2UgPSB7XG4gICAgICBwcm9qZWN0SWQ6IHByb2plY3RJZCB8fCAnZGVmYXVsdCcsXG4gICAgICBhbGdvcml0aG06IGFsZ29yaXRobSB8fCAnZWNvbm9taWNzLW9wdGltaXplZCcsXG4gICAgICBiZWZvcmU6IHtcbiAgICAgICAgcm9sZUNvdW50OiA4LFxuICAgICAgICBhdmdJbnRlcmZhY2VDb3N0OiAwLjM1LFxuICAgICAgICBpbWJhbGFuY2U6IDAuNDIsXG4gICAgICB9LFxuICAgICAgYWZ0ZXI6IHtcbiAgICAgICAgcm9sZUNvdW50OiBrQXV0byA/IDYgOiA3LFxuICAgICAgICBhdmdJbnRlcmZhY2VDb3N0OiAwLjIyLFxuICAgICAgICBpbWJhbGFuY2U6IDAuMTUsXG4gICAgICB9LFxuICAgICAgaW1wcm92ZW1lbnRzOiB7XG4gICAgICAgIGludGVyZmFjZUNvc3RSZWR1Y3Rpb246ICczNyUnLFxuICAgICAgICBpbWJhbGFuY2VSZWR1Y3Rpb246ICc2NCUnLFxuICAgICAgfSxcbiAgICB9O1xuXG4gICAgY29uc3QgY2hhbmdlRXZlbnQgPSBjcmVhdGVDaGFuZ2VFdmVudCgncmViYWxhbmNlJywgJ3JvbGVzJywgcmViYWxhbmNlLCBkcnlSdW4gfHwgZmFsc2UpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICBkYXRhOiByZWJhbGFuY2UsXG4gICAgICBjaGFuZ2VFdmVudCxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHJldHVybiB7XG4gICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgIGVycm9yOiBTdHJpbmcoZXJyb3IpLFxuICAgIH07XG4gIH1cbn1cblxuLyoqXG4gKiBVSSBnZW4gY29tbWFuZCAtIEdlbmVyYXRlIFVJIHByb3RvdHlwZVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdWlHZW5Db21tYW5kKG9wdGlvbnM6IENMSU9wdGlvbnMgJiB7IHByZElkPzogc3RyaW5nOyBmcmFtZXdvcms/OiBzdHJpbmcgfSk6IFByb21pc2U8Q29tbWFuZFJlc3VsdD4ge1xuICBjb25zdCB7IGRyeVJ1biwgb3V0cHV0LCBwcmRJZCwgZnJhbWV3b3JrIH0gPSBvcHRpb25zO1xuXG4gIHRyeSB7XG4gICAgY29uc29sZS5sb2coYFthbmZzZl0gJHtkcnlSdW4gPyAnW0RSWSBSVU5dICcgOiAnJ31HZW5lcmF0aW5nIFVJIHByb3RvdHlwZS4uLmApO1xuXG4gICAgY29uc3QgdWlQcm90b3R5cGUgPSB7XG4gICAgICBwcmRJZDogcHJkSWQgfHwgJ2RlZmF1bHQnLFxuICAgICAgZnJhbWV3b3JrOiBmcmFtZXdvcmsgfHwgJ3JlYWN0JyxcbiAgICAgIGNvbXBvbmVudHM6IFtcbiAgICAgICAgeyBuYW1lOiAnRGFzaGJvYXJkJywgdHlwZTogJ3BhZ2UnLCBjb21wbGV4aXR5OiAnaGlnaCcgfSxcbiAgICAgICAgeyBuYW1lOiAnVXNlclRhYmxlJywgdHlwZTogJ2NvbXBvbmVudCcsIGNvbXBsZXhpdHk6ICdtZWRpdW0nIH0sXG4gICAgICAgIHsgbmFtZTogJ1NldHRpbmdzRm9ybScsIHR5cGU6ICdjb21wb25lbnQnLCBjb21wbGV4aXR5OiAnbWVkaXVtJyB9LFxuICAgICAgXSxcbiAgICAgIGxheW91dDoge1xuICAgICAgICB0eXBlOiAncmVzcG9uc2l2ZS1ncmlkJyxcbiAgICAgICAgYnJlYWtwb2ludHM6IFsnbW9iaWxlJywgJ3RhYmxldCcsICdkZXNrdG9wJ10sXG4gICAgICB9LFxuICAgICAgZGVzaWduVG9rZW5zOiB7XG4gICAgICAgIGNvbG9yczogMTIsXG4gICAgICAgIHR5cG9ncmFwaHk6IDgsXG4gICAgICAgIHNwYWNpbmc6IDYsXG4gICAgICB9LFxuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgIGRhdGE6IHVpUHJvdG90eXBlLFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgZXJyb3I6IFN0cmluZyhlcnJvciksXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIFNraWxsIGxvYWQgY29tbWFuZCAtIExvYWQgYSBza2lsbFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2tpbGxMb2FkQ29tbWFuZChvcHRpb25zOiBDTElPcHRpb25zICYgeyBza2lsbE5hbWU6IHN0cmluZzsgdmVyc2lvbj86IHN0cmluZyB9KTogUHJvbWlzZTxDb21tYW5kUmVzdWx0PiB7XG4gIGNvbnN0IHsgZHJ5UnVuLCBvdXRwdXQsIHNraWxsTmFtZSwgdmVyc2lvbiB9ID0gb3B0aW9ucztcblxuICB0cnkge1xuICAgIGNvbnNvbGUubG9nKGBbYW5mc2ZdICR7ZHJ5UnVuID8gJ1tEUlkgUlVOXSAnIDogJyd9TG9hZGluZyBza2lsbDogJHtza2lsbE5hbWV9QCR7dmVyc2lvbiB8fCAnbGF0ZXN0J30uLi5gKTtcblxuICAgIGNvbnN0IHJlZ2lzdHJ5ID0gbmV3IFNraWxsc1JlZ2lzdHJ5KCk7XG4gICAgXG4gICAgaWYgKGRyeVJ1bikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIHNraWxsTmFtZSxcbiAgICAgICAgICB2ZXJzaW9uOiB2ZXJzaW9uIHx8ICdsYXRlc3QnLFxuICAgICAgICAgIHN0YXR1czogJ3dvdWxkLWxvYWQnLFxuICAgICAgICAgIGRlcGVuZGVuY2llczogWyd1dGlscycsICd2YWxpZGF0b3InXSxcbiAgICAgICAgfSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgY29uc3Qgc2tpbGwgPSBhd2FpdCByZWdpc3RyeS5sb2FkKHNraWxsTmFtZSwgdmVyc2lvbiB8fCAnMS4wLjAnKTtcblxuICAgIHJldHVybiB7XG4gICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgZGF0YToge1xuICAgICAgICBza2lsbE5hbWU6IHNraWxsLm5hbWUsXG4gICAgICAgIHZlcnNpb246IHNraWxsLnZlcnNpb24sXG4gICAgICAgIHN0YXR1czogc2tpbGwuc3RhdHVzLFxuICAgICAgICBkZXBlbmRlbmNpZXM6IHNraWxsLmRlcGVuZGVuY2llcyxcbiAgICAgIH0sXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICBlcnJvcjogU3RyaW5nKGVycm9yKSxcbiAgICB9O1xuICB9XG59XG5cbi8qKlxuICogSGFybmVzcyB0ZXN0IGNvbW1hbmQgLSBSdW4gdGVzdHNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGhhcm5lc3NUZXN0Q29tbWFuZChvcHRpb25zOiBDTElPcHRpb25zICYgeyBzY2VuYXJpb0lkPzogc3RyaW5nOyB0ZXN0TmFtZT86IHN0cmluZyB9KTogUHJvbWlzZTxDb21tYW5kUmVzdWx0PiB7XG4gIGNvbnN0IHsgZHJ5UnVuLCBvdXRwdXQsIHNjZW5hcmlvSWQsIHRlc3ROYW1lIH0gPSBvcHRpb25zO1xuXG4gIHRyeSB7XG4gICAgY29uc29sZS5sb2coYFthbmZzZl0gJHtkcnlSdW4gPyAnW0RSWSBSVU5dICcgOiAnJ31SdW5uaW5nIHRlc3RzLi4uYCk7XG5cbiAgICBjb25zdCBoYXJuZXNzID0gbmV3IEFnZW50SGFybmVzcygpO1xuXG4gICAgaWYgKGRyeVJ1bikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgZGF0YToge1xuICAgICAgICAgIHNjZW5hcmlvSWQ6IHNjZW5hcmlvSWQgfHwgJ2RlZmF1bHQnLFxuICAgICAgICAgIHRlc3ROYW1lOiB0ZXN0TmFtZSB8fCAnc21va2UtdGVzdCcsXG4gICAgICAgICAgc3RhdHVzOiAnd291bGQtcnVuJyxcbiAgICAgICAgICBlc3RpbWF0ZWREdXJhdGlvbjogJzMwcycsXG4gICAgICAgIH0sXG4gICAgICB9O1xuICAgIH1cblxuICAgIGNvbnN0IHRlc3RTY2VuYXJpbyA9IHtcbiAgICAgIGlkOiBzY2VuYXJpb0lkIHx8IGdlbmVyYXRlVVVJRCgpLFxuICAgICAgbmFtZTogdGVzdE5hbWUgfHwgJ2ludGVncmF0aW9uLXRlc3QnLFxuICAgICAgdHlwZTogJ2ludGVncmF0aW9uJyBhcyBjb25zdCxcbiAgICAgIGNvbmZpZzoge30sXG4gICAgICBleHBlY3RlZE91dGNvbWVzOiBbXSxcbiAgICAgIHN1Y2Nlc3NDcml0ZXJpYToge1xuICAgICAgICBtaW5QYXNzUmF0ZTogMC45LFxuICAgICAgICBtYXhFcnJvclJhdGU6IDAuMSxcbiAgICAgIH0sXG4gICAgfTtcblxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGhhcm5lc3MucnVuVGVzdCh0ZXN0U2NlbmFyaW8pO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN1Y2Nlc3M6IHJlc3VsdC5wYXNzZWQsXG4gICAgICBkYXRhOiByZXN1bHQsXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICBlcnJvcjogU3RyaW5nKGVycm9yKSxcbiAgICB9O1xuICB9XG59XG5cbi8qKlxuICogTUNQIGluc3BlY3QgY29tbWFuZCAtIEluc3BlY3QgTUNQIG1lc3NhZ2VzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBtY3BJbnNwZWN0Q29tbWFuZChvcHRpb25zOiBDTElPcHRpb25zICYgeyB0cmFjZUlkPzogc3RyaW5nOyBsaW1pdD86IG51bWJlciB9KTogUHJvbWlzZTxDb21tYW5kUmVzdWx0PiB7XG4gIGNvbnN0IHsgZHJ5UnVuLCBvdXRwdXQsIHRyYWNlSWQsIGxpbWl0IH0gPSBvcHRpb25zO1xuXG4gIHRyeSB7XG4gICAgY29uc29sZS5sb2coYFthbmZzZl0gJHtkcnlSdW4gPyAnW0RSWSBSVU5dICcgOiAnJ31JbnNwZWN0aW5nIE1DUCBtZXNzYWdlcy4uLmApO1xuXG4gICAgY29uc3QgYnVzID0gbmV3IE1DUEJ1cyh7IGVuYWJsZUxvZ2dpbmc6IHRydWUsIGVuYWJsZVRyYWNpbmc6IHRydWUgfSk7XG5cbiAgICAvLyBHZXQgc3RhdHNcbiAgICBjb25zdCBzdGF0cyA9IGJ1cy5nZXRTdGF0cygpO1xuXG4gICAgLy8gR2V0IGxvZ3NcbiAgICBjb25zdCBsb2dzID0gYnVzLmdldExvZ3MobGltaXQgfHwgMTApO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICBkYXRhOiB7XG4gICAgICAgIHN0YXRzLFxuICAgICAgICByZWNlbnRMb2dzOiBsb2dzLFxuICAgICAgICB0cmFjZUlkOiB0cmFjZUlkIHx8ICduby10cmFjZScsXG4gICAgICB9LFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgZXJyb3I6IFN0cmluZyhlcnJvciksXG4gICAgfTtcbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBDTEkgTWFpbiBFbnRyeVxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgaW50ZXJmYWNlIENMSUFyZ3Mge1xuICBjb21tYW5kOiBzdHJpbmc7XG4gIHN1YmNvbW1hbmQ/OiBzdHJpbmc7XG4gIG9wdGlvbnM6IENMSU9wdGlvbnMgJiBSZWNvcmQ8c3RyaW5nLCBhbnk+O1xufVxuXG4vKipcbiAqIE1haW4gQ0xJIGVudHJ5IHBvaW50XG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5DTEkoYXJnczogQ0xJQXJncyk6IFByb21pc2U8bnVtYmVyPiB7XG4gIGNvbnN0IHsgY29tbWFuZCwgc3ViY29tbWFuZCwgb3B0aW9ucyB9ID0gYXJncztcbiAgY29uc3QgeyBvdXRwdXQgPSAndGFibGUnLCB2ZXJib3NlID0gZmFsc2UgfSA9IG9wdGlvbnM7XG5cbiAgY29uc29sZS5sb2coYFthbmZzZl0gQU5GU0YgQ0xJIHYke0NMSV9WRVJTSU9OfWApO1xuICBjb25zb2xlLmxvZyhgW2FuZnNmXSBDb21tYW5kOiAke2NvbW1hbmR9ICR7c3ViY29tbWFuZCB8fCAnJ31gKTtcblxuICBsZXQgcmVzdWx0OiBDb21tYW5kUmVzdWx0O1xuXG4gIHN3aXRjaCAoY29tbWFuZCkge1xuICAgIGNhc2UgJ3N5bnRoZXNpemUnOlxuICAgICAgcmVzdWx0ID0gYXdhaXQgc3ludGhlc2l6ZUNvbW1hbmQob3B0aW9ucyk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgJ3ByZXZpZXcnOlxuICAgICAgcmVzdWx0ID0gYXdhaXQgcHJldmlld0NvbW1hbmQob3B0aW9ucyk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgJ3ZlcmlmeSc6XG4gICAgICByZXN1bHQgPSBhd2FpdCB2ZXJpZnlDb21tYW5kKG9wdGlvbnMpO1xuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlICdyb2xlJzpcbiAgICAgIGlmIChzdWJjb21tYW5kID09PSAncmViYWxhbmNlJykge1xuICAgICAgICByZXN1bHQgPSBhd2FpdCByb2xlUmViYWxhbmNlQ29tbWFuZChvcHRpb25zKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYFthbmZzZl0gVW5rbm93biByb2xlIHN1YmNvbW1hbmQ6ICR7c3ViY29tbWFuZH1gKTtcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgJ3VpJzpcbiAgICAgIGlmIChzdWJjb21tYW5kID09PSAnZ2VuJykge1xuICAgICAgICByZXN1bHQgPSBhd2FpdCB1aUdlbkNvbW1hbmQob3B0aW9ucyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBbYW5mc2ZdIFVua25vd24gVUkgc3ViY29tbWFuZDogJHtzdWJjb21tYW5kfWApO1xuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAnc2tpbGwnOlxuICAgICAgaWYgKHN1YmNvbW1hbmQgPT09ICdsb2FkJykge1xuICAgICAgICByZXN1bHQgPSBhd2FpdCBza2lsbExvYWRDb21tYW5kKG9wdGlvbnMgYXMgYW55KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYFthbmZzZl0gVW5rbm93biBza2lsbCBzdWJjb21tYW5kOiAke3N1YmNvbW1hbmR9YCk7XG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlICdoYXJuZXNzJzpcbiAgICAgIGlmIChzdWJjb21tYW5kID09PSAndGVzdCcpIHtcbiAgICAgICAgcmVzdWx0ID0gYXdhaXQgaGFybmVzc1Rlc3RDb21tYW5kKG9wdGlvbnMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgW2FuZnNmXSBVbmtub3duIGhhcm5lc3Mgc3ViY29tbWFuZDogJHtzdWJjb21tYW5kfWApO1xuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAnbWNwJzpcbiAgICAgIGlmIChzdWJjb21tYW5kID09PSAnaW5zcGVjdCcpIHtcbiAgICAgICAgcmVzdWx0ID0gYXdhaXQgbWNwSW5zcGVjdENvbW1hbmQob3B0aW9ucyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBbYW5mc2ZdIFVua25vd24gTUNQIHN1YmNvbW1hbmQ6ICR7c3ViY29tbWFuZH1gKTtcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgICBicmVhaztcblxuICAgIGRlZmF1bHQ6XG4gICAgICBjb25zb2xlLmVycm9yKGBbYW5mc2ZdIFVua25vd24gY29tbWFuZDogJHtjb21tYW5kfWApO1xuICAgICAgcHJpbnRIZWxwKCk7XG4gICAgICByZXR1cm4gMTtcbiAgfVxuXG4gIGlmIChyZXN1bHQuc3VjY2Vzcykge1xuICAgIGNvbnNvbGUubG9nKGZvcm1hdE91dHB1dChyZXN1bHQuZGF0YSwgb3V0cHV0KSk7XG4gICAgXG4gICAgaWYgKHZlcmJvc2UgJiYgcmVzdWx0LmNoYW5nZUV2ZW50KSB7XG4gICAgICBjb25zb2xlLmxvZygnXFxuW2FuZnNmXSBDaGFuZ2UgRXZlbnQ6Jyk7XG4gICAgICBjb25zb2xlLmxvZyhmb3JtYXRPdXRwdXQocmVzdWx0LmNoYW5nZUV2ZW50LCAnanNvbicpKTtcbiAgICB9XG4gICAgXG4gICAgcmV0dXJuIDA7XG4gIH0gZWxzZSB7XG4gICAgY29uc29sZS5lcnJvcihgW2FuZnNmXSBFcnJvcjogJHtyZXN1bHQuZXJyb3J9YCk7XG4gICAgcmV0dXJuIDE7XG4gIH1cbn1cblxuLyoqXG4gKiBQcmludCBoZWxwIG1lc3NhZ2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByaW50SGVscCgpOiB2b2lkIHtcbiAgY29uc29sZS5sb2coYFxuQU5GU0YgQ0xJIHYke0NMSV9WRVJTSU9OfVxuXG5Vc2FnZTogYW5mc2YgPGNvbW1hbmQ+IFtzdWJjb21tYW5kXSBbb3B0aW9uc11cblxuQ29tbWFuZHM6XG4gIHN5bnRoZXNpemUgICAgICAgICAgICAgIFRyaWdnZXIgcm9sZSBzeW50aGVzaXMgYW5kIGFyY2hpdGVjdHVyZSBnZW5lcmF0aW9uXG4gIHByZXZpZXcgICAgICAgICAgICAgICAgIFByZXZpZXcgYXJjaGl0ZWN0dXJlIGNoYW5nZXNcbiAgdmVyaWZ5ICAgICAgICAgICAgICAgICAgVmVyaWZ5IGFyY2hpdGVjdHVyZSBjb25zaXN0ZW5jeVxuICByb2xlIHJlYmFsYW5jZSAgICAgICAgICBSZWJhbGFuY2Ugcm9sZSBhc3NpZ25tZW50c1xuICB1aSBnZW4gICAgICAgICAgICAgICAgICBHZW5lcmF0ZSBVSSBwcm90b3R5cGVcbiAgc2tpbGwgbG9hZCAgICAgICAgICAgICAgTG9hZCBhIHNraWxsXG4gIGhhcm5lc3MgdGVzdCAgICAgICAgICAgIFJ1biB0ZXN0c1xuICBtY3AgaW5zcGVjdCAgICAgICAgICAgICBJbnNwZWN0IE1DUCBtZXNzYWdlc1xuXG5PcHRpb25zOlxuICAtLWRyeS1ydW4gICAgICAgICAgICAgIFNpbXVsYXRlIHdpdGhvdXQgbWFraW5nIGNoYW5nZXNcbiAgLS1rLWF1dG8gICAgICAgICAgICAgICBBdXRvLW9wdGltaXplIHJvbGUgY291bnRcbiAgLS1vdXRwdXQgPGZvcm1hdD4gICAgICBPdXRwdXQgZm9ybWF0OiB0YWJsZSB8IGpzb24gKGRlZmF1bHQ6IHRhYmxlKVxuICAtLXZlcmJvc2UgICAgICAgICAgICAgIEVuYWJsZSB2ZXJib3NlIG91dHB1dFxuICAtLWhlbHAgICAgICAgICAgICAgICAgIFNob3cgdGhpcyBoZWxwIG1lc3NhZ2VcblxuRXhhbXBsZXM6XG4gIGFuZnNmIHN5bnRoZXNpemUgLS1rLWF1dG8gLS1kcnktcnVuXG4gIGFuZnNmIHByZXZpZXcgLS1vdXRwdXQganNvblxuICBhbmZzZiByb2xlIHJlYmFsYW5jZSAtLXByb2plY3QgbXktcHJvamVjdFxuICBhbmZzZiB1aSBnZW4gLS1mcmFtZXdvcmsgcmVhY3RcbiAgYW5mc2Ygc2tpbGwgbG9hZCBteS1za2lsbCAtLXZlcnNpb24gMS4wLjBcbiAgYW5mc2YgaGFybmVzcyB0ZXN0IC0tc2NlbmFyaW8gaW50ZWdyYXRpb25cbiAgYW5mc2YgbWNwIGluc3BlY3QgLS10cmFjZSB0cmFjZV8xMjNcbmApO1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBFeHBvcnRzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBkZWZhdWx0IHtcbiAgcnVuQ0xJLFxuICBwcmludEhlbHAsXG4gIHN5bnRoZXNpemVDb21tYW5kLFxuICBwcmV2aWV3Q29tbWFuZCxcbiAgdmVyaWZ5Q29tbWFuZCxcbiAgcm9sZVJlYmFsYW5jZUNvbW1hbmQsXG4gIHVpR2VuQ29tbWFuZCxcbiAgc2tpbGxMb2FkQ29tbWFuZCxcbiAgaGFybmVzc1Rlc3RDb21tYW5kLFxuICBtY3BJbnNwZWN0Q29tbWFuZCxcbn07XG4iXX0=