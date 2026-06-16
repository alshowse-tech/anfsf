import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Approval } from "./Approval";

export type ProjectStatus = "planning" | "in_progress" | "completed" | "suspended" | "cancelled";

@Entity("projects")
export class Project {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "project_code", length: 50, unique: true })
  projectCode!: string;

  @Column({ name: "project_name", length: 200 })
  projectName!: string;

  @ManyToOne(() => Approval, { nullable: true })
  @JoinColumn({ name: "approval_id" })
  approval?: Approval;

  @Column({ name: "approval_id", nullable: true })
  approvalId?: string;

  @Column({ name: "status", type: "varchar", length: 20, default: "planning" })
  status!: ProjectStatus;

  @Column({ name: "planned_start_date", type: "date", nullable: true })
  plannedStartDate?: Date;

  @Column({ name: "planned_end_date", type: "date", nullable: true })
  plannedEndDate?: Date;

  @Column({ name: "actual_start_date", type: "date", nullable: true })
  actualStartDate?: Date;

  @Column({ name: "actual_end_date", type: "date", nullable: true })
  actualEndDate?: Date;

  @Column({ name: "budget_used", type: "decimal", precision: 15, scale: 2, default: 0 })
  budgetUsed!: number;

  @Column({ name: "progress_percentage", type: "decimal", precision: 5, scale: 2, default: 0 })
  progressPercentage!: number;

  @Column({ name: "responsible_person", length: 100, nullable: true })
  responsiblePerson?: string;

  @Column({ type: "jsonb", nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}