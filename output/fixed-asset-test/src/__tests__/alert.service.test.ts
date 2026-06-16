import { AlertService } from '../modules/alert/alert.service';
import { AlertType, AlertSeverity } from '../modules/alert/alert-rule.entity';

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

jest.mock('../services/email.service', () => ({
  EmailService: jest.fn().mockImplementation(() => ({
    sendEmail: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('AlertService', () => {
  let service: AlertService;

  beforeEach(() => {
    service = new AlertService();
  });

  it('should create alert rule', async () => {
    const ruleData = {
      ruleName: 'Budget Overflow Alert',
      type: AlertType.BUDGET_OVERFLOW,
      severity: AlertSeverity.HIGH,
      config: { threshold: 90 },
      messageTemplate: 'Warning: {{message}}',
    };

    const rule = await service.createRule(ruleData);
    expect(rule).toBeDefined();
    expect(rule.ruleName).toBe('Budget Overflow Alert');
  });

  it('should check and trigger alerts', async () => {
    const alerts = await service.checkAndTriggerAlerts();
    expect(Array.isArray(alerts)).toBe(true);
  });
});