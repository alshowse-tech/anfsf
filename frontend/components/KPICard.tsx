/**
 * ASF V4.0 Dashboard - Role KPI Card Component
 * 
 * Displays role KPI metrics with health score and trend.
 * Version: v0.8.5
 */

import React from 'react';

export interface RoleKPI {
  roleId: string;
  throughput: number;
  failureRate: number;
  reworkRate: number;
  queuePressure: number;
  conflictRate: number;
  driftIndex: number;
  healthScore: number;
  trend: 'improving' | 'stable' | 'degrading';
}

export interface KPICardProps {
  kpi: RoleKPI;
  onRoleClick?: (roleId: string) => void;
  showDetails?: boolean;
}

/**
 * Get health status color.
 */
function getHealthColor(score: number): string {
  if (score >= 80) return '#16a34a'; // green
  if (score >= 60) return '#ca8a04'; // yellow
  return '#dc2626';                  // red
}

/**
 * Get trend icon.
 */
function getTrendIcon(trend: string): JSX.Element {
  switch (trend) {
    case 'improving':
      return <span className="text-green-500">↑</span>;
    case 'degrading':
      return <span className="text-red-500">↓</span>;
    default:
      return <span className="text-gray-400">→</span>;
  }
}

/**
 * Get status badge.
 */
function getStatusBadge(score: number): string {
  if (score >= 80) return 'bg-green-100 text-green-800';
  if (score >= 60) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
}

/**
 * Metric display component.
 */
const MetricRow: React.FC<{
  label: string;
  value: number;
  format?: (v: number) => string;
  warning?: number;
  critical?: number;
  higherIsBetter?: boolean;
}> = ({ label, value, format, warning, critical, higherIsBetter = false }) => {
  let colorClass = 'text-gray-900';
  
  if (critical !== undefined && warning !== undefined) {
    if (higherIsBetter) {
      if (value <= critical) colorClass = 'text-red-600';
      else if (value <= warning) colorClass = 'text-yellow-600';
    } else {
      if (value >= critical) colorClass = 'text-red-600';
      else if (value >= warning) colorClass = 'text-yellow-600';
    }
  }

  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-sm font-medium ${colorClass}`}>
        {format ? format(value) : value.toFixed(2)}
      </span>
    </div>
  );
};

/**
 * KPI Card Component
 */
export const KPICard: React.FC<KPICardProps> = ({
  kpi,
  onRoleClick,
  showDetails = true,
}) => {
  const healthColor = getHealthColor(kpi.healthScore);
  const statusClass = getStatusBadge(kpi.healthScore);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3
            className={`text-lg font-semibold ${
              onRoleClick ? 'cursor-pointer hover:text-blue-600' : ''
            }`}
            onClick={() => onRoleClick?.(kpi.roleId)}
          >
            {kpi.roleId}
          </h3>
          <span className={`px-2 py-1 text-xs rounded-full ${statusClass}`}>
            {kpi.healthScore >= 80 ? 'Healthy' : kpi.healthScore >= 60 ? 'Warning' : 'Critical'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {getTrendIcon(kpi.trend)}
          <span className="text-sm text-gray-500">{kpi.trend}</span>
        </div>
      </div>

      {/* Health Score Gauge */}
      <div className="mb-6">
        <div className="flex items-end justify-between mb-2">
          <span className="text-sm text-gray-600">Health Score</span>
          <span className="text-3xl font-bold" style={{ color: healthColor }}>
            {kpi.healthScore}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="h-3 rounded-full transition-all duration-500"
            style={{
              width: `${kpi.healthScore}%`,
              backgroundColor: healthColor,
            }}
          />
        </div>
      </div>

      {/* Metrics */}
      {showDetails && (
        <div className="space-y-1">
          <MetricRow
            label="Throughput"
            value={kpi.throughput}
            format={(v) => `${v.toFixed(1)} tasks/hr`}
            warning={3}
            higherIsBetter={true}
          />
          <MetricRow
            label="Failure Rate"
            value={kpi.failureRate * 100}
            format={(v) => `${v.toFixed(1)}%`}
            warning={15}
            critical={25}
          />
          <MetricRow
            label="Rework Rate"
            value={kpi.reworkRate * 100}
            format={(v) => `${v.toFixed(1)}%`}
            warning={20}
            critical={30}
          />
          <MetricRow
            label="Queue Pressure"
            value={kpi.queuePressure}
            format={(v) => `${v.toFixed(2)}x`}
            warning={0.8}
            critical={1.2}
          />
          <MetricRow
            label="Conflict Rate"
            value={kpi.conflictRate * 100}
            format={(v) => `${v.toFixed(1)}%`}
            warning={10}
            critical={15}
          />
          <MetricRow
            label="Drift Index"
            value={kpi.driftIndex}
            format={(v) => v.toFixed(3)}
            warning={0.25}
            critical={0.35}
          />
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex gap-2">
          {kpi.queuePressure > 1.2 && (
            <button className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">
              Suggest Split
            </button>
          )}
          {kpi.driftIndex > 0.35 && (
            <button className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200">
              Review Tasks
            </button>
          )}
          <button className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default KPICard;
