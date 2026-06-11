import { Router, Request, Response } from 'express';

export const router = Router();

router.get('/project/:projectId', (req: Request, res: Response) => {
  // TODO: implement get sub-projects by project ID
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Get sub-projects not yet implemented' });
});

router.get('/:id', (req: Request, res: Response) => {
  // TODO: implement get sub-project by ID
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Get sub-project not yet implemented' });
});

router.post('/', (req: Request, res: Response) => {
  // TODO: implement create sub-project with budget validation
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Create sub-project not yet implemented' });
});

router.put('/:id', (req: Request, res: Response) => {
  // TODO: implement update sub-project
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Update sub-project not yet implemented' });
});

router.put('/:id/start', (req: Request, res: Response) => {
  // TODO: implement start sub-project
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Start sub-project not yet implemented' });
});

router.get('/:id/timeline', (req: Request, res: Response) => {
  // TODO: implement get sub-project timeline
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Get timeline not yet implemented' });
});
