import { Router } from 'express';
import { AlertController } from './alert.controller';

const router = Router();
const controller = new AlertController();

router.post('/rules', controller.createRule.bind(controller));
router.put('/rules/:id', controller.updateRule.bind(controller));
router.get('/rules', controller.getAllRules.bind(controller));
router.post('/check', controller.triggerCheck.bind(controller));

export { router as alertRouter };