export interface ReportFilter {
  startDate: string;
  endDate: string;
  reportType: "monthly" | "quarterly" | "annual";
  projectIds?: string[];
}

export interface ReportData {
  totalProjects: number;
  totalBudget: number;
  totalSpent: number;
  completedProjects: number;
  inProgressProjects: number;
  overBudgetProjects: number;
  overdueProjects: number;
}

export class ReportGenerationService {
  generateReport(filter: ReportFilter): ReportData {
    return {
      totalProjects: 0,
      totalBudget: 0,
      totalSpent: 0,
      completedProjects: 0,
      inProgressProjects: 0,
      overBudgetProjects: 0,
      overdueProjects: 0
    };
  }
}