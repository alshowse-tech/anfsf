import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Project } from "./Project";

export type AlertType = "overdue" | "over_budget" | "milestone" | "status_change";
export type AlertSeverity = "info" | "warning" | "critical";
export type AlertStatus = "active" | "acknowledged" | "resolved";

@Entity("alerts")
export class Alert {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "type", type: "varchar", length: 30 })
  alertType!: AlertType;

  @Column({ name: "severity", type: "varchar", length: 20, default: "warning" })
  severity!: AlertSeverity;

  @Column({ name: "title", length: 200 })
  title!: string;

  @Column({ name: "description", type: "text", nullable: true })
  description?: string;

  @ManyToOne(() => Project, { nullable: true })
  @JoinColumn({ name: "project_id" })
  project?: Project;

  @Column({ name: "project_id", nullable: true })
  projectId?: string;

  @Column({ name: "status", type: "varchar", length: 20, default: "active" })
  status!: AlertStatus;

  @Column({ name: "threshold_value", type: "decimal", precision: 15, scale: 2, nullable: true })
  thresholdValue?: number;

  @Column({ name: "current_value", type: "decimal", precision: 15, scale: 2, nullable: true })
  currentValue?: number;

  @Column({ type: "jsonb", nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}