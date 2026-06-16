import { Router } from 'express';
import { ProjectControlController } from './project-control.controller';

const router = Router();
const controller = new ProjectControlController();

// Project routes
router.post('/', controller.createProject.bind(controller));
router.put('/:id', controller.updateProject.bind(controller));
router.get('/', controller.getAll.bind(controller));
router.get('/status/:status', controller.getByStatus.bind(controller));
router.get('/:id', controller.getById.bind(controller));
router.get('/:id/progress', controller.getProgress.bind(controller));

// Milestone routes
router.post('/:projectId/milestones', controller.addMilestone.bind(controller));
router.put(
  '/:projectId/milestones/:milestoneId/status',
  controller.updateMilestoneStatus.bind(controller)
);

export { router as projectControlRouter };