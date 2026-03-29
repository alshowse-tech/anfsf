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
export function exportPrometheus(kpis: RoleKPISnapshot[]): string {
  const lines: string[] = [];

  // Add help comments
  lines.push('# HELP role_kpi_throughput Tasks completed per hour');
  lines.push('# TYPE role_kpi_throughput gauge');
  lines.push('# HELP role_kpi_failure_rate Failed tasks ratio (0-1)');
  lines.push('# TYPE role_kpi_failure_rate gauge');
  lines.push('# HELP role_kpi_rework_rate Reworked tasks ratio (0-1)');
  lines.push('# TYPE role_kpi_rework_rate gauge');
  lines.push('# HELP role_kpi_queue_pressure Queue length ratio');
  lines.push('# TYPE role_kpi_queue_pressure gauge');
  lines.push('# HELP role_kpi_conflict_rate Conflict ratio (0-1)');
  lines.push('# TYPE role_kpi_conflict_rate gauge');
  lines.push('# HELP role_kpi_drift_index Task capability drift (0-1)');
  lines.push('# TYPE role_kpi_drift_index gauge');
  lines.push('# HELP role_kpi_health_score Overall health score (0-100)');
  lines.push('# TYPE role_kpi_health_score gauge');
  lines.push('');

  for (const kpi of kpis) {
    const labels = `role="${kpi.roleId}",window="${kpi.window}"`;

    lines.push(`role_kpi_throughput{${labels}} ${kpi.throughput}`);
    lines.push(`role_kpi_failure_rate{${labels}} ${kpi.failureRate}`);
    lines.push(`role_kpi_rework_rate{${labels}} ${kpi.reworkRate}`);
    lines.push(`role_kpi_queue_pressure{${labels}} ${kpi.queuePressure}`);
    lines.push(`role_kpi_conflict_rate{${labels}} ${kpi.conflictRate}`);
    lines.push(`role_kpi_drift_index{${labels}} ${kpi.driftIndex}`);
    lines.push(`role_kpi_health_score{${labels}} ${kpi.healthScore}`);
  }

  return lines.join('\n');
}

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
export function exportJSONL(kpis: RoleKPISnapshot[]): string {
  return kpis.map((kpi) => JSON.stringify(kpi)).join('\n');
}

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
export function exportSnapshot(
  kpis: RoleKPISnapshot[],
  includeMetadata: boolean = true
): string {
  const snapshot: any = {
    roles: kpis,
  };

  if (includeMetadata) {
    snapshot.metadata = {
      exportedAt: Date.now(),
      count: kpis.length,
      windows: [...new Set(kpis.map((k) => k.window))],
      roles: kpis.map((k) => k.roleId),
    };
  }

  return JSON.stringify(snapshot, null, 2);
}

/**
 * Export KPI data to CSV format.
 * 
 * @param kpis - Array of KPI snapshots
 * @param includeHeader - Include CSV header (default: true)
 * @returns CSV string
 */
export function exportCSV(kpis: RoleKPISnapshot[], includeHeader: boolean = true): string {
  const lines: string[] = [];

  if (includeHeader) {
    lines.push(
      'roleId,timestamp,window,throughput,failureRate,reworkRate,queuePressure,conflictRate,driftIndex,healthScore,trend,taskCount,changeCount'
    );
  }

  for (const kpi of kpis) {
    lines.push(
      [
        kpi.roleId,
        kpi.timestamp,
        kpi.window,
        kpi.throughput,
        kpi.failureRate,
        kpi.reworkRate,
        kpi.queuePressure,
        kpi.conflictRate,
        kpi.driftIndex,
        kpi.healthScore,
        kpi.trend,
        kpi.taskCount,
        kpi.changeCount,
      ].join(',')
    );
  }

  return lines.join('\n');
}

