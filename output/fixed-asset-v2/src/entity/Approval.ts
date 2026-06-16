import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity("approvals")
export class Approval {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "project_code", length: 50, unique: true })
  projectCode!: string;

  @Column({ name: "project_name", length: 200 })
  projectName!: string;

  @Column({ name: "approval_number", length: 100 })
  approvalNumber!: string;

  @Column({ name: "total_budget", type: "decimal", precision: 15, scale: 2 })
  totalBudget!: number;

  @Column({ name: "approval_date", type: "date" })
  approvalDate!: Date;

  @Column({ name: "source_system", length: 50, default: "headquarters" })
  sourceSystem!: string;

  @Column({ name: "sync_status", length: 20, default: "pending" })
  syncStatus!: string;

  @Column({ type: "jsonb", nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}