/**
 * ANFSF — PM Requirement Review Component
 *
 * Displays LLM-parsed requirements with confidence annotations.
 * PM can confirm, modify, or reject each item before locking the spec.
 *
 * Task: T-103
 */

import React, { useState, useCallback } from 'react';

// ============================================================================
// Types (mirrored from src/prd/confidence-annotator.ts)
// ============================================================================

type DerivationSource = 'explicit' | 'inferred' | 'supplemented';
type ConfidenceLevel = 'high' | 'medium' | 'low';

interface ConfidenceAnnotation {
  itemId: string;
  itemText: string;
  source: DerivationSource;
  confidence: ConfidenceLevel;
  confidenceScore: number;
  rationale: string;
  pmConfirmed: boolean;
  pmOverride?: ConfidenceLevel;
  pmNote?: string;
}

interface RequirementItem {
  id: string;
  text: string;
  category?: string;
  annotation: ConfidenceAnnotation;
}

interface RequirementReviewProps {
  /** All parsed requirement items with annotations */
  items: RequirementItem[];
  /** Summary counts */
  summary: {
    total: number;
    explicit: number;
    inferred: number;
    supplemented: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
  };
  /** Items needing PM attention */
  attentionItems: string[];
  /** Called when PM locks the requirements */
  onLock: (confirmedItems: RequirementItem[]) => void;
  /** Called when PM wants to re-analyze after modifications */
  onReanalyze: (modifications: string) => void;
}

// ============================================================================
// Helpers
// ============================================================================

function sourceLabel(src: DerivationSource): string {
  switch (src) {
    case 'explicit': return '🟢 明确提及';
    case 'inferred': return '🟡 合理推断';
    case 'supplemented': return '🔴 系统补充';
  }
}

function confidenceColor(level: ConfidenceLevel): string {
  switch (level) {
    case 'high': return 'text-green-600 bg-green-50';
    case 'medium': return 'text-yellow-600 bg-yellow-50';
    case 'low': return 'text-red-600 bg-red-50';
  }
}

function confidenceLabel(level: ConfidenceLevel): string {
  switch (level) {
    case 'high': return '高置信度';
    case 'medium': return '中置信度';
    case 'low': return '低置信度';
  }
}

// ============================================================================
// Component
// ============================================================================