/**
 * Export KPI data to Grafana dashboard JSON.
 * 
 * @param kpis - Array of KPI snapshots
 * @param dashboardTitle - Dashboard title
 * @returns Grafana dashboard JSON
 */
export function exportGrafanaDashboard(
  kpis: RoleKPISnapshot[],
  dashboardTitle: string = 'Role KPI Dashboard'
): string {
  const roles = [...new Set(kpis.map((k) => k.roleId))];

  const dashboard = {
    dashboard: {
      id: null,
      uid: 'role-kpi-dashboard',
      title: dashboardTitle,
      tags: ['role-kpi', 'asf-v4'],
      timezone: 'browser',
      panels: [
        {
          id: 1,
          title: 'Health Score Overview',
          type: 'gauge',
          gridPos: { h: 8, w: 12, x: 0, y: 0 },
          targets: roles.map((role, i) => ({
            expr: `role_kpi_health_score{role="${role}"}`,
            legendFormat: role,
            refId: String.fromCharCode(65 + i),
          })),
          options: {
            showThresholdLabels: true,
            showThresholdMarkers: true,
          },
          fieldConfig: {
            defaults: {
              min: 0,
              max: 100,
              thresholds: {
                mode: 'absolute',
                steps: [
                  { color: 'red', value: 0 },
                  { color: 'yellow', value: 60 },
                  { color: 'green', value: 80 },
                ],
              },
            },
          },
        },
        {
          id: 2,
          title: 'Throughput by Role',
          type: 'bargauge',
          gridPos: { h: 8, w: 12, x: 12, y: 0 },
          targets: roles.map((role, i) => ({
            expr: `role_kpi_throughput{role="${role}"}`,
            legendFormat: role,
            refId: String.fromCharCode(65 + i),
          })),
        },
        {
          id: 3,
          title: 'Failure Rate',
          type: 'stat',
          gridPos: { h: 8, w: 8, x: 0, y: 8 },
          targets: roles.map((role, i) => ({
            expr: `role_kpi_failure_rate{role="${role}"}`,
            legendFormat: role,
            refId: String.fromCharCode(65 + i),
          })),
        },
        {
          id: 4,
          title: 'Queue Pressure',
          type: 'stat',
          gridPos: { h: 8, w: 8, x: 8, y: 8 },
          targets: roles.map((role, i) => ({
            expr: `role_kpi_queue_pressure{role="${role}"}`,
            legendFormat: role,
            refId: String.fromCharCode(65 + i),
          })),
        },
        {
          id: 5,
          title: 'Drift Index',
          type: 'stat',
          gridPos: { h: 8, w: 8, x: 16, y: 8 },
          targets: roles.map((role, i) => ({
            expr: `role_kpi_drift_index{role="${role}"}`,
            legendFormat: role,
            refId: String.fromCharCode(65 + i),
          })),
        },
      ],
      refresh: '30s',
      schemaVersion: 38,
      version: 1,
    },
  };

  return JSON.stringify(dashboard, null, 2);
}

/**
 * Generic export function.
 * 
 * @param kpis - Array of KPI snapshots
 * @param format - Export format
 * @param options - Format-specific options
 * @returns Exported string
 */
export function exportKPI(
  kpis: RoleKPISnapshot[],
  format: 'prometheus' | 'jsonl' | 'snapshot' | 'csv' | 'grafana',
  options?: {
    dashboardTitle?: string;
    includeMetadata?: boolean;
    includeHeader?: boolean;
  }
): string {
  switch (format) {
    case 'prometheus':
      return exportPrometheus(kpis);
    case 'jsonl':
      return exportJSONL(kpis);
    case 'snapshot':
      return exportSnapshot(kpis, options?.includeMetadata);
    case 'csv':
      return exportCSV(kpis, options?.includeHeader);
    case 'grafana':
      return exportGrafanaDashboard(kpis, options?.dashboardTitle);
    default:
      throw new Error(`Unknown export format: ${format}`);
  }
}
