import { Repository } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { ApprovalRecord, ApprovalStatus } from './approval-record.entity';
import { logger } from '../../utils/logger';
import { ExternalApiService } from '../../services/external-api.service';

export class ApprovalDataService {
  private readonly repository: Repository<ApprovalRecord>;
  private readonly externalApiService: ExternalApiService;

  constructor() {
    this.repository = AppDataSource.getRepository(ApprovalRecord);
    this.externalApiService = new ExternalApiService();
  }

  async syncApprovalData(): Promise<{ synced: number; failed: number }> {
    try {
      const externalData = await this.externalApiService.fetchApprovalData();
      let synced = 0;
      let failed = 0;

      for (const record of externalData) {
        try {
          const existing = await this.repository.findOne({
            where: { externalId: record.externalId },
          });

          if (existing) {
            Object.assign(existing, {
              ...record,
              syncStatus: true,
              syncMessage: 'Updated from external system',
            });
            await this.repository.save(existing);
          } else {
            const newRecord = this.repository.create({
              ...record,
              syncStatus: true,
              syncMessage: 'Synced from external system',
              status: record.status as ApprovalStatus,
            });
            await this.repository.save(newRecord);
          }
          synced++;
        } catch (error) {
          failed++;
          logger.error(`Failed to sync record ${record.externalId}:`, error);
        }
      }

      return { synced, failed };
    } catch (error) {
      logger.error('Failed to sync approval data:', error);
      throw error;
    }
  }

  async findAll(): Promise<ApprovalRecord[]> {
    return this.repository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<ApprovalRecord | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByStatus(status: ApprovalStatus): Promise<ApprovalRecord[]> {
    return this.repository.find({
      where: { status },
      order: { createdAt: 'DESC' },
    });
  }
}