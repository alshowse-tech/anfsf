/**
 * ASF V4.0 Preview Controller UI Extension - Readiness Gate
 *
 * Style probing and self-healing for UI preview readiness.
 * Version: v1.5.0
 *
 * Features:
 * - Style resource probing (HEAD requests)
 * - Automatic self-healing trigger
 * - User-friendly status reporting
 */
/**
 * Style probe result.
 */
export interface StyleProbeResult {
    /** Whether all styles passed */
    passed: boolean;
    /** List of failed URLs */
    failedUrls: string[];
    /** Self-healing ticket ID (if triggered) */
    repairTicketId?: string;
    /** Probe timestamp */
    timestamp: number;
    /** Total styles checked */
    totalChecked: number;
}
/**
 * Style resource info.
 */
export interface StyleResource {
    /** Resource URL */
    url: string;
    /** Resource type */
    type: 'critical' | 'external' | 'dynamic' | 'font';
    /** Whether it's required */
    required: boolean;
}
/**
 * Self-healing trigger parameters.
 */
export interface SelfHealingParams {
    /** Failed style URLs */
    failedUrls: string[];
    /** Component name */
    componentName?: string;
    /** Priority level */
    priority: 'low' | 'medium' | 'high' | 'critical';
    /** Retry count */
    retryCount?: number;
}
/**
 * Self-healing ticket.
 */
export interface SelfHealingTicket {
    /** Ticket ID */
    id: string;
    /** Status */
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    /** Failed resources */
    failedResources: string[];
    /** Created timestamp */
    createdAt: number;
    /** Completed timestamp */
    completedAt?: number;
    /** Result message */
    result?: string;
}
/**
 * Preview Controller interface.
 */
export interface PreviewController {
    /** Reload preview */
    reload(): Promise<void>;
    /** Get current preview URL */
    getPreviewUrl(): string;
    /** Check if preview is ready */
    isReady(): boolean;
}
/**
 * MCP Bus interface.
 */
export interface MCPBus {
    send(message: MCPMessage): Promise<void>;
}
export interface MCPMessage {
    type: 'command' | 'event' | 'proposal' | 'response';
    from?: string;
    to?: string;
    target?: string;
    payload: any;
    traceId?: string;
}
/**
 * Frontend Role interface for self-healing.
 */
export interface FrontendRole {
    /** Fix missing styles */
    fixMissingStyles(urls: string[]): Promise<string[]>;
    /** Regenerate critical CSS */
    regenerateCriticalCSS(): Promise<string>;
}
/**
 * Preview Controller UI Extension - Handles style readiness checks.
 */
export declare class PreviewControllerUIExtension {
    private previewController;
    private mcpBus;
    private frontendRole;
    private probeTimeout;
    private enableAutoHealing;
    private activeTickets;
    constructor(options?: {
        previewController?: PreviewController;
        mcpBus?: MCPBus;
        frontendRole?: FrontendRole;
        probeTimeout?: number;
        enableAutoHealing?: boolean;
    });
    /**
     * Probe style resources for availability.
     *
     * Sends HEAD requests to check if style resources are accessible.
     * Automatically triggers self-healing if failures detected.
     */
    probeStyles(resources: StyleResource[]): Promise<StyleProbeResult>;
    /**
     * Probe a single resource using HEAD request.
     */
    private probeSingleResource;
    /**
     * Trigger self-healing process.
     */
    triggerSelfHealing(params: SelfHealingParams): Promise<SelfHealingTicket>;
    /**
     * Get self-healing ticket status.
     */
    getTicketStatus(ticketId: string): SelfHealingTicket | null;
    /**
     * Get all active tickets.
     */
    getActiveTickets(): SelfHealingTicket[];
    /**
     * Check overall readiness.
     */
    checkReadiness(resources: StyleResource[]): Promise<{
        ready: boolean;
        styleProbe: StyleProbeResult;
        previewReady: boolean;
        message: string;
    }>;
    /**
     * Determine priority based on failure ratio.
     */
    private determinePriority;
    /**
     * Generate unique ticket ID.
     */
    private generateTicketId;
    /**
     * Set frontend role for self-healing.
     */
    setFrontendRole(frontendRole: FrontendRole): void;
    /**
     * Set preview controller.
     */
    setPreviewController(controller: PreviewController): void;
    /**
     * Set MCP bus.
     */
    setMCPBus(mcpBus: MCPBus): void;
    /**
     * Enable/disable auto-healing.
     */
    setAutoHealing(enabled: boolean): void;
    /**
     * Clear completed tickets older than specified age.
     */
    cleanupOldTickets(maxAgeMs?: number): void;
}
/**
 * Create preview controller UI extension.
 */
export declare function createPreviewControllerUIExtension(options?: {
    previewController?: PreviewController;
    mcpBus?: MCPBus;
    frontendRole?: FrontendRole;
    probeTimeout?: number;
    enableAutoHealing?: boolean;
}): PreviewControllerUIExtension;
export default PreviewControllerUIExtension;
