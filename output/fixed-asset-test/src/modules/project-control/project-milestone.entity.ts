import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Project } from './project.entity';

export enum MilestoneStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DELAYED = 'DELAYED',
}

@Entity('project_milestones')
export class ProjectMilestone {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'milestone_name' })
  milestoneName!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'planned_date', type: 'date' })
  plannedDate!: Date;

  @Column({ name: 'actual_date', type: 'date', nullable: true })
  actualDate!: Date | null;

  @Column({
    type: 'enum',
    enum: MilestoneStatus,
    default: MilestoneStatus.PENDING,
  })
  status!: MilestoneStatus;

  @Column({ name: 'completion_percentage', type: 'int', default: 0 })
  completionPercentage!: number;

  @Column({ name: 'remark', type: 'text', nullable: true })
  remark!: string | null;

  @ManyToOne(() => Project, (project) => project.milestones)
  @JoinColumn({ name: 'project_id' })
  project!: Project;

  @Column({ name: 'project_id' })
  projectId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}