/**
 * ASF V4.0 Dashboard - Budget Comparison Component
 * 
 * Compares interface budget utilization across roles.
 * Version: v0.8.5
 */

import React from 'react';

export interface RoleBudget {
  roleId: string;
  totalBudget: number;
  usedBudget: number;
  remainingBudget: number;
  utilizationRate: number;
  crossRoleEdges: number;
  contractTouches: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface BudgetComparisonProps {
  budgets: RoleBudget[];
  onRoleClick?: (roleId: string) => void;
  showDetails?: boolean;
}

/**
 * Get status color.
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'critical': return 'text-red-600';
    case 'warning': return 'text-yellow-600';
    default: return 'text-green-600';
  }
}

/**
 * Get status bg color.
 */
function getStatusBg(status: string): string {
  switch (status) {
    case 'critical': return 'bg-red-500';
    case 'warning': return 'bg-yellow-500';
    default: return 'bg-green-500';
  }
}

/**
 * Budget Bar Component.
 */
const BudgetBar: React.FC<{
  utilization: number;
  status: string;
}> = ({ utilization, status }) => {
  const width = Math.min(utilization * 100, 100);
  
  return (
    <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
      <div
        className={`h-4 rounded-full transition-all duration-500 ${getStatusBg(status)}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
};

/**
 * Budget Comparison Component
 */
export const BudgetComparison: React.FC<BudgetComparisonProps> = ({
  budgets,
  onRoleClick,
  showDetails = true,
}) => {
  // Sort by utilization (highest first)
  const sortedBudgets = [...budgets].sort(
    (a, b) => b.utilizationRate - a.utilizationRate
  );

  // Calculate average utilization
  const avgUtilization = budgets.reduce(
    (sum, b) => sum + b.utilizationRate,
    0
  ) / (budgets.length || 1);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-800">
          Interface Budget Comparison
        </h3>
        <div className="text-sm text-gray-500">
          Avg Utilization: {(avgUtilization * 100).toFixed(1)}%
        </div>
      </div>

      {budgets.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          No budget data available
        </div>
      ) : (
        <div className="space-y-4">
          {/* Header */}
          <div className="grid grid-cols-12 gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider pb-2 border-b">
            <div className="col-span-3">Role</div>
            <div className="col-span-4">Budget Usage</div>
            <div className="col-span-2 text-right">Utilization</div>
            <div className="col-span-2 text-right">Edges</div>
            <div className="col-span-1 text-right">Status</div>
          </div>

          {/* Budget rows */}
          {sortedBudgets.map((budget) => (
            <div
              key={budget.roleId}
              className={`grid grid-cols-12 gap-4 items-center py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 ${
                onRoleClick ? 'cursor-pointer' : ''
              }`}
              onClick={() => onRoleClick?.(budget.roleId)}
            >
              {/* Role */}
              <div className="col-span-3">
                <div className={`font-medium ${
                  onRoleClick ? 'text-blue-600 hover:underline' : 'text-gray-900'
                }`}>
                  {budget.roleId}
                </div>
                {showDetails && (
                  <div className="text-xs text-gray-500 mt-1">
                    {budget.contractTouches} contract touches
                  </div>
                )}
              </div>

              {/* Budget bar */}
              <div className="col-span-4">
                <BudgetBar utilization={budget.utilizationRate} status={budget.status} />
                <div className="text-xs text-gray-500 mt-1">
                  {budget.usedBudget.toFixed(1)} / {budget.totalBudget}
                </div>
              </div>

              {/* Utilization */}
              <div className="col-span-2 text-right">
                <div className={`font-semibold ${getStatusColor(budget.status)}`}>
                  {(budget.utilizationRate * 100).toFixed(1)}%
                </div>
                {budget.utilizationRate > avgUtilization && (
                  <div className="text-xs text-red-500">
                    +{((budget.utilizationRate - avgUtilization) * 100).toFixed(1)}% vs avg
                  </div>
                )}
              </div>

              {/* Cross-role edges */}
              <div className="col-span-2 text-right">
                <div className="text-sm text-gray-900">{budget.crossRoleEdges}</div>
                {budget.crossRoleEdges > 20 && (
                  <div className="text-xs text-yellow-600">High coupling</div>
                )}
              </div>

              {/* Status badge */}
              <div className="col-span-1 text-right">
                <span className={`px-2 py-1 text-xs rounded-full ${
                  budget.status === 'critical' ? 'bg-red-100 text-red-800' :
                  budget.status === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {budget.status === 'healthy' ? 'OK' : 
                   budget.status === 'warning' ? '⚠️' : '🚨'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span>Healthy (&lt;70%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-yellow-500" />
              <span>Warning (70-90%)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span>Critical (&gt;90%)</span>
            </div>
          </div>
          <div className="text-xs">
            Threshold: 100 budget units per role
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {sortedBudgets.some(b => b.status !== 'healthy') && (
        <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
          <h4 className="text-sm font-medium text-yellow-800 mb-2">
            💡 Recommendations
          </h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            {sortedBudgets
              .filter(b => b.status === 'critical')
              .map(b => (
                <li key={b.roleId}>
                  <strong>{b.roleId}</strong>: Consider splitting role or reducing dependencies (
                  {(b.utilizationRate * 100).toFixed(0)}% utilized)
                </li>
              ))}
            {sortedBudgets
              .filter(b => b.status === 'warning')
              .map(b => (
                <li key={b.roleId}>
                  <strong>{b.roleId}</strong>: Review cross-role dependencies (
                  {(b.utilizationRate * 100).toFixed(0)}% utilized)
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default BudgetComparison;
