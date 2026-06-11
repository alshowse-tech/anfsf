import { ProgressReport, ProgressPhoto, ChangeVariation } from '../models/Project';

export async function getProgressReports(subId: string): Promise<ProgressReport[]> {
  // TODO: implement progress report query
  return [];
}

export async function createProgressReport(data: any): Promise<ProgressReport> {
  // TODO: implement progress report creation with photo requirement
  throw new Error('Not implemented');
}

export async function reviewBySupervisor(reportId: string, opinion: string, approved: boolean): Promise<ProgressReport> {
  // TODO: implement supervisor review
  throw new Error('Not implemented');
}

export async function confirmByEngDept(reportId: string): Promise<ProgressReport> {
  // TODO: implement engineering department confirmation
  throw new Error('Not implemented');
}

export async function uploadProgressPhoto(reportId: string, photoData: any): Promise<ProgressPhoto> {
  // TODO: implement photo upload with metadata
  throw new Error('Not implemented');
}

export async function getProgressPhotos(reportId: string): Promise<ProgressPhoto[]> {
  // TODO: implement photo query
  return [];
}

export async function createChangeVariation(data: any): Promise<ChangeVariation> {
  // TODO: implement change/variation creation
  throw new Error('Not implemented');
}

export async function approveChangeVariation(changeId: string, approvedCost: number): Promise<ChangeVariation> {
  // TODO: implement change/variation approval
  throw new Error('Not implemented');
}
