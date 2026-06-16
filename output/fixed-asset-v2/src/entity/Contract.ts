import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { Project } from "./Project";

export type ContractStatus = "draft" | "signed" | "executing" | "completed" | "terminated";

@Entity("contracts")
export class Contract {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "contract_number", length: 100, unique: true })
  contractNumber!: string;

  @Column({ name: "contract_name", length: 200 })
  contractName!: string;

  @ManyToOne(() => Project, { nullable: false })
  @JoinColumn({ name: "project_id" })
  project!: Project;

  @Column({ name: "project_id" })
  projectId!: string;

  @Column({ name: "contract_amount", type: "decimal", precision: 15, scale: 2 })
  contractAmount!: number;

  @Column({ name: "paid_amount", type: "decimal", precision: 15, scale: 2, default: 0 })
  paidAmount!: number;

  @Column({ name: "status", type: "varchar", length: 20, default: "draft" })
  status!: ContractStatus;

  @Column({ name: "sign_date", type: "date", nullable: true })
  signDate?: Date;

  @Column({ name: "vendor_name", length: 200 })
  vendorName!: string;

  @Column({ name: "start_date", type: "date", nullable: true })
  startDate?: Date;

  @Column({ name: "end_date", type: "date", nullable: true })
  endDate?: Date;

  @Column({ type: "jsonb", nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}