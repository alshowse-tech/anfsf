import { Approval } from "../entity/Approval";

interface HeadquarterApprovalData {
  projectCode: string;
  projectName: string;
  approvalNumber: string;
  totalBudget: number;
  approvalDate: string;
  metadata?: Record<string, unknown>;
}

export class ApprovalSyncService {
  async syncFromHeadquarters(data: HeadquarterApprovalData[]): Promise<{ synced: number; failed: number }> {
    let synced = 0;
    let failed = 0;

    for (const item of data) {
      try {
        const approval = new Approval();
        approval.projectCode = item.projectCode;
        approval.projectName = item.projectName;
        approval.approvalNumber = item.approvalNumber;
        approval.totalBudget = item.totalBudget;
        approval.approvalDate = new Date(item.approvalDate);
        approval.metadata = item.metadata;
        approval.syncStatus = "synced";
        approval.sourceSystem = "headquarters";
        synced++;
      } catch (error) {
        console.error(`Failed to sync approval ${item.projectCode}:`, error);
        failed++;
      }
    }

    return { synced, failed };
  }
}