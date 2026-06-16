import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { Project, ProjectStatus } from '../project-control/project.entity';
import { ApprovalRecord, ApprovalStatus } from '../approval-data/approval-record.entity';
import { MilestoneStatus } from '../project-control/project-milestone.entity';

export interface ProjectStatistics {
  totalProjects: number;
  byStatus: Record<string, number>;
  totalBudget: number;
  usedBudget: number;
  budgetUtilizationRate: number;
}

export interface ApprovalStatistics {
  totalApprovals: number;
  byStatus: Record<string, number>;
  totalBudget: number;
}

export interface MilestoneStatistics {
  totalMilestones: number;
  completed: number;
  delayed: number;
  onTrack: number;
}

export class StatisticsService {
  private readonly projectRepository: Repository<Project>;
  private readonly approvalRepository: Repository<ApprovalRecord>;

  constructor() {
    this.projectRepository = AppDataSource.getRepository(Project);
    this.approvalRepository = AppDataSource.getRepository(ApprovalRecord);
  }

  async getProjectStatistics(): Promise<ProjectStatistics> {
    const projects = await this.projectRepository.find();
    const totalProjects = projects.length;
    const totalBudget = projects.reduce((sum, p) => sum + Number(p.totalBudget), 0);
    const usedBudget = projects.reduce((sum, p) => sum + Number(p.usedBudget), 0);

    const byStatus: Record<string, number> = {};
    for (const status of Object.values(ProjectStatus)) {
      byStatus[status] = projects.filter((p) => p.status === status).length;
    }

    return {
      totalProjects,
      byStatus,
      totalBudget,
      usedBudget,
      budgetUtilizationRate:
        totalBudget > 0 ? Math.round((usedBudget / totalBudget) * 100) : 0,
    };
  }

  async getApprovalStatistics(): Promise<ApprovalStatistics> {
    const approvals = await this.approvalRepository.find();
    const totalApprovals = approvals.length;
    const totalBudget = approvals.reduce(
      (sum, a) => sum + Number(a.budgetAmount),
      0
    );

    const byStatus: Record<string, number> = {};
    for (const status of Object.values(ApprovalStatus)) {
      byStatus[status] = approvals.filter((a) => a.status === status).length;
    }

    return {
      totalApprovals,
      byStatus,
      totalBudget,
    };
  }

  async getMilestoneStatistics(): Promise<MilestoneStatistics> {
    const { ProjectMilestone } = await import(
      '../project-control/project-milestone.entity'
    );
    const milestoneRepository = AppDataSource.getRepository(ProjectMilestone);
    const milestones = await milestoneRepository.find();

    return {
      totalMilestones: milestones.length,
      completed: milestones.filter(
        (m) => m.status === MilestoneStatus.COMPLETED
      ).length,
      delayed: milestones.filter((m) => m.status === MilestoneStatus.DELAYED).length,
      onTrack: milestones.filter(
        (m) =>
          m.status === MilestoneStatus.PENDING ||
          m.status === MilestoneStatus.IN_PROGRESS
      ).length,
    };
  }

  async getComprehensiveReport(): Promise<{
    projects: ProjectStatistics;
    approvals: ApprovalStatistics;
    milestones: MilestoneStatistics;
  }> {
    const [projects, approvals, milestones] = await Promise.all([
      this.getProjectStatistics(),
      this.getApprovalStatistics(),
      this.getMilestoneStatistics(),
    ]);

    return { projects, approvals, milestones };
  }
}