import { Router } from 'express';
import { ApprovalDataController } from './approval-data.controller';

const router = Router();
const controller = new ApprovalDataController();

router.get('/sync', controller.syncData.bind(controller));
router.get('/', controller.getAll.bind(controller));
router.get('/:id', controller.getById.bind(controller));

export { router as approvalDataRouter };