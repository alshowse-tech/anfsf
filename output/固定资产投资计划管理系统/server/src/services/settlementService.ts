import { Settlement, Dispute, YearRollover, ProjectCancel } from '../models/Project';

export async function getSettlementBySubProject(subId: string): Promise<Settlement | null> {
  // TODO: implement settlement query
  return null;
}

export async function startSettlement(subId: string): Promise<Settlement> {
  // TODO: implement settlement start with document locking
  throw new Error('Not implemented');
}

export async function submitSettlement(settlementId: string, data: any): Promise<Settlement> {
  // TODO: implement settlement submission
  throw new Error('Not implemented');
}

export async function reviewSettlement(settlementId: string, data: any): Promise<Settlement> {
  // TODO: implement multi-level review
  throw new Error('Not implemented');
}

export async function internalAudit(settlementId: string, data: any): Promise<Settlement> {
  // TODO: implement internal audit (≤50万)
  throw new Error('Not implemented');
}

export async function receiveHQAuditResult(settlementId: string, data: any): Promise<Settlement> {
  // TODO: implement HQ audit result reception (>50万)
  throw new Error('Not implemented');
}

export async function initiateDispute(settlementId: string, data: any): Promise<Dispute> {
  // TODO: implement dispute initiation
  throw new Error('Not implemented');
}

export async function resolveDispute(disputeId: string, resolution: string): Promise<Dispute> {
  // TODO: implement dispute resolution
  throw new Error('Not implemented');
}

export async function finalizeSettlement(settlementId: string): Promise<Settlement> {
  // TODO: implement settlement finalization
  throw new Error('Not implemented');
}

export async function cancelProject(projectId: string, data: any): Promise<ProjectCancel> {
  // TODO: implement project cancellation (all sub-projects must be completed)
  throw new Error('Not implemented');
}

export async function executeYearRollover(fromYear: number, toYear: number): Promise<YearRollover[]> {
  // TODO: implement year-end rollover
  return [];
}
