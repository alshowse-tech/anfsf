import 'reflect-metadata';
import express from 'express';
import { AppDataSource } from './config/database';
import { approvalDataRouter } from './modules/approval-data/approval-data.router';
import { projectControlRouter } from './modules/project-control/project-control.router';
import { statisticsRouter } from './modules/statistics/statistics.router';
import { alertRouter } from './modules/alert/alert.router';
import { errorHandler } from './middleware/error-handler';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.APP_PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/approval-data', approvalDataRouter);
app.use('/api/project-control', projectControlRouter);
app.use('/api/statistics', statisticsRouter);
app.use('/api/alert', alertRouter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

async function bootstrap(): Promise<void> {
  try {
    await AppDataSource.initialize();
    logger.info('Database connection established');

    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();

export default app;