export interface ProgressRecord {
  id: string;
  projectId: string;
  phase: string;
  completionPercentage: number;
  description: string;
  recordedBy: string;
  recordedAt: Date;
  createdAt: Date;
}