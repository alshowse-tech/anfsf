/**
 * ASF V4.0 Role Engine - KPI Export
 *
 * Export KPI data to Prometheus, JSONL, and snapshot formats.
 * Version: v0.8.5
 */
import type { RoleKPISnapshot } from './kpi-types';
/**
 * Export KPI data to Prometheus metrics format.
 *
 * @param kpis - Array of KPI snapshots
 * @returns Prometheus-formatted metrics string
 *
 * @example
 * ```
 * role_kpi_throughput{role="backend-team",window="1d"} 5.23
 * role_kpi_failure_rate{role="backend-team",window="1d"} 0.125
 * role_kpi_health_score{role="backend-team",window="1d"} 72
 * ```
 */
export declare function exportPrometheus(kpis: RoleKPISnapshot[]): string;
/**
 * Export KPI data to JSONL (JSON Lines) format.
 *
 * Each line is a complete JSON object.
 * Suitable for time series storage and streaming.
 *
 * @param kpis - Array of KPI snapshots
 * @returns JSONL string
 *
 * @example
 * ```
 * {"roleId":"backend-team","timestamp":1711700000000,"window":"1d","throughput":5.23,...}
 * {"roleId":"frontend-team","timestamp":1711700000000,"window":"1d","throughput":4.56,...}
 * ```
 */
export declare function exportJSONL(kpis: RoleKPISnapshot[]): string;
/**
 * Export KPI data to snapshot JSON format.
 *
 * Includes metadata and all KPIs in a single object.
 * Suitable for archival and reporting.
 *
 * @param kpis - Array of KPI snapshots
 * @param includeMetadata - Include export metadata (default: true)
 * @returns JSON string
 */
export declare function exportSnapshot(kpis: RoleKPISnapshot[], includeMetadata?: boolean): string;
/**
 * Export KPI data to CSV format.
 *
 * @param kpis - Array of KPI snapshots
 * @param includeHeader - Include CSV header (default: true)
 * @returns CSV string
 */
export declare function exportCSV(kpis: RoleKPISnapshot[], includeHeader?: boolean): string;
/**
 * Export KPI data to Grafana dashboard JSON.
 *
 * @param kpis - Array of KPI snapshots
 * @param dashboardTitle - Dashboard title
 * @returns Grafana dashboard JSON
 */
export declare function exportGrafanaDashboard(kpis: RoleKPISnapshot[], dashboardTitle?: string): string;
/**
 * Generic export function.
 *
 * @param kpis - Array of KPI snapshots
 * @param format - Export format
 * @param options - Format-specific options
 * @returns Exported string
 */
export declare function exportKPI(kpis: RoleKPISnapshot[], format: 'prometheus' | 'jsonl' | 'snapshot' | 'csv' | 'grafana', options?: {
    dashboardTitle?: string;
    includeMetadata?: boolean;
    includeHeader?: boolean;
}): string;
