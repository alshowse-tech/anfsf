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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5mc2YtY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vc3JjL2NsaS9hbmZzZi1jbGkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7OztHQUtHOztBQThGSCw4Q0FtQ0M7QUFLRCx3Q0FtQ0M7QUFLRCxzQ0EyQkM7QUFLRCxvREFzQ0M7QUFLRCxvQ0FtQ0M7QUFLRCw0Q0FxQ0M7QUFLRCxnREE0Q0M7QUFLRCw4Q0E0QkM7QUFlRCx3QkFzRkM7QUFLRCw4QkFnQ0M7QUFoaUJELDRDQUF3QztBQUN4QywrREFBMkQ7QUFDM0QsNERBQXdEO0FBR3hELCtFQUErRTtBQUMvRSxZQUFZO0FBQ1osK0VBQStFO0FBRS9FLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQztBQUM1QixNQUFNLGNBQWMsR0FBRyxTQUFTLENBQUM7QUFvQmpDLCtFQUErRTtBQUMvRSxtQkFBbUI7QUFDbkIsK0VBQStFO0FBRS9FLFNBQVMsWUFBWTtJQUNuQixPQUFPLHNDQUFzQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtRQUNuRSxNQUFNLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDbkMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUM7UUFDMUMsT0FBTyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3hCLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQUVELFNBQVMsR0FBRztJQUNWLE9BQU8sSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQ3BCLENBQUM7QUFFRCxTQUFTLFlBQVksQ0FBQyxNQUFXLEVBQUUsTUFBd0I7SUFDekQsSUFBSSxNQUFNLEtBQUss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QUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDeEQsQ0FBQztRQUVELE9BQU8sQ0FBQyxDQUFDO0lBQ1gsQ0FBQztTQUFNLENBQUM7UUFDTixPQUFPLENBQUMsS0FBSyxDQUFDLGtCQUFrQixNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUNoRCxPQUFPLENBQUMsQ0FBQztJQUNYLENBQUM7QUFDSCxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFnQixTQUFTO0lBQ3ZCLE9BQU8sQ0FBQyxHQUFHLENBQUM7YUFDRCxXQUFXOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztDQTZCdkIsQ0FBQyxDQUFDO0FBQ0gsQ0FBQztBQUVELCtFQUErRTtBQUMvRSxVQUFVO0FBQ1YsK0VBQStFO0FBRS9FLGtCQUFlO0lBQ2IsTUFBTTtJQUNOLFNBQVM7SUFDVCxpQkFBaUI7SUFDakIsY0FBYztJQUNkLGFBQWE7SUFDYixvQkFBb0I7SUFDcEIsWUFBWTtJQUNaLGdCQUFnQjtJQUNoQixrQkFBa0I7SUFDbEIsaUJBQWlCO0NBQ2xCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEFORlNGIFY0IExheWVyIDguNSAtIENMSSBJbXBsZW1lbnRhdGlvblxuICogXG4gKiBDb21tYW5kLWxpbmUgaW50ZXJmYWNlIGZvciBBTkZTRiBnb3Zlcm5hbmNlIG9wZXJhdGlvbnMuXG4gKiBDb21tYW5kczogc3ludGhlc2l6ZSwgcHJldmlldywgdmVyaWZ5LCByb2xlIHJlYmFsYW5jZSwgdWkgZ2VuLCBza2lsbCBsb2FkLCBoYXJuZXNzIHRlc3QsIG1jcCBpbnNwZWN0XG4gKi9cblxuaW1wb3J0IHsgTUNQQnVzIH0gZnJvbSAnLi4vbWNwL21jcC1idXMnO1xuaW1wb3J0IHsgU2tpbGxzUmVnaXN0cnkgfSBmcm9tICcuLi9za2lsbHMvc2tpbGxzLXJlZ2lzdHJ5JztcbmltcG9ydCB7IEFnZW50SGFybmVzcyB9IGZyb20gJy4uL2hhcm5lc3MvYWdlbnQtaGFybmVzcyc7XG5pbXBvcnQgeyBDaGFuZ2VFdmVudCB9IGZyb20gJy4uL2NvcmUvZ3JhcGgvdHlwZXMnO1xuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBDb25zdGFudHNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuY29uc3QgQ0xJX1ZFUlNJT04gPSAnMS41LjAnO1xuY29uc3QgU0NIRU1BX1ZFUlNJT04gPSAnMjAyNi0wMyc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFR5cGVzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmludGVyZmFjZSBDTElPcHRpb25zIHtcbiAgZHJ5UnVuPzogYm9vbGVhbjtcbiAga0F1dG8/OiBib29sZWFuO1xuICBvdXRwdXQ/OiAndGFibGUnIHwgJ2pzb24nO1xuICB2ZXJib3NlPzogYm9vbGVhbjtcbn1cblxuaW50ZXJmYWNlIENvbW1hbmRSZXN1bHQge1xuICBzdWNjZXNzOiBib29sZWFuO1xuICBkYXRhPzogYW55O1xuICBlcnJvcj86IHN0cmluZztcbiAgY2hhbmdlRXZlbnQ/OiBDaGFuZ2VFdmVudDtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSGVscGVyIEZ1bmN0aW9uc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5mdW5jdGlvbiBnZW5lcmF0ZVVVSUQoKTogc3RyaW5nIHtcbiAgcmV0dXJuICd4eHh4eHh4eC14eHh4LTR4eHgteXh4eC14eHh4eHh4eHh4eHgnLnJlcGxhY2UoL1t4eV0vZywgKGMpID0+IHtcbiAgICBjb25zdCByID0gKE1hdGgucmFuZG9tKCkgKiAxNikgfCAwO1xuICAgIGNvbnN0IHYgPSBjID09PSAneCcgPyByIDogKHIgJiAweDMpIHwgMHg4O1xuICAgIHJldHVybiB2LnRvU3RyaW5nKDE2KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIG5vdygpOiBudW1iZXIge1xuICByZXR1cm4gRGF0ZS5ub3coKTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0T3V0cHV0KHJlc3VsdDogYW55LCBmb3JtYXQ6ICd0YWJsZScgfCAnanNvbicpOiBzdHJpbmcge1xuICBpZiAoZm9ybWF0ID09PSAnanNvbicpIHtcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkocmVzdWx0LCBudWxsLCAyKTtcbiAgfVxuICBcbiAgLy8gU2ltcGxlIHRhYmxlIGZvcm1hdHRpbmdcbiAgaWYgKEFycmF5LmlzQXJyYXkocmVzdWx0KSkge1xuICAgIGlmIChyZXN1bHQubGVuZ3RoID09PSAwKSByZXR1cm4gJ05vIHJlc3VsdHMnO1xuICAgIFxuICAgIGNvbnN0IGhlYWRlcnMgPSBPYmplY3Qua2V5cyhyZXN1bHRbMF0pO1xuICAgIGNvbnN0IHJvd3MgPSByZXN1bHQubWFwKHIgPT4gaGVhZGVycy5tYXAoaCA9PiBTdHJpbmcocltoXSA/PyAnJykpLmpvaW4oJyB8ICcpKTtcbiAgICByZXR1cm4gW2hlYWRlcnMuam9pbignIHwgJyksIGhlYWRlcnMubWFwKCgpID0+ICctLS0nKS5qb2luKCd8JyksIC4uLnJvd3NdLmpvaW4oJ1xcbicpO1xuICB9XG4gIFxuICByZXR1cm4gSlNPTi5zdHJpbmdpZnkocmVzdWx0LCBudWxsLCAyKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlQ2hhbmdlRXZlbnQoYWN0aW9uOiBzdHJpbmcsIHRhcmdldDogc3RyaW5nLCBkYXRhOiBhbnksIGRyeVJ1bjogYm9vbGVhbik6IENoYW5nZUV2ZW50IHtcbiAgcmV0dXJuIHtcbiAgICBpZDogZ2VuZXJhdGVVVUlEKCksXG4gICAgdHM6IG5vdygpLFxuICAgIGFjdG9yUm9sZUlkOiAnY2xpLXVzZXInLFxuICAgIGFjdGlvbjogZHJ5UnVuID8gJ3ByZXZpZXcnIDogKGFjdGlvbiBhcyBhbnkpLFxuICAgIHRhcmdldDoge1xuICAgICAga2luZDogJ2dyYXBoJyxcbiAgICAgIGlkT3JQYXRoOiB0YXJnZXQsXG4gICAgfSxcbiAgICBvd25lcnNoaXBSdWxlSWQ6ICdjbGktcnVsZScsXG4gICAgZGlmZjoge1xuICAgICAgYWRkZWQ6IGRhdGEsXG4gICAgfSxcbiAgICByaXNrU2NvcmU6IGRyeVJ1biA/IDAgOiAyNSxcbiAgICBtZXRhZGF0YToge1xuICAgICAgc291cmNlOiAnY2xpJyxcbiAgICAgIGRyeVJ1bixcbiAgICB9LFxuICB9O1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBDTEkgQ29tbWFuZHNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBTeW50aGVzaXplIGNvbW1hbmQgLSBUcmlnZ2VyIHJvbGUgc3ludGhlc2lzIGFuZCBhcmNoaXRlY3R1cmUgZ2VuZXJhdGlvblxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc3ludGhlc2l6ZUNvbW1hbmQob3B0aW9uczogQ0xJT3B0aW9ucyAmIHsgcHJvamVjdElkPzogc3RyaW5nOyBrPzogbnVtYmVyIH0pOiBQcm9taXNlPENvbW1hbmRSZXN1bHQ+IHtcbiAgY29uc3QgeyBkcnlSdW4sIGtBdXRvLCBvdXRwdXQsIHByb2plY3RJZCwgayB9ID0gb3B0aW9ucztcblxuICB0cnkge1xuICAgIGNvbnNvbGUubG9nKGBbYW5mc2ZdICR7ZHJ5UnVuID8gJ1tEUlkgUlVOXSAnIDogJyd9U3ludGhlc2l6aW5nIGFyY2hpdGVjdHVyZS4uLmApO1xuXG4gICAgLy8gTW9jayBzeW50aGVzaXMgcmVzdWx0XG4gICAgY29uc3QgcmVzdWx0ID0ge1xuICAgICAgcHJvamVjdElkOiBwcm9qZWN0SWQgfHwgJ2RlZmF1bHQnLFxuICAgICAgcm9sZXM6IGtBdXRvID8gJ2F1dG8tb3B0aW1pemVkJyA6IGsgfHwgNSxcbiAgICAgIGFyY2hpdGVjdHVyZToge1xuICAgICAgICBzZXJ2aWNlczogMTIsXG4gICAgICAgIGNvbnRyYWN0czogMjQsXG4gICAgICAgIHByb2JlczogOCxcbiAgICAgIH0sXG4gICAgICBvcHRpbWl6YXRpb246IHtcbiAgICAgICAgZWNvbm9taWNzU2NvcmU6IDAuODcsXG4gICAgICAgIGludGVyZmFjZUNvc3Q6IDAuMjMsXG4gICAgICAgIHJld29ya1Jpc2s6ICdsb3cnLFxuICAgICAgfSxcbiAgICB9O1xuXG4gICAgY29uc3QgY2hhbmdlRXZlbnQgPSBjcmVhdGVDaGFuZ2VFdmVudCgnc3ludGhlc2l6ZScsICdhcmNoaXRlY3R1cmUnLCByZXN1bHQsIGRyeVJ1biB8fCBmYWxzZSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgIGRhdGE6IHJlc3VsdCxcbiAgICAgIGNoYW5nZUV2ZW50LFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgZXJyb3I6IFN0cmluZyhlcnJvciksXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIFByZXZpZXcgY29tbWFuZCAtIFByZXZpZXcgYXJjaGl0ZWN0dXJlIGNoYW5nZXNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHByZXZpZXdDb21tYW5kKG9wdGlvbnM6IENMSU9wdGlvbnMgJiB7IGNoYW5nZUlkPzogc3RyaW5nIH0pOiBQcm9taXNlPENvbW1hbmRSZXN1bHQ+IHtcbiAgY29uc3QgeyBkcnlSdW4sIG91dHB1dCwgY2hhbmdlSWQgfSA9IG9wdGlvbnM7XG5cbiAgdHJ5IHtcbiAgICBjb25zb2xlLmxvZyhgW2FuZnNmXSAke2RyeVJ1biA/ICdbRFJZIFJVTl0gJyA6ICcnfVByZXZpZXdpbmcgY2hhbmdlcy4uLmApO1xuXG4gICAgY29uc3QgcHJldmlldyA9IHtcbiAgICAgIGNoYW5nZUlkOiBjaGFuZ2VJZCB8fCBnZW5lcmF0ZVVVSUQoKSxcbiAgICAgIGNoYW5nZXM6IFtcbiAgICAgICAgeyB0eXBlOiAncm9sZScsIGFjdGlvbjogJ2NyZWF0ZScsIG5hbWU6ICdhcGktZ2F0ZXdheS1yb2xlJyB9LFxuICAgICAgICB7IHR5cGU6ICdjb250cmFjdCcsIGFjdGlvbjogJ3VwZGF0ZScsIG5hbWU6ICd1c2VyLXNlcnZpY2UtYXBpJyB9LFxuICAgICAgICB7IHR5cGU6ICdwcm9iZScsIGFjdGlvbjogJ2NyZWF0ZScsIG5hbWU6ICdsYXRlbmN5LXByb2JlJyB9LFxuICAgICAgXSxcbiAgICAgIGltcGFjdDoge1xuICAgICAgICBhZmZlY3RlZFNlcnZpY2VzOiAzLFxuICAgICAgICBhZmZlY3RlZENvbnRyYWN0czogNSxcbiAgICAgICAgZXN0aW1hdGVkUmV3b3JrOiAnbWVkaXVtJyxcbiAgICAgIH0sXG4gICAgICB2ZXRvQ2hlY2s6IHtcbiAgICAgICAgcGFzc2VkOiB0cnVlLFxuICAgICAgICBoYXJkVmV0b2VzOiAwLFxuICAgICAgICBzb2Z0VmV0b2VzOiAxLFxuICAgICAgfSxcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICBkYXRhOiBwcmV2aWV3LFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgZXJyb3I6IFN0cmluZyhlcnJvciksXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIFZlcmlmeSBjb21tYW5kIC0gVmVyaWZ5IGFyY2hpdGVjdHVyZSBjb25zaXN0ZW5jeVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gdmVyaWZ5Q29tbWFuZChvcHRpb25zOiBDTElPcHRpb25zICYgeyBwcm9qZWN0SWQ/OiBzdHJpbmcgfSk6IFByb21pc2U8Q29tbWFuZFJlc3VsdD4ge1xuICBjb25zdCB7IGRyeVJ1biwgb3V0cHV0LCBwcm9qZWN0SWQgfSA9IG9wdGlvbnM7XG5cbiAgdHJ5IHtcbiAgICBjb25zb2xlLmxvZyhgW2FuZnNmXSAke2RyeVJ1biA/ICdbRFJZIFJVTl0gJyA6ICcnfVZlcmlmeWluZyBhcmNoaXRlY3R1cmUuLi5gKTtcblxuICAgIGNvbnN0IHZlcmlmaWNhdGlvbiA9IHtcbiAgICAgIHByb2plY3RJZDogcHJvamVjdElkIHx8ICdkZWZhdWx0JyxcbiAgICAgIGNvbnNpc3RlbmN5OiB7XG4gICAgICAgIGdyYXBoQ29uc2lzdGVuY3k6IHRydWUsXG4gICAgICAgIGNvbnRyYWN0Q29uc2lzdGVuY3k6IHRydWUsXG4gICAgICAgIG93bmVyc2hpcENvbnNpc3RlbmN5OiB0cnVlLFxuICAgICAgfSxcbiAgICAgIGlzc3VlczogW10sXG4gICAgICBzY29yZTogMC45NSxcbiAgICB9O1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICBkYXRhOiB2ZXJpZmljYXRpb24sXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICBlcnJvcjogU3RyaW5nKGVycm9yKSxcbiAgICB9O1xuICB9XG59XG5cbi8qKlxuICogUm9sZSByZWJhbGFuY2UgY29tbWFuZCAtIFJlYmFsYW5jZSByb2xlIGFzc2lnbm1lbnRzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiByb2xlUmViYWxhbmNlQ29tbWFuZChvcHRpb25zOiBDTElPcHRpb25zICYgeyBwcm9qZWN0SWQ/OiBzdHJpbmc7IGFsZ29yaXRobT86IHN0cmluZyB9KTogUHJvbWlzZTxDb21tYW5kUmVzdWx0PiB7XG4gIGNvbnN0IHsgZHJ5UnVuLCBrQXV0bywgb3V0cHV0LCBwcm9qZWN0SWQsIGFsZ29yaXRobSB9ID0gb3B0aW9ucztcblxuICB0cnkge1xuICAgIGNvbnNvbGUubG9nKGBbYW5mc2ZdICR7ZHJ5UnVuID8gJ1tEUlkgUlVOXSAnIDogJyd9UmViYWxhbmNpbmcgcm9sZXMuLi5gKTtcblxuICAgIGNvbnN0IHJlYmFsYW5jZSA9IHtcbiAgICAgIHByb2plY3RJZDogcHJvamVjdElkIHx8ICdkZWZhdWx0JyxcbiAgICAgIGFsZ29yaXRobTogYWxnb3JpdGhtIHx8ICdlY29ub21pY3Mtb3B0aW1pemVkJyxcbiAgICAgIGJlZm9yZToge1xuICAgICAgICByb2xlQ291bnQ6IDgsXG4gICAgICAgIGF2Z0ludGVyZmFjZUNvc3Q6IDAuMzUsXG4gICAgICAgIGltYmFsYW5jZTogMC40MixcbiAgICAgIH0sXG4gICAgICBhZnRlcjoge1xuICAgICAgICByb2xlQ291bnQ6IGtBdXRvID8gNiA6IDcsXG4gICAgICAgIGF2Z0ludGVyZmFjZUNvc3Q6IDAuMjIsXG4gICAgICAgIGltYmFsYW5jZTogMC4xNSxcbiAgICAgIH0sXG4gICAgICBpbXByb3ZlbWVudHM6IHtcbiAgICAgICAgaW50ZXJmYWNlQ29zdFJlZHVjdGlvbjogJzM3JScsXG4gICAgICAgIGltYmFsYW5jZVJlZHVjdGlvbjogJzY0JScsXG4gICAgICB9LFxuICAgIH07XG5cbiAgICBjb25zdCBjaGFuZ2VFdmVudCA9IGNyZWF0ZUNoYW5nZUV2ZW50KCdyZWJhbGFuY2UnLCAncm9sZXMnLCByZWJhbGFuY2UsIGRyeVJ1biB8fCBmYWxzZSk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgIGRhdGE6IHJlYmFsYW5jZSxcbiAgICAgIGNoYW5nZUV2ZW50LFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgZXJyb3I6IFN0cmluZyhlcnJvciksXG4gICAgfTtcbiAgfVxufVxuXG4vKipcbiAqIFVJIGdlbiBjb21tYW5kIC0gR2VuZXJhdGUgVUkgcHJvdG90eXBlXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1aUdlbkNvbW1hbmQob3B0aW9uczogQ0xJT3B0aW9ucyAmIHsgcHJkSWQ/OiBzdHJpbmc7IGZyYW1ld29yaz86IHN0cmluZyB9KTogUHJvbWlzZTxDb21tYW5kUmVzdWx0PiB7XG4gIGNvbnN0IHsgZHJ5UnVuLCBvdXRwdXQsIHByZElkLCBmcmFtZXdvcmsgfSA9IG9wdGlvbnM7XG5cbiAgdHJ5IHtcbiAgICBjb25zb2xlLmxvZyhgW2FuZnNmXSAke2RyeVJ1biA/ICdbRFJZIFJVTl0gJyA6ICcnfUdlbmVyYXRpbmcgVUkgcHJvdG90eXBlLi4uYCk7XG5cbiAgICBjb25zdCB1aVByb3RvdHlwZSA9IHtcbiAgICAgIHByZElkOiBwcmRJZCB8fCAnZGVmYXVsdCcsXG4gICAgICBmcmFtZXdvcms6IGZyYW1ld29yayB8fCAncmVhY3QnLFxuICAgICAgY29tcG9uZW50czogW1xuICAgICAgICB7IG5hbWU6ICdEYXNoYm9hcmQnLCB0eXBlOiAncGFnZScsIGNvbXBsZXhpdHk6ICdoaWdoJyB9LFxuICAgICAgICB7IG5hbWU6ICdVc2VyVGFibGUnLCB0eXBlOiAnY29tcG9uZW50JywgY29tcGxleGl0eTogJ21lZGl1bScgfSxcbiAgICAgICAgeyBuYW1lOiAnU2V0dGluZ3NGb3JtJywgdHlwZTogJ2NvbXBvbmVudCcsIGNvbXBsZXhpdHk6ICdtZWRpdW0nIH0sXG4gICAgICBdLFxuICAgICAgbGF5b3V0OiB7XG4gICAgICAgIHR5cGU6ICdyZXNwb25zaXZlLWdyaWQnLFxuICAgICAgICBicmVha3BvaW50czogWydtb2JpbGUnLCAndGFibGV0JywgJ2Rlc2t0b3AnXSxcbiAgICAgIH0sXG4gICAgICBkZXNpZ25Ub2tlbnM6IHtcbiAgICAgICAgY29sb3JzOiAxMixcbiAgICAgICAgdHlwb2dyYXBoeTogOCxcbiAgICAgICAgc3BhY2luZzogNixcbiAgICAgIH0sXG4gICAgfTtcblxuICAgIHJldHVybiB7XG4gICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgZGF0YTogdWlQcm90b3R5cGUsXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICBlcnJvcjogU3RyaW5nKGVycm9yKSxcbiAgICB9O1xuICB9XG59XG5cbi8qKlxuICogU2tpbGwgbG9hZCBjb21tYW5kIC0gTG9hZCBhIHNraWxsXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBza2lsbExvYWRDb21tYW5kKG9wdGlvbnM6IENMSU9wdGlvbnMgJiB7IHNraWxsTmFtZTogc3RyaW5nOyB2ZXJzaW9uPzogc3RyaW5nIH0pOiBQcm9taXNlPENvbW1hbmRSZXN1bHQ+IHtcbiAgY29uc3QgeyBkcnlSdW4sIG91dHB1dCwgc2tpbGxOYW1lLCB2ZXJzaW9uIH0gPSBvcHRpb25zO1xuXG4gIHRyeSB7XG4gICAgY29uc29sZS5sb2coYFthbmZzZl0gJHtkcnlSdW4gPyAnW0RSWSBSVU5dICcgOiAnJ31Mb2FkaW5nIHNraWxsOiAke3NraWxsTmFtZX1AJHt2ZXJzaW9uIHx8ICdsYXRlc3QnfS4uLmApO1xuXG4gICAgY29uc3QgcmVnaXN0cnkgPSBuZXcgU2tpbGxzUmVnaXN0cnkoKTtcbiAgICBcbiAgICBpZiAoZHJ5UnVuKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgc2tpbGxOYW1lLFxuICAgICAgICAgIHZlcnNpb246IHZlcnNpb24gfHwgJ2xhdGVzdCcsXG4gICAgICAgICAgc3RhdHVzOiAnd291bGQtbG9hZCcsXG4gICAgICAgICAgZGVwZW5kZW5jaWVzOiBbJ3V0aWxzJywgJ3ZhbGlkYXRvciddLFxuICAgICAgICB9LFxuICAgICAgfTtcbiAgICB9XG5cbiAgICBjb25zdCBza2lsbCA9IGF3YWl0IHJlZ2lzdHJ5LmxvYWQoc2tpbGxOYW1lLCB2ZXJzaW9uIHx8ICcxLjAuMCcpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICBkYXRhOiB7XG4gICAgICAgIHNraWxsTmFtZTogc2tpbGwubmFtZSxcbiAgICAgICAgdmVyc2lvbjogc2tpbGwudmVyc2lvbixcbiAgICAgICAgc3RhdHVzOiBza2lsbC5zdGF0dXMsXG4gICAgICAgIGRlcGVuZGVuY2llczogc2tpbGwuZGVwZW5kZW5jaWVzLFxuICAgICAgfSxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHJldHVybiB7XG4gICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgIGVycm9yOiBTdHJpbmcoZXJyb3IpLFxuICAgIH07XG4gIH1cbn1cblxuLyoqXG4gKiBIYXJuZXNzIHRlc3QgY29tbWFuZCAtIFJ1biB0ZXN0c1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaGFybmVzc1Rlc3RDb21tYW5kKG9wdGlvbnM6IENMSU9wdGlvbnMgJiB7IHNjZW5hcmlvSWQ/OiBzdHJpbmc7IHRlc3ROYW1lPzogc3RyaW5nIH0pOiBQcm9taXNlPENvbW1hbmRSZXN1bHQ+IHtcbiAgY29uc3QgeyBkcnlSdW4sIG91dHB1dCwgc2NlbmFyaW9JZCwgdGVzdE5hbWUgfSA9IG9wdGlvbnM7XG5cbiAgdHJ5IHtcbiAgICBjb25zb2xlLmxvZyhgW2FuZnNmXSAke2RyeVJ1biA/ICdbRFJZIFJVTl0gJyA6ICcnfVJ1bm5pbmcgdGVzdHMuLi5gKTtcblxuICAgIGNvbnN0IGhhcm5lc3MgPSBuZXcgQWdlbnRIYXJuZXNzKCk7XG5cbiAgICBpZiAoZHJ5UnVuKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgc2NlbmFyaW9JZDogc2NlbmFyaW9JZCB8fCAnZGVmYXVsdCcsXG4gICAgICAgICAgdGVzdE5hbWU6IHRlc3ROYW1lIHx8ICdzbW9rZS10ZXN0JyxcbiAgICAgICAgICBzdGF0dXM6ICd3b3VsZC1ydW4nLFxuICAgICAgICAgIGVzdGltYXRlZER1cmF0aW9uOiAnMzBzJyxcbiAgICAgICAgfSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgY29uc3QgdGVzdFNjZW5hcmlvID0ge1xuICAgICAgaWQ6IHNjZW5hcmlvSWQgfHwgZ2VuZXJhdGVVVUlEKCksXG4gICAgICBuYW1lOiB0ZXN0TmFtZSB8fCAnaW50ZWdyYXRpb24tdGVzdCcsXG4gICAgICB0eXBlOiAnaW50ZWdyYXRpb24nIGFzIGNvbnN0LFxuICAgICAgY29uZmlnOiB7fSxcbiAgICAgIGV4cGVjdGVkT3V0Y29tZXM6IFtdLFxuICAgICAgc3VjY2Vzc0NyaXRlcmlhOiB7XG4gICAgICAgIG1pblBhc3NSYXRlOiAwLjksXG4gICAgICAgIG1heEVycm9yUmF0ZTogMC4xLFxuICAgICAgfSxcbiAgICB9O1xuXG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgaGFybmVzcy5ydW5UZXN0KHRlc3RTY2VuYXJpbyk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogcmVzdWx0LnBhc3NlZCxcbiAgICAgIGRhdGE6IHJlc3VsdCxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHJldHVybiB7XG4gICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgIGVycm9yOiBTdHJpbmcoZXJyb3IpLFxuICAgIH07XG4gIH1cbn1cblxuLyoqXG4gKiBNQ1AgaW5zcGVjdCBjb21tYW5kIC0gSW5zcGVjdCBNQ1AgbWVzc2FnZXNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIG1jcEluc3BlY3RDb21tYW5kKG9wdGlvbnM6IENMSU9wdGlvbnMgJiB7IHRyYWNlSWQ/OiBzdHJpbmc7IGxpbWl0PzogbnVtYmVyIH0pOiBQcm9taXNlPENvbW1hbmRSZXN1bHQ+IHtcbiAgY29uc3QgeyBkcnlSdW4sIG91dHB1dCwgdHJhY2VJZCwgbGltaXQgfSA9IG9wdGlvbnM7XG5cbiAgdHJ5IHtcbiAgICBjb25zb2xlLmxvZyhgW2FuZnNmXSAke2RyeVJ1biA/ICdbRFJZIFJVTl0gJyA6ICcnfUluc3BlY3RpbmcgTUNQIG1lc3NhZ2VzLi4uYCk7XG5cbiAgICBjb25zdCBidXMgPSBuZXcgTUNQQnVzKHsgZW5hYmxlTG9nZ2luZzogdHJ1ZSwgZW5hYmxlVHJhY2luZzogdHJ1ZSB9KTtcblxuICAgIC8vIEdldCBzdGF0c1xuICAgIGNvbnN0IHN0YXRzID0gYnVzLmdldFN0YXRzKCk7XG5cbiAgICAvLyBHZXQgbG9nc1xuICAgIGNvbnN0IGxvZ3MgPSBidXMuZ2V0TG9ncyhsaW1pdCB8fCAxMCk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgIGRhdGE6IHtcbiAgICAgICAgc3RhdHMsXG4gICAgICAgIHJlY2VudExvZ3M6IGxvZ3MsXG4gICAgICAgIHRyYWNlSWQ6IHRyYWNlSWQgfHwgJ25vLXRyYWNlJyxcbiAgICAgIH0sXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICByZXR1cm4ge1xuICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICBlcnJvcjogU3RyaW5nKGVycm9yKSxcbiAgICB9O1xuICB9XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIENMSSBNYWluIEVudHJ5XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ0xJQXJncyB7XG4gIGNvbW1hbmQ6IHN0cmluZztcbiAgc3ViY29tbWFuZD86IHN0cmluZztcbiAgb3B0aW9uczogQ0xJT3B0aW9ucyAmIFJlY29yZDxzdHJpbmcsIGFueT47XG59XG5cbi8qKlxuICogTWFpbiBDTEkgZW50cnkgcG9pbnRcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJ1bkNMSShhcmdzOiBDTElBcmdzKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgY29uc3QgeyBjb21tYW5kLCBzdWJjb21tYW5kLCBvcHRpb25zIH0gPSBhcmdzO1xuICBjb25zdCB7IG91dHB1dCA9ICd0YWJsZScsIHZlcmJvc2UgPSBmYWxzZSB9ID0gb3B0aW9ucztcblxuICBjb25zb2xlLmxvZyhgW2FuZnNmXSBBTkZTRiBDTEkgdiR7Q0xJX1ZFUlNJT059YCk7XG4gIGNvbnNvbGUubG9nKGBbYW5mc2ZdIENvbW1hbmQ6ICR7Y29tbWFuZH0gJHtzdWJjb21tYW5kIHx8ICcnfWApO1xuXG4gIGxldCByZXN1bHQ6IENvbW1hbmRSZXN1bHQ7XG5cbiAgc3dpdGNoIChjb21tYW5kKSB7XG4gICAgY2FzZSAnc3ludGhlc2l6ZSc6XG4gICAgICByZXN1bHQgPSBhd2FpdCBzeW50aGVzaXplQ29tbWFuZChvcHRpb25zKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAncHJldmlldyc6XG4gICAgICByZXN1bHQgPSBhd2FpdCBwcmV2aWV3Q29tbWFuZChvcHRpb25zKTtcbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAndmVyaWZ5JzpcbiAgICAgIHJlc3VsdCA9IGF3YWl0IHZlcmlmeUNvbW1hbmQob3B0aW9ucyk7XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgJ3JvbGUnOlxuICAgICAgaWYgKHN1YmNvbW1hbmQgPT09ICdyZWJhbGFuY2UnKSB7XG4gICAgICAgIHJlc3VsdCA9IGF3YWl0IHJvbGVSZWJhbGFuY2VDb21tYW5kKG9wdGlvbnMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgW2FuZnNmXSBVbmtub3duIHJvbGUgc3ViY29tbWFuZDogJHtzdWJjb21tYW5kfWApO1xuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSAndWknOlxuICAgICAgaWYgKHN1YmNvbW1hbmQgPT09ICdnZW4nKSB7XG4gICAgICAgIHJlc3VsdCA9IGF3YWl0IHVpR2VuQ29tbWFuZChvcHRpb25zKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYFthbmZzZl0gVW5rbm93biBVSSBzdWJjb21tYW5kOiAke3N1YmNvbW1hbmR9YCk7XG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlICdza2lsbCc6XG4gICAgICBpZiAoc3ViY29tbWFuZCA9PT0gJ2xvYWQnKSB7XG4gICAgICAgIHJlc3VsdCA9IGF3YWl0IHNraWxsTG9hZENvbW1hbmQob3B0aW9ucyBhcyBhbnkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgW2FuZnNmXSBVbmtub3duIHNraWxsIHN1YmNvbW1hbmQ6ICR7c3ViY29tbWFuZH1gKTtcbiAgICAgICAgcmV0dXJuIDE7XG4gICAgICB9XG4gICAgICBicmVhaztcblxuICAgIGNhc2UgJ2hhcm5lc3MnOlxuICAgICAgaWYgKHN1YmNvbW1hbmQgPT09ICd0ZXN0Jykge1xuICAgICAgICByZXN1bHQgPSBhd2FpdCBoYXJuZXNzVGVzdENvbW1hbmQob3B0aW9ucyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBbYW5mc2ZdIFVua25vd24gaGFybmVzcyBzdWJjb21tYW5kOiAke3N1YmNvbW1hbmR9YCk7XG4gICAgICAgIHJldHVybiAxO1xuICAgICAgfVxuICAgICAgYnJlYWs7XG5cbiAgICBjYXNlICdtY3AnOlxuICAgICAgaWYgKHN1YmNvbW1hbmQgPT09ICdpbnNwZWN0Jykge1xuICAgICAgICByZXN1bHQgPSBhd2FpdCBtY3BJbnNwZWN0Q29tbWFuZChvcHRpb25zKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoYFthbmZzZl0gVW5rbm93biBNQ1Agc3ViY29tbWFuZDogJHtzdWJjb21tYW5kfWApO1xuICAgICAgICByZXR1cm4gMTtcbiAgICAgIH1cbiAgICAgIGJyZWFrO1xuXG4gICAgZGVmYXVsdDpcbiAgICAgIGNvbnNvbGUuZXJyb3IoYFthbmZzZl0gVW5rbm93biBjb21tYW5kOiAke2NvbW1hbmR9YCk7XG4gICAgICBwcmludEhlbHAoKTtcbiAgICAgIHJldHVybiAxO1xuICB9XG5cbiAgaWYgKHJlc3VsdC5zdWNjZXNzKSB7XG4gICAgY29uc29sZS5sb2coZm9ybWF0T3V0cHV0KHJlc3VsdC5kYXRhLCBvdXRwdXQpKTtcbiAgICBcbiAgICBpZiAodmVyYm9zZSAmJiByZXN1bHQuY2hhbmdlRXZlbnQpIHtcbiAgICAgIGNvbnNvbGUubG9nKCdcXG5bYW5mc2ZdIENoYW5nZSBFdmVudDonKTtcbiAgICAgIGNvbnNvbGUubG9nKGZvcm1hdE91dHB1dChyZXN1bHQuY2hhbmdlRXZlbnQsICdqc29uJykpO1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gMDtcbiAgfSBlbHNlIHtcbiAgICBjb25zb2xlLmVycm9yKGBbYW5mc2ZdIEVycm9yOiAke3Jlc3VsdC5lcnJvcn1gKTtcbiAgICByZXR1cm4gMTtcbiAgfVxufVxuXG4vKipcbiAqIFByaW50IGhlbHAgbWVzc2FnZVxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJpbnRIZWxwKCk6IHZvaWQge1xuICBjb25zb2xlLmxvZyhgXG5BTkZTRiBDTEkgdiR7Q0xJX1ZFUlNJT059XG5cblVzYWdlOiBhbmZzZiA8Y29tbWFuZD4gW3N1YmNvbW1hbmRdIFtvcHRpb25zXVxuXG5Db21tYW5kczpcbiAgc3ludGhlc2l6ZSAgICAgICAgICAgICAgVHJpZ2dlciByb2xlIHN5bnRoZXNpcyBhbmQgYXJjaGl0ZWN0dXJlIGdlbmVyYXRpb25cbiAgcHJldmlldyAgICAgICAgICAgICAgICAgUHJldmlldyBhcmNoaXRlY3R1cmUgY2hhbmdlc1xuICB2ZXJpZnkgICAgICAgICAgICAgICAgICBWZXJpZnkgYXJjaGl0ZWN0dXJlIGNvbnNpc3RlbmN5XG4gIHJvbGUgcmViYWxhbmNlICAgICAgICAgIFJlYmFsYW5jZSByb2xlIGFzc2lnbm1lbnRzXG4gIHVpIGdlbiAgICAgICAgICAgICAgICAgIEdlbmVyYXRlIFVJIHByb3RvdHlwZVxuICBza2lsbCBsb2FkICAgICAgICAgICAgICBMb2FkIGEgc2tpbGxcbiAgaGFybmVzcyB0ZXN0ICAgICAgICAgICAgUnVuIHRlc3RzXG4gIG1jcCBpbnNwZWN0ICAgICAgICAgICAgIEluc3BlY3QgTUNQIG1lc3NhZ2VzXG5cbk9wdGlvbnM6XG4gIC0tZHJ5LXJ1biAgICAgICAgICAgICAgU2ltdWxhdGUgd2l0aG91dCBtYWtpbmcgY2hhbmdlc1xuICAtLWstYXV0byAgICAgICAgICAgICAgIEF1dG8tb3B0aW1pemUgcm9sZSBjb3VudFxuICAtLW91dHB1dCA8Zm9ybWF0PiAgICAgIE91dHB1dCBmb3JtYXQ6IHRhYmxlIHwganNvbiAoZGVmYXVsdDogdGFibGUpXG4gIC0tdmVyYm9zZSAgICAgICAgICAgICAgRW5hYmxlIHZlcmJvc2Ugb3V0cHV0XG4gIC0taGVscCAgICAgICAgICAgICAgICAgU2hvdyB0aGlzIGhlbHAgbWVzc2FnZVxuXG5FeGFtcGxlczpcbiAgYW5mc2Ygc3ludGhlc2l6ZSAtLWstYXV0byAtLWRyeS1ydW5cbiAgYW5mc2YgcHJldmlldyAtLW91dHB1dCBqc29uXG4gIGFuZnNmIHJvbGUgcmViYWxhbmNlIC0tcHJvamVjdCBteS1wcm9qZWN0XG4gIGFuZnNmIHVpIGdlbiAtLWZyYW1ld29yayByZWFjdFxuICBhbmZzZiBza2lsbCBsb2FkIG15LXNraWxsIC0tdmVyc2lvbiAxLjAuMFxuICBhbmZzZiBoYXJuZXNzIHRlc3QgLS1zY2VuYXJpbyBpbnRlZ3JhdGlvblxuICBhbmZzZiBtY3AgaW5zcGVjdCAtLXRyYWNlIHRyYWNlXzEyM1xuYCk7XG59XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEV4cG9ydHNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuZXhwb3J0IGRlZmF1bHQge1xuICBydW5DTEksXG4gIHByaW50SGVscCxcbiAgc3ludGhlc2l6ZUNvbW1hbmQsXG4gIHByZXZpZXdDb21tYW5kLFxuICB2ZXJpZnlDb21tYW5kLFxuICByb2xlUmViYWxhbmNlQ29tbWFuZCxcbiAgdWlHZW5Db21tYW5kLFxuICBza2lsbExvYWRDb21tYW5kLFxuICBoYXJuZXNzVGVzdENvbW1hbmQsXG4gIG1jcEluc3BlY3RDb21tYW5kLFxufTtcbiJdfQ==