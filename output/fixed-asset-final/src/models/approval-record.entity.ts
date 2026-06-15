export interface ApprovalRecord {
  id: string;
  projectId: string;
  approvalType: string;
  approvalStatus: string;
  approver: string;
  approvalDate: Date;
  comments: string;
  createdAt: Date;
}