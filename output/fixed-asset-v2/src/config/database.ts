import { DataSource } from "typeorm";
import { Approval } from "../entity/Approval";
import { Project } from "../entity/Project";
import { Contract } from "../entity/Contract";
import { Alert } from "../entity/Alert";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  username: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
  database: process.env.DB_NAME || "fixed_asset_v2",
  synchronize: process.env.NODE_ENV !== "production",
  logging: process.env.NODE_ENV !== "production",
  entities: [Approval, Project, Contract, Alert],
  subscribers: [],
  migrations: [],
});