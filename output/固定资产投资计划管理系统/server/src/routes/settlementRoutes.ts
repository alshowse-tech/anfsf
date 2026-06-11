import { Router, Request, Response } from 'express';

export const router = Router();

router.get('/sub-project/:subId', (req: Request, res: Response) => {
  // TODO: implement get settlement by sub-project
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Get settlement not yet implemented' });
});

router.post('/start', (req: Request, res: Response) => {
  // TODO: implement start settlement process
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Start settlement not yet implemented' });
});

router.post('/submit', (req: Request, res: Response) => {
  // TODO: implement submit settlement for review
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Submit settlement not yet implemented' });
});

router.put('/:id/review', (req: Request, res: Response) => {
  // TODO: implement multi-level review
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Review settlement not yet implemented' });
});

router.put('/:id/internal-audit', (req: Request, res: Response) => {
  // TODO: implement internal audit (≤50万)
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Internal audit not yet implemented' });
});

router.post('/hq-audit-result', (req: Request, res: Response) => {
  // TODO: implement receive HQ audit result (>50万)
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'HQ audit result not yet implemented' });
});

router.post('/dispute', (req: Request, res: Response) => {
  // TODO: implement dispute initiation
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Initiate dispute not yet implemented' });
});

router.put('/dispute/:id/resolve', (req: Request, res: Response) => {
  // TODO: implement dispute resolution
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Resolve dispute not yet implemented' });
});

router.put('/:id/finalize', (req: Request, res: Response) => {
  // TODO: implement settlement finalization
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Finalize settlement not yet implemented' });
});

router.post('/project-cancel', (req: Request, res: Response) => {
  // TODO: implement project cancellation (all sub-projects must be completed)
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Cancel project not yet implemented' });
});

router.post('/year-rollover', (req: Request, res: Response) => {
  // TODO: implement year-end rollover
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Year rollover not yet implemented' });
});
