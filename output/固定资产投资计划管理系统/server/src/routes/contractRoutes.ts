import { Router, Request, Response } from 'express';

export const router = Router();

router.get('/sub-project/:subId', (req: Request, res: Response) => {
  // TODO: implement get contracts by sub-project ID
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Get contracts not yet implemented' });
});

router.get('/:id', (req: Request, res: Response) => {
  // TODO: implement get contract by ID
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Get contract not yet implemented' });
});

router.post('/', (req: Request, res: Response) => {
  // TODO: implement create contract (pre-filing)
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Create contract not yet implemented' });
});

router.put('/:id', (req: Request, res: Response) => {
  // TODO: implement update contract
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Update contract not yet implemented' });
});

router.post('/:id/sync-to-hq', (req: Request, res: Response) => {
  // TODO: implement sync contract to HQ system
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Sync to HQ not yet implemented' });
});

router.put('/:id/approve', (req: Request, res: Response) => {
  // TODO: implement approve contract
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Approve contract not yet implemented' });
});
