import { logger } from '../utils/logger';

interface ExternalApprovalData {
  externalId: string;
  projectName: string;
  projectCode: string;
  budgetAmount: number;
  approvalDate: string;
  approvalDocument: string;
  status: string;
  rawData: Record<string, unknown>;
}

export class ExternalApiService {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl = process.env.EXTERNAL_API_BASE_URL || 'http://localhost:8080';
    this.apiKey = process.env.EXTERNAL_API_KEY || '';
  }

  async fetchApprovalData(): Promise<ExternalApprovalData[]> {
    try {
      logger.info('Fetching approval data from external system...');

      // Simulate API call - in production, use actual HTTP client
      const mockData: ExternalApprovalData[] = [
        {
          externalId: 'EXT-001',
          projectName: '基础设施改造项目',
          projectCode: 'PROJ-2024-001',
          budgetAmount: 5000000.0,
          approvalDate: '2024-01-15',
          approvalDocument: '批文-2024-001',
          status: 'APPROVED',
          rawData: { source: 'external-system-v1' },
        },
        {
          externalId: 'EXT-002',
          projectName: '设备升级项目',
          projectCode: 'PROJ-2024-002',
          budgetAmount: 3200000.0,
          approvalDate: '2024-02-01',
          approvalDocument: '批文-2024-002',
          status: 'PENDING',
          rawData: { source: 'external-system-v1' },
        },
      ];

      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 100));

      logger.info(`Fetched ${mockData.length} approval records`);
      return mockData;
    } catch (error) {
      logger.error('Failed to fetch approval data from external system:', error);
      throw new Error('外部系统数据同步失败');
    }
  }
}