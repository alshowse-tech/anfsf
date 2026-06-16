import cron from 'node-cron';
import { ApprovalDataService } from '../modules/approval-data/approval-data.service';
import { AlertService } from '../modules/alert/alert.service';
import { logger } from '../utils/logger';

export class CronService {
  private readonly approvalDataService: ApprovalDataService;
  private readonly alertService: AlertService;

  constructor() {
    this.approvalDataService = new ApprovalDataService();
    this.alertService = new AlertService();
  }

  startJobs(): void {
    // Sync approval data every hour
    cron.schedule('0 * * * *', async () => {
      logger.info('Starting scheduled approval data sync...');
      try {
        const result = await this.approvalDataService.syncApprovalData();
        logger.info(`Scheduled sync completed: ${JSON.stringify(result)}`);
      } catch (error) {
        logger.error('Scheduled sync failed:', error);
      }
    });

    // Check alerts every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
      logger.info('Starting scheduled alert check...');
      try {
        const alerts = await this.alertService.checkAndTriggerAlerts();
        if (alerts.length > 0) {
          logger.info(`Scheduled alert check triggered ${alerts.length} alerts`);
        }
      } catch (error) {
        logger.error('Scheduled alert check failed:', error);
      }
    });

    logger.info('Cron jobs started successfully');
  }
}