import { Request, Response, NextFunction } from 'express';
import { ProjectControlService } from './project-control.service';
import { ProjectStatus } from './project.entity';
import { MilestoneStatus } from './project-milestone.entity';

export class ProjectControlController {
  private readonly service: ProjectControlService;

  constructor() {
    this.service = new ProjectControlService();
  }

  async createProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await this.service.createProject(req.body);
      res.status(201).json({
        success: true,
        data: project,
        message: '项目创建成功',
      });
    } catch (error) {
      next(error);
    }
  }

  async updateProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await this.service.updateProject(req.params.id, req.body);
      if (!project) {
        res.status(404).json({
          success: false,
          error: { message: '项目未找到' },
        });
        return;
      }
      res.json({
        success: true,
        data: project,
        message: '项目更新成功',
      });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const projects = await this.service.findAll();
      res.json({
        success: true,
        data: projects,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await this.service.findById(req.params.id);
      if (!project) {
        res.status(404).json({
          success: false,
          error: { message: '项目未找到' },
        });
        return;
      }
      res.json({
        success: true,
        data: project,
      });
    } catch (error) {
      next(error);
    }
  }

  async getByStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.params.status as ProjectStatus;
      const projects = await this.service.findByStatus(status);
      res.json({
        success: true,
        data: projects,
      });
    } catch (error) {
      next(error);
    }
  }

  async addMilestone(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const milestone = await this.service.addMilestone(
        req.params.projectId,
        req.body
      );
      if (!milestone) {
        res.status(404).json({
          success: false,
          error: { message: '项目未找到' },
        });
        return;
      }
      res.status(201).json({
        success: true,
        data: milestone,
        message: '里程碑添加成功',
      });
    } catch (error) {
      next(error);
    }
  }

  async updateMilestoneStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const status = req.body.status as MilestoneStatus;
      const milestone = await this.service.updateMilestoneStatus(
        req.params.milestoneId,
        status
      );
      if (!milestone) {
        res.status(404).json({
          success: false,
          error: { message: '里程碑未找到' },
        });
        return;
      }
      res.json({
        success: true,
        data: milestone,
        message: '里程碑状态更新成功',
      });
    } catch (error) {
      next(error);
    }
  }

  async getProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const progress = await this.service.getProjectProgress(req.params.projectId);
      if (!progress) {
        res.status(404).json({
          success: false,
          error: { message: '项目未找到' },
        });
        return;
      }
      res.json({
        success: true,
        data: progress,
      });
    } catch (error) {
      next(error);
    }
  }
}