import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ProjectMilestone } from './project-milestone.entity';

export enum ProjectStatus {
  PLANNING = 'PLANNING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SUSPENDED = 'SUSPENDED',
  CANCELLED = 'CANCELLED',
}

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'project_name' })
  projectName!: string;

  @Column({ name: 'project_code', unique: true })
  projectCode!: string;

  @Column('decimal', { name: 'total_budget', precision: 15, scale: 2 })
  totalBudget!: number;

  @Column('decimal', {
    name: 'used_budget',
    precision: 15,
    scale: 2,
    default: 0,
  })
  usedBudget!: number;

  @Column({
    type: 'enum',
    enum: ProjectStatus,
    default: ProjectStatus.PLANNING,
  })
  status!: ProjectStatus;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate!: Date | null;

  @Column({ name: 'expected_end_date', type: 'date', nullable: true })
  expectedEndDate!: Date | null;

  @Column({ name: 'actual_end_date', type: 'date', nullable: true })
  actualEndDate!: Date | null;

  @Column({ name: 'responsible_person' })
  responsiblePerson!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @OneToMany(() => ProjectMilestone, (milestone) => milestone.project)
  milestones!: ProjectMilestone[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}