"use strict";
/**
 * ASF V4.0 OpenClaw Skill
 *
 * Industrial-grade governance and optimization modules.
 * Version: v1.5.0 - Layer 8.5 Governance Control Plane
 *
 * @module asf-v4
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.asf_v4 = void 0;
// ============================================================================
// Imports from core synthesizer
// ============================================================================
const core_synthesizer_1 = require("./src/core/core-synthesizer");
// ============================================================================
// Imports from UI/UX modules
// ============================================================================
const ui_index_1 = require("./src/ui/ui-index");
// ============================================================================
// Skill Definition
// ============================================================================
exports.asf_v4 = {
    name: 'asf-v4',
    version: '1.4.0',
    description: 'ASF V4.0 工业化增强模块 - 治理门禁 + 成本模型 + 安全优化 + UI/UX 智能合成',
    author: 'ASF V4.0 Team',
    license: 'MIT',
    // ============================================================================
    // Tools - Callable functions
    // ============================================================================
    tools: {
        /**
         * Veto Enforcement Tool
         * Check if changes pass hard/soft veto rules.
         */
        'veto-check': async (params) => {
            const enforcer = params.rules
                ? new core_synthesizer_1.VetoEnforcer(params.rules)
                : (0, core_synthesizer_1.createDefaultVetoEnforcer)();
            return enforcer.enforce({ changes: params.changes }, params.approvals || []);
        },
        /**
         * Ownership Proof Generator
         * Generate verifiable ownership proofs for resources.
         */
        'ownership-proof': async (params) => {
            const resources = params.resources.map(r => (0, core_synthesizer_1.canonicalizeResource)(r));
            const proofs = (0, core_synthesizer_1.generateOwnershipProof)(resources, params.roles, params.rules || []);
            const validation = (0, core_synthesizer_1.validateProofs)(proofs);
            return {
                proofs,
                valid: validation.valid,
                invalidCount: validation.invalidProofs.length,
                singleWriterViolations: validation.singleWriterViolations.length,
            };
        },
        /**
         * Economics Score Calculator
         * Compute role assignment economics score.
         */
        'economics-score': async (params) => {
            return (0, core_synthesizer_1.computeEconomicsScore)(params.assignment, params.dag, params.roles);
        },
        /**
         * Interface Budget Calculator
         * Compute cross-role dependency cost.
         */
        'interface-budget': async (params) => {
            return (0, core_synthesizer_1.computeRoleCost)(params.roles.find(r => r.id === params.roleId), params.assignment, params.dag);
        },
        /**
         * Rework Risk Predictor
         * Predict rework risk for tasks.
         */
        'rework-risk': async (params) => {
            return (0, core_synthesizer_1.predictReworkRisk)(params.task, params.contractChanges, params.historicalData || []);
        },
        /**
         * Hot Contract Analyzer
         * Analyze contract coupling and suggest role count.
         */
        'hot-contract': async (params) => {
            return (0, core_synthesizer_1.determineOptimalRoleCount)(params.tasks, params.graph || {}, params.constraints || { kMin: 2, kMax: 8 });
        },
        /**
         * Conflict Resolver
         * Resolve ownership conflicts with budget-driven decisions.
         */
        'conflict-resolve': async (params) => {
            return (0, core_synthesizer_1.resolveOwnershipConflict)(params.resource, params.conflictingRoles, params.currentBudget, params.budgetLimit);
        },
        /**
         * Safe Optimizer
         * Safe online optimization with knobs and rollback.
         */
        'safe-optimize': async (params) => {
            const optimizer = (0, core_synthesizer_1.createSafeOptimizer)();
            return optimizer.optimize(params.current, params.metrics, params.projectId);
        },
        // ============================================================================
        // UI/UX Tools
        // ============================================================================
        /**
         * UI Component Synthesizer
         * Generate UI components from PRD requirements.
         */
        'ui-synthesize': async (params) => {
            const synthesizer = (0, ui_index_1.createComponentSynthesizer)(params.config || ui_index_1.DEFAULT_UI_CONFIG);
            return synthesizer.synthesize(params.requirement, params.config);
        },
        /**
         * Layout Generator
         * Generate page layouts from user flows.
         */
        'ui-layout': async (params) => {
            const generator = (0, ui_index_1.createLayoutGenerator)();
            return generator.generateFromFlow(params.userFlow, params.requirements);
        },
        /**
         * Design System Mapper
         * Extract design tokens from PRD.
         */
        'ui-design-tokens': async (params) => {
            const mapper = (0, ui_index_1.createDesignSystemMapper)();
            return mapper.extractFromPRD(params.prd);
        },
        /**
         * Interaction Flow Generator
         * Generate interaction flows from user flows.
         */
        'ui-interaction': async (params) => {
            const engine = (0, ui_index_1.createInteractionFlowEngine)();
            return engine.generateFromUserFlow(params.userFlow);
        },
        /**
         * Prototype Generator
         * Generate complete interactive prototype from PRD.
         */
        'ui-prototype': async (params) => {
            const generator = (0, ui_index_1.createPrototypeGenerator)(params.config);
            return generator.generate(params.prd, params.config);
        },
    },
    // ============================================================================
    // Commands - CLI-style commands
    // ============================================================================
    commands: {
        /**
         * Check ASF V4.0 status
         */
        'asf:status': async () => {
            return {
                version: '1.5.0',
                modules: [
                    // Core Governance (V1.4)
                    'veto-enforcement',
                    'economics-scoring',
                    'hot-contract',
                    'ownership-proof',
                    'rework-risk',
                    'safe-optimizer',
                    'conflict-resolver',
                    // UI/UX Synthesis (V1.4)
                    'ui-component-synthesizer',
                    'ui-layout-generator',
                    'ui-design-system-mapper',
                    'ui-interaction-flow',
                    'ui-prototype-generator',
                    // Layer 8.5 Governance Control Plane (NEW)
                    'mcp-bus',
                    'skills-registry',
                    'sandbox-executor',
                    'agent-harness',
                    'canary-deployer',
                    'ab-test-runner',
                    'governance-control-plane',
                    'cli-tools',
                ],
                integration: '100%',
                openclawVersion: '2026.3.24',
                layer85: {
                    mcpBus: 'enabled',
                    skillsRegistry: 'enabled',
                    agentHarness: 'enabled',
                    governanceControlPlane: 'enabled',
                },
                status: 'active',
            };
        },
        /**
         * Layer 8.5 - Run CLI command
         */
        'asf:cli': async (args) => {
            const { runCLI } = await Promise.resolve().then(() => __importStar(require('../../src/cli/anfsf-cli')));
            const result = await runCLI({
                command: args.command,
                subcommand: args.subcommand,
                options: args.options || {},
            });
            return { exitCode: result, layer: '8.5' };
        },
        /**
         * Layer 8.5 - Deploy policy with canary
         */
        'asf:deploy': async (args) => {
            const { GovernanceControlPlane } = await Promise.resolve().then(() => __importStar(require('../../src/governance/control-plane')));
            const controlPlane = new GovernanceControlPlane();
            const result = await controlPlane.deployPolicy(args.policy, args.canaryOptions);
            return result;
        },
        /**
         * Layer 8.5 - Run test scenario
         */
        'asf:test': async (args) => {
            const { GovernanceControlPlane } = await Promise.resolve().then(() => __importStar(require('../../src/governance/control-plane')));
            const controlPlane = new GovernanceControlPlane();
            const result = await controlPlane.runTest(args.scenario);
            return result;
        },
        /**
         * Layer 8.5 - Load skill
         */
        'asf:load-skill': async (args) => {
            const { GovernanceControlPlane } = await Promise.resolve().then(() => __importStar(require('../../src/governance/control-plane')));
            const controlPlane = new GovernanceControlPlane();
            const result = await controlPlane.loadSkill(args.skillName, args.version);
            return result;
        },
        /**
         * Run veto check
         */
        'asf:veto': async (args) => {
            const enforcer = (0, core_synthesizer_1.createDefaultVetoEnforcer)();
            const result = enforcer.enforce({ changes: args.changes || [] }, args.approvals || []);
            return result;
        },
        /**
         * Generate ownership proof
         */
        'asf:proof': async (args) => {
            const proofs = (0, core_synthesizer_1.generateOwnershipProof)(args.resources || [], args.roles || [], core_synthesizer_1.DEFAULT_VETO_RULES);
            return (0, core_synthesizer_1.validateProofs)(proofs);
        },
        /**
         * Calculate economics score
         */
        'asf:score': async (args) => {
            if (!args.assignment || !args.dag || !args.roles) {
                return { error: 'Missing required parameters: assignment, dag, roles' };
            }
            return (0, core_synthesizer_1.computeEconomicsScore)(args.assignment, args.dag, args.roles);
        },
        /**
         * Predict rework risk
         */
        'asf:risk': async (args) => {
            if (!args.task) {
                return { error: 'Missing required parameter: task' };
            }
            return (0, core_synthesizer_1.predictReworkRisk)(args.task, args.changes || [], args.history || []);
        },
        /**
         * Analyze hot contracts
         */
        'asf:hot-contracts': async (args) => {
            if (!args.tasks) {
                return { error: 'Missing required parameter: tasks' };
            }
            return (0, core_synthesizer_1.determineOptimalRoleCount)(args.tasks, {}, args.constraints || { kMin: 2, kMax: 8 });
        },
        // =========================================================================
        // 推荐技能集成 (OpenClaw v2026.4.5)
        // =========================================================================
        /**
         * 获取推荐技能状态
         */
        'asf:recommended-skills': async () => {
            return {
                core: [
                    { name: 'coding-agent', status: 'ready', priority: 'P0', reason: '代码生成/重构/PR 审核' },
                    { name: 'skill-creator', status: 'ready', priority: 'P0', reason: 'ANFSF 自身技能开发' },
                    { name: 'clawhub', status: 'ready', priority: 'P0', reason: '技能分发与更新' },
                    { name: 'github', status: 'ready', priority: 'P0', reason: 'GitHub 仓库操作' },
                    { name: 'gh-issues', status: 'ready', priority: 'P0', reason: 'Issue 自动处理' },
                    { name: 'healthcheck', status: 'ready', priority: 'P0', reason: '安全审计' },
                ],
                enhanced: [
                    { name: 'oracle', status: 'ready', priority: 'P1', reason: 'Prompt 优化' },
                    { name: 'openai-whisper-api', status: 'ready', priority: 'P1', reason: '语音输入' },
                    { name: 'session-logs', status: 'ready', priority: 'P1', reason: '会话日志' },
                    { name: 'node-connect', status: 'ready', priority: 'P1', reason: '多节点部署' },
                    { name: 'video-frames', status: 'ready', priority: 'P2', reason: '视频帧提取' },
                ],
                pending: [
                    { name: 'model-usage', status: 'needs-setup', priority: 'P1', reason: '需要 macOS' },
                ],
                summary: {
                    total: 16,
                    ready: 15,
                    needsSetup: 1,
                    integrationRate: '93.75%'
                }
            };
        },
        /**
         * 调用 coding-agent (P0 强烈推荐)
         */
        'asf:code': async (args) => {
            return {
                skill: 'coding-agent',
                task: args.task,
                model: args.model || 'default',
                status: 'delegated',
                message: 'Use coding-agent skill directly via openclaw'
            };
        },
        /**
         * 调用 github 技能 (P0 强烈推荐)
         */
        'asf:github': async (args) => {
            return {
                skill: 'github',
                action: args.action,
                params: args.params,
                status: 'delegated',
                message: 'Use github skill directly via openclaw'
            };
        },
        /**
         * 调用 gh-issues 技能 (P0 强烈推荐)
         */
        'asf:issues': async (args) => {
            return {
                skill: 'gh-issues',
                repo: args.repo,
                label: args.label,
                limit: args.limit || 5,
                status: 'delegated',
                message: 'Use gh-issues skill directly via openclaw'
            };
        },
    },
    // ============================================================================
    // Configuration
    // ============================================================================
    config: {
        vetoRules: 'default', // 'default' | 'strict' | 'custom'
        economicsWeights: 'default', // 'default' | 'custom'
        safeOptimizer: true, // Enable safe online optimizer
        cooldownMs: 1800000, // 30 minutes
        failureThreshold: 2,
    },
    // ============================================================================
    // Lifecycle Hooks
    // ============================================================================
    hooks: {
        /**
         * Called when skill is loaded
         */
        onLoad: async () => {
            console.log('[asf-v4] Skill loaded');
            return { success: true };
        },
        /**
         * Called before each agent turn
         */
        onTurn: async (context) => {
            // Could inject veto checks here
            return { success: true };
        },
        /**
         * Called when skill is unloaded
         */
        onUnload: async () => {
            console.log('[asf-v4] Skill unloaded');
            return { success: true };
        },
    },
};
// ============================================================================
// Default Export
// ============================================================================
exports.default = exports.asf_v4;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7R0FPRzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUgsK0VBQStFO0FBQy9FLGdDQUFnQztBQUNoQywrRUFBK0U7QUFDL0Usa0VBK0JxQztBQUVyQywrRUFBK0U7QUFDL0UsNkJBQTZCO0FBQzdCLCtFQUErRTtBQUMvRSxnREFxQjJCO0FBRTNCLCtFQUErRTtBQUMvRSxtQkFBbUI7QUFDbkIsK0VBQStFO0FBQ2xFLFFBQUEsTUFBTSxHQUFHO0lBQ3BCLElBQUksRUFBRSxRQUFRO0lBQ2QsT0FBTyxFQUFFLE9BQU87SUFDaEIsV0FBVyxFQUFFLG9EQUFvRDtJQUNqRSxNQUFNLEVBQUUsZUFBZTtJQUN2QixPQUFPLEVBQUUsS0FBSztJQUVkLCtFQUErRTtJQUMvRSw2QkFBNkI7SUFDN0IsK0VBQStFO0lBQy9FLEtBQUssRUFBRTtRQUNMOzs7V0FHRztRQUNILFlBQVksRUFBRSxLQUFLLEVBQUUsTUFJcEIsRUFBRSxFQUFFO1lBQ0gsTUFBTSxRQUFRLEdBQUcsTUFBTSxDQUFDLEtBQUs7Z0JBQzNCLENBQUMsQ0FBQyxJQUFJLCtCQUFZLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztnQkFDaEMsQ0FBQyxDQUFDLElBQUEsNENBQXlCLEdBQUUsQ0FBQztZQUVoQyxPQUFPLFFBQVEsQ0FBQyxPQUFPLENBQ3JCLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLEVBQUUsRUFDM0IsTUFBTSxDQUFDLFNBQVMsSUFBSSxFQUFFLENBQ3ZCLENBQUM7UUFDSixDQUFDO1FBRUQ7OztXQUdHO1FBQ0gsaUJBQWlCLEVBQUUsS0FBSyxFQUFFLE1BSXpCLEVBQUUsRUFBRTtZQUNILE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENB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QUksRUFBRSxDQUFDO1FBQzNCLENBQUM7UUFFRDs7V0FFRztRQUNILE1BQU0sRUFBRSxLQUFLLEVBQUUsT0FBWSxFQUFFLEVBQUU7WUFDN0IsZ0NBQWdDO1lBQ2hDLE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUM7UUFDM0IsQ0FBQztRQUVEOztXQUVHO1FBQ0gsUUFBUSxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ25CLE9BQU8sQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQztZQUN2QyxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxDQUFDO1FBQzNCLENBQUM7S0FDRjtDQUNGLENBQUM7QUFFRiwrRUFBK0U7QUFDL0UsaUJBQWlCO0FBQ2pCLCtFQUErRTtBQUMvRSxrQkFBZSxjQUFNLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEFTRiBWNC4wIE9wZW5DbGF3IFNraWxsXG4gKiBcbiAqIEluZHVzdHJpYWwtZ3JhZGUgZ292ZXJuYW5jZSBhbmQgb3B0aW1pemF0aW9uIG1vZHVsZXMuXG4gKiBWZXJzaW9uOiB2MS41LjAgLSBMYXllciA4LjUgR292ZXJuYW5jZSBDb250cm9sIFBsYW5lXG4gKiBcbiAqIEBtb2R1bGUgYXNmLXY0XG4gKi9cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSW1wb3J0cyBmcm9tIGNvcmUgc3ludGhlc2l6ZXJcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbmltcG9ydCB7XG4gIC8vIFZldG8gRW5mb3JjZW1lbnRcbiAgVmV0b0VuZm9yY2VyLFxuICBjcmVhdGVEZWZhdWx0VmV0b0VuZm9yY2VyLFxuICBERUZBVUxUX1ZFVE9fUlVMRVMsXG4gIFxuICAvLyBFY29ub21pY3MgU2NvcmluZ1xuICBjb21wdXRlUm9sZUNvc3QsXG4gIGNvbXB1dGVFY29ub21pY3NTY29yZSxcbiAgY29tcHV0ZUludGVyZmFjZUNvc3QsXG4gIFxuICAvLyBIb3QgQ29udHJhY3QgQW5hbHlzaXNcbiAgZGV0ZXJtaW5lT3B0aW1hbFJvbGVDb3VudCxcbiAgY29tcHV0ZUNvbnRyYWN0Q291cGxpbmdCb3VuZCxcbiAgXG4gIC8vIE93bmVyc2hpcCBQcm9vZlxuICBnZW5lcmF0ZU93bmVyc2hpcFByb29mLFxuICB2YWxpZGF0ZVByb29mcyxcbiAgY2Fub25pY2FsaXplUmVzb3VyY2UsXG4gIFxuICAvLyBSZXdvcmsgUmlza1xuICBwcmVkaWN0UmV3b3JrUmlzayxcbiAgY29tcHV0ZVRvdGFsUmV3b3JrUmlzayxcbiAgXG4gIC8vIFNhZmUgT3B0aW1pemVyXG4gIFNhZmVPbmxpbmVPcHRpbWl6ZXIsXG4gIGNyZWF0ZVNhZmVPcHRpbWl6ZXIsXG4gIFxuICAvLyBDb25mbGljdCBSZXNvbHZlclxuICByZXNvbHZlT3duZXJzaGlwQ29uZmxpY3QsXG4gIGdlbmVyYXRlQ29uZmxpY3RSZXBvcnQsXG59IGZyb20gJy4vc3JjL2NvcmUvY29yZS1zeW50aGVzaXplcic7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEltcG9ydHMgZnJvbSBVSS9VWCBtb2R1bGVzXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5pbXBvcnQge1xuICAvLyBDb21wb25lbnQgU3ludGhlc2l6ZXJcbiAgVUlDb21wb25lbnRTeW50aGVzaXplcixcbiAgY3JlYXRlQ29tcG9uZW50U3ludGhlc2l6ZXIsXG4gIERFRkFVTFRfVUlfQ09ORklHLFxuICBcbiAgLy8gTGF5b3V0IEdlbmVyYXRvclxuICBMYXlvdXRHZW5lcmF0b3IsXG4gIGNyZWF0ZUxheW91dEdlbmVyYXRvcixcbiAgXG4gIC8vIERlc2lnbiBTeXN0ZW0gTWFwcGVyXG4gIERlc2lnblN5c3RlbU1hcHBlcixcbiAgY3JlYXRlRGVzaWduU3lzdGVtTWFwcGVyLFxuICBcbiAgLy8gSW50ZXJhY3Rpb24gRmxvdyBFbmdpbmVcbiAgSW50ZXJhY3Rpb25GbG93RW5naW5lLFxuICBjcmVhdGVJbnRlcmFjdGlvbkZsb3dFbmdpbmUsXG4gIFxuICAvLyBQcm90b3R5cGUgR2VuZXJhdG9yXG4gIFByb3RvdHlwZUdlbmVyYXRvcixcbiAgY3JlYXRlUHJvdG90eXBlR2VuZXJhdG9yLFxufSBmcm9tICcuL3NyYy91aS91aS1pbmRleCc7XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFNraWxsIERlZmluaXRpb25cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbmV4cG9ydCBjb25zdCBhc2ZfdjQgPSB7XG4gIG5hbWU6ICdhc2YtdjQnLFxuICB2ZXJzaW9uOiAnMS40LjAnLFxuICBkZXNjcmlwdGlvbjogJ0FTRiBWNC4wIOW3peS4muWMluWinuW8uuaooeWdlyAtIOayu+eQhumXqOemgSArIOaIkOacrOaooeWeiyArIOWuieWFqOS8mOWMliArIFVJL1VYIOaZuuiDveWQiOaIkCcsXG4gIGF1dGhvcjogJ0FTRiBWNC4wIFRlYW0nLFxuICBsaWNlbnNlOiAnTUlUJyxcbiAgXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gVG9vbHMgLSBDYWxsYWJsZSBmdW5jdGlvbnNcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICB0b29sczoge1xuICAgIC8qKlxuICAgICAqIFZldG8gRW5mb3JjZW1lbnQgVG9vbFxuICAgICAqIENoZWNrIGlmIGNoYW5nZXMgcGFzcyBoYXJkL3NvZnQgdmV0byBydWxlcy5cbiAgICAgKi9cbiAgICAndmV0by1jaGVjayc6IGFzeW5jIChwYXJhbXM6IHtcbiAgICAgIGNoYW5nZXM6IEFycmF5PHsgcmVzb3VyY2VUeXBlOiBzdHJpbmc7IHJlc291cmNlUGF0aDogc3RyaW5nOyBhY3Rpb246IHN0cmluZyB9PjtcbiAgICAgIGFwcHJvdmFscz86IEFycmF5PHsgYXV0aG9yaXR5OiBzdHJpbmc7IHNjb3BlOiBzdHJpbmc7IHN0YXR1czogc3RyaW5nIH0+O1xuICAgICAgcnVsZXM/OiBhbnlbXTtcbiAgICB9KSA9PiB7XG4gICAgICBjb25zdCBlbmZvcmNlciA9IHBhcmFtcy5ydWxlcyBcbiAgICAgICAgPyBuZXcgVmV0b0VuZm9yY2VyKHBhcmFtcy5ydWxlcylcbiAgICAgICAgOiBjcmVhdGVEZWZhdWx0VmV0b0VuZm9yY2VyKCk7XG4gICAgICBcbiAgICAgIHJldHVybiBlbmZvcmNlci5lbmZvcmNlKFxuICAgICAgICB7IGNoYW5nZXM6IHBhcmFtcy5jaGFuZ2VzIH0sXG4gICAgICAgIHBhcmFtcy5hcHByb3ZhbHMgfHwgW11cbiAgICAgICk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBPd25lcnNoaXAgUHJvb2YgR2VuZXJhdG9yXG4gICAgICogR2VuZXJhdGUgdmVyaWZpYWJsZSBvd25lcnNoaXAgcHJvb2ZzIGZvciByZXNvdXJjZXMuXG4gICAgICovXG4gICAgJ293bmVyc2hpcC1wcm9vZic6IGFzeW5jIChwYXJhbXM6IHtcbiAgICAgIHJlc291cmNlczogQXJyYXk8eyB0eXBlOiBzdHJpbmc7IHBhdGg6IHN0cmluZzsgc3VicGF0aD86IHN0cmluZyB9PjtcbiAgICAgIHJvbGVzOiBBcnJheTx7IGlkOiBzdHJpbmcgfT47XG4gICAgICBydWxlcz86IGFueVtdO1xuICAgIH0pID0+IHtcbiAgICAgIGNvbnN0IHJlc291cmNlcyA9IHBhcmFtcy5yZXNvdXJjZXMubWFwKHIgPT4gY2Fub25pY2FsaXplUmVzb3VyY2UociBhcyBhbnkpKTtcbiAgICAgIGNvbnN0IHByb29mcyA9IGdlbmVyYXRlT3duZXJzaGlwUHJvb2YocmVzb3VyY2VzLCBwYXJhbXMucm9sZXMsIHBhcmFtcy5ydWxlcyB8fCBbXSk7XG4gICAgICBjb25zdCB2YWxpZGF0aW9uID0gdmFsaWRhdGVQcm9vZnMocHJvb2ZzKTtcbiAgICAgIFxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgcHJvb2ZzLFxuICAgICAgICB2YWxpZDogdmFsaWRhdGlvbi52YWxpZCxcbiAgICAgICAgaW52YWxpZENvdW50OiB2YWxpZGF0aW9uLmludmFsaWRQcm9vZnMubGVuZ3RoLFxuICAgICAgICBzaW5nbGVXcml0ZXJWaW9sYXRpb25zOiB2YWxpZGF0aW9uLnNpbmdsZVdyaXRlclZpb2xhdGlvbnMubGVuZ3RoLFxuICAgICAgfTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEVjb25vbWljcyBTY29yZSBDYWxjdWxhdG9yXG4gICAgICogQ29tcHV0ZSByb2xlIGFzc2lnbm1lbnQgZWNvbm9taWNzIHNjb3JlLlxuICAgICAqL1xuICAgICdlY29ub21pY3Mtc2NvcmUnOiBhc3luYyAocGFyYW1zOiB7XG4gICAgICBhc3NpZ25tZW50OiB7IHRhc2tUb1JvbGU6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gfTtcbiAgICAgIGRhZzogeyB0YXNrczogYW55W107IGVkZ2VzOiBhbnlbXSB9O1xuICAgICAgcm9sZXM6IEFycmF5PHsgaWQ6IHN0cmluZzsgZWNvbm9taWNzPzogYW55IH0+O1xuICAgIH0pID0+IHtcbiAgICAgIHJldHVybiBjb21wdXRlRWNvbm9taWNzU2NvcmUoXG4gICAgICAgIHBhcmFtcy5hc3NpZ25tZW50LFxuICAgICAgICBwYXJhbXMuZGFnLFxuICAgICAgICBwYXJhbXMucm9sZXNcbiAgICAgICk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbnRlcmZhY2UgQnVkZ2V0IENhbGN1bGF0b3JcbiAgICAgKiBDb21wdXRlIGNyb3NzLXJvbGUgZGVwZW5kZW5jeSBjb3N0LlxuICAgICAqL1xuICAgICdpbnRlcmZhY2UtYnVkZ2V0JzogYXN5bmMgKHBhcmFtczoge1xuICAgICAgcm9sZUlkOiBzdHJpbmc7XG4gICAgICBhc3NpZ25tZW50OiB7IHRhc2tUb1JvbGU6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gfTtcbiAgICAgIGRhZzogeyB0YXNrczogYW55W107IGVkZ2VzOiBhbnlbXSB9O1xuICAgICAgcm9sZXM6IGFueVtdO1xuICAgIH0pID0+IHtcbiAgICAgIHJldHVybiBjb21wdXRlUm9sZUNvc3QoXG4gICAgICAgIHBhcmFtcy5yb2xlcy5maW5kKHIgPT4gci5pZCA9PT0gcGFyYW1zLnJvbGVJZCksXG4gICAgICAgIHBhcmFtcy5hc3NpZ25tZW50LFxuICAgICAgICBwYXJhbXMuZGFnXG4gICAgICApO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUmV3b3JrIFJpc2sgUHJlZGljdG9yXG4gICAgICogUHJlZGljdCByZXdvcmsgcmlzayBmb3IgdGFza3MuXG4gICAgICovXG4gICAgJ3Jld29yay1yaXNrJzogYXN5bmMgKHBhcmFtczoge1xuICAgICAgdGFzazogeyBpZDogc3RyaW5nOyBmZWF0dXJlSWQ/OiBzdHJpbmc7IHJpc2s/OiBzdHJpbmcgfTtcbiAgICAgIGNvbnRyYWN0Q2hhbmdlczogQXJyYXk8eyBjb250cmFjdElkOiBzdHJpbmc7IGJyZWFraW5nOiBib29sZWFuOyBkZXByZWNhdGVkPzogYm9vbGVhbiB9PjtcbiAgICAgIGhpc3RvcmljYWxEYXRhPzogYW55W107XG4gICAgfSkgPT4ge1xuICAgICAgcmV0dXJuIHByZWRpY3RSZXdvcmtSaXNrKFxuICAgICAgICBwYXJhbXMudGFzayxcbiAgICAgICAgcGFyYW1zLmNvbnRyYWN0Q2hhbmdlcyxcbiAgICAgICAgcGFyYW1zLmhpc3RvcmljYWxEYXRhIHx8IFtdXG4gICAgICApO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogSG90IENvbnRyYWN0IEFuYWx5emVyXG4gICAgICogQW5hbHl6ZSBjb250cmFjdCBjb3VwbGluZyBhbmQgc3VnZ2VzdCByb2xlIGNvdW50LlxuICAgICAqL1xuICAgICdob3QtY29udHJhY3QnOiBhc3luYyAocGFyYW1zOiB7XG4gICAgICB0YXNrczogQXJyYXk8eyBpZDogc3RyaW5nOyBjb250cmFjdElkcz86IHN0cmluZ1tdIH0+O1xuICAgICAgZ3JhcGg/OiBhbnk7XG4gICAgICBjb25zdHJhaW50cz86IHsga01pbjogbnVtYmVyOyBrTWF4OiBudW1iZXIgfTtcbiAgICB9KSA9PiB7XG4gICAgICByZXR1cm4gZGV0ZXJtaW5lT3B0aW1hbFJvbGVDb3VudChcbiAgICAgICAgcGFyYW1zLnRhc2tzLFxuICAgICAgICBwYXJhbXMuZ3JhcGggfHwge30sXG4gICAgICAgIHBhcmFtcy5jb25zdHJhaW50cyB8fCB7IGtNaW46IDIsIGtNYXg6IDggfVxuICAgICAgKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENvbmZsaWN0IFJlc29sdmVyXG4gICAgICogUmVzb2x2ZSBvd25lcnNoaXAgY29uZmxpY3RzIHdpdGggYnVkZ2V0LWRyaXZlbiBkZWNpc2lvbnMuXG4gICAgICovXG4gICAgJ2NvbmZsaWN0LXJlc29sdmUnOiBhc3luYyAocGFyYW1zOiB7XG4gICAgICByZXNvdXJjZTogeyBpZDogc3RyaW5nOyB0eXBlOiBzdHJpbmc7IHBhdGg6IHN0cmluZyB9O1xuICAgICAgY29uZmxpY3RpbmdSb2xlczogQXJyYXk8eyBpZDogc3RyaW5nIH0+O1xuICAgICAgY3VycmVudEJ1ZGdldDogbnVtYmVyO1xuICAgICAgYnVkZ2V0TGltaXQ6IG51bWJlcjtcbiAgICB9KSA9PiB7XG4gICAgICByZXR1cm4gcmVzb2x2ZU93bmVyc2hpcENvbmZsaWN0KFxuICAgICAgICBwYXJhbXMucmVzb3VyY2UsXG4gICAgICAgIHBhcmFtcy5jb25mbGljdGluZ1JvbGVzLFxuICAgICAgICBwYXJhbXMuY3VycmVudEJ1ZGdldCxcbiAgICAgICAgcGFyYW1zLmJ1ZGdldExpbWl0XG4gICAgICApO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogU2FmZSBPcHRpbWl6ZXJcbiAgICAgKiBTYWZlIG9ubGluZSBvcHRpbWl6YXRpb24gd2l0aCBrbm9icyBhbmQgcm9sbGJhY2suXG4gICAgICovXG4gICAgJ3NhZmUtb3B0aW1pemUnOiBhc3luYyAocGFyYW1zOiB7XG4gICAgICBjdXJyZW50OiBhbnk7XG4gICAgICBtZXRyaWNzOiB7XG4gICAgICAgIGZhaWx1cmVSYXRlOiBudW1iZXI7XG4gICAgICAgIHByZXZpZXdGYWlsdXJlczogbnVtYmVyO1xuICAgICAgICBxdWV1ZUxlbmd0aDogbnVtYmVyO1xuICAgICAgICB1dGlsaXphdGlvbjogbnVtYmVyO1xuICAgICAgICBpbnRlcmZhY2VDb3N0OiBudW1iZXI7XG4gICAgICAgIGJ1ZGdldDogbnVtYmVyO1xuICAgICAgfTtcbiAgICAgIHByb2plY3RJZDogc3RyaW5nO1xuICAgIH0pID0+IHtcbiAgICAgIGNvbnN0IG9wdGltaXplciA9IGNyZWF0ZVNhZmVPcHRpbWl6ZXIoKTtcbiAgICAgIHJldHVybiBvcHRpbWl6ZXIub3B0aW1pemUocGFyYW1zLmN1cnJlbnQsIHBhcmFtcy5tZXRyaWNzLCBwYXJhbXMucHJvamVjdElkKTtcbiAgICB9LFxuICAgIFxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyBVSS9VWCBUb29sc1xuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICBcbiAgICAvKipcbiAgICAgKiBVSSBDb21wb25lbnQgU3ludGhlc2l6ZXJcbiAgICAgKiBHZW5lcmF0ZSBVSSBjb21wb25lbnRzIGZyb20gUFJEIHJlcXVpcmVtZW50cy5cbiAgICAgKi9cbiAgICAndWktc3ludGhlc2l6ZSc6IGFzeW5jIChwYXJhbXM6IHtcbiAgICAgIHJlcXVpcmVtZW50OiB7IGlkOiBzdHJpbmc7IGRlc2NyaXB0aW9uOiBzdHJpbmc7IHByaW9yaXR5OiBzdHJpbmc7IGFjY2VwdGFuY2VDcml0ZXJpYTogc3RyaW5nW10gfTtcbiAgICAgIGNvbmZpZz86IHsgZnJhbWV3b3JrOiBzdHJpbmc7IHVpTGlicmFyeTogc3RyaW5nOyBzdHlsaW5nOiBzdHJpbmcgfTtcbiAgICB9KSA9PiB7XG4gICAgICBjb25zdCBzeW50aGVzaXplciA9IGNyZWF0ZUNvbXBvbmVudFN5bnRoZXNpemVyKHBhcmFtcy5jb25maWcgfHwgREVGQVVMVF9VSV9DT05GSUcpO1xuICAgICAgcmV0dXJuIHN5bnRoZXNpemVyLnN5bnRoZXNpemUocGFyYW1zLnJlcXVpcmVtZW50LCBwYXJhbXMuY29uZmlnKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExheW91dCBHZW5lcmF0b3JcbiAgICAgKiBHZW5lcmF0ZSBwYWdlIGxheW91dHMgZnJvbSB1c2VyIGZsb3dzLlxuICAgICAqL1xuICAgICd1aS1sYXlvdXQnOiBhc3luYyAocGFyYW1zOiB7XG4gICAgICB1c2VyRmxvdzogYW55O1xuICAgICAgcmVxdWlyZW1lbnRzOiBhbnlbXTtcbiAgICB9KSA9PiB7XG4gICAgICBjb25zdCBnZW5lcmF0b3IgPSBjcmVhdGVMYXlvdXRHZW5lcmF0b3IoKTtcbiAgICAgIHJldHVybiBnZW5lcmF0b3IuZ2VuZXJhdGVGcm9tRmxvdyhwYXJhbXMudXNlckZsb3csIHBhcmFtcy5yZXF1aXJlbWVudHMpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogRGVzaWduIFN5c3RlbSBNYXBwZXJcbiAgICAgKiBFeHRyYWN0IGRlc2lnbiB0b2tlbnMgZnJvbSBQUkQuXG4gICAgICovXG4gICAgJ3VpLWRlc2lnbi10b2tlbnMnOiBhc3luYyAocGFyYW1zOiB7XG4gICAgICBwcmQ6IGFueTtcbiAgICB9KSA9PiB7XG4gICAgICBjb25zdCBtYXBwZXIgPSBjcmVhdGVEZXNpZ25TeXN0ZW1NYXBwZXIoKTtcbiAgICAgIHJldHVybiBtYXBwZXIuZXh0cmFjdEZyb21QUkQocGFyYW1zLnByZCk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBJbnRlcmFjdGlvbiBGbG93IEdlbmVyYXRvclxuICAgICAqIEdlbmVyYXRlIGludGVyYWN0aW9uIGZsb3dzIGZyb20gdXNlciBmbG93cy5cbiAgICAgKi9cbiAgICAndWktaW50ZXJhY3Rpb24nOiBhc3luYyAocGFyYW1zOiB7XG4gICAgICB1c2VyRmxvdzogYW55O1xuICAgIH0pID0+IHtcbiAgICAgIGNvbnN0IGVuZ2luZSA9IGNyZWF0ZUludGVyYWN0aW9uRmxvd0VuZ2luZSgpO1xuICAgICAgcmV0dXJuIGVuZ2luZS5nZW5lcmF0ZUZyb21Vc2VyRmxvdyhwYXJhbXMudXNlckZsb3cpO1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogUHJvdG90eXBlIEdlbmVyYXRvclxuICAgICAqIEdlbmVyYXRlIGNvbXBsZXRlIGludGVyYWN0aXZlIHByb3RvdHlwZSBmcm9tIFBSRC5cbiAgICAgKi9cbiAgICAndWktcHJvdG90eXBlJzogYXN5bmMgKHBhcmFtczoge1xuICAgICAgcHJkOiBhbnk7XG4gICAgICBjb25maWc/OiBhbnk7XG4gICAgfSkgPT4ge1xuICAgICAgY29uc3QgZ2VuZXJhdG9yID0gY3JlYXRlUHJvdG90eXBlR2VuZXJhdG9yKHBhcmFtcy5jb25maWcpO1xuICAgICAgcmV0dXJuIGdlbmVyYXRvci5nZW5lcmF0ZShwYXJhbXMucHJkLCBwYXJhbXMuY29uZmlnKTtcbiAgICB9LFxuICB9LFxuICBcbiAgLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAvLyBDb21tYW5kcyAtIENMSS1zdHlsZSBjb21tYW5kc1xuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIGNvbW1hbmRzOiB7XG4gICAgLyoqXG4gICAgICogQ2hlY2sgQVNGIFY0LjAgc3RhdHVzXG4gICAgICovXG4gICAgJ2FzZjpzdGF0dXMnOiBhc3luYyAoKSA9PiB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICB2ZXJzaW9uOiAnMS41LjAnLFxuICAgICAgICBtb2R1bGVzOiBbXG4gICAgICAgICAgLy8gQ29yZSBHb3Zlcm5hbmNlIChWMS40KVxuICAgICAgICAgICd2ZXRvLWVuZm9yY2VtZW50JyxcbiAgICAgICAgICAnZWNvbm9taWNzLXNjb3JpbmcnLFxuICAgICAgICAgICdob3QtY29udHJhY3QnLFxuICAgICAgICAgICdvd25lcnNoaXAtcHJvb2YnLFxuICAgICAgICAgICdyZXdvcmstcmlzaycsXG4gICAgICAgICAgJ3NhZmUtb3B0aW1pemVyJyxcbiAgICAgICAgICAnY29uZmxpY3QtcmVzb2x2ZXInLFxuICAgICAgICAgIC8vIFVJL1VYIFN5bnRoZXNpcyAoVjEuNClcbiAgICAgICAgICAndWktY29tcG9uZW50LXN5bnRoZXNpemVyJyxcbiAgICAgICAgICAndWktbGF5b3V0LWdlbmVyYXRvcicsXG4gICAgICAgICAgJ3VpLWRlc2lnbi1zeXN0ZW0tbWFwcGVyJyxcbiAgICAgICAgICAndWktaW50ZXJhY3Rpb24tZmxvdycsXG4gICAgICAgICAgJ3VpLXByb3RvdHlwZS1nZW5lcmF0b3InLFxuICAgICAgICAgIC8vIExheWVyIDguNSBHb3Zlcm5hbmNlIENvbnRyb2wgUGxhbmUgKE5FVylcbiAgICAgICAgICAnbWNwLWJ1cycsXG4gICAgICAgICAgJ3NraWxscy1yZWdpc3RyeScsXG4gICAgICAgICAgJ3NhbmRib3gtZXhlY3V0b3InLFxuICAgICAgICAgICdhZ2VudC1oYXJuZXNzJyxcbiAgICAgICAgICAnY2FuYXJ5LWRlcGxveWVyJyxcbiAgICAgICAgICAnYWItdGVzdC1ydW5uZXInLFxuICAgICAgICAgICdnb3Zlcm5hbmNlLWNvbnRyb2wtcGxhbmUnLFxuICAgICAgICAgICdjbGktdG9vbHMnLFxuICAgICAgICBdLFxuICAgICAgICBpbnRlZ3JhdGlvbjogJzEwMCUnLFxuICAgICAgICBvcGVuY2xhd1ZlcnNpb246ICcyMDI2LjMuMjQnLFxuICAgICAgICBsYXllcjg1OiB7XG4gICAgICAgICAgbWNwQnVzOiAnZW5hYmxlZCcsXG4gICAgICAgICAgc2tpbGxzUmVnaXN0cnk6ICdlbmFibGVkJyxcbiAgICAgICAgICBhZ2VudEhhcm5lc3M6ICdlbmFibGVkJyxcbiAgICAgICAgICBnb3Zlcm5hbmNlQ29udHJvbFBsYW5lOiAnZW5hYmxlZCcsXG4gICAgICAgIH0sXG4gICAgICAgIHN0YXR1czogJ2FjdGl2ZScsXG4gICAgICB9O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTGF5ZXIgOC41IC0gUnVuIENMSSBjb21tYW5kXG4gICAgICovXG4gICAgJ2FzZjpjbGknOiBhc3luYyAoYXJnczogeyBjb21tYW5kOiBzdHJpbmc7IHN1YmNvbW1hbmQ/OiBzdHJpbmc7IG9wdGlvbnM/OiBhbnkgfSkgPT4ge1xuICAgICAgY29uc3QgeyBydW5DTEkgfSA9IGF3YWl0IGltcG9ydCgnLi4vLi4vc3JjL2NsaS9hbmZzZi1jbGknKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHJ1bkNMSSh7XG4gICAgICAgIGNvbW1hbmQ6IGFyZ3MuY29tbWFuZCxcbiAgICAgICAgc3ViY29tbWFuZDogYXJncy5zdWJjb21tYW5kLFxuICAgICAgICBvcHRpb25zOiBhcmdzLm9wdGlvbnMgfHwge30sXG4gICAgICB9KTtcbiAgICAgIHJldHVybiB7IGV4aXRDb2RlOiByZXN1bHQsIGxheWVyOiAnOC41JyB9O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogTGF5ZXIgOC41IC0gRGVwbG95IHBvbGljeSB3aXRoIGNhbmFyeVxuICAgICAqL1xuICAgICdhc2Y6ZGVwbG95JzogYXN5bmMgKGFyZ3M6IHsgcG9saWN5OiBhbnk7IGNhbmFyeU9wdGlvbnM/OiBhbnkgfSkgPT4ge1xuICAgICAgY29uc3QgeyBHb3Zlcm5hbmNlQ29udHJvbFBsYW5lIH0gPSBhd2FpdCBpbXBvcnQoJy4uLy4uL3NyYy9nb3Zlcm5hbmNlL2NvbnRyb2wtcGxhbmUnKTtcbiAgICAgIGNvbnN0IGNvbnRyb2xQbGFuZSA9IG5ldyBHb3Zlcm5hbmNlQ29udHJvbFBsYW5lKCk7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBjb250cm9sUGxhbmUuZGVwbG95UG9saWN5KGFyZ3MucG9saWN5LCBhcmdzLmNhbmFyeU9wdGlvbnMpO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExheWVyIDguNSAtIFJ1biB0ZXN0IHNjZW5hcmlvXG4gICAgICovXG4gICAgJ2FzZjp0ZXN0JzogYXN5bmMgKGFyZ3M6IHsgc2NlbmFyaW86IGFueSB9KSA9PiB7XG4gICAgICBjb25zdCB7IEdvdmVybmFuY2VDb250cm9sUGxhbmUgfSA9IGF3YWl0IGltcG9ydCgnLi4vLi4vc3JjL2dvdmVybmFuY2UvY29udHJvbC1wbGFuZScpO1xuICAgICAgY29uc3QgY29udHJvbFBsYW5lID0gbmV3IEdvdmVybmFuY2VDb250cm9sUGxhbmUoKTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGNvbnRyb2xQbGFuZS5ydW5UZXN0KGFyZ3Muc2NlbmFyaW8pO1xuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIExheWVyIDguNSAtIExvYWQgc2tpbGxcbiAgICAgKi9cbiAgICAnYXNmOmxvYWQtc2tpbGwnOiBhc3luYyAoYXJnczogeyBza2lsbE5hbWU6IHN0cmluZzsgdmVyc2lvbjogc3RyaW5nIH0pID0+IHtcbiAgICAgIGNvbnN0IHsgR292ZXJuYW5jZUNvbnRyb2xQbGFuZSB9ID0gYXdhaXQgaW1wb3J0KCcuLi8uLi9zcmMvZ292ZXJuYW5jZS9jb250cm9sLXBsYW5lJyk7XG4gICAgICBjb25zdCBjb250cm9sUGxhbmUgPSBuZXcgR292ZXJuYW5jZUNvbnRyb2xQbGFuZSgpO1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgY29udHJvbFBsYW5lLmxvYWRTa2lsbChhcmdzLnNraWxsTmFtZSwgYXJncy52ZXJzaW9uKTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBSdW4gdmV0byBjaGVja1xuICAgICAqL1xuICAgICdhc2Y6dmV0byc6IGFzeW5jIChhcmdzOiB7IGNoYW5nZXM/OiBhbnlbXTsgYXBwcm92YWxzPzogYW55W10gfSkgPT4ge1xuICAgICAgY29uc3QgZW5mb3JjZXIgPSBjcmVhdGVEZWZhdWx0VmV0b0VuZm9yY2VyKCk7XG4gICAgICBjb25zdCByZXN1bHQgPSBlbmZvcmNlci5lbmZvcmNlKFxuICAgICAgICB7IGNoYW5nZXM6IGFyZ3MuY2hhbmdlcyB8fCBbXSB9LFxuICAgICAgICBhcmdzLmFwcHJvdmFscyB8fCBbXVxuICAgICAgKTtcbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBHZW5lcmF0ZSBvd25lcnNoaXAgcHJvb2ZcbiAgICAgKi9cbiAgICAnYXNmOnByb29mJzogYXN5bmMgKGFyZ3M6IHsgcmVzb3VyY2VzPzogYW55W107IHJvbGVzPzogYW55W10gfSkgPT4ge1xuICAgICAgY29uc3QgcHJvb2ZzID0gZ2VuZXJhdGVPd25lcnNoaXBQcm9vZihcbiAgICAgICAgYXJncy5yZXNvdXJjZXMgfHwgW10sXG4gICAgICAgIGFyZ3Mucm9sZXMgfHwgW10sXG4gICAgICAgIERFRkFVTFRfVkVUT19SVUxFUyBhcyBhbnlcbiAgICAgICk7XG4gICAgICByZXR1cm4gdmFsaWRhdGVQcm9vZnMocHJvb2ZzKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGN1bGF0ZSBlY29ub21pY3Mgc2NvcmVcbiAgICAgKi9cbiAgICAnYXNmOnNjb3JlJzogYXN5bmMgKGFyZ3M6IHsgYXNzaWdubWVudD86IGFueTsgZGFnPzogYW55OyByb2xlcz86IGFueVtdIH0pID0+IHtcbiAgICAgIGlmICghYXJncy5hc3NpZ25tZW50IHx8ICFhcmdzLmRhZyB8fCAhYXJncy5yb2xlcykge1xuICAgICAgICByZXR1cm4geyBlcnJvcjogJ01pc3NpbmcgcmVxdWlyZWQgcGFyYW1ldGVyczogYXNzaWdubWVudCwgZGFnLCByb2xlcycgfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBjb21wdXRlRWNvbm9taWNzU2NvcmUoYXJncy5hc3NpZ25tZW50LCBhcmdzLmRhZywgYXJncy5yb2xlcyk7XG4gICAgfSxcbiAgICBcbiAgICAvKipcbiAgICAgKiBQcmVkaWN0IHJld29yayByaXNrXG4gICAgICovXG4gICAgJ2FzZjpyaXNrJzogYXN5bmMgKGFyZ3M6IHsgdGFzaz86IGFueTsgY2hhbmdlcz86IGFueVtdOyBoaXN0b3J5PzogYW55W10gfSkgPT4ge1xuICAgICAgaWYgKCFhcmdzLnRhc2spIHtcbiAgICAgICAgcmV0dXJuIHsgZXJyb3I6ICdNaXNzaW5nIHJlcXVpcmVkIHBhcmFtZXRlcjogdGFzaycgfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBwcmVkaWN0UmV3b3JrUmlzayhhcmdzLnRhc2ssIGFyZ3MuY2hhbmdlcyB8fCBbXSwgYXJncy5oaXN0b3J5IHx8IFtdKTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIEFuYWx5emUgaG90IGNvbnRyYWN0c1xuICAgICAqL1xuICAgICdhc2Y6aG90LWNvbnRyYWN0cyc6IGFzeW5jIChhcmdzOiB7IHRhc2tzPzogYW55W107IGNvbnN0cmFpbnRzPzogYW55IH0pID0+IHtcbiAgICAgIGlmICghYXJncy50YXNrcykge1xuICAgICAgICByZXR1cm4geyBlcnJvcjogJ01pc3NpbmcgcmVxdWlyZWQgcGFyYW1ldGVyOiB0YXNrcycgfTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBkZXRlcm1pbmVPcHRpbWFsUm9sZUNvdW50KFxuICAgICAgICBhcmdzLnRhc2tzLFxuICAgICAgICB7fSxcbiAgICAgICAgYXJncy5jb25zdHJhaW50cyB8fCB7IGtNaW46IDIsIGtNYXg6IDggfVxuICAgICAgKTtcbiAgICB9LFxuICAgIFxuICAgIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgICAvLyDmjqjojZDmioDog73pm4bmiJAgKE9wZW5DbGF3IHYyMDI2LjQuNSlcbiAgICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICAgXG4gICAgLyoqXG4gICAgICog6I635Y+W5o6o6I2Q5oqA6IO954q25oCBXG4gICAgICovXG4gICAgJ2FzZjpyZWNvbW1lbmRlZC1za2lsbHMnOiBhc3luYyAoKSA9PiB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBjb3JlOiBbXG4gICAgICAgICAgeyBuYW1lOiAnY29kaW5nLWFnZW50Jywgc3RhdHVzOiAncmVhZHknLCBwcmlvcml0eTogJ1AwJywgcmVhc29uOiAn5Luj56CB55Sf5oiQL+mHjeaehC9QUiDlrqHmoLgnIH0sXG4gICAgICAgICAgeyBuYW1lOiAnc2tpbGwtY3JlYXRvcicsIHN0YXR1czogJ3JlYWR5JywgcHJpb3JpdHk6ICdQMCcsIHJlYXNvbjogJ0FORlNGIOiHqui6q+aKgOiDveW8gOWPkScgfSxcbiAgICAgICAgICB7IG5hbWU6ICdjbGF3aHViJywgc3RhdHVzOiAncmVhZHknLCBwcmlvcml0eTogJ1AwJywgcmVhc29uOiAn5oqA6IO95YiG5Y+R5LiO5pu05pawJyB9LFxuICAgICAgICAgIHsgbmFtZTogJ2dpdGh1YicsIHN0YXR1czogJ3JlYWR5JywgcHJpb3JpdHk6ICdQMCcsIHJlYXNvbjogJ0dpdEh1YiDku5PlupPmk43kvZwnIH0sXG4gICAgICAgICAgeyBuYW1lOiAnZ2gtaXNzdWVzJywgc3RhdHVzOiAncmVhZHknLCBwcmlvcml0eTogJ1AwJywgcmVhc29uOiAnSXNzdWUg6Ieq5Yqo5aSE55CGJyB9LFxuICAgICAgICAgIHsgbmFtZTogJ2hlYWx0aGNoZWNrJywgc3RhdHVzOiAncmVhZHknLCBwcmlvcml0eTogJ1AwJywgcmVhc29uOiAn5a6J5YWo5a6h6K6hJyB9LFxuICAgICAgICBdLFxuICAgICAgICBlbmhhbmNlZDogW1xuICAgICAgICAgIHsgbmFtZTogJ29yYWNsZScsIHN0YXR1czogJ3JlYWR5JywgcHJpb3JpdHk6ICdQMScsIHJlYXNvbjogJ1Byb21wdCDkvJjljJYnIH0sXG4gICAgICAgICAgeyBuYW1lOiAnb3BlbmFpLXdoaXNwZXItYXBpJywgc3RhdHVzOiAncmVhZHknLCBwcmlvcml0eTogJ1AxJywgcmVhc29uOiAn6K+t6Z+z6L6T5YWlJyB9LFxuICAgICAgICAgIHsgbmFtZTogJ3Nlc3Npb24tbG9ncycsIHN0YXR1czogJ3JlYWR5JywgcHJpb3JpdHk6ICdQMScsIHJlYXNvbjogJ+S8muivneaXpeW/lycgfSxcbiAgICAgICAgICB7IG5hbWU6ICdub2RlLWNvbm5lY3QnLCBzdGF0dXM6ICdyZWFkeScsIHByaW9yaXR5OiAnUDEnLCByZWFzb246ICflpJroioLngrnpg6jnvbInIH0sXG4gICAgICAgICAgeyBuYW1lOiAndmlkZW8tZnJhbWVzJywgc3RhdHVzOiAncmVhZHknLCBwcmlvcml0eTogJ1AyJywgcmVhc29uOiAn6KeG6aKR5bin5o+Q5Y+WJyB9LFxuICAgICAgICBdLFxuICAgICAgICBwZW5kaW5nOiBbXG4gICAgICAgICAgeyBuYW1lOiAnbW9kZWwtdXNhZ2UnLCBzdGF0dXM6ICduZWVkcy1zZXR1cCcsIHByaW9yaXR5OiAnUDEnLCByZWFzb246ICfpnIDopoEgbWFjT1MnIH0sXG4gICAgICAgIF0sXG4gICAgICAgIHN1bW1hcnk6IHtcbiAgICAgICAgICB0b3RhbDogMTYsXG4gICAgICAgICAgcmVhZHk6IDE1LFxuICAgICAgICAgIG5lZWRzU2V0dXA6IDEsXG4gICAgICAgICAgaW50ZWdyYXRpb25SYXRlOiAnOTMuNzUlJ1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICog6LCD55SoIGNvZGluZy1hZ2VudCAoUDAg5by654OI5o6o6I2QKVxuICAgICAqL1xuICAgICdhc2Y6Y29kZSc6IGFzeW5jIChhcmdzOiB7IHRhc2s6IHN0cmluZzsgbW9kZWw/OiBzdHJpbmcgfSkgPT4ge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc2tpbGw6ICdjb2RpbmctYWdlbnQnLFxuICAgICAgICB0YXNrOiBhcmdzLnRhc2ssXG4gICAgICAgIG1vZGVsOiBhcmdzLm1vZGVsIHx8ICdkZWZhdWx0JyxcbiAgICAgICAgc3RhdHVzOiAnZGVsZWdhdGVkJyxcbiAgICAgICAgbWVzc2FnZTogJ1VzZSBjb2RpbmctYWdlbnQgc2tpbGwgZGlyZWN0bHkgdmlhIG9wZW5jbGF3J1xuICAgICAgfTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIOiwg+eUqCBnaXRodWIg5oqA6IO9IChQMCDlvLrng4jmjqjojZApXG4gICAgICovXG4gICAgJ2FzZjpnaXRodWInOiBhc3luYyAoYXJnczogeyBhY3Rpb246IHN0cmluZzsgcGFyYW1zPzogYW55IH0pID0+IHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHNraWxsOiAnZ2l0aHViJyxcbiAgICAgICAgYWN0aW9uOiBhcmdzLmFjdGlvbixcbiAgICAgICAgcGFyYW1zOiBhcmdzLnBhcmFtcyxcbiAgICAgICAgc3RhdHVzOiAnZGVsZWdhdGVkJyxcbiAgICAgICAgbWVzc2FnZTogJ1VzZSBnaXRodWIgc2tpbGwgZGlyZWN0bHkgdmlhIG9wZW5jbGF3J1xuICAgICAgfTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIOiwg+eUqCBnaC1pc3N1ZXMg5oqA6IO9IChQMCDlvLrng4jmjqjojZApXG4gICAgICovXG4gICAgJ2FzZjppc3N1ZXMnOiBhc3luYyAoYXJnczogeyByZXBvOiBzdHJpbmc7IGxhYmVsPzogc3RyaW5nOyBsaW1pdD86IG51bWJlciB9KSA9PiB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBza2lsbDogJ2doLWlzc3VlcycsXG4gICAgICAgIHJlcG86IGFyZ3MucmVwbyxcbiAgICAgICAgbGFiZWw6IGFyZ3MubGFiZWwsXG4gICAgICAgIGxpbWl0OiBhcmdzLmxpbWl0IHx8IDUsXG4gICAgICAgIHN0YXR1czogJ2RlbGVnYXRlZCcsXG4gICAgICAgIG1lc3NhZ2U6ICdVc2UgZ2gtaXNzdWVzIHNraWxsIGRpcmVjdGx5IHZpYSBvcGVuY2xhdydcbiAgICAgIH07XG4gICAgfSxcbiAgfSxcbiAgXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gQ29uZmlndXJhdGlvblxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gIGNvbmZpZzoge1xuICAgIHZldG9SdWxlczogJ2RlZmF1bHQnLCAvLyAnZGVmYXVsdCcgfCAnc3RyaWN0JyB8ICdjdXN0b20nXG4gICAgZWNvbm9taWNzV2VpZ2h0czogJ2RlZmF1bHQnLCAvLyAnZGVmYXVsdCcgfCAnY3VzdG9tJ1xuICAgIHNhZmVPcHRpbWl6ZXI6IHRydWUsIC8vIEVuYWJsZSBzYWZlIG9ubGluZSBvcHRpbWl6ZXJcbiAgICBjb29sZG93bk1zOiAxODAwMDAwLCAvLyAzMCBtaW51dGVzXG4gICAgZmFpbHVyZVRocmVzaG9sZDogMixcbiAgfSxcbiAgXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgLy8gTGlmZWN5Y2xlIEhvb2tzXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgaG9va3M6IHtcbiAgICAvKipcbiAgICAgKiBDYWxsZWQgd2hlbiBza2lsbCBpcyBsb2FkZWRcbiAgICAgKi9cbiAgICBvbkxvYWQ6IGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnNvbGUubG9nKCdbYXNmLXY0XSBTa2lsbCBsb2FkZWQnKTtcbiAgICAgIHJldHVybiB7IHN1Y2Nlc3M6IHRydWUgfTtcbiAgICB9LFxuICAgIFxuICAgIC8qKlxuICAgICAqIENhbGxlZCBiZWZvcmUgZWFjaCBhZ2VudCB0dXJuXG4gICAgICovXG4gICAgb25UdXJuOiBhc3luYyAoY29udGV4dDogYW55KSA9PiB7XG4gICAgICAvLyBDb3VsZCBpbmplY3QgdmV0byBjaGVja3MgaGVyZVxuICAgICAgcmV0dXJuIHsgc3VjY2VzczogdHJ1ZSB9O1xuICAgIH0sXG4gICAgXG4gICAgLyoqXG4gICAgICogQ2FsbGVkIHdoZW4gc2tpbGwgaXMgdW5sb2FkZWRcbiAgICAgKi9cbiAgICBvblVubG9hZDogYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc29sZS5sb2coJ1thc2YtdjRdIFNraWxsIHVubG9hZGVkJyk7XG4gICAgICByZXR1cm4geyBzdWNjZXNzOiB0cnVlIH07XG4gICAgfSxcbiAgfSxcbn07XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIERlZmF1bHQgRXhwb3J0XG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5leHBvcnQgZGVmYXVsdCBhc2ZfdjQ7XG4iXX0=