import { Repository, LessThan, FindOperator } from 'typeorm';
import { AppDataSource } from '../../config/database';
import { AlertRule, AlertType, AlertStatus, AlertSeverity } from './alert-rule.entity';
import { Project, ProjectStatus } from '../project-control/project.entity';
import { ProjectMilestone, MilestoneStatus } from '../project-control/project-milestone.entity';
import { logger } from '../../utils/logger';
import { EmailService } from '../../services/email.service';

export interface AlertEvent {
  type: AlertType;
  projectId?: string;
  projectName?: string;
  message: string;
  severity: AlertSeverity;
}

export class AlertService {
  private readonly alertRuleRepository: Repository<AlertRule>;
  private readonly projectRepository: Repository<Project>;
  private readonly milestoneRepository: Repository<ProjectMilestone>;
  private readonly emailService: EmailService;

  constructor() {
    this.alertRuleRepository = AppDataSource.getRepository(AlertRule);
    this.projectRepository = AppDataSource.getRepository(Project);
    this.milestoneRepository = AppDataSource.getRepository(ProjectMilestone);
    this.emailService = new EmailService();
  }

  async createRule(ruleData: Partial<AlertRule>): Promise<AlertRule> {
    const rule = this.alertRuleRepository.create(ruleData);
    return this.alertRuleRepository.save(rule);
  }

  async updateRule(
    id: string,
    ruleData: Partial<AlertRule>
  ): Promise<AlertRule | null> {
    const rule = await this.alertRuleRepository.findOne({ where: { id } });
    if (!rule) {
      return null;
    }
    Object.assign(rule, ruleData);
    return this.alertRuleRepository.save(rule);
  }

  async findAllRules(): Promise<AlertRule[]> {
    return this.alertRuleRepository.find({
      where: { status: AlertStatus.ACTIVE },
      order: { createdAt: 'DESC' },
    });
  }

  async checkAndTriggerAlerts(): Promise<AlertEvent[]> {
    const alerts: AlertEvent[] = [];
    const activeRules = await this.alertRuleRepository.find({
      where: { status: AlertStatus.ACTIVE },
    });

    for (const rule of activeRules) {
      try {
        const triggeredAlerts = await this.evaluateRule(rule);
        alerts.push(...triggeredAlerts);
      } catch (error) {
        logger.error(`Failed to evaluate rule ${rule.id}:`, error);
      }
    }

    // Send notifications for triggered alerts
    for (const alert of alerts) {
      await this.sendAlertNotification(alert);
    }

    return alerts;
  }

  private async evaluateRule(rule: AlertRule): Promise<AlertEvent[]> {
    const alerts: AlertEvent[] = [];

    switch (rule.type) {
      case AlertType.BUDGET_OVERFLOW:
        alerts.push(...(await this.checkBudgetOverflow(rule)));
        break;
      case AlertType.MILESTONE_DELAY:
        alerts.push(...(await this.checkMilestoneDelay(rule)));
        break;
      case AlertType.PROJECT_DEADLINE:
        alerts.push(...(await this.checkProjectDeadline(rule)));
        break;
      default:
        break;
    }

    return alerts;
  }

  private async checkBudgetOverflow(rule: AlertRule): Promise<AlertEvent[]> {
    const alerts: AlertEvent[] = [];
    const threshold = (rule.config['threshold'] as number) || 90;
    const projects = await this.projectRepository.find();

    for (const project of projects) {
      const totalBudget = Number(project.totalBudget);
      const usedBudget = Number(project.usedBudget);
      if (totalBudget > 0) {
        const usageRate = (usedBudget / totalBudget) * 100;
        if (usageRate >= threshold) {
          alerts.push({
            type: AlertType.BUDGET_OVERFLOW,
            projectId: project.id,
            projectName: project.projectName,
            message: `项目 "${project.projectName}" 预算使用率已达到 ${usageRate.toFixed(2)}%，请关注`,
            severity: usageRate >= 100 ? AlertSeverity.CRITICAL : AlertSeverity.HIGH,
          });
        }
      }
    }

    return alerts;
  }

  private async checkMilestoneDelay(rule: AlertRule): Promise<AlertEvent[]> {
    const alerts: AlertEvent[] = [];
    const delayDays = (rule.config['delayDays'] as number) || 7;
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - delayDays);

    const delayedMilestones = await this.milestoneRepository.find({
      where: {
        status: MilestoneStatus.PENDING,
        plannedDate: LessThan(thresholdDate),
      },
      relations: ['project'],
    });

    for (const milestone of delayedMilestones) {
      alerts.push({
        type: AlertType.MILESTONE_DELAY,
        projectId: milestone.projectId,
        projectName: milestone.project.projectName,
        message: `项目 "${milestone.project.projectName}" 的里程碑 "${milestone.milestoneName}" 已延迟`,
        severity: AlertSeverity.MEDIUM,
      });
    }

    return alerts;
  }

  private async checkProjectDeadline(rule: AlertRule): Promise<AlertEvent[]> {
    const alerts: AlertEvent[] = [];
    const daysBefore = (rule.config['daysBefore'] as number) || 30;
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + daysBefore);

    const projects = await this.projectRepository.find({
      where: {
        status: ProjectStatus.IN_PROGRESS,
        expectedEndDate: LessThan(deadlineDate),
      },
    });

    for (const project of projects) {
      const daysRemaining = Math.ceil(
        (project.expectedEndDate!.getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      );
      alerts.push({
        type: AlertType.PROJECT_DEADLINE,
        projectId: project.id,
        projectName: project.projectName,
        message: `项目 "${project.projectName}" 距离截止日期还有 ${daysRemaining} 天`,
        severity: daysRemaining <= 7 ? AlertSeverity.HIGH : AlertSeverity.MEDIUM,
      });
    }

    return alerts;
  }

  private async sendAlertNotification(alert: AlertEvent): Promise<void> {
    try {
      const rules = await this.alertRuleRepository.find({
        where: {
          type: alert.type,
          status: AlertStatus.ACTIVE,
        },
      });

      for (const rule of rules) {
        if (rule.notificationEmail) {
          const message = rule.messageTemplate.replace(
            '{{message}}',
            alert.message
          );
          await this.emailService.sendEmail({
            to: rule.notificationEmail,
            subject: `[${alert.severity}] 项目预警通知`,
            text: message,
          });
        }
      }
    } catch (error) {
      logger.error('Failed to send alert notification:', error);
    }
  }
}