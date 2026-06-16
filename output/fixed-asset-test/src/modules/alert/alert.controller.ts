import { Request, Response, NextFunction } from 'express';
import { AlertService } from './alert.service';

export class AlertController {
  private readonly service: AlertService;

  constructor() {
    this.service = new AlertService();
  }

  async createRule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rule = await this.service.createRule(req.body);
      res.status(201).json({
        success: true,
        data: rule,
        message: '预警规则创建成功',
      });
    } catch (error) {
      next(error);
    }
  }

  async updateRule(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rule = await this.service.updateRule(req.params.id, req.body);
      if (!rule) {
        res.status(404).json({
          success: false,
          error: { message: '预警规则未找到' },
        });
        return;
      }
      res.json({
        success: true,
        data: rule,
        message: '预警规则更新成功',
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllRules(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const rules = await this.service.findAllRules();
      res.json({
        success: true,
        data: rules,
      });
    } catch (error) {
      next(error);
    }
  }

  async triggerCheck(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const alerts = await this.service.checkAndTriggerAlerts();
      res.json({
        success: true,
        data: alerts,
        message: `预警检查完成，触发了 ${alerts.length} 条预警`,
      });
    } catch (error) {
      next(error);
    }
  }
}