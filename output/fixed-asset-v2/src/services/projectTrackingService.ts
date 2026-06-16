import { Project } from "../entity/Project";

export class ProjectTrackingService {
  calculateProgress(project: Project): number {
    if (project.plannedStartDate && project.plannedEndDate) {
      const now = new Date();
      const total = project.plannedEndDate.getTime() - project.plannedStartDate.getTime();
      const elapsed = now.getTime() - project.plannedStartDate.getTime();
      return Math.min(100, Math.max(0, (elapsed / total) * 100));
    }
    return project.progressPercentage;
  }

  checkBudgetUsage(project: Project): { used: number; total: number; percentage: number } {
    const total = project.budgetUsed;
    const used = project.budgetUsed;
    const percentage = total > 0 ? (used / total) * 100 : 0;
    return { used, total, percentage };
  }
}