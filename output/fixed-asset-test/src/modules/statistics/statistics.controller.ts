import { Request, Response, NextFunction } from 'express';
import { StatisticsService } from './statistics.service';

export class StatisticsController {
  private readonly service: StatisticsService;

  constructor() {
    this.service = new StatisticsService();
  }

  async getProjectStats(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const stats = await this.service.getProjectStatistics();
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  async getApprovalStats(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const stats = await this.service.getApprovalStatistics();
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMilestoneStats(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const stats = await this.service.getMilestoneStatistics();
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  async getComprehensiveReport(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const report = await this.service.getComprehensiveReport();
      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }
}