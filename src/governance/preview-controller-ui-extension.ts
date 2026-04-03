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

// ============================================================================
// Type Definitions
// ============================================================================

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

// ============================================================================
// Preview Controller UI Extension
// ============================================================================

/**
 * Preview Controller UI Extension - Handles style readiness checks.
 */
export class PreviewControllerUIExtension {
  private previewController: PreviewController | null;
  private mcpBus: MCPBus | null;
  private frontendRole: FrontendRole | null;
  private probeTimeout: number;
  private enableAutoHealing: boolean;
  private activeTickets: Map<string, SelfHealingTicket>;

  constructor(
    options: {
      previewController?: PreviewController;
      mcpBus?: MCPBus;
      frontendRole?: FrontendRole;
      probeTimeout?: number;
      enableAutoHealing?: boolean;
    } = {}
  ) {
    this.previewController = options.previewController || null;
    this.mcpBus = options.mcpBus || null;
    this.frontendRole = options.frontendRole || null;
    this.probeTimeout = options.probeTimeout || 5000; // 5 seconds default
    this.enableAutoHealing = options.enableAutoHealing !== false;
    this.activeTickets = new Map();
  }

  /**
   * Probe style resources for availability.
   * 
   * Sends HEAD requests to check if style resources are accessible.
   * Automatically triggers self-healing if failures detected.
   */
  async probeStyles(
    resources: StyleResource[]
  ): Promise<StyleProbeResult> {
    const startTime = Date.now();
    const failedUrls: string[] = [];
    const successfulUrls: string[] = [];

    console.log(`🔍 Starting style probe for ${resources.length} resources...`);

    // Probe each resource
    const probePromises = resources.map(async (resource) => {
      try {
        const isAvailable = await this.probeSingleResource(resource.url);
        if (isAvailable) {
          successfulUrls.push(resource.url);
        } else {
          failedUrls.push(resource.url);
          console.log(`❌ Style resource unavailable: ${resource.url}`);
        }
      } catch (error) {
        failedUrls.push(resource.url);
        console.log(`❌ Style resource probe failed: ${resource.url} - ${error}`);
      }
    });

    // Wait for all probes with timeout
    await Promise.allSettled(probePromises);

    const result: StyleProbeResult = {
      passed: failedUrls.length === 0,
      failedUrls,
      timestamp: Date.now(),
      totalChecked: resources.length,
    };

    // Trigger self-healing if failures detected
    if (failedUrls.length > 0 && this.enableAutoHealing) {
      const ticket = await this.triggerSelfHealing({
        failedUrls,
        priority: this.determinePriority(failedUrls.length, resources.length),
        retryCount: 0,
      });
      result.repairTicketId = ticket.id;

      console.log(`🔧 检测到 ${failedUrls.length} 个样式资源缺失，已自动触发 Frontend Role 修复 (Ticket: ${ticket.id})`);
    }

    // Report status
    if (result.passed) {
      console.log(`✅ Style probe passed: ${successfulUrls.length}/${resources.length} resources available`);
    } else {
      console.log(`⚠️  Style probe failed: ${failedUrls.length}/${resources.length} resources unavailable`);
    }

    return result;
  }

  /**
   * Probe a single resource using HEAD request.
   */
  private async probeSingleResource(url: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.probeTimeout);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      clearTimeout(timeoutId);

