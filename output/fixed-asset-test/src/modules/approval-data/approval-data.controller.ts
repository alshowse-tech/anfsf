import { Request, Response, NextFunction } from 'express';
import { ApprovalDataService } from './approval-data.service';
import { logger } from '../../utils/logger';

export class ApprovalDataController {
  private readonly service: ApprovalDataService;

  constructor() {
    this.service = new ApprovalDataService();
  }

  async syncData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await this.service.syncApprovalData();
      logger.info(`Sync completed: ${result.synced} synced, ${result.failed} failed`);
      res.json({
        success: true,
        data: result,
        message: `同步完成: ${result.synced} 条成功, ${result.failed} 条失败`,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const records = await this.service.findAll();
      res.json({
        success: true,
        data: records,
      });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const record = await this.service.findById(req.params.id);
      if (!record) {
        res.status(404).json({
          success: false,
          error: { message: '批复记录未找到' },
        });
        return;
      }
      res.json({
        success: true,
        data: record,
      });
    } catch (error) {
      next(error);
    }
  }
}