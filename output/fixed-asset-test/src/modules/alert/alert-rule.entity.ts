import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AlertType {
  BUDGET_OVERFLOW = 'BUDGET_OVERFLOW',
  MILESTONE_DELAY = 'MILESTONE_DELAY',
  PROJECT_DEADLINE = 'PROJECT_DEADLINE',
  STATUS_CHANGE = 'STATUS_CHANGE',
}

export enum AlertSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum AlertStatus {
  ACTIVE = 'ACTIVE',
  TRIGGERED = 'TRIGGERED',
  RESOLVED = 'RESOLVED',
  DISABLED = 'DISABLED',
}

@Entity('alert_rules')
export class AlertRule {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'rule_name' })
  ruleName!: string;

  @Column({
    type: 'enum',
    enum: AlertType,
  })
  type!: AlertType;

  @Column({
    type: 'enum',
    enum: AlertSeverity,
    default: AlertSeverity.MEDIUM,
  })
  severity!: AlertSeverity;

  @Column({
    type: 'enum',
    enum: AlertStatus,
    default: AlertStatus.ACTIVE,
  })
  status!: AlertStatus;

  @Column({ type: 'jsonb', name: 'config' })
  config!: Record<string, unknown>;

  @Column({ name: 'notification_email', nullable: true })
  notificationEmail!: string | null;

  @Column({ type: 'text', name: 'message_template' })
  messageTemplate!: string;

  @Column({ name: 'last_triggered_at', type: 'timestamp', nullable: true })
  lastTriggeredAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}