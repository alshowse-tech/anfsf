import { Router, Request, Response } from 'express';

export const router = Router();

router.get('/', (req: Request, res: Response) => {
  // TODO: implement get project list with filtering
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Get projects not yet implemented' });
});

router.get('/:id', (req: Request, res: Response) => {
  // TODO: implement get project by ID
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Get project not yet implemented' });
});

router.post('/', (req: Request, res: Response) => {
  // TODO: implement create project
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Create project not yet implemented' });
});

router.put('/:id', (req: Request, res: Response) => {
  // TODO: implement update project
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Update project not yet implemented' });
});

router.delete('/:id', (req: Request, res: Response) => {
  // TODO: implement delete project (soft delete)
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Delete project not yet implemented' });
});

router.post('/sync', (req: Request, res: Response) => {
  // TODO: implement sync from HQ system
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Sync projects not yet implemented' });
});

router.post('/import', (req: Request, res: Response) => {
  // TODO: implement Excel import
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Import projects not yet implemented' });
});

router.put('/:id/toggle-key', (req: Request, res: Response) => {
  // TODO: implement toggle key project flag
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Toggle key project not yet implemented' });
});
