import { ApprovalDataService } from '../modules/approval-data/approval-data.service';

jest.mock('../config/database', () => ({
  AppDataSource: {
    getRepository: jest.fn().mockReturnValue({
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((data) => data),
      save: jest.fn().mockImplementation((data) => Promise.resolve(data)),
    }),
  },
}));

jest.mock('../services/external-api.service', () => ({
  ExternalApiService: jest.fn().mockImplementation(() => ({
    fetchApprovalData: jest.fn().mockResolvedValue([
      {
        externalId: 'TEST-001',
        projectName: 'Test Project',
        projectCode: 'TEST-001',
        budgetAmount: 100000,
        approvalDate: '2024-01-01',
        approvalDocument: 'DOC-001',
        status: 'APPROVED',
        rawData: {},
      },
    ]),
  })),
}));

describe('ApprovalDataService', () => {
  let service: ApprovalDataService;

  beforeEach(() => {
    service = new ApprovalDataService();
  });

  it('should sync approval data successfully', async () => {
    const result = await service.syncApprovalData();
    expect(result).toHaveProperty('synced');
    expect(result).toHaveProperty('failed');
    expect(result.synced).toBeGreaterThan(0);
  });

  it('should find all records', async () => {
    const records = await service.findAll();
    expect(Array.isArray(records)).toBe(true);
  });
});