import { DesignConfirmation } from '../models/Project';

export async function getDesignBySubProject(subId: string): Promise<DesignConfirmation | null> {
  // TODO: implement design confirmation query
  return null;
}

export async function createDesignEntrustment(data: any): Promise<DesignConfirmation> {
  // TODO: implement design entrustment creation
  throw new Error('Not implemented');
}

export async function uploadDrawing(designId: string, fileId: string): Promise<DesignConfirmation> {
  // TODO: implement drawing upload and status update
  throw new Error('Not implemented');
}

export async function submitForReview(designId: string, reviewerId: string): Promise<DesignConfirmation> {
  // TODO: implement design review submission
  throw new Error('Not implemented');
}

export async function completeReview(designId: string, result: '通过' | '不通过', reviewerId: string): Promise<DesignConfirmation> {
  // TODO: implement design review completion
  throw new Error('Not implemented');
}

export async function submitBudgetToHQ(designId: string, budgetAmount: number): Promise<DesignConfirmation> {
  // TODO: implement budget submission to HQ
  throw new Error('Not implemented');
}

export async function recordHQApproval(designId: string, approveDocNo: string, approvedAmount: number): Promise<DesignConfirmation> {
  // TODO: implement HQ approval record
  throw new Error('Not implemented');
}
