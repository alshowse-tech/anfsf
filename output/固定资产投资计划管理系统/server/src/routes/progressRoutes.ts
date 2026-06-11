import { Router, Request, Response } from 'express';

export const router = Router();

router.get('/sub-project/:subId', (req: Request, res: Response) => {
  // TODO: implement get progress reports by sub-project
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Get progress reports not yet implemented' });
});

router.post('/', (req: Request, res: Response) => {
  // TODO: implement create progress report with mandatory photos
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Create progress report not yet implemented' });
});

router.put('/:id/supervisor-review', (req: Request, res: Response) => {
  // TODO: implement supervisor review of progress report
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Supervisor review not yet implemented' });
});

router.put('/:id/eng-dept-confirm', (req: Request, res: Response) => {
  // TODO: implement engineering department confirmation
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Eng dept confirm not yet implemented' });
});

router.post('/:id/photos', (req: Request, res: Response) => {
  // TODO: implement upload site photos for progress report
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Upload photos not yet implemented' });
});

router.get('/:id/photos', (req: Request, res: Response) => {
  // TODO: implement get photos for a progress report
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Get photos not yet implemented' });
});

// Change & Variation routes
router.get('/changes/sub-project/:subId', (req: Request, res: Response) => {
  // TODO: implement get changes by sub-project
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Get changes not yet implemented' });
});

router.post('/changes', (req: Request, res: Response) => {
  // TODO: implement create change/variation request
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Create change not yet implemented' });
});

router.put('/changes/:id/approve', (req: Request, res: Response) => {
  // TODO: implement approve change/variation
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Approve change not yet implemented' });
});
