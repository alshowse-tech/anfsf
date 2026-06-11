import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { router as projectRouter } from './routes/projectRoutes';
import { router as subProjectRouter } from './routes/subProjectRoutes';
import { router as designRouter } from './routes/designRoutes';
import { router as contractRouter } from './routes/contractRoutes';
import { router as progressRouter } from './routes/progressRoutes';
import { router as equipmentRouter } from './routes/equipmentRoutes';
import { router as paymentRouter } from './routes/paymentRoutes';
import { router as settlementRouter } from './routes/settlementRoutes';
import { router as reportRouter } from './routes/reportRoutes';
import { router as traceRouter } from './routes/traceRoutes';
import { router as authRouter } from './routes/authRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/projects', projectRouter);
app.use('/api/v1/sub-projects', subProjectRouter);
app.use('/api/v1/design', designRouter);
app.use('/api/v1/contracts', contractRouter);
app.use('/api/v1/progress', progressRouter);
app.use('/api/v1/equipment', equipmentRouter);
app.use('/api/v1/payments', paymentRouter);
app.use('/api/v1/settlements', settlementRouter);
app.use('/api/v1/reports', reportRouter);
app.use('/api/v1/trace', traceRouter);

// Health check
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
