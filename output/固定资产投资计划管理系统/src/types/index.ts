// [generated]
// TODO: implement detailed types

export interface Project {
  id: string;
  name: string;
  code: string;
  department: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  budget: number;
  description?: string;
}

export enum ProjectStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export interface AnnualPlan {
  id: string;
  year: number;
  totalBudget: number;
  status: PlanStatus;
  items: PlanItem[];
}

export interface PlanItem {
  projectId: string;
  budget: number;
  remarks?: string;
}

export enum PlanStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  HEAD_OFFICE_REVIEW = 'HEAD_OFFICE_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface Approval {
  id: string;
  entityType: 'PROJECT' | 'PLAN';
  entityId: string;
  step: number;
  status: ApprovalStatus;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}
