import { DataSource } from 'typeorm';
import { ApprovalRecord } from '../modules/approval-data/approval-record.entity';
import { Project } from '../modules/project-control/project.entity';
import { ProjectMilestone } from '../modules/project-control/project-milestone.entity';
import { AlertRule } from '../modules/alert/alert-rule.entity';

const {
  DB_HOST = 'localhost',
  DB_PORT = '5432',
  DB_USERNAME = 'postgres',
  DB_PASSWORD = 'password',
  DB_DATABASE = 'fixed_asset_db',
} = process.env;

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: DB_HOST,
  port: parseInt(DB_PORT, 10),
  username: DB_USERNAME,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  synchronize: true,
  logging: process.env.NODE_ENV === 'development',
  entities: [ApprovalRecord, Project, ProjectMilestone, AlertRule],
  subscribers: [],
  migrations: [],
});