      return response.ok && response.status >= 200 && response.status < 400;
    } catch (error) {
      // Network error, timeout, or other failure
      return false;
    }
  }

  /**
   * Trigger self-healing process.
   */
  async triggerSelfHealing(params: SelfHealingParams): Promise<SelfHealingTicket> {
    const ticketId = this.generateTicketId();
    
    const ticket: SelfHealingTicket = {
      id: ticketId,
      status: 'pending',
      failedResources: params.failedUrls,
      createdAt: Date.now(),
    };

    this.activeTickets.set(ticketId, ticket);

    try {
      // Update status
      ticket.status = 'in_progress';

      // Notify via MCP if available
      if (this.mcpBus) {
        await this.mcpBus.send({
          type: 'command',
          target: 'FrontendRole',
          payload: {
            action: 'fixMissingStyles',
            ticketId,
            urls: params.failedUrls,
            priority: params.priority,
          },
          traceId: `healing-${ticketId}`,
        });
      }

      // Execute fix if frontend role is available
      if (this.frontendRole) {
        const fixedUrls = await this.frontendRole.fixMissingStyles(params.failedUrls);
        
        // Check if all were fixed
        const stillFailed = params.failedUrls.filter(url => !fixedUrls.includes(url));
        
        if (stillFailed.length === 0) {
          ticket.status = 'completed';
          ticket.result = `Successfully fixed ${fixedUrls.length} style resources`;
          ticket.completedAt = Date.now();
        } else {
          ticket.status = 'failed';
          ticket.result = `Partially fixed: ${fixedUrls.length}/${params.failedUrls.length}. Still failed: ${stillFailed.join(', ')}`;
          ticket.completedAt = Date.now();
        }
      } else {
        // No frontend role available, mark as pending for manual intervention
        ticket.status = 'pending';
        ticket.result = 'Self-healing initiated, waiting for Frontend Role';
      }

      // Reload preview if completed
      if (ticket.status === 'completed' && this.previewController) {
        await this.previewController.reload();
      }

    } catch (error) {
      ticket.status = 'failed';
      ticket.result = `Self-healing failed: ${error}`;
      ticket.completedAt = Date.now();
    }

    this.activeTickets.set(ticketId, ticket);
    return ticket;
  }

  /**
   * Get self-healing ticket status.
   */
  getTicketStatus(ticketId: string): SelfHealingTicket | null {
    return this.activeTickets.get(ticketId) || null;
  }

  /**
   * Get all active tickets.
   */
  getActiveTickets(): SelfHealingTicket[] {
    return Array.from(this.activeTickets.values())
      .filter(ticket => ticket.status === 'pending' || ticket.status === 'in_progress');
  }

  /**
   * Check overall readiness.
   */
  async checkReadiness(resources: StyleResource[]): Promise<{
    ready: boolean;
    styleProbe: StyleProbeResult;
    previewReady: boolean;
    message: string;
  }> {
    // Probe styles
    const styleProbe = await this.probeStyles(resources);

    // Check preview
    const previewReady = this.previewController?.isReady() || false;

    // Determine overall readiness
    const ready = styleProbe.passed && previewReady;

    let message = '';
    if (ready) {
      message = '✅ Preview is ready with all styles loaded';
    } else if (!styleProbe.passed) {
      message = `⚠️  ${styleProbe.failedUrls.length} style resources missing`;
    } else if (!previewReady) {
      message = '⚠️  Preview controller not ready';
    }

    return {
      ready,
      styleProbe,
      previewReady,
      message,
    };
  }

  /**
   * Determine priority based on failure ratio.
   */
  private determinePriority(failedCount: number, totalCount: number): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = failedCount / totalCount;
    
    if (ratio === 0) return 'low';
    if (ratio < 0.25) return 'low';
    if (ratio < 0.5) return 'medium';
    if (ratio < 0.75) return 'high';
    return 'critical';
  }

  /**
   * Generate unique ticket ID.
   */
  private generateTicketId(): string {
    return `healing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set frontend role for self-healing.
   */
  setFrontendRole(frontendRole: FrontendRole): void {
    this.frontendRole = frontendRole;
  }

  /**
   * Set preview controller.
   */
  setPreviewController(controller: PreviewController): void {
    this.previewController = controller;
  }

  /**
   * Set MCP bus.
   */
  setMCPBus(mcpBus: MCPBus): void {
    this.mcpBus = mcpBus;
  }

  /**
   * Enable/disable auto-healing.
   */
  setAutoHealing(enabled: boolean): void {
    this.enableAutoHealing = enabled;
  }

  /**
   * Clear completed tickets older than specified age.
   */
  cleanupOldTickets(maxAgeMs: number = 3600000): void {
    const now = Date.now();
    for (const [id, ticket] of this.activeTickets.entries()) {
      if (
        (ticket.status === 'completed' || ticket.status === 'failed') &&
        ticket.completedAt &&
        now - ticket.completedAt > maxAgeMs
      ) {
        this.activeTickets.delete(id);
      }
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create preview controller UI extension.
 */
export function createPreviewControllerUIExtension(
  options?: {
    previewController?: PreviewController;
    mcpBus?: MCPBus;
    frontendRole?: FrontendRole;
    probeTimeout?: number;
    enableAutoHealing?: boolean;
  }
): PreviewControllerUIExtension {
  return new PreviewControllerUIExtension(options);
}

// ============================================================================
// Exports
// ============================================================================

export default PreviewControllerUIExtension;
