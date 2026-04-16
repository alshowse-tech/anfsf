"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreviewControllerUIExtension = void 0;
exports.createPreviewControllerUIExtension = createPreviewControllerUIExtension;
// ============================================================================
// Preview Controller UI Extension
// ============================================================================
/**
 * Preview Controller UI Extension - Handles style readiness checks.
 */
class PreviewControllerUIExtension {
    constructor(options = {}) {
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
    async probeStyles(resources) {
        const startTime = Date.now();
        const failedUrls = [];
        const successfulUrls = [];
        console.log(`🔍 Starting style probe for ${resources.length} resources...`);
        // Probe each resource
        const probePromises = resources.map(async (resource) => {
            try {
                const isAvailable = await this.probeSingleResource(resource.url);
                if (isAvailable) {
                    successfulUrls.push(resource.url);
                }
                else {
                    failedUrls.push(resource.url);
                    console.log(`❌ Style resource unavailable: ${resource.url}`);
                }
            }
            catch (error) {
                failedUrls.push(resource.url);
                console.log(`❌ Style resource probe failed: ${resource.url} - ${error}`);
            }
        });
        // Wait for all probes with timeout
        await Promise.allSettled(probePromises);
        const result = {
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
        }
        else {
            console.log(`⚠️  Style probe failed: ${failedUrls.length}/${resources.length} resources unavailable`);
        }
        return result;
    }
    /**
     * Probe a single resource using HEAD request.
     */
    async probeSingleResource(url) {
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
        }
        catch (error) {
            // Network error, timeout, or other failure
            return false;
        }
    }
    /**
     * Trigger self-healing process.
     */
    async triggerSelfHealing(params) {
        const ticketId = this.generateTicketId();
        const ticket = {
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
                }
                else {
                    ticket.status = 'failed';
                    ticket.result = `Partially fixed: ${fixedUrls.length}/${params.failedUrls.length}. Still failed: ${stillFailed.join(', ')}`;
                    ticket.completedAt = Date.now();
                }
            }
            else {
                // No frontend role available, mark as pending for manual intervention
                ticket.status = 'pending';
                ticket.result = 'Self-healing initiated, waiting for Frontend Role';
            }
            // Reload preview if completed
            if (ticket.status === 'completed' && this.previewController) {
                await this.previewController.reload();
            }
        }
        catch (error) {
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
    getTicketStatus(ticketId) {
        return this.activeTickets.get(ticketId) || null;
    }
    /**
     * Get all active tickets.
     */
    getActiveTickets() {
        return Array.from(this.activeTickets.values())
            .filter(ticket => ticket.status === 'pending' || ticket.status === 'in_progress');
    }
    /**
     * Check overall readiness.
     */
    async checkReadiness(resources) {
        // Probe styles
        const styleProbe = await this.probeStyles(resources);
        // Check preview
        const previewReady = this.previewController?.isReady() || false;
        // Determine overall readiness
        const ready = styleProbe.passed && previewReady;
        let message = '';
        if (ready) {
            message = '✅ Preview is ready with all styles loaded';
        }
        else if (!styleProbe.passed) {
            message = `⚠️  ${styleProbe.failedUrls.length} style resources missing`;
        }
        else if (!previewReady) {
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
    determinePriority(failedCount, totalCount) {
        const ratio = failedCount / totalCount;
        if (ratio === 0)
            return 'low';
        if (ratio < 0.25)
            return 'low';
        if (ratio < 0.5)
            return 'medium';
        if (ratio < 0.75)
            return 'high';
        return 'critical';
    }
    /**
     * Generate unique ticket ID.
     */
    generateTicketId() {
        return `healing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Set frontend role for self-healing.
     */
    setFrontendRole(frontendRole) {
        this.frontendRole = frontendRole;
    }
    /**
     * Set preview controller.
     */
    setPreviewController(controller) {
        this.previewController = controller;
    }
    /**
     * Set MCP bus.
     */
    setMCPBus(mcpBus) {
        this.mcpBus = mcpBus;
    }
    /**
     * Enable/disable auto-healing.
     */
    setAutoHealing(enabled) {
        this.enableAutoHealing = enabled;
    }
    /**
     * Clear completed tickets older than specified age.
     */
    cleanupOldTickets(maxAgeMs = 3600000) {
        const now = Date.now();
        for (const [id, ticket] of this.activeTickets.entries()) {
            if ((ticket.status === 'completed' || ticket.status === 'failed') &&
                ticket.completedAt &&
                now - ticket.completedAt > maxAgeMs) {
                this.activeTickets.delete(id);
            }
        }
    }
}
exports.PreviewControllerUIExtension = PreviewControllerUIExtension;
// ============================================================================
// Factory Functions
// ============================================================================
/**
 * Create preview controller UI extension.
 */
function createPreviewControllerUIExtension(options) {
    return new PreviewControllerUIExtension(options);
}
// ============================================================================
// Exports
// ============================================================================
exports.default = PreviewControllerUIExtension;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJldmlldy1jb250cm9sbGVyLXVpLWV4dGVuc2lvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3NyYy9nb3Zlcm5hbmNlL3ByZXZpZXctY29udHJvbGxlci11aS1leHRlbnNpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7O0dBVUc7OztBQWtiSCxnRkFVQztBQW5VRCwrRUFBK0U7QUFDL0Usa0NBQWtDO0FBQ2xDLCtFQUErRTtBQUUvRTs7R0FFRztBQUNILE1BQWEsNEJBQTRCO0lBUXZDLFlBQ0UsVUFNSSxFQUFFO1FBRU4sSUFBSSxDQUFDLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsSUFBSSxJQUFJLENBQUM7UUFDM0QsSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQztRQUNyQyxJQUFJLENBQUMsWUFBWSxHQUFHLE9BQU8sQ0FBQyxZQUFZLElBQUksSUFBSSxDQUFDO1FBQ2pELElBQUksQ0FBQyxZQUFZLEdBQUcsT0FBTyxDQUFDLFlBQVksSUFBSSxJQUFJLENBQUMsQ0FBQyxvQkFBb0I7UUFDdEUsSUFBSSxDQUFDLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsS0FBSyxLQUFLLENBQUM7UUFDN0QsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO0lBQ2pDLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILEtBQUssQ0FBQyxXQUFXLENBQ2YsU0FBMEI7UUFFMUIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQzdCLE1BQU0sVUFBVSxHQUFhLEVBQUUsQ0FBQztRQUNoQyxNQUFNLGNBQWMsR0FBYSxFQUFFLENBQUM7UUFFcEMsT0FBTyxDQUFDLEdBQUcsQ0FBQywrQkFBK0IsU0FBUyxDQUFDLE1BQU0sZUFBZSxDQUFDLENBQUM7UUFFNUUsc0JBQXNCO1FBQ3RCLE1BQU0sYUFBYSxH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QyxVQUE2QjtRQUNoRCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsVUFBVSxDQUFDO0lBQ3RDLENBQUM7SUFFRDs7T0FFRztJQUNILFNBQVMsQ0FBQyxNQUFjO1FBQ3RCLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO0lBQ3ZCLENBQUM7SUFFRDs7T0FFRztJQUNILGNBQWMsQ0FBQyxPQUFnQjtRQUM3QixJQUFJLENBQUMsaUJBQWlCLEdBQUcsT0FBTyxDQUFDO0lBQ25DLENBQUM7SUFFRDs7T0FFRztJQUNILGlCQUFpQixDQUFDLFdBQW1CLE9BQU87UUFDMUMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3ZCLEtBQUssTUFBTSxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7WUFDeEQsSUFDRSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEtBQUssV0FBVyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssUUFBUSxDQUFDO2dCQUM3RCxNQUFNLENBQUMsV0FBVztnQkFDbEIsR0FBRyxHQUFHLE1BQU0sQ0FBQyxXQUFXLEdBQUcsUUFBUSxFQUNuQyxDQUFDO2dCQUNELElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ2hDLENBQUM7UUFDSCxDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBelNELG9FQXlTQztBQUVELCtFQUErRTtBQUMvRSxvQkFBb0I7QUFDcEIsK0VBQStFO0FBRS9FOztHQUVHO0FBQ0gsU0FBZ0Isa0NBQWtDLENBQ2hELE9BTUM7SUFFRCxPQUFPLElBQUksNEJBQTRCLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDbkQsQ0FBQztBQUVELCtFQUErRTtBQUMvRSxVQUFVO0FBQ1YsK0VBQStFO0FBRS9FLGtCQUFlLDRCQUE0QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBBU0YgVjQuMCBQcmV2aWV3IENvbnRyb2xsZXIgVUkgRXh0ZW5zaW9uIC0gUmVhZGluZXNzIEdhdGVcbiAqIFxuICogU3R5bGUgcHJvYmluZyBhbmQgc2VsZi1oZWFsaW5nIGZvciBVSSBwcmV2aWV3IHJlYWRpbmVzcy5cbiAqIFZlcnNpb246IHYxLjUuMFxuICogXG4gKiBGZWF0dXJlczpcbiAqIC0gU3R5bGUgcmVzb3VyY2UgcHJvYmluZyAoSEVBRCByZXF1ZXN0cylcbiAqIC0gQXV0b21hdGljIHNlbGYtaGVhbGluZyB0cmlnZ2VyXG4gKiAtIFVzZXItZnJpZW5kbHkgc3RhdHVzIHJlcG9ydGluZ1xuICovXG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIFR5cGUgRGVmaW5pdGlvbnNcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuLyoqXG4gKiBTdHlsZSBwcm9iZSByZXN1bHQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU3R5bGVQcm9iZVJlc3VsdCB7XG4gIC8qKiBXaGV0aGVyIGFsbCBzdHlsZXMgcGFzc2VkICovXG4gIHBhc3NlZDogYm9vbGVhbjtcbiAgXG4gIC8qKiBMaXN0IG9mIGZhaWxlZCBVUkxzICovXG4gIGZhaWxlZFVybHM6IHN0cmluZ1tdO1xuICBcbiAgLyoqIFNlbGYtaGVhbGluZyB0aWNrZXQgSUQgKGlmIHRyaWdnZXJlZCkgKi9cbiAgcmVwYWlyVGlja2V0SWQ/OiBzdHJpbmc7XG4gIFxuICAvKiogUHJvYmUgdGltZXN0YW1wICovXG4gIHRpbWVzdGFtcDogbnVtYmVyO1xuICBcbiAgLyoqIFRvdGFsIHN0eWxlcyBjaGVja2VkICovXG4gIHRvdGFsQ2hlY2tlZDogbnVtYmVyO1xufVxuXG4vKipcbiAqIFN0eWxlIHJlc291cmNlIGluZm8uXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU3R5bGVSZXNvdXJjZSB7XG4gIC8qKiBSZXNvdXJjZSBVUkwgKi9cbiAgdXJsOiBzdHJpbmc7XG4gIFxuICAvKiogUmVzb3VyY2UgdHlwZSAqL1xuICB0eXBlOiAnY3JpdGljYWwnIHwgJ2V4dGVybmFsJyB8ICdkeW5hbWljJyB8ICdmb250JztcbiAgXG4gIC8qKiBXaGV0aGVyIGl0J3MgcmVxdWlyZWQgKi9cbiAgcmVxdWlyZWQ6IGJvb2xlYW47XG59XG5cbi8qKlxuICogU2VsZi1oZWFsaW5nIHRyaWdnZXIgcGFyYW1ldGVycy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTZWxmSGVhbGluZ1BhcmFtcyB7XG4gIC8qKiBGYWlsZWQgc3R5bGUgVVJMcyAqL1xuICBmYWlsZWRVcmxzOiBzdHJpbmdbXTtcbiAgXG4gIC8qKiBDb21wb25lbnQgbmFtZSAqL1xuICBjb21wb25lbnROYW1lPzogc3RyaW5nO1xuICBcbiAgLyoqIFByaW9yaXR5IGxldmVsICovXG4gIHByaW9yaXR5OiAnbG93JyB8ICdtZWRpdW0nIHwgJ2hpZ2gnIHwgJ2NyaXRpY2FsJztcbiAgXG4gIC8qKiBSZXRyeSBjb3VudCAqL1xuICByZXRyeUNvdW50PzogbnVtYmVyO1xufVxuXG4vKipcbiAqIFNlbGYtaGVhbGluZyB0aWNrZXQuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgU2VsZkhlYWxpbmdUaWNrZXQge1xuICAvKiogVGlja2V0IElEICovXG4gIGlkOiBzdHJpbmc7XG4gIFxuICAvKiogU3RhdHVzICovXG4gIHN0YXR1czogJ3BlbmRpbmcnIHwgJ2luX3Byb2dyZXNzJyB8ICdjb21wbGV0ZWQnIHwgJ2ZhaWxlZCc7XG4gIFxuICAvKiogRmFpbGVkIHJlc291cmNlcyAqL1xuICBmYWlsZWRSZXNvdXJjZXM6IHN0cmluZ1tdO1xuICBcbiAgLyoqIENyZWF0ZWQgdGltZXN0YW1wICovXG4gIGNyZWF0ZWRBdDogbnVtYmVyO1xuICBcbiAgLyoqIENvbXBsZXRlZCB0aW1lc3RhbXAgKi9cbiAgY29tcGxldGVkQXQ/OiBudW1iZXI7XG4gIFxuICAvKiogUmVzdWx0IG1lc3NhZ2UgKi9cbiAgcmVzdWx0Pzogc3RyaW5nO1xufVxuXG4vKipcbiAqIFByZXZpZXcgQ29udHJvbGxlciBpbnRlcmZhY2UuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgUHJldmlld0NvbnRyb2xsZXIge1xuICAvKiogUmVsb2FkIHByZXZpZXcgKi9cbiAgcmVsb2FkKCk6IFByb21pc2U8dm9pZD47XG4gIFxuICAvKiogR2V0IGN1cnJlbnQgcHJldmlldyBVUkwgKi9cbiAgZ2V0UHJldmlld1VybCgpOiBzdHJpbmc7XG4gIFxuICAvKiogQ2hlY2sgaWYgcHJldmlldyBpcyByZWFkeSAqL1xuICBpc1JlYWR5KCk6IGJvb2xlYW47XG59XG5cbi8qKlxuICogTUNQIEJ1cyBpbnRlcmZhY2UuXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgTUNQQnVzIHtcbiAgc2VuZChtZXNzYWdlOiBNQ1BNZXNzYWdlKTogUHJvbWlzZTx2b2lkPjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBNQ1BNZXNzYWdlIHtcbiAgdHlwZTogJ2NvbW1hbmQnIHwgJ2V2ZW50JyB8ICdwcm9wb3NhbCcgfCAncmVzcG9uc2UnO1xuICBmcm9tPzogc3RyaW5nO1xuICB0bz86IHN0cmluZztcbiAgdGFyZ2V0Pzogc3RyaW5nO1xuICBwYXlsb2FkOiBhbnk7XG4gIHRyYWNlSWQ/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogRnJvbnRlbmQgUm9sZSBpbnRlcmZhY2UgZm9yIHNlbGYtaGVhbGluZy5cbiAqL1xuZXhwb3J0IGludGVyZmFjZSBGcm9udGVuZFJvbGUge1xuICAvKiogRml4IG1pc3Npbmcgc3R5bGVzICovXG4gIGZpeE1pc3NpbmdTdHlsZXModXJsczogc3RyaW5nW10pOiBQcm9taXNlPHN0cmluZ1tdPjtcbiAgXG4gIC8qKiBSZWdlbmVyYXRlIGNyaXRpY2FsIENTUyAqL1xuICByZWdlbmVyYXRlQ3JpdGljYWxDU1MoKTogUHJvbWlzZTxzdHJpbmc+O1xufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBQcmV2aWV3IENvbnRyb2xsZXIgVUkgRXh0ZW5zaW9uXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogUHJldmlldyBDb250cm9sbGVyIFVJIEV4dGVuc2lvbiAtIEhhbmRsZXMgc3R5bGUgcmVhZGluZXNzIGNoZWNrcy5cbiAqL1xuZXhwb3J0IGNsYXNzIFByZXZpZXdDb250cm9sbGVyVUlFeHRlbnNpb24ge1xuICBwcml2YXRlIHByZXZpZXdDb250cm9sbGVyOiBQcmV2aWV3Q29udHJvbGxlciB8IG51bGw7XG4gIHByaXZhdGUgbWNwQnVzOiBNQ1BCdXMgfCBudWxsO1xuICBwcml2YXRlIGZyb250ZW5kUm9sZTogRnJvbnRlbmRSb2xlIHwgbnVsbDtcbiAgcHJpdmF0ZSBwcm9iZVRpbWVvdXQ6IG51bWJlcjtcbiAgcHJpdmF0ZSBlbmFibGVBdXRvSGVhbGluZzogYm9vbGVhbjtcbiAgcHJpdmF0ZSBhY3RpdmVUaWNrZXRzOiBNYXA8c3RyaW5nLCBTZWxmSGVhbGluZ1RpY2tldD47XG5cbiAgY29uc3RydWN0b3IoXG4gICAgb3B0aW9uczoge1xuICAgICAgcHJldmlld0NvbnRyb2xsZXI/OiBQcmV2aWV3Q29udHJvbGxlcjtcbiAgICAgIG1jcEJ1cz86IE1DUEJ1cztcbiAgICAgIGZyb250ZW5kUm9sZT86IEZyb250ZW5kUm9sZTtcbiAgICAgIHByb2JlVGltZW91dD86IG51bWJlcjtcbiAgICAgIGVuYWJsZUF1dG9IZWFsaW5nPzogYm9vbGVhbjtcbiAgICB9ID0ge31cbiAgKSB7XG4gICAgdGhpcy5wcmV2aWV3Q29udHJvbGxlciA9IG9wdGlvbnMucHJldmlld0NvbnRyb2xsZXIgfHwgbnVsbDtcbiAgICB0aGlzLm1jcEJ1cyA9IG9wdGlvbnMubWNwQnVzIHx8IG51bGw7XG4gICAgdGhpcy5mcm9udGVuZFJvbGUgPSBvcHRpb25zLmZyb250ZW5kUm9sZSB8fCBudWxsO1xuICAgIHRoaXMucHJvYmVUaW1lb3V0ID0gb3B0aW9ucy5wcm9iZVRpbWVvdXQgfHwgNTAwMDsgLy8gNSBzZWNvbmRzIGRlZmF1bHRcbiAgICB0aGlzLmVuYWJsZUF1dG9IZWFsaW5nID0gb3B0aW9ucy5lbmFibGVBdXRvSGVhbGluZyAhPT0gZmFsc2U7XG4gICAgdGhpcy5hY3RpdmVUaWNrZXRzID0gbmV3IE1hcCgpO1xuICB9XG5cbiAgLyoqXG4gICAqIFByb2JlIHN0eWxlIHJlc291cmNlcyBmb3IgYXZhaWxhYmlsaXR5LlxuICAgKiBcbiAgICogU2VuZHMgSEVBRCByZXF1ZXN0cyB0byBjaGVjayBpZiBzdHlsZSByZXNvdXJjZXMgYXJlIGFjY2Vzc2libGUuXG4gICAqIEF1dG9tYXRpY2FsbHkgdHJpZ2dlcnMgc2VsZi1oZWFsaW5nIGlmIGZhaWx1cmVzIGRldGVjdGVkLlxuICAgKi9cbiAgYXN5bmMgcHJvYmVTdHlsZXMoXG4gICAgcmVzb3VyY2VzOiBTdHlsZVJlc291cmNlW11cbiAgKTogUHJvbWlzZTxTdHlsZVByb2JlUmVzdWx0PiB7XG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcbiAgICBjb25zdCBmYWlsZWRVcmxzOiBzdHJpbmdbXSA9IFtdO1xuICAgIGNvbnN0IHN1Y2Nlc3NmdWxVcmxzOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgY29uc29sZS5sb2coYPCflI0gU3RhcnRpbmcgc3R5bGUgcHJvYmUgZm9yICR7cmVzb3VyY2VzLmxlbmd0aH0gcmVzb3VyY2VzLi4uYCk7XG5cbiAgICAvLyBQcm9iZSBlYWNoIHJlc291cmNlXG4gICAgY29uc3QgcHJvYmVQcm9taXNlcyA9IHJlc291cmNlcy5tYXAoYXN5bmMgKHJlc291cmNlKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBpc0F2YWlsYWJsZSA9IGF3YWl0IHRoaXMucHJvYmVTaW5nbGVSZXNvdXJjZShyZXNvdXJjZS51cmwpO1xuICAgICAgICBpZiAoaXNBdmFpbGFibGUpIHtcbiAgICAgICAgICBzdWNjZXNzZnVsVXJscy5wdXNoKHJlc291cmNlLnVybCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZmFpbGVkVXJscy5wdXNoKHJlc291cmNlLnVybCk7XG4gICAgICAgICAgY29uc29sZS5sb2coYOKdjCBTdHlsZSByZXNvdXJjZSB1bmF2YWlsYWJsZTogJHtyZXNvdXJjZS51cmx9YCk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGZhaWxlZFVybHMucHVzaChyZXNvdXJjZS51cmwpO1xuICAgICAgICBjb25zb2xlLmxvZyhg4p2MIFN0eWxlIHJlc291cmNlIHByb2JlIGZhaWxlZDogJHtyZXNvdXJjZS51cmx9IC0gJHtlcnJvcn1gKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIFdhaXQgZm9yIGFsbCBwcm9iZXMgd2l0aCB0aW1lb3V0XG4gICAgYXdhaXQgUHJvbWlzZS5hbGxTZXR0bGVkKHByb2JlUHJvbWlzZXMpO1xuXG4gICAgY29uc3QgcmVzdWx0OiBTdHlsZVByb2JlUmVzdWx0ID0ge1xuICAgICAgcGFzc2VkOiBmYWlsZWRVcmxzLmxlbmd0aCA9PT0gMCxcbiAgICAgIGZhaWxlZFVybHMsXG4gICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXG4gICAgICB0b3RhbENoZWNrZWQ6IHJlc291cmNlcy5sZW5ndGgsXG4gICAgfTtcblxuICAgIC8vIFRyaWdnZXIgc2VsZi1oZWFsaW5nIGlmIGZhaWx1cmVzIGRldGVjdGVkXG4gICAgaWYgKGZhaWxlZFVybHMubGVuZ3RoID4gMCAmJiB0aGlzLmVuYWJsZUF1dG9IZWFsaW5nKSB7XG4gICAgICBjb25zdCB0aWNrZXQgPSBhd2FpdCB0aGlzLnRyaWdnZXJTZWxmSGVhbGluZyh7XG4gICAgICAgIGZhaWxlZFVybHMsXG4gICAgICAgIHByaW9yaXR5OiB0aGlzLmRldGVybWluZVByaW9yaXR5KGZhaWxlZFVybHMubGVuZ3RoLCByZXNvdXJjZXMubGVuZ3RoKSxcbiAgICAgICAgcmV0cnlDb3VudDogMCxcbiAgICAgIH0pO1xuICAgICAgcmVzdWx0LnJlcGFpclRpY2tldElkID0gdGlja2V0LmlkO1xuXG4gICAgICBjb25zb2xlLmxvZyhg8J+UpyDmo4DmtYvliLAgJHtmYWlsZWRVcmxzLmxlbmd0aH0g5Liq5qC35byP6LWE5rqQ57y65aSx77yM5bey6Ieq5Yqo6Kem5Y+RIEZyb250ZW5kIFJvbGUg5L+u5aSNIChUaWNrZXQ6ICR7dGlja2V0LmlkfSlgKTtcbiAgICB9XG5cbiAgICAvLyBSZXBvcnQgc3RhdHVzXG4gICAgaWYgKHJlc3VsdC5wYXNzZWQpIHtcbiAgICAgIGNvbnNvbGUubG9nKGDinIUgU3R5bGUgcHJvYmUgcGFzc2VkOiAke3N1Y2Nlc3NmdWxVcmxzLmxlbmd0aH0vJHtyZXNvdXJjZXMubGVuZ3RofSByZXNvdXJjZXMgYXZhaWxhYmxlYCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnNvbGUubG9nKGDimqDvuI8gIFN0eWxlIHByb2JlIGZhaWxlZDogJHtmYWlsZWRVcmxzLmxlbmd0aH0vJHtyZXNvdXJjZXMubGVuZ3RofSByZXNvdXJjZXMgdW5hdmFpbGFibGVgKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9XG5cbiAgLyoqXG4gICAqIFByb2JlIGEgc2luZ2xlIHJlc291cmNlIHVzaW5nIEhFQUQgcmVxdWVzdC5cbiAgICovXG4gIHByaXZhdGUgYXN5bmMgcHJvYmVTaW5nbGVSZXNvdXJjZSh1cmw6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBjb250cm9sbGVyID0gbmV3IEFib3J0Q29udHJvbGxlcigpO1xuICAgICAgY29uc3QgdGltZW91dElkID0gc2V0VGltZW91dCgoKSA9PiBjb250cm9sbGVyLmFib3J0KCksIHRoaXMucHJvYmVUaW1lb3V0KTtcblxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCh1cmwsIHtcbiAgICAgICAgbWV0aG9kOiAnSEVBRCcsXG4gICAgICAgIHNpZ25hbDogY29udHJvbGxlci5zaWduYWwsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAnQ2FjaGUtQ29udHJvbCc6ICduby1jYWNoZScsXG4gICAgICAgIH0sXG4gICAgICB9KTtcblxuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRJZCk7XG5cbiAgICAgIHJldHVybiByZXNwb25zZS5vayAmJiByZXNwb25zZS5zdGF0dXMgPj0gMjAwICYmIHJlc3BvbnNlLnN0YXR1cyA8IDQwMDtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgLy8gTmV0d29yayBlcnJvciwgdGltZW91dCwgb3Igb3RoZXIgZmFpbHVyZVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBUcmlnZ2VyIHNlbGYtaGVhbGluZyBwcm9jZXNzLlxuICAgKi9cbiAgYXN5bmMgdHJpZ2dlclNlbGZIZWFsaW5nKHBhcmFtczogU2VsZkhlYWxpbmdQYXJhbXMpOiBQcm9taXNlPFNlbGZIZWFsaW5nVGlja2V0PiB7XG4gICAgY29uc3QgdGlja2V0SWQgPSB0aGlzLmdlbmVyYXRlVGlja2V0SWQoKTtcbiAgICBcbiAgICBjb25zdCB0aWNrZXQ6IFNlbGZIZWFsaW5nVGlja2V0ID0ge1xuICAgICAgaWQ6IHRpY2tldElkLFxuICAgICAgc3RhdHVzOiAncGVuZGluZycsXG4gICAgICBmYWlsZWRSZXNvdXJjZXM6IHBhcmFtcy5mYWlsZWRVcmxzLFxuICAgICAgY3JlYXRlZEF0OiBEYXRlLm5vdygpLFxuICAgIH07XG5cbiAgICB0aGlzLmFjdGl2ZVRpY2tldHMuc2V0KHRpY2tldElkLCB0aWNrZXQpO1xuXG4gICAgdHJ5IHtcbiAgICAgIC8vIFVwZGF0ZSBzdGF0dXNcbiAgICAgIHRpY2tldC5zdGF0dXMgPSAnaW5fcHJvZ3Jlc3MnO1xuXG4gICAgICAvLyBOb3RpZnkgdmlhIE1DUCBpZiBhdmFpbGFibGVcbiAgICAgIGlmICh0aGlzLm1jcEJ1cykge1xuICAgICAgICBhd2FpdCB0aGlzLm1jcEJ1cy5zZW5kKHtcbiAgICAgICAgICB0eXBlOiAnY29tbWFuZCcsXG4gICAgICAgICAgdGFyZ2V0OiAnRnJvbnRlbmRSb2xlJyxcbiAgICAgICAgICBwYXlsb2FkOiB7XG4gICAgICAgICAgICBhY3Rpb246ICdmaXhNaXNzaW5nU3R5bGVzJyxcbiAgICAgICAgICAgIHRpY2tldElkLFxuICAgICAgICAgICAgdXJsczogcGFyYW1zLmZhaWxlZFVybHMsXG4gICAgICAgICAgICBwcmlvcml0eTogcGFyYW1zLnByaW9yaXR5LFxuICAgICAgICAgIH0sXG4gICAgICAgICAgdHJhY2VJZDogYGhlYWxpbmctJHt0aWNrZXRJZH1gLFxuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgLy8gRXhlY3V0ZSBmaXggaWYgZnJvbnRlbmQgcm9sZSBpcyBhdmFpbGFibGVcbiAgICAgIGlmICh0aGlzLmZyb250ZW5kUm9sZSkge1xuICAgICAgICBjb25zdCBmaXhlZFVybHMgPSBhd2FpdCB0aGlzLmZyb250ZW5kUm9sZS5maXhNaXNzaW5nU3R5bGVzKHBhcmFtcy5mYWlsZWRVcmxzKTtcbiAgICAgICAgXG4gICAgICAgIC8vIENoZWNrIGlmIGFsbCB3ZXJlIGZpeGVkXG4gICAgICAgIGNvbnN0IHN0aWxsRmFpbGVkID0gcGFyYW1zLmZhaWxlZFVybHMuZmlsdGVyKHVybCA9PiAhZml4ZWRVcmxzLmluY2x1ZGVzKHVybCkpO1xuICAgICAgICBcbiAgICAgICAgaWYgKHN0aWxsRmFpbGVkLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgIHRpY2tldC5zdGF0dXMgPSAnY29tcGxldGVkJztcbiAgICAgICAgICB0aWNrZXQucmVzdWx0ID0gYFN1Y2Nlc3NmdWxseSBmaXhlZCAke2ZpeGVkVXJscy5sZW5ndGh9IHN0eWxlIHJlc291cmNlc2A7XG4gICAgICAgICAgdGlja2V0LmNvbXBsZXRlZEF0ID0gRGF0ZS5ub3coKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aWNrZXQuc3RhdHVzID0gJ2ZhaWxlZCc7XG4gICAgICAgICAgdGlja2V0LnJlc3VsdCA9IGBQYXJ0aWFsbHkgZml4ZWQ6ICR7Zml4ZWRVcmxzLmxlbmd0aH0vJHtwYXJhbXMuZmFpbGVkVXJscy5sZW5ndGh9LiBTdGlsbCBmYWlsZWQ6ICR7c3RpbGxGYWlsZWQuam9pbignLCAnKX1gO1xuICAgICAgICAgIHRpY2tldC5jb21wbGV0ZWRBdCA9IERhdGUubm93KCk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIE5vIGZyb250ZW5kIHJvbGUgYXZhaWxhYmxlLCBtYXJrIGFzIHBlbmRpbmcgZm9yIG1hbnVhbCBpbnRlcnZlbnRpb25cbiAgICAgICAgdGlja2V0LnN0YXR1cyA9ICdwZW5kaW5nJztcbiAgICAgICAgdGlja2V0LnJlc3VsdCA9ICdTZWxmLWhlYWxpbmcgaW5pdGlhdGVkLCB3YWl0aW5nIGZvciBGcm9udGVuZCBSb2xlJztcbiAgICAgIH1cblxuICAgICAgLy8gUmVsb2FkIHByZXZpZXcgaWYgY29tcGxldGVkXG4gICAgICBpZiAodGlja2V0LnN0YXR1cyA9PT0gJ2NvbXBsZXRlZCcgJiYgdGhpcy5wcmV2aWV3Q29udHJvbGxlcikge1xuICAgICAgICBhd2FpdCB0aGlzLnByZXZpZXdDb250cm9sbGVyLnJlbG9hZCgpO1xuICAgICAgfVxuXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRpY2tldC5zdGF0dXMgPSAnZmFpbGVkJztcbiAgICAgIHRpY2tldC5yZXN1bHQgPSBgU2VsZi1oZWFsaW5nIGZhaWxlZDogJHtlcnJvcn1gO1xuICAgICAgdGlja2V0LmNvbXBsZXRlZEF0ID0gRGF0ZS5ub3coKTtcbiAgICB9XG5cbiAgICB0aGlzLmFjdGl2ZVRpY2tldHMuc2V0KHRpY2tldElkLCB0aWNrZXQpO1xuICAgIHJldHVybiB0aWNrZXQ7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHNlbGYtaGVhbGluZyB0aWNrZXQgc3RhdHVzLlxuICAgKi9cbiAgZ2V0VGlja2V0U3RhdHVzKHRpY2tldElkOiBzdHJpbmcpOiBTZWxmSGVhbGluZ1RpY2tldCB8IG51bGwge1xuICAgIHJldHVybiB0aGlzLmFjdGl2ZVRpY2tldHMuZ2V0KHRpY2tldElkKSB8fCBudWxsO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBhbGwgYWN0aXZlIHRpY2tldHMuXG4gICAqL1xuICBnZXRBY3RpdmVUaWNrZXRzKCk6IFNlbGZIZWFsaW5nVGlja2V0W10ge1xuICAgIHJldHVybiBBcnJheS5mcm9tKHRoaXMuYWN0aXZlVGlja2V0cy52YWx1ZXMoKSlcbiAgICAgIC5maWx0ZXIodGlja2V0ID0+IHRpY2tldC5zdGF0dXMgPT09ICdwZW5kaW5nJyB8fCB0aWNrZXQuc3RhdHVzID09PSAnaW5fcHJvZ3Jlc3MnKTtcbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVjayBvdmVyYWxsIHJlYWRpbmVzcy5cbiAgICovXG4gIGFzeW5jIGNoZWNrUmVhZGluZXNzKHJlc291cmNlczogU3R5bGVSZXNvdXJjZVtdKTogUHJvbWlzZTx7XG4gICAgcmVhZHk6IGJvb2xlYW47XG4gICAgc3R5bGVQcm9iZTogU3R5bGVQcm9iZVJlc3VsdDtcbiAgICBwcmV2aWV3UmVhZHk6IGJvb2xlYW47XG4gICAgbWVzc2FnZTogc3RyaW5nO1xuICB9PiB7XG4gICAgLy8gUHJvYmUgc3R5bGVzXG4gICAgY29uc3Qgc3R5bGVQcm9iZSA9IGF3YWl0IHRoaXMucHJvYmVTdHlsZXMocmVzb3VyY2VzKTtcblxuICAgIC8vIENoZWNrIHByZXZpZXdcbiAgICBjb25zdCBwcmV2aWV3UmVhZHkgPSB0aGlzLnByZXZpZXdDb250cm9sbGVyPy5pc1JlYWR5KCkgfHwgZmFsc2U7XG5cbiAgICAvLyBEZXRlcm1pbmUgb3ZlcmFsbCByZWFkaW5lc3NcbiAgICBjb25zdCByZWFkeSA9IHN0eWxlUHJvYmUucGFzc2VkICYmIHByZXZpZXdSZWFkeTtcblxuICAgIGxldCBtZXNzYWdlID0gJyc7XG4gICAgaWYgKHJlYWR5KSB7XG4gICAgICBtZXNzYWdlID0gJ+KchSBQcmV2aWV3IGlzIHJlYWR5IHdpdGggYWxsIHN0eWxlcyBsb2FkZWQnO1xuICAgIH0gZWxzZSBpZiAoIXN0eWxlUHJvYmUucGFzc2VkKSB7XG4gICAgICBtZXNzYWdlID0gYOKaoO+4jyAgJHtzdHlsZVByb2JlLmZhaWxlZFVybHMubGVuZ3RofSBzdHlsZSByZXNvdXJjZXMgbWlzc2luZ2A7XG4gICAgfSBlbHNlIGlmICghcHJldmlld1JlYWR5KSB7XG4gICAgICBtZXNzYWdlID0gJ+KaoO+4jyAgUHJldmlldyBjb250cm9sbGVyIG5vdCByZWFkeSc7XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHJlYWR5LFxuICAgICAgc3R5bGVQcm9iZSxcbiAgICAgIHByZXZpZXdSZWFkeSxcbiAgICAgIG1lc3NhZ2UsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBEZXRlcm1pbmUgcHJpb3JpdHkgYmFzZWQgb24gZmFpbHVyZSByYXRpby5cbiAgICovXG4gIHByaXZhdGUgZGV0ZXJtaW5lUHJpb3JpdHkoZmFpbGVkQ291bnQ6IG51bWJlciwgdG90YWxDb3VudDogbnVtYmVyKTogJ2xvdycgfCAnbWVkaXVtJyB8ICdoaWdoJyB8ICdjcml0aWNhbCcge1xuICAgIGNvbnN0IHJhdGlvID0gZmFpbGVkQ291bnQgLyB0b3RhbENvdW50O1xuICAgIFxuICAgIGlmIChyYXRpbyA9PT0gMCkgcmV0dXJuICdsb3cnO1xuICAgIGlmIChyYXRpbyA8IDAuMjUpIHJldHVybiAnbG93JztcbiAgICBpZiAocmF0aW8gPCAwLjUpIHJldHVybiAnbWVkaXVtJztcbiAgICBpZiAocmF0aW8gPCAwLjc1KSByZXR1cm4gJ2hpZ2gnO1xuICAgIHJldHVybiAnY3JpdGljYWwnO1xuICB9XG5cbiAgLyoqXG4gICAqIEdlbmVyYXRlIHVuaXF1ZSB0aWNrZXQgSUQuXG4gICAqL1xuICBwcml2YXRlIGdlbmVyYXRlVGlja2V0SWQoKTogc3RyaW5nIHtcbiAgICByZXR1cm4gYGhlYWxpbmdfJHtEYXRlLm5vdygpfV8ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnN1YnN0cigyLCA5KX1gO1xuICB9XG5cbiAgLyoqXG4gICAqIFNldCBmcm9udGVuZCByb2xlIGZvciBzZWxmLWhlYWxpbmcuXG4gICAqL1xuICBzZXRGcm9udGVuZFJvbGUoZnJvbnRlbmRSb2xlOiBGcm9udGVuZFJvbGUpOiB2b2lkIHtcbiAgICB0aGlzLmZyb250ZW5kUm9sZSA9IGZyb250ZW5kUm9sZTtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXQgcHJldmlldyBjb250cm9sbGVyLlxuICAgKi9cbiAgc2V0UHJldmlld0NvbnRyb2xsZXIoY29udHJvbGxlcjogUHJldmlld0NvbnRyb2xsZXIpOiB2b2lkIHtcbiAgICB0aGlzLnByZXZpZXdDb250cm9sbGVyID0gY29udHJvbGxlcjtcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXQgTUNQIGJ1cy5cbiAgICovXG4gIHNldE1DUEJ1cyhtY3BCdXM6IE1DUEJ1cyk6IHZvaWQge1xuICAgIHRoaXMubWNwQnVzID0gbWNwQnVzO1xuICB9XG5cbiAgLyoqXG4gICAqIEVuYWJsZS9kaXNhYmxlIGF1dG8taGVhbGluZy5cbiAgICovXG4gIHNldEF1dG9IZWFsaW5nKGVuYWJsZWQ6IGJvb2xlYW4pOiB2b2lkIHtcbiAgICB0aGlzLmVuYWJsZUF1dG9IZWFsaW5nID0gZW5hYmxlZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBDbGVhciBjb21wbGV0ZWQgdGlja2V0cyBvbGRlciB0aGFuIHNwZWNpZmllZCBhZ2UuXG4gICAqL1xuICBjbGVhbnVwT2xkVGlja2V0cyhtYXhBZ2VNczogbnVtYmVyID0gMzYwMDAwMCk6IHZvaWQge1xuICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gICAgZm9yIChjb25zdCBbaWQsIHRpY2tldF0gb2YgdGhpcy5hY3RpdmVUaWNrZXRzLmVudHJpZXMoKSkge1xuICAgICAgaWYgKFxuICAgICAgICAodGlja2V0LnN0YXR1cyA9PT0gJ2NvbXBsZXRlZCcgfHwgdGlja2V0LnN0YXR1cyA9PT0gJ2ZhaWxlZCcpICYmXG4gICAgICAgIHRpY2tldC5jb21wbGV0ZWRBdCAmJlxuICAgICAgICBub3cgLSB0aWNrZXQuY29tcGxldGVkQXQgPiBtYXhBZ2VNc1xuICAgICAgKSB7XG4gICAgICAgIHRoaXMuYWN0aXZlVGlja2V0cy5kZWxldGUoaWQpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBGYWN0b3J5IEZ1bmN0aW9uc1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG4vKipcbiAqIENyZWF0ZSBwcmV2aWV3IGNvbnRyb2xsZXIgVUkgZXh0ZW5zaW9uLlxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUHJldmlld0NvbnRyb2xsZXJVSUV4dGVuc2lvbihcbiAgb3B0aW9ucz86IHtcbiAgICBwcmV2aWV3Q29udHJvbGxlcj86IFByZXZpZXdDb250cm9sbGVyO1xuICAgIG1jcEJ1cz86IE1DUEJ1cztcbiAgICBmcm9udGVuZFJvbGU/OiBGcm9udGVuZFJvbGU7XG4gICAgcHJvYmVUaW1lb3V0PzogbnVtYmVyO1xuICAgIGVuYWJsZUF1dG9IZWFsaW5nPzogYm9vbGVhbjtcbiAgfVxuKTogUHJldmlld0NvbnRyb2xsZXJVSUV4dGVuc2lvbiB7XG4gIHJldHVybiBuZXcgUHJldmlld0NvbnRyb2xsZXJVSUV4dGVuc2lvbihvcHRpb25zKTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gRXhwb3J0c1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5leHBvcnQgZGVmYXVsdCBQcmV2aWV3Q29udHJvbGxlclVJRXh0ZW5zaW9uO1xuIl19