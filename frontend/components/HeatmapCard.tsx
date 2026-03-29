/**
 * ASF V4.0 Dashboard - Heatmap Card Component
 * 
 * Visualizes change heatmap with blast radius overlay.
 * Version: v0.8.5
 */

import React from 'react';

export interface HeatmapEntry {
  nodeId: string;
  nodeType: string;
  heatScore: number;
  rank: number;
  changeCount: number;
  blastRadius: number;
  riskWeight: number;
}

export interface HeatmapCardProps {
  entries: HeatmapEntry[];
  title?: string;
  onNodeClick?: (nodeId: string) => void;
  maxEntries?: number;
}

/**
 * Get color based on heat score.
 */
function getHeatColor(heatScore: number): string {
  if (heatScore >= 200) return '#dc2626'; // red-600
  if (heatScore >= 100) return '#ea580c'; // orange-600
  if (heatScore >= 50) return '#ca8a04';  // yellow-600
  if (heatScore >= 20) return '#65a30d';  // lime-600
  return '#16a34a';                        // green-600
}

/**
 * Get node type badge color.
 */
function getTypeColor(nodeType: string): string {
  const colors: Record<string, string> = {
    APIContract: '#3b82f6',   // blue
    DBSchema: '#8b5cf6',      // purple
    Service: '#06b6d4',       // cyan
    UIComponent: '#ec4899',   // pink
    Utility: '#6b7280',       // gray
  };
  return colors[nodeType] || '#6b7280';
}

/**
 * Heatmap Card Component
 */
export const HeatmapCard: React.FC<HeatmapCardProps> = ({
  entries,
  title = 'Change Heatmap',
  onNodeClick,
  maxEntries = 10,
}) => {
  const topEntries = entries.slice(0, maxEntries);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <span className="text-sm text-gray-500">Last 7 days</span>
      </div>

      {topEntries.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No change data available
        </div>
      ) : (
        <div className="space-y-3">
          {topEntries.map((entry) => (
            <div
              key={entry.nodeId}
              className={`flex items-center p-3 rounded-md cursor-pointer hover:bg-gray-50 transition-colors ${
                onNodeClick ? '' : 'cursor-default'
              }`}
              onClick={() => onNodeClick?.(entry.nodeId)}
            >
              {/* Rank */}
              <div className="w-8 text-center">
                <span className="text-sm font-medium text-gray-500">
                  #{entry.rank}
                </span>
              </div>

              {/* Heat indicator */}
              <div
                className="w-2 h-12 rounded-full mr-4"
                style={{ backgroundColor: getHeatColor(entry.heatScore) }}
              />

              {/* Node info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {entry.nodeId}
                  </span>
                  <span
                    className="px-2 py-0.5 text-xs rounded-full text-white"
                    style={{ backgroundColor: getTypeColor(entry.nodeType) }}
                  >
                    {entry.nodeType}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                  <span>Heat: {entry.heatScore.toFixed(1)}</span>
                  <span>Changes: {entry.changeCount}</span>
                  <span>Blast Radius: {entry.blastRadius}</span>
                </div>
              </div>

              {/* Heat score badge */}
              <div className="ml-4 text-right">
                <div
                  className="text-lg font-bold"
                  style={{ color: getHeatColor(entry.heatScore) }}
                >
                  {entry.heatScore.toFixed(0)}
                </div>
                <div className="text-xs text-gray-400">heat score</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-[#16a34a]" />
            <span>Cold (&lt;20)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-[#65a30d]" />
            <span>Cool (20-50)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-[#ca8a04]" />
            <span>Warm (50-100)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-[#ea580c]" />
            <span>Hot (100-200)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-[#dc2626]" />
            <span>Critical (&gt;200)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeatmapCard;
