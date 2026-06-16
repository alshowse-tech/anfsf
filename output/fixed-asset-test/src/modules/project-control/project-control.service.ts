import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { Project, ProjectStatus } from './project.entity';
import { ProjectMilestone, MilestoneStatus } from './project-milestone.entity';
import { logger } from '../../utils/logger';

export class ProjectControlService {
  private readonly projectRepository: Repository<Project>;
  private readonly milestoneRepository: Repository<ProjectMilestone>;

  constructor() {
    this.projectRepository = AppDataSource.getRepository(Project);
    this.milestoneRepository = AppDataSource.getRepository(ProjectMilestone);
  }

  async createProject(projectData: Partial<Project>): Promise<Project> {
    const project = this.projectRepository.create(projectData);
    return this.projectRepository.save(project);
  }

  async updateProject(
    id: string,
    projectData: Partial<Project>
  ): Promise<Project | null> {
    const project = await this.projectRepository.findOne({ where: { id } });
    if (!project) {
      return null;
    }
    Object.assign(project, projectData);
    return this.projectRepository.save(project);
  }

  async findAll(): Promise<Project[]> {
    return this.projectRepository.find({
      relations: ['milestones'],
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Project | null> {
    return this.projectRepository.findOne({
      where: { id },
      relations: ['milestones'],
    });
  }

  async findByStatus(status: ProjectStatus): Promise<Project[]> {
    return this.projectRepository.find({
      where: { status },
      relations: ['milestones'],
    });
  }

  async addMilestone(
    projectId: string,
    milestoneData: Partial<ProjectMilestone>
  ): Promise<ProjectMilestone | null> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });
    if (!project) {
      return null;
    }

    const milestone = this.milestoneRepository.create({
      ...milestoneData,
      projectId,
    });
    return this.milestoneRepository.save(milestone);
  }

  async updateMilestoneStatus(
    milestoneId: string,
    status: MilestoneStatus
  ): Promise<ProjectMilestone | null> {
    const milestone = await this.milestoneRepository.findOne({
      where: { id: milestoneId },
    });
    if (!milestone) {
      return null;
    }

    milestone.status = status;
    if (status === MilestoneStatus.COMPLETED) {
      milestone.actualDate = new Date();
      milestone.completionPercentage = 100;
    }

    return this.milestoneRepository.save(milestone);
  }

  async getProjectProgress(projectId: string): Promise<{
    totalMilestones: number;
    completedMilestones: number;
    completionPercentage: number;
  } | null> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['milestones'],
    });

    if (!project) {
      return null;
    }

    const milestones = project.milestones;
    const total = milestones.length;
    const completed = milestones.filter(
      (m) => m.status === MilestoneStatus.COMPLETED
    ).length;

    return {
      totalMilestones: total,
      completedMilestones: completed,
      completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }
}