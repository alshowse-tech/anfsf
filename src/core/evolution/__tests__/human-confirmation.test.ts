/**
 * ANFSF L17 — Human Confirmation Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { HumanConfirmation, createHumanConfirmation } from '../human-confirmation';
import type { EvolutionProposal } from '../framework';

describe('Human Confirmation Tests', () => {
  let hc: HumanConfirmation;

  const mockProposal: EvolutionProposal = {
    id: 'prop-1',
    description: 'Update API rate limiting',
    kpiImpact: {
      style_loading_success_rate: 0,
      contract_change_success_rate: -2,
      role_assignment_efficiency: 0,
      token_budget_compliance: 0,
      deployment_success_rate: 0,
    },
    budgetImpact: 500,
    riskScore: 40,
    changes: [],
  };

  beforeEach(() => {
    hc = createHumanConfirmation();
  });

  // --- Request Management ---

  it('should create confirmation instance', () => {
    expect(hc).toBeDefined();
  });

  it('should create a confirmation request', () => {
    const request = hc.createRequest(mockProposal);

    expect(request.id).toBeDefined();
    expect(request.proposal).toBe(mockProposal);
    expect(request.status).toBe('pending');
    expect(request.timeoutMs).toBe(300000);
    expect(request.allowBatchApproval).toBe(true);
  });

  it('should create request with custom options', () => {
    const request = hc.createRequest(mockProposal, {
      requiredRole: 'architect',
      timeoutMs: 60000,
      allowBatchApproval: false,
    });

    expect(request.requiredRole).toBe('architect');
    expect(request.timeoutMs).toBe(60000);
    expect(request.allowBatchApproval).toBe(false);
  });

  it('should get request by ID', () => {
    const request = hc.createRequest(mockProposal);
    const found = hc.getRequest(request.id);
    expect(found).toBe(request);
  });

  it('should return null for unknown ID', () => {
    expect(hc.getRequest('unknown')).toBeNull();
  });

  it('should get pending requests', () => {
    hc.createRequest(mockProposal);
    hc.createRequest({ ...mockProposal, id: 'prop-2' });

    expect(hc.getPendingRequests()).toHaveLength(2);
  });

  it('should get pending count', () => {
    hc.createRequest(mockProposal);
    hc.createRequest({ ...mockProposal, id: 'prop-2' });

    expect(hc.getPendingCount()).toBe(2);
  });

  // --- Review Actions ---

  it('should approve a request', () => {
    const request = hc.createRequest(mockProposal);
    const response = hc.approve(request.id, 'alice', 'Looks good');

    expect(response).not.toBeNull();
    expect(response!.status).toBe('approved');
    expect(response!.reviewer).toBe('alice');
    expect(response!.comments).toBe('Looks good');
  });

  it('should reject a request', () => {
    const request = hc.createRequest(mockProposal);
    const response = hc.reject(request.id, 'bob', 'Too risky');

    expect(response).not.toBeNull();
    expect(response!.status).toBe('rejected');
    expect(response!.reviewer).toBe('bob');
  });

  it('should request modifications', () => {
    const request = hc.createRequest(mockProposal);
    const response = hc.modify(request.id, 'carol', [
      {
        field: 'budgetImpact',
        currentValue: 500,
        proposedValue: 200,
        reason: 'Budget too high',
      },
    ], 'Please reduce budget');

    expect(response).not.toBeNull();
    expect(response!.status).toBe('modified');
    expect(response!.modifications).toHaveLength(1);
    expect(response!.modifications![0].field).toBe('budgetImpact');
  });

  it('should not approve already approved request', () => {
    const request = hc.createRequest(mockProposal);
    hc.approve(request.id, 'alice');
    expect(hc.approve(request.id, 'bob')).toBeNull();
  });

  it('should not approve unknown request', () => {
    expect(hc.approve('unknown', 'alice')).toBeNull();
  });

  // --- Batch Approval ---

  it('should batch approve requests', () => {
    const r1 = hc.createRequest(mockProposal);
    const r2 = hc.createRequest({ ...mockProposal, id: 'prop-2' });
    const r3 = hc.createRequest({ ...mockProposal, id: 'prop-3' });

    const result = hc.batchApprove([r1.id, r2.id, r3.id], 'admin', 'Batch approved');

    expect(result.total).toBe(3);
    expect(result.approved).toBe(3);
    expect(result.results).toHaveLength(3);
  });

  it('should skip non-batch-allowable requests', () => {
    const r1 = hc.createRequest(mockProposal, { allowBatchApproval: true });
    const r2 = hc.createRequest({ ...mockProposal, id: 'prop-2' }, { allowBatchApproval: false });

    const result = hc.batchApprove([r1.id, r2.id], 'admin');

    expect(result.approved).toBe(1);
    expect(result.expired).toBe(1);
  });

  // --- Expiration ---

  it('should expire timed-out requests', () => {
    const request = hc.createRequest(mockProposal, { timeoutMs: 0 });

    // Manually backdate the request to simulate expiration
    request.requestedAt = Date.now() - 3600000 * 2; // 2 hours ago

    const expired = hc.checkExpirations();

    expect(expired).toContain(request.id);
    expect(request.status).toBe('expired');
  });

  it('should not expire fresh requests', () => {
    hc.createRequest(mockProposal, { timeoutMs: 60000 });
    const expired = hc.checkExpirations();
    expect(expired).toHaveLength(0);
  });

  it('should cancel a pending request', () => {
    const request = hc.createRequest(mockProposal);
    const result = hc.cancel(request.id);

    expect(result).toBe(true);
    expect(request.status).toBe('cancelled');
  });

  it('should not cancel non-pending request', () => {
    const request = hc.createRequest(mockProposal);
    hc.approve(request.id, 'alice');
    expect(hc.cancel(request.id)).toBe(false);
  });

  // --- Max Pending Enforcement ---

  it('should expire oldest pending when max is reached', () => {
    hc = createHumanConfirmation({ maxPendingConfirmations: 2 });

    const r1 = hc.createRequest(mockProposal);
    r1.requestedAt = Date.now() - 10000; // Backdate to ensure it's oldest
    hc.createRequest({ ...mockProposal, id: 'prop-2' });

    // Third request should expire oldest
    hc.createRequest({ ...mockProposal, id: 'prop-3' });

    expect(r1.status).toBe('expired');
  });

  // --- History and Stats ---

  it('should get confirmation history', () => {
    const request = hc.createRequest(mockProposal);
    hc.approve(request.id, 'alice');

    const history = hc.getHistory();
    expect(history).toHaveLength(1);
    expect(history[0].status).toBe('approved');
  });

  it('should get history for specific proposal', () => {
    const r1 = hc.createRequest(mockProposal);
    hc.approve(r1.id, 'alice');

    const r2 = hc.createRequest({ ...mockProposal, id: 'prop-2' });
    hc.reject(r2.id, 'bob');

    const propHistory = hc.getHistoryForProposal('prop-1');
    expect(propHistory).toHaveLength(1);
    expect(propHistory[0].proposalId).toBe('prop-1');
  });

  it('should provide accurate stats', () => {
    const r1 = hc.createRequest(mockProposal);
    const r2 = hc.createRequest({ ...mockProposal, id: 'prop-2' });
    hc.createRequest({ ...mockProposal, id: 'prop-3' });

    hc.approve(r1.id, 'alice');
    hc.reject(r2.id, 'bob');

    const stats = hc.getStats();
    expect(stats.totalRequests).toBe(3);
    expect(stats.approved).toBe(1);
    expect(stats.rejected).toBe(1);
    expect(stats.pending).toBe(1);
  });

  it('should clear all data', () => {
    const request = hc.createRequest(mockProposal);
    hc.approve(request.id, 'alice');

    hc.clear();
    expect(hc.getHistory()).toHaveLength(0);
    expect(hc.getPendingRequests()).toHaveLength(0);
    expect(hc.getStats().totalRequests).toBe(0);
  });

  // --- Custom Config ---

  it('should respect custom config', () => {
    hc = createHumanConfirmation({
      defaultTimeoutMs: 60000,
      maxPendingConfirmations: 5,
      autoExpireAfterMs: 0,
    });

    const request = hc.createRequest(mockProposal);
    expect(request.timeoutMs).toBe(60000);
  });
});
