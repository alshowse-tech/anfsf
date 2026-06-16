export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  environment: process.env.NODE_ENV || "development",
  database: {
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    username: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "fixed_asset_v2"
  },
  sync: {
    interval: parseInt(process.env.SYNC_INTERVAL || "3600000", 10),
    headquartersApi: process.env.HQ_API_URL || "http://localhost:8080/api"
  },
  alerts: {
    budgetThreshold: parseInt(process.env.BUDGET_THRESHOLD || "90", 10),
    overdueDays: parseInt(process.env.OVERDUE_DAYS || "30", 10)
  }
};