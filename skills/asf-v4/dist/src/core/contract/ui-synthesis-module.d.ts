/**
 * ASF V4.0 UI Synthesis Module - Contract Pack Extension
 *
 * Handles UI component synthesis with asset manifest management.
 * Version: v1.5.0
 *
 * Features:
 * - Asset manifest generation (styles, fonts, images, icons)
 * - MCP synchronization with PreviewController
 * - Manifest integrity validation
 */
/**
 * Style asset types.
 */
export interface StyleAssets {
    /** Critical CSS (inlined) */
    critical?: string;
    /** External style URLs */
    external: string[];
    /** Dynamic styles (runtime generated) */
    dynamic: string[];
    /** Tailwind utility classes */
    tailwind: string[];
    /** Font URLs */
    fonts?: string[];
}
/**
 * Component tree asset references.
 */
export interface ComponentTreeAssets {
    /** Image URLs */
    images: string[];
    /** Icon references */
    icons: string[];
}
/**
 * Complete asset manifest for UI synthesis.
 */
export interface AssetManifest {
    /** Style assets */
    styles: {
        critical?: string;
        external: string[];
        dynamic: string[];
        tailwind: string[];
    };
    /** Font assets */
    fonts?: string[];
    /** Other assets */
    assets: {
        images: string[];
        icons: string[];
    };
}
/**
 * UI Synthesis configuration.
 */
export interface UISynthesisConfig {
    /** Target framework */
    framework?: 'react' | 'vue' | 'angular' | 'svelte';
    /** UI library */
    uiLibrary?: 'antd' | 'material-ui' | 'chakra' | 'tailwind';
    /** Styling approach */
    styling?: 'css-modules' | 'styled-components' | 'tailwind' | 'inline';
    /** Enable critical CSS inlining */
    enableCriticalCSS?: boolean;
    /** Enable asset validation */
    enableAssetValidation?: boolean;
}
/**
 * UI Synthesis result.
 */
export interface UISynthesisResult {
    /** Component name */
    componentName: string;
    /** Generated code */
    code: string;
    /** Component props */
    props: Record<string, any>;
    /** Dependencies */
    dependencies: string[];
    /** Accessibility score */
    a11yScore: number;
    /** Asset manifest */
    assetManifest: AssetManifest;
}
/**
 * MCP Bus interface for synchronization.
 */
export interface MCPBus {
    send(message: MCPMessage): Promise<void>;
}
/**
 * MCP Message structure.
 */
export interface MCPMessage {
    type: 'command' | 'event' | 'proposal' | 'response';
    from?: string;
    to?: string;
    target?: string;
    payload: any;
    traceId?: string;
    idempotencyKey?: string;
    ttl?: number;
}
/**
 * UI Synthesis Module - Manages UI component generation with asset tracking.
 */
export declare class UISynthesisModule {
    private config;
    private mcpBus;
    constructor(config?: UISynthesisConfig, mcpBus?: MCPBus);
    /**
     * Synthesize UI component from requirements.
     */
    synthesize(requirement: any, componentTree: ComponentTreeAssets): Promise<UISynthesisResult>;
    /**
     * Validate asset manifest integrity.
     *
     * Throws error if manifest is empty or invalid.
     */
    private validateManifestIntegrity;
    /**
     * Extract styles from requirement.
     */
    private extractStyles;
    /**
     * Generate component code (simplified).
     */
    private generateComponentCode;
    private generateReactComponent;
    private generateVueComponent;
    private generateAngularComponent;
    /**
     * Extract props from requirement.
     */
    private extractProps;
    /**
     * Extract dependencies from requirement.
     */
    private extractDependencies;
    /**
     * Calculate accessibility score.
     */
    private calculateA11yScore;
    /**
     * Generate trace ID for MCP messages.
     */
    private generateTraceId;
    /**
     * Set MCP bus for synchronization.
     */
    setMCPBus(mcpBus: MCPBus): void;
}
/**
 * Create UI synthesis module with default config.
 */
export declare function createUISynthesisModule(config?: UISynthesisConfig, mcpBus?: MCPBus): UISynthesisModule;
/**
 * Create asset manifest from styles and component tree.
 */
export declare function createAssetManifest(styles: StyleAssets, componentTree: ComponentTreeAssets): AssetManifest;
export default UISynthesisModule;
