"use strict";
/**
 * ASF V4.0 Role Engine - KPI Export
 *
 * Export KPI data to Prometheus, JSONL, and snapshot formats.
 * Version: v0.8.5
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportPrometheus = exportPrometheus;
exports.exportJSONL = exportJSONL;
exports.exportSnapshot = exportSnapshot;
exports.exportCSV = exportCSV;
exports.exportGrafanaDashboard = exportGrafanaDashboard;
exports.exportKPI = exportKPI;
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
function exportPrometheus(kpis) {
    const lines = [];
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
function exportJSONL(kpis) {
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
function exportSnapshot(kpis, includeMetadata = true) {
    const snapshot = {
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
function exportCSV(kpis, includeHeader = true) {
    const lines = [];
    if (includeHeader) {
        lines.push('roleId,timestamp,window,throughput,failureRate,reworkRate,queuePressure,conflictRate,driftIndex,healthScore,trend,taskCount,changeCount');
    }
    for (const kpi of kpis) {
        lines.push([
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
        ].join(','));
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
function exportGrafanaDashboard(kpis, dashboardTitle = 'Role KPI Dashboard') {
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
function exportKPI(kpis, format, options) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia3BpLWV4cG9ydC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9jb3JlL3JvbGUva3BpLWV4cG9ydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7O0FBaUJILDRDQWlDQztBQWlCRCxrQ0FFQztBQVlELHdDQWtCQztBQVNELDhCQThCQztBQVNELHdEQStGQztBQVVELDhCQXVCQztBQS9RRDs7Ozs7Ozs7Ozs7O0dBWUc7QUFDSCxTQUFnQixnQkFBZ0IsQ0FBQyxJQUF1QjtJQUN0RCxNQUFNLEtBQUssR0FBYSxFQUFFLENBQUM7SUFFM0Isb0JBQW9CO0lBQ3BCLEtBQUssQ0FBQyxJQUFJLENBQUMscURBQXFELENBQUMsQ0FBQztJQUNsRSxLQUFLLENBQUMsSUFBSSxDQUFDLGtDQUFrQyxDQUFDLENBQUM7SUFDL0MsS0FBSyxDQUFDLElBQUksQ0FBQyx1REFBdUQsQ0FBQyxDQUFDO0lBQ3BFLEtBQUssQ0FBQyxJQUFJLENBQUMsb0NBQW9DLENBQUMsQ0FBQztJQUNqRCxLQUFLLENBQUMsSUFBSSxDQUFDLHdEQUF3RCxDQUFDLENBQUM7SUFDckUsS0FBSyxDQUFDLElBQUksQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO0lBQ2hELEtBQUssQ0FBQyxJQUFJLENBQUMsbURBQW1ELENBQUMsQ0FBQztJQUNoRSxLQUFLLENBQUMsSUFBSSxDQUFDLHNDQUFzQyxDQUFDLENBQUM7SUFDbkQsS0FBSyxDQUFDLElBQUksQ0FBQyxvREFBb0QsQ0FBQyxDQUFDO0lBQ2pFLEtBQUssQ0FBQyxJQUFJLENBQUMscUNBQXFDLENBQUMsQ0FBQztJQUNsRCxLQUFLLENBQUMsSUFBSSxDQUFDLHlEQUF5RCxDQUFDLENBQUM7SUFDdEUsS0FBSyxDQUFDLElBQUksQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO0lBQ2hELEtBQUssQ0FBQyxJQUFJLENBQUMsMkRBQTJELENBQUMsQ0FBQztJQUN4RSxLQUFLLENBQUMsSUFBSSxD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bnQiOlsiLyoqXG4gKiBBU0YgVjQuMCBSb2xlIEVuZ2luZSAtIEtQSSBFeHBvcnRcbiAqIFxuICogRXhwb3J0IEtQSSBkYXRhIHRvIFByb21ldGhldXMsIEpTT05MLCBhbmQgc25hcHNob3QgZm9ybWF0cy5cbiAqIFZlcnNpb246IHYwLjguNVxuICovXG5cbmltcG9ydCB0eXBlIHsgUm9sZUtQSVNuYXBzaG90IH0gZnJvbSAnLi9rcGktdHlwZXMnO1xuXG4vKipcbiAqIEV4cG9ydCBLUEkgZGF0YSB0byBQcm9tZXRoZXVzIG1ldHJpY3MgZm9ybWF0LlxuICogXG4gKiBAcGFyYW0ga3BpcyAtIEFycmF5IG9mIEtQSSBzbmFwc2hvdHNcbiAqIEByZXR1cm5zIFByb21ldGhldXMtZm9ybWF0dGVkIG1ldHJpY3Mgc3RyaW5nXG4gKiBcbiAqIEBleGFtcGxlXG4gKiBgYGBcbiAqIHJvbGVfa3BpX3Rocm91Z2hwdXR7cm9sZT1cImJhY2tlbmQtdGVhbVwiLHdpbmRvdz1cIjFkXCJ9IDUuMjNcbiAqIHJvbGVfa3BpX2ZhaWx1cmVfcmF0ZXtyb2xlPVwiYmFja2VuZC10ZWFtXCIsd2luZG93PVwiMWRcIn0gMC4xMjVcbiAqIHJvbGVfa3BpX2hlYWx0aF9zY29yZXtyb2xlPVwiYmFja2VuZC10ZWFtXCIsd2luZG93PVwiMWRcIn0gNzJcbiAqIGBgYFxuICovXG5leHBvcnQgZnVuY3Rpb24gZXhwb3J0UHJvbWV0aGV1cyhrcGlzOiBSb2xlS1BJU25hcHNob3RbXSk6IHN0cmluZyB7XG4gIGNvbnN0IGxpbmVzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIC8vIEFkZCBoZWxwIGNvbW1lbnRzXG4gIGxpbmVzLnB1c2goJyMgSEVMUCByb2xlX2twaV90aHJvdWdocHV0IFRhc2tzIGNvbXBsZXRlZCBwZXIgaG91cicpO1xuICBsaW5lcy5wdXNoKCcjIFRZUEUgcm9sZV9rcGlfdGhyb3VnaHB1dCBnYXVnZScpO1xuICBsaW5lcy5wdXNoKCcjIEhFTFAgcm9sZV9rcGlfZmFpbHVyZV9yYXRlIEZhaWxlZCB0YXNrcyByYXRpbyAoMC0xKScpO1xuICBsaW5lcy5wdXNoKCcjIFRZUEUgcm9sZV9rcGlfZmFpbHVyZV9yYXRlIGdhdWdlJyk7XG4gIGxpbmVzLnB1c2goJyMgSEVMUCByb2xlX2twaV9yZXdvcmtfcmF0ZSBSZXdvcmtlZCB0YXNrcyByYXRpbyAoMC0xKScpO1xuICBsaW5lcy5wdXNoKCcjIFRZUEUgcm9sZV9rcGlfcmV3b3JrX3JhdGUgZ2F1Z2UnKTtcbiAgbGluZXMucHVzaCgnIyBIRUxQIHJvbGVfa3BpX3F1ZXVlX3ByZXNzdXJlIFF1ZXVlIGxlbmd0aCByYXRpbycpO1xuICBsaW5lcy5wdXNoKCcjIFRZUEUgcm9sZV9rcGlfcXVldWVfcHJlc3N1cmUgZ2F1Z2UnKTtcbiAgbGluZXMucHVzaCgnIyBIRUxQIHJvbGVfa3BpX2NvbmZsaWN0X3JhdGUgQ29uZmxpY3QgcmF0aW8gKDAtMSknKTtcbiAgbGluZXMucHVzaCgnIyBUWVBFIHJvbGVfa3BpX2NvbmZsaWN0X3JhdGUgZ2F1Z2UnKTtcbiAgbGluZXMucHVzaCgnIyBIRUxQIHJvbGVfa3BpX2RyaWZ0X2luZGV4IFRhc2sgY2FwYWJpbGl0eSBkcmlmdCAoMC0xKScpO1xuICBsaW5lcy5wdXNoKCcjIFRZUEUgcm9sZV9rcGlfZHJpZnRfaW5kZXggZ2F1Z2UnKTtcbiAgbGluZXMucHVzaCgnIyBIRUxQIHJvbGVfa3BpX2hlYWx0aF9zY29yZSBPdmVyYWxsIGhlYWx0aCBzY29yZSAoMC0xMDApJyk7XG4gIGxpbmVzLnB1c2goJyMgVFlQRSByb2xlX2twaV9oZWFsdGhfc2NvcmUgZ2F1Z2UnKTtcbiAgbGluZXMucHVzaCgnJyk7XG5cbiAgZm9yIChjb25zdCBrcGkgb2Yga3Bpcykge1xuICAgIGNvbnN0IGxhYmVscyA9IGByb2xlPVwiJHtrcGkucm9sZUlkfVwiLHdpbmRvdz1cIiR7a3BpLndpbmRvd31cImA7XG5cbiAgICBsaW5lcy5wdXNoKGByb2xlX2twaV90aHJvdWdocHV0eyR7bGFiZWxzfX0gJHtrcGkudGhyb3VnaHB1dH1gKTtcbiAgICBsaW5lcy5wdXNoKGByb2xlX2twaV9mYWlsdXJlX3JhdGV7JHtsYWJlbHN9fSAke2twaS5mYWlsdXJlUmF0ZX1gKTtcbiAgICBsaW5lcy5wdXNoKGByb2xlX2twaV9yZXdvcmtfcmF0ZXske2xhYmVsc319ICR7a3BpLnJld29ya1JhdGV9YCk7XG4gICAgbGluZXMucHVzaChgcm9sZV9rcGlfcXVldWVfcHJlc3N1cmV7JHtsYWJlbHN9fSAke2twaS5xdWV1ZVByZXNzdXJlfWApO1xuICAgIGxpbmVzLnB1c2goYHJvbGVfa3BpX2NvbmZsaWN0X3JhdGV7JHtsYWJlbHN9fSAke2twaS5jb25mbGljdFJhdGV9YCk7XG4gICAgbGluZXMucHVzaChgcm9sZV9rcGlfZHJpZnRfaW5kZXh7JHtsYWJlbHN9fSAke2twaS5kcmlmdEluZGV4fWApO1xuICAgIGxpbmVzLnB1c2goYHJvbGVfa3BpX2hlYWx0aF9zY29yZXske2xhYmVsc319ICR7a3BpLmhlYWx0aFNjb3JlfWApO1xuICB9XG5cbiAgcmV0dXJuIGxpbmVzLmpvaW4oJ1xcbicpO1xufVxuXG4vKipcbiAqIEV4cG9ydCBLUEkgZGF0YSB0byBKU09OTCAoSlNPTiBMaW5lcykgZm9ybWF0LlxuICogXG4gKiBFYWNoIGxpbmUgaXMgYSBjb21wbGV0ZSBKU09OIG9iamVjdC5cbiAqIFN1aXRhYmxlIGZvciB0aW1lIHNlcmllcyBzdG9yYWdlIGFuZCBzdHJlYW1pbmcuXG4gKiBcbiAqIEBwYXJhbSBrcGlzIC0gQXJyYXkgb2YgS1BJIHNuYXBzaG90c1xuICogQHJldHVybnMgSlNPTkwgc3RyaW5nXG4gKiBcbiAqIEBleGFtcGxlXG4gKiBgYGBcbiAqIHtcInJvbGVJZFwiOlwiYmFja2VuZC10ZWFtXCIsXCJ0aW1lc3RhbXBcIjoxNzExNzAwMDAwMDAwLFwid2luZG93XCI6XCIxZFwiLFwidGhyb3VnaHB1dFwiOjUuMjMsLi4ufVxuICoge1wicm9sZUlkXCI6XCJmcm9udGVuZC10ZWFtXCIsXCJ0aW1lc3RhbXBcIjoxNzExNzAwMDAwMDAwLFwid2luZG93XCI6XCIxZFwiLFwidGhyb3VnaHB1dFwiOjQuNTYsLi4ufVxuICogYGBgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHBvcnRKU09OTChrcGlzOiBSb2xlS1BJU25hcHNob3RbXSk6IHN0cmluZyB7XG4gIHJldHVybiBrcGlzLm1hcCgoa3BpKSA9PiBKU09OLnN0cmluZ2lmeShrcGkpKS5qb2luKCdcXG4nKTtcbn1cblxuLyoqXG4gKiBFeHBvcnQgS1BJIGRhdGEgdG8gc25hcHNob3QgSlNPTiBmb3JtYXQuXG4gKiBcbiAqIEluY2x1ZGVzIG1ldGFkYXRhIGFuZCBhbGwgS1BJcyBpbiBhIHNpbmdsZSBvYmplY3QuXG4gKiBTdWl0YWJsZSBmb3IgYXJjaGl2YWwgYW5kIHJlcG9ydGluZy5cbiAqIFxuICogQHBhcmFtIGtwaXMgLSBBcnJheSBvZiBLUEkgc25hcHNob3RzXG4gKiBAcGFyYW0gaW5jbHVkZU1ldGFkYXRhIC0gSW5jbHVkZSBleHBvcnQgbWV0YWRhdGEgKGRlZmF1bHQ6IHRydWUpXG4gKiBAcmV0dXJucyBKU09OIHN0cmluZ1xuICovXG5leHBvcnQgZnVuY3Rpb24gZXhwb3J0U25hcHNob3QoXG4gIGtwaXM6IFJvbGVLUElTbmFwc2hvdFtdLFxuICBpbmNsdWRlTWV0YWRhdGE6IGJvb2xlYW4gPSB0cnVlXG4pOiBzdHJpbmcge1xuICBjb25zdCBzbmFwc2hvdDogYW55ID0ge1xuICAgIHJvbGVzOiBrcGlzLFxuICB9O1xuXG4gIGlmIChpbmNsdWRlTWV0YWRhdGEpIHtcbiAgICBzbmFwc2hvdC5tZXRhZGF0YSA9IHtcbiAgICAgIGV4cG9ydGVkQXQ6IERhdGUubm93KCksXG4gICAgICBjb3VudDoga3Bpcy5sZW5ndGgsXG4gICAgICB3aW5kb3dzOiBbLi4ubmV3IFNldChrcGlzLm1hcCgoaykgPT4gay53aW5kb3cpKV0sXG4gICAgICByb2xlczoga3Bpcy5tYXAoKGspID0+IGsucm9sZUlkKSxcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHNuYXBzaG90LCBudWxsLCAyKTtcbn1cblxuLyoqXG4gKiBFeHBvcnQgS1BJIGRhdGEgdG8gQ1NWIGZvcm1hdC5cbiAqIFxuICogQHBhcmFtIGtwaXMgLSBBcnJheSBvZiBLUEkgc25hcHNob3RzXG4gKiBAcGFyYW0gaW5jbHVkZUhlYWRlciAtIEluY2x1ZGUgQ1NWIGhlYWRlciAoZGVmYXVsdDogdHJ1ZSlcbiAqIEByZXR1cm5zIENTViBzdHJpbmdcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4cG9ydENTVihrcGlzOiBSb2xlS1BJU25hcHNob3RbXSwgaW5jbHVkZUhlYWRlcjogYm9vbGVhbiA9IHRydWUpOiBzdHJpbmcge1xuICBjb25zdCBsaW5lczogc3RyaW5nW10gPSBbXTtcblxuICBpZiAoaW5jbHVkZUhlYWRlcikge1xuICAgIGxpbmVzLnB1c2goXG4gICAgICAncm9sZUlkLHRpbWVzdGFtcCx3aW5kb3csdGhyb3VnaHB1dCxmYWlsdXJlUmF0ZSxyZXdvcmtSYXRlLHF1ZXVlUHJlc3N1cmUsY29uZmxpY3RSYXRlLGRyaWZ0SW5kZXgsaGVhbHRoU2NvcmUsdHJlbmQsdGFza0NvdW50LGNoYW5nZUNvdW50J1xuICAgICk7XG4gIH1cblxuICBmb3IgKGNvbnN0IGtwaSBvZiBrcGlzKSB7XG4gICAgbGluZXMucHVzaChcbiAgICAgIFtcbiAgICAgICAga3BpLnJvbGVJZCxcbiAgICAgICAga3BpLnRpbWVzdGFtcCxcbiAgICAgICAga3BpLndpbmRvdyxcbiAgICAgICAga3BpLnRocm91Z2hwdXQsXG4gICAgICAgIGtwaS5mYWlsdXJlUmF0ZSxcbiAgICAgICAga3BpLnJld29ya1JhdGUsXG4gICAgICAgIGtwaS5xdWV1ZVByZXNzdXJlLFxuICAgICAgICBrcGkuY29uZmxpY3RSYXRlLFxuICAgICAgICBrcGkuZHJpZnRJbmRleCxcbiAgICAgICAga3BpLmhlYWx0aFNjb3JlLFxuICAgICAgICBrcGkudHJlbmQsXG4gICAgICAgIGtwaS50YXNrQ291bnQsXG4gICAgICAgIGtwaS5jaGFuZ2VDb3VudCxcbiAgICAgIF0uam9pbignLCcpXG4gICAgKTtcbiAgfVxuXG4gIHJldHVybiBsaW5lcy5qb2luKCdcXG4nKTtcbn1cblxuLyoqXG4gKiBFeHBvcnQgS1BJIGRhdGEgdG8gR3JhZmFuYSBkYXNoYm9hcmQgSlNPTi5cbiAqIFxuICogQHBhcmFtIGtwaXMgLSBBcnJheSBvZiBLUEkgc25hcHNob3RzXG4gKiBAcGFyYW0gZGFzaGJvYXJkVGl0bGUgLSBEYXNoYm9hcmQgdGl0bGVcbiAqIEByZXR1cm5zIEdyYWZhbmEgZGFzaGJvYXJkIEpTT05cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4cG9ydEdyYWZhbmFEYXNoYm9hcmQoXG4gIGtwaXM6IFJvbGVLUElTbmFwc2hvdFtdLFxuICBkYXNoYm9hcmRUaXRsZTogc3RyaW5nID0gJ1JvbGUgS1BJIERhc2hib2FyZCdcbik6IHN0cmluZyB7XG4gIGNvbnN0IHJvbGVzID0gWy4uLm5ldyBTZXQoa3Bpcy5tYXAoKGspID0+IGsucm9sZUlkKSldO1xuXG4gIGNvbnN0IGRhc2hib2FyZCA9IHtcbiAgICBkYXNoYm9hcmQ6IHtcbiAgICAgIGlkOiBudWxsLFxuICAgICAgdWlkOiAncm9sZS1rcGktZGFzaGJvYXJkJyxcbiAgICAgIHRpdGxlOiBkYXNoYm9hcmRUaXRsZSxcbiAgICAgIHRhZ3M6IFsncm9sZS1rcGknLCAnYXNmLXY0J10sXG4gICAgICB0aW1lem9uZTogJ2Jyb3dzZXInLFxuICAgICAgcGFuZWxzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogMSxcbiAgICAgICAgICB0aXRsZTogJ0hlYWx0aCBTY29yZSBPdmVydmlldycsXG4gICAgICAgICAgdHlwZTogJ2dhdWdlJyxcbiAgICAgICAgICBncmlkUG9zOiB7IGg6IDgsIHc6IDEyLCB4OiAwLCB5OiAwIH0sXG4gICAgICAgICAgdGFyZ2V0czogcm9sZXMubWFwKChyb2xlLCBpKSA9PiAoe1xuICAgICAgICAgICAgZXhwcjogYHJvbGVfa3BpX2hlYWx0aF9zY29yZXtyb2xlPVwiJHtyb2xlfVwifWAsXG4gICAgICAgICAgICBsZWdlbmRGb3JtYXQ6IHJvbGUsXG4gICAgICAgICAgICByZWZJZDogU3RyaW5nLmZyb21DaGFyQ29kZSg2NSArIGkpLFxuICAgICAgICAgIH0pKSxcbiAgICAgICAgICBvcHRpb25zOiB7XG4gICAgICAgICAgICBzaG93VGhyZXNob2xkTGFiZWxzOiB0cnVlLFxuICAgICAgICAgICAgc2hvd1RocmVzaG9sZE1hcmtlcnM6IHRydWUsXG4gICAgICAgICAgfSxcbiAgICAgICAgICBmaWVsZENvbmZpZzoge1xuICAgICAgICAgICAgZGVmYXVsdHM6IHtcbiAgICAgICAgICAgICAgbWluOiAwLFxuICAgICAgICAgICAgICBtYXg6IDEwMCxcbiAgICAgICAgICAgICAgdGhyZXNob2xkczoge1xuICAgICAgICAgICAgICAgIG1vZGU6ICdhYnNvbHV0ZScsXG4gICAgICAgICAgICAgICAgc3RlcHM6IFtcbiAgICAgICAgICAgICAgICAgIHsgY29sb3I6ICdyZWQnLCB2YWx1ZTogMCB9LFxuICAgICAgICAgICAgICAgICAgeyBjb2xvcjogJ3llbGxvdycsIHZhbHVlOiA2MCB9LFxuICAgICAgICAgICAgICAgICAgeyBjb2xvcjogJ2dyZWVuJywgdmFsdWU6IDgwIH0sXG4gICAgICAgICAgICAgICAgXSxcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIGlkOiAyLFxuICAgICAgICAgIHRpdGxlOiAnVGhyb3VnaHB1dCBieSBSb2xlJyxcbiAgICAgICAgICB0eXBlOiAnYmFyZ2F1Z2UnLFxuICAgICAgICAgIGdyaWRQb3M6IHsgaDogOCwgdzogMTIsIHg6IDEyLCB5OiAwIH0sXG4gICAgICAgICAgdGFyZ2V0czogcm9sZXMubWFwKChyb2xlLCBpKSA9PiAoe1xuICAgICAgICAgICAgZXhwcjogYHJvbGVfa3BpX3Rocm91Z2hwdXR7cm9sZT1cIiR7cm9sZX1cIn1gLFxuICAgICAgICAgICAgbGVnZW5kRm9ybWF0OiByb2xlLFxuICAgICAgICAgICAgcmVmSWQ6IFN0cmluZy5mcm9tQ2hhckNvZGUoNjUgKyBpKSxcbiAgICAgICAgICB9KSksXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogMyxcbiAgICAgICAgICB0aXRsZTogJ0ZhaWx1cmUgUmF0ZScsXG4gICAgICAgICAgdHlwZTogJ3N0YXQnLFxuICAgICAgICAgIGdyaWRQb3M6IHsgaDogOCwgdzogOCwgeDogMCwgeTogOCB9LFxuICAgICAgICAgIHRhcmdldHM6IHJvbGVzLm1hcCgocm9sZSwgaSkgPT4gKHtcbiAgICAgICAgICAgIGV4cHI6IGByb2xlX2twaV9mYWlsdXJlX3JhdGV7cm9sZT1cIiR7cm9sZX1cIn1gLFxuICAgICAgICAgICAgbGVnZW5kRm9ybWF0OiByb2xlLFxuICAgICAgICAgICAgcmVmSWQ6IFN0cmluZy5mcm9tQ2hhckNvZGUoNjUgKyBpKSxcbiAgICAgICAgICB9KSksXG4gICAgICAgIH0sXG4gICAgICAgIHtcbiAgICAgICAgICBpZDogNCxcbiAgICAgICAgICB0aXRsZTogJ1F1ZXVlIFByZXNzdXJlJyxcbiAgICAgICAgICB0eXBlOiAnc3RhdCcsXG4gICAgICAgICAgZ3JpZFBvczogeyBoOiA4LCB3OiA4LCB4OiA4LCB5OiA4IH0sXG4gICAgICAgICAgdGFyZ2V0czogcm9sZXMubWFwKChyb2xlLCBpKSA9PiAoe1xuICAgICAgICAgICAgZXhwcjogYHJvbGVfa3BpX3F1ZXVlX3ByZXNzdXJle3JvbGU9XCIke3JvbGV9XCJ9YCxcbiAgICAgICAgICAgIGxlZ2VuZEZvcm1hdDogcm9sZSxcbiAgICAgICAgICAgIHJlZklkOiBTdHJpbmcuZnJvbUNoYXJDb2RlKDY1ICsgaSksXG4gICAgICAgICAgfSkpLFxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgaWQ6IDUsXG4gICAgICAgICAgdGl0bGU6ICdEcmlmdCBJbmRleCcsXG4gICAgICAgICAgdHlwZTogJ3N0YXQnLFxuICAgICAgICAgIGdyaWRQb3M6IHsgaDogOCwgdzogOCwgeDogMTYsIHk6IDggfSxcbiAgICAgICAgICB0YXJnZXRzOiByb2xlcy5tYXAoKHJvbGUsIGkpID0+ICh7XG4gICAgICAgICAgICBleHByOiBgcm9sZV9rcGlfZHJpZnRfaW5kZXh7cm9sZT1cIiR7cm9sZX1cIn1gLFxuICAgICAgICAgICAgbGVnZW5kRm9ybWF0OiByb2xlLFxuICAgICAgICAgICAgcmVmSWQ6IFN0cmluZy5mcm9tQ2hhckNvZGUoNjUgKyBpKSxcbiAgICAgICAgICB9KSksXG4gICAgICAgIH0sXG4gICAgICBdLFxuICAgICAgcmVmcmVzaDogJzMwcycsXG4gICAgICBzY2hlbWFWZXJzaW9uOiAzOCxcbiAgICAgIHZlcnNpb246IDEsXG4gICAgfSxcbiAgfTtcblxuICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoZGFzaGJvYXJkLCBudWxsLCAyKTtcbn1cblxuLyoqXG4gKiBHZW5lcmljIGV4cG9ydCBmdW5jdGlvbi5cbiAqIFxuICogQHBhcmFtIGtwaXMgLSBBcnJheSBvZiBLUEkgc25hcHNob3RzXG4gKiBAcGFyYW0gZm9ybWF0IC0gRXhwb3J0IGZvcm1hdFxuICogQHBhcmFtIG9wdGlvbnMgLSBGb3JtYXQtc3BlY2lmaWMgb3B0aW9uc1xuICogQHJldHVybnMgRXhwb3J0ZWQgc3RyaW5nXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBleHBvcnRLUEkoXG4gIGtwaXM6IFJvbGVLUElTbmFwc2hvdFtdLFxuICBmb3JtYXQ6ICdwcm9tZXRoZXVzJyB8ICdqc29ubCcgfCAnc25hcHNob3QnIHwgJ2NzdicgfCAnZ3JhZmFuYScsXG4gIG9wdGlvbnM/OiB7XG4gICAgZGFzaGJvYXJkVGl0bGU/OiBzdHJpbmc7XG4gICAgaW5jbHVkZU1ldGFkYXRhPzogYm9vbGVhbjtcbiAgICBpbmNsdWRlSGVhZGVyPzogYm9vbGVhbjtcbiAgfVxuKTogc3RyaW5nIHtcbiAgc3dpdGNoIChmb3JtYXQpIHtcbiAgICBjYXNlICdwcm9tZXRoZXVzJzpcbiAgICAgIHJldHVybiBleHBvcnRQcm9tZXRoZXVzKGtwaXMpO1xuICAgIGNhc2UgJ2pzb25sJzpcbiAgICAgIHJldHVybiBleHBvcnRKU09OTChrcGlzKTtcbiAgICBjYXNlICdzbmFwc2hvdCc6XG4gICAgICByZXR1cm4gZXhwb3J0U25hcHNob3Qoa3Bpcywgb3B0aW9ucz8uaW5jbHVkZU1ldGFkYXRhKTtcbiAgICBjYXNlICdjc3YnOlxuICAgICAgcmV0dXJuIGV4cG9ydENTVihrcGlzLCBvcHRpb25zPy5pbmNsdWRlSGVhZGVyKTtcbiAgICBjYXNlICdncmFmYW5hJzpcbiAgICAgIHJldHVybiBleHBvcnRHcmFmYW5hRGFzaGJvYXJkKGtwaXMsIG9wdGlvbnM/LmRhc2hib2FyZFRpdGxlKTtcbiAgICBkZWZhdWx0OlxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBVbmtub3duIGV4cG9ydCBmb3JtYXQ6ICR7Zm9ybWF0fWApO1xuICB9XG59XG4iXX0=