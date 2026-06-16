import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SYNCED = 'SYNCED',
}

@Entity('approval_records')
export class ApprovalRecord {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'external_id', unique: true })
  externalId!: string;

  @Column({ name: 'project_name' })
  projectName!: string;

  @Column({ name: 'project_code' })
  projectCode!: string;

  @Column('decimal', { name: 'budget_amount', precision: 15, scale: 2 })
  budgetAmount!: number;

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    default: ApprovalStatus.PENDING,
  })
  status!: ApprovalStatus;

  @Column({ name: 'approval_date', type: 'date', nullable: true })
  approvalDate!: Date | null;

  @Column({ name: 'approval_document', nullable: true })
  approvalDocument!: string | null;

  @Column({ type: 'jsonb', name: 'raw_data', nullable: true })
  rawData!: Record<string, unknown> | null;

  @Column({ name: 'sync_status', default: false })
  syncStatus!: boolean;

  @Column({ name: 'sync_message', nullable: true })
  syncMessage!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}