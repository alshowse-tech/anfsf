/**
 * ASF V4.0 Dashboard - Approval Queue Component
 * 
 * Displays pending contract proposals awaiting approval.
 * Version: v0.8.5
 */

import React from 'react';

export interface ContractProposal {
  id: string;
  contractId: string;
  contractType: 'OpenAPI' | 'DBSchema' | 'UIProps' | 'EventSchema';
  proposerRoleId: string;
  submittedAt: number;
  diff: {
    breaking: boolean;
    riskScore: number;
    changelog: string;
  };
  autoApproveEligible?: boolean;
}

export interface ApprovalQueueProps {
  proposals: ContractProposal[];
  onApprove?: (proposalId: string, comment?: string) => void;
  onReject?: (proposalId: string, comment: string) => void;
  onAutoApprove?: (proposalId: string) => void;
  isLoading?: boolean;
}

/**
 * Get contract type badge color.
 */
function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    OpenAPI: 'bg-blue-100 text-blue-800',
    DBSchema: 'bg-purple-100 text-purple-800',
    UIProps: 'bg-pink-100 text-pink-800',
    EventSchema: 'bg-green-100 text-green-800',
  };
  return colors[type] || 'bg-gray-100 text-gray-800';
}

/**
 * Get risk level indicator.
 */
function getRiskLevel(riskScore: number): { label: string; color: string } {
  if (riskScore >= 70) return { label: 'High', color: 'text-red-600' };
  if (riskScore >= 40) return { label: 'Medium', color: 'text-yellow-600' };
  return { label: 'Low', color: 'text-green-600' };
}

/**
 * Format time ago.
 */
function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Approval Queue Component
 */
export const ApprovalQueue: React.FC<ApprovalQueueProps> = ({
  proposals,
  onApprove,
  onReject,
  onAutoApprove,
  isLoading = false,
}) => {
  const [selectedProposal, setSelectedProposal] = React.useState<string | null>(null);
  const [comment, setComment] = React.useState('');

  const handleApprove = (proposalId: string) => {
    onApprove?.(proposalId, comment);
    setComment('');
    setSelectedProposal(null);
  };

  const handleReject = (proposalId: string) => {
    if (!comment.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    onReject?.(proposalId, comment);
    setComment('');
    setSelectedProposal(null);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Approval Queue
          {proposals.length > 0 && (
            <span className="ml-2 px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
              {proposals.length} pending
            </span>
          )}
        </h3>
        <span className="text-sm text-gray-500">
          {proposals.filter(p => p.autoApproveEligible).length} auto-approvable
        </span>
      </div>

      {proposals.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-2">All caught up!</p>
          <p className="text-sm">No pending proposals</p>
        </div>
      ) : (
        <div className="space-y-4">
          {proposals.map((proposal) => {
            const risk = getRiskLevel(proposal.diff.riskScore);
            const isExpanded = selectedProposal === proposal.id;

            return (
              <div
                key={proposal.id}
                className={`border rounded-lg p-4 transition-colors ${
                  isExpanded ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(proposal.contractType)}`}>
                        {proposal.contractType}
                      </span>
                      {proposal.autoApproveEligible && (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                          Auto-Approve Eligible
                        </span>
                      )}
                      {proposal.diff.breaking && (
                        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                          Breaking Change
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {proposal.contractId}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Proposed by {proposal.proposerRoleId} • {timeAgo(proposal.submittedAt)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`text-sm font-medium ${risk.color}`}>
                      Risk: {risk.label} ({proposal.diff.riskScore})
                    </div>
                    <button
                      onClick={() => setSelectedProposal(isExpanded ? null : proposal.id)}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                    >
                      {isExpanded ? 'Collapse' : 'Expand'}
                    </button>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Changes</h4>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">
                        {proposal.diff.changelog || 'No description provided'}
                      </p>
                    </div>

                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Review Comment</h4>
                      <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Add your comment..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2">
                      {proposal.autoApproveEligible && onAutoApprove && (
                        <button
                          onClick={() => onAutoApprove(proposal.id)}
                          className="px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        >
                          Auto Approve
                        </button>
                      )}
                      <button
                        onClick={() => handleApprove(proposal.id)}
                        className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(proposal.id)}
                        className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ApprovalQueue;
