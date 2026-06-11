import { Router, Request, Response } from 'express';

export const router = Router();

router.get('/sub-project/:subId', (req: Request, res: Response) => {
  // TODO: implement get equipment arrivals by sub-project
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Get equipment arrivals not yet implemented' });
});

router.post('/sync-contract', (req: Request, res: Response) => {
  // TODO: implement sync equipment contract from external platform
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Sync contract not yet implemented' });
});

router.post('/arrival', (req: Request, res: Response) => {
  // TODO: implement register equipment arrival
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Register arrival not yet implemented' });
});

router.put('/:id/accept', (req: Request, res: Response) => {
  // TODO: implement accept equipment
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Accept equipment not yet implemented' });
});

router.get('/:id', (req: Request, res: Response) => {
  // TODO: implement get equipment arrival by ID
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Get equipment arrival not yet implemented' });
});
