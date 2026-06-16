import { Router } from 'express';
import { StatisticsController } from './statistics.controller';

const router = Router();
const controller = new StatisticsController();

router.get('/projects', controller.getProjectStats.bind(controller));
router.get('/approvals', controller.getApprovalStats.bind(controller));
router.get('/milestones', controller.getMilestoneStats.bind(controller));
router.get('/comprehensive', controller.getComprehensiveReport.bind(controller));

export { router as statisticsRouter };