export const RequirementReview: React.FC<RequirementReviewProps> = ({
  items,
  summary,
  attentionItems,
  onLock,
  onReanalyze,
}) => {
  const [confirmedItems, setConfirmedItems] = useState<Set<string>>(new Set());
  const [modifiedItems, setModifiedItems] = useState<Record<string, string>>({});
  const [rejectedItems, setRejectedItems] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [modificationText, setModificationText] = useState('');
  const [showOnlyAttention, setShowOnlyAttention] = useState(false);

  const toggleConfirm = useCallback((id: string) => {
    setConfirmedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleReject = useCallback((id: string) => {
    setRejectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleModify = useCallback((id: string, value: string) => {
    setModifiedItems(prev => ({ ...prev, [id]: value }));
  }, []);

  const handleNote = useCallback((id: string, value: string) => {
    setNotes(prev => ({ ...prev, [id]: value }));
  }, []);

  const handleLock = () => {
    const result = items.map(item => ({
      ...item,
      text: modifiedItems[item.id] ?? item.text,
      annotation: {
        ...item.annotation,
        pmConfirmed: confirmedItems.has(item.id),
        pmNote: notes[item.id],
      },
    }));
    onLock(result);
  };

  const handleReanalyze = () => {
    onReanalyze(modificationText);
  };

  const filteredItems = showOnlyAttention
    ? items.filter(i => attentionItems.includes(i.id))
    : items;

  return (
    <div className="requirement-review max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">需求理解确认</h2>
        <p className="text-gray-600">
          系统已分析 PRD 并生成以下需求理解。请逐条确认、修改或补充。
          <span className="text-red-500 font-medium">红色标记项需要您重点关注。</span>
        </p>
      </div>

      {/* Summary Bar */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4 flex flex-wrap gap-4 text-sm">
        <span>总计: <strong>{summary.total}</strong></span>
        <span className="text-green-600">🟢 明确: <strong>{summary.explicit}</strong></span>
        <span className="text-yellow-600">🟡 推断: <strong>{summary.inferred}</strong></span>
        <span className="text-red-600">🔴 补充: <strong>{summary.supplemented}</strong></span>
        <span>|</span>
        <span>已确认: <strong>{confirmedItems.size}/{summary.total}</strong></span>
        <button
          onClick={() => setShowOnlyAttention(!showOnlyAttention)}
          className="ml-auto text-blue-600 hover:underline"
        >
          {showOnlyAttention ? '显示全部' : `仅显示需关注项 (${attentionItems.length})`}
        </button>
      </div>

      {/* Item List */}
      <div className="space-y-3 mb-6">
        {filteredItems.map(item => {
          const isAttention = attentionItems.includes(item.id);
          const isConfirmed = confirmedItems.has(item.id);
          const isRejected = rejectedItems.has(item.id);

          return (
            <div
              key={item.id}
              className={`border rounded-lg p-4 transition-colors ${
                isAttention ? 'border-red-300 bg-red-50' :
                isConfirmed ? 'border-green-300 bg-green-50' :
                isRejected ? 'border-gray-300 bg-gray-50 opacity-60' :
                'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  {/* Source + Confidence Badge */}
                  <div className="flex gap-2 mb-1">
                    <span className="text-xs font-medium">{sourceLabel(item.annotation.source)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${confidenceColor(item.annotation.confidence)}`}>
                      {confidenceLabel(item.annotation.confidence)} ({item.annotation.confidenceScore}%)
                    </span>
                    {item.category && (
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{item.category}</span>
                    )}
                  </div>

                  {/* Item Text */}
                  {modifiedItems[item.id] ? (
                    <textarea
                      className="w-full border rounded p-2 text-sm"
                      value={modifiedItems[item.id]}
                      onChange={e => handleModify(item.id, e.target.value)}
                      rows={2}
                    />
                  ) : (
                    <p className="text-gray-800">{item.text}</p>
                  )}

                  {/* Rationale */}
                  <p className="text-xs text-gray-500 mt-1">{item.annotation.rationale}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => toggleConfirm(item.id)}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    isConfirmed ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-green-100'
                  }`}
                >
                  {isConfirmed ? '✓ 已确认' : '确认'}
                </button>
                <button
                  onClick={() => {
                    if (!modifiedItems[item.id]) {
                      handleModify(item.id, item.text);
                    }
                  }}
                  className="px-3 py-1 rounded text-sm bg-blue-100 text-blue-700 hover:bg-blue-200"
                >
                  ✎ 修改
                </button>
                <button
                  onClick={() => toggleReject(item.id)}
                  className={`px-3 py-1 rounded text-sm ${
                    isRejected ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-red-100'
                  }`}
                >
                  {isRejected ? '✗ 已拒绝' : '拒绝'}
                </button>
                <input
                  type="text"
                  placeholder="添加备注..."
                  className="flex-1 border rounded px-2 py-1 text-sm"
                  value={notes[item.id] || ''}
                  onChange={e => handleNote(item.id, e.target.value)}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Actions */}
      <div className="border-t pt-4 space-y-4">
        {/* Re-analyze section */}
        <div className="bg-blue-50 rounded-lg p-4">
          <h3 className="font-medium mb-2">需求修改/补充</h3>
          <p className="text-sm text-gray-600 mb-2">
            如需大幅调整需求，请在此描述修改内容，系统将重新分析。
          </p>
          <textarea
            className="w-full border rounded p-2 text-sm"
            value={modificationText}
            onChange={e => setModificationText(e.target.value)}
            placeholder="例：增加批量导入导出功能、调整权限模型为 RBAC..."
            rows={3}
          />
          <button
            onClick={handleReanalyze}
            disabled={!modificationText.trim()}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            重新分析
          </button>
        </div>

        {/* Lock button */}
        <div className="flex justify-end">
          <button
            onClick={handleLock}
            disabled={confirmedItems.size < summary.total * 0.5}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 disabled:opacity-50"
          >
            🔒 锁定需求（{confirmedItems.size}/{summary.total} 已确认）
          </button>
        </div>
        <p className="text-xs text-gray-400 text-right">
          锁定后需求规格将生成版本快照，进入骨架生成阶段。
          至少需确认 50% 的条目才能锁定。
        </p>
      </div>
    </div>
  );
};

export default RequirementReview;
