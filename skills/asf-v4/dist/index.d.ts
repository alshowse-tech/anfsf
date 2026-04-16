/**
 * ASF V4.0 OpenClaw Skill
 *
 * Industrial-grade governance and optimization modules.
 * Version: v1.5.0 - Layer 8.5 Governance Control Plane
 *
 * @module asf-v4
 */
export declare const asf_v4: {
    name: string;
    version: string;
    description: string;
    author: string;
    license: string;
    tools: {
        /**
         * Veto Enforcement Tool
         * Check if changes pass hard/soft veto rules.
         */
        'veto-check': (params: {
            changes: Array<{
                resourceType: string;
                resourcePath: string;
                action: string;
            }>;
            approvals?: Array<{
                authority: string;
                scope: string;
                status: string;
            }>;
            rules?: any[];
        }) => Promise<any>;
        /**
         * Ownership Proof Generator
         * Generate verifiable ownership proofs for resources.
         */
        'ownership-proof': (params: {
            resources: Array<{
                type: string;
                path: string;
                subpath?: string;
            }>;
            roles: Array<{
                id: string;
            }>;
            rules?: any[];
        }) => Promise<{
            proofs: string;
            valid: any;
            invalidCount: any;
            singleWriterViolations: any;
        }>;
        /**
         * Economics Score Calculator
         * Compute role assignment economics score.
         */
        'economics-score': (params: {
            assignment: {
                taskToRole: Record<string, string>;
            };
            dag: {
                tasks: any[];
                edges: any[];
            };
            roles: Array<{
                id: string;
                economics?: any;
            }>;
        }) => Promise<number>;
        /**
         * Interface Budget Calculator
         * Compute cross-role dependency cost.
         */
        'interface-budget': (params: {
            roleId: string;
            assignment: {
                taskToRole: Record<string, string>;
            };
            dag: {
                tasks: any[];
                edges: any[];
            };
            roles: any[];
        }) => Promise<number>;
        /**
         * Rework Risk Predictor
         * Predict rework risk for tasks.
         */
        'rework-risk': (params: {
            task: {
                id: string;
                featureId?: string;
                risk?: string;
            };
            contractChanges: Array<{
                contractId: string;
                breaking: boolean;
                deprecated?: boolean;
            }>;
            historicalData?: any[];
        }) => Promise<number>;
        /**
         * Hot Contract Analyzer
         * Analyze contract coupling and suggest role count.
         */
        'hot-contract': (params: {
            tasks: Array<{
                id: string;
                contractIds?: string[];
            }>;
            graph?: any;
            constraints?: {
                kMin: number;
                kMax: number;
            };
        }) => Promise<number>;
        /**
         * Conflict Resolver
         * Resolve ownership conflicts with budget-driven decisions.
         */
        'conflict-resolve': (params: {
            resource: {
                id: string;
                type: string;
                path: string;
            };
            conflictingRoles: Array<{
                id: string;
            }>;
            currentBudget: number;
            budgetLimit: number;
        }) => Promise<{
            resolved: boolean;
            solution: any;
        }>;
        /**
         * Safe Optimizer
         * Safe online optimization with knobs and rollback.
         */
        'safe-optimize': (params: {
            current: any;
            metrics: {
                failureRate: number;
                previewFailures: number;
                queueLength: number;
                utilization: number;
                interfaceCost: number;
                budget: number;
            };
            projectId: string;
        }) => Promise<boolean>;
        /**
         * UI Component Synthesizer
         * Generate UI components from PRD requirements.
         */
        'ui-synthesize': (params: {
            requirement: {
                id: string;
                description: string;
                priority: string;
                acceptanceCriteria: string[];
            };
            config?: {
                framework: string;
                uiLibrary: string;
                styling: string;
            };
        }) => Promise<any>;
        /**
         * Layout Generator
         * Generate page layouts from user flows.
         */
        'ui-layout': (params: {
            userFlow: any;
            requirements: any[];
        }) => Promise<any>;
        /**
         * Design System Mapper
         * Extract design tokens from PRD.
         */
        'ui-design-tokens': (params: {
            prd: any;
        }) => Promise<any>;
        /**
         * Interaction Flow Generator
         * Generate interaction flows from user flows.
         */
        'ui-interaction': (params: {
            userFlow: any;
        }) => Promise<any>;
        /**
         * Prototype Generator
         * Generate complete interactive prototype from PRD.
         */
        'ui-prototype': (params: {
            prd: any;
            config?: any;
        }) => Promise<any>;
    };
    commands: {
        /**
         * Check ASF V4.0 status
         */
        'asf:status': () => Promise<{
            version: string;
            modules: string[];
            integration: string;
            openclawVersion: string;
            layer85: {
                mcpBus: string;
                skillsRegistry: string;
                agentHarness: string;
                governanceControlPlane: string;
            };
            status: string;
        }>;
        /**
         * Layer 8.5 - Run CLI command
         */
        'asf:cli': (args: {
            command: string;
            subcommand?: string;
            options?: any;
        }) => Promise<{
            exitCode: number;
            layer: string;
        }>;
        /**
         * Layer 8.5 - Deploy policy with canary
         */
        'asf:deploy': (args: {
            policy: any;
            canaryOptions?: any;
        }) => Promise<import("../../src/governance/control-plane").GovernanceOperation>;
        /**
         * Layer 8.5 - Run test scenario
         */
        'asf:test': (args: {
            scenario: any;
        }) => Promise<import("../../src/governance/control-plane").GovernanceOperation>;
        /**
         * Layer 8.5 - Load skill
         */
        'asf:load-skill': (args: {
            skillName: string;
            version: string;
        }) => Promise<import("../../src/governance/control-plane").GovernanceOperation>;
        /**
         * Run veto check
         */
        'asf:veto': (args: {
            changes?: any[];
            approvals?: any[];
        }) => Promise<boolean>;
        /**
         * Generate ownership proof
         */
        'asf:proof': (args: {
            resources?: any[];
            roles?: any[];
        }) => Promise<boolean>;
        /**
         * Calculate economics score
         */
        'asf:score': (args: {
            assignment?: any;
            dag?: any;
            roles?: any[];
        }) => Promise<number | {
            error: string;
        }>;
        /**
         * Predict rework risk
         */
        'asf:risk': (args: {
            task?: any;
            changes?: any[];
            history?: any[];
        }) => Promise<number | {
            error: string;
        }>;
        /**
         * Analyze hot contracts
         */
        'asf:hot-contracts': (args: {
            tasks?: any[];
            constraints?: any;
        }) => Promise<number | {
            error: string;
        }>;
        /**
         * 获取推荐技能状态
         */
        'asf:recommended-skills': () => Promise<{
            core: {
                name: string;
                status: string;
                priority: string;
                reason: string;
            }[];
            enhanced: {
                name: string;
                status: string;
                priority: string;
                reason: string;
            }[];
            pending: {
                name: string;
                status: string;
                priority: string;
                reason: string;
            }[];
            summary: {
                total: number;
                ready: number;
                needsSetup: number;
                integrationRate: string;
            };
        }>;
        /**
         * 调用 coding-agent (P0 强烈推荐)
         */
        'asf:code': (args: {
            task: string;
            model?: string;
        }) => Promise<{
            skill: string;
            task: string;
            model: string;
            status: string;
            message: string;
        }>;
        /**
         * 调用 github 技能 (P0 强烈推荐)
         */
        'asf:github': (args: {
            action: string;
            params?: any;
        }) => Promise<{
            skill: string;
            action: string;
            params: any;
            status: string;
            message: string;
        }>;
        /**
         * 调用 gh-issues 技能 (P0 强烈推荐)
         */
        'asf:issues': (args: {
            repo: string;
            label?: string;
            limit?: number;
        }) => Promise<{
            skill: string;
            repo: string;
            label: string | undefined;
            limit: number;
            status: string;
            message: string;
        }>;
    };
    config: {
        vetoRules: string;
        economicsWeights: string;
        safeOptimizer: boolean;
        cooldownMs: number;
        failureThreshold: number;
    };
    hooks: {
        /**
         * Called when skill is loaded
         */
        onLoad: () => Promise<{
            success: boolean;
        }>;
        /**
         * Called before each agent turn
         */
        onTurn: (context: any) => Promise<{
            success: boolean;
        }>;
        /**
         * Called when skill is unloaded
         */
        onUnload: () => Promise<{
            success: boolean;
        }>;
    };
};
export default asf_v4;
