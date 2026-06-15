export const config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    environment: process.env.NODE_ENV || 'development'
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'fixed_asset'
  },
  externalSystem: {
    approvalApiUrl: process.env.APPROVAL_API_URL || 'http://localhost:8080/api',
    syncInterval: parseInt(process.env.SYNC_INTERVAL || '3600000', 10) // 1 hour
  },
  alert: {
    checkInterval: parseInt(process.env.ALERT_CHECK_INTERVAL || '300000', 10), // 5 minutes
    warningThreshold: parseInt(process.env.WARNING_THRESHOLD || '80', 10) // percentage
  }
};