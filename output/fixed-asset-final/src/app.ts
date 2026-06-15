import express, { Application } from 'express';
import { Logger } from './utils/logger';
import { ApprovalDataSyncService } from './modules/approval-sync/approval-data-sync.service';
import { ProjectProcessControlService } from './modules/process-control/project-process-control.service';
import { StatisticsReportService } from './modules/report/statistics-report.service';
import { AlertReminderService } from './modules/alert/alert-reminder.service';

export class App {
  private app: Application;
  private logger: Logger;
  private port: number;

  constructor() {
    this.app = express();
    this.logger = new Logger('App');
    this.port = parseInt(process.env.PORT || '3000', 10);
  }

  public async initialize(): Promise<void> {
    this.configureMiddleware();
    this.configureRoutes();
    await this.initializeServices();
    this.logger.info('Application initialized');
  }

  public async start(): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(this.port, () => {
        this.logger.info(`Server running on port ${this.port}`);
        resolve();
      });
    });
  }

  private configureMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private configureRoutes(): void {
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
  }

  private async initializeServices(): Promise<void> {
    const approvalSyncService = new ApprovalDataSyncService();
    const processControlService = new ProjectProcessControlService();
    const statisticsReportService = new StatisticsReportService();
    const alertReminderService = new AlertReminderService();

    await Promise.all([
      approvalSyncService.initialize(),
      processControlService.initialize(),
      statisticsReportService.initialize(),
      alertReminderService.initialize()
    ]);
  }
}