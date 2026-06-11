import { Router, Request, Response } from 'express';

export const router = Router();

router.get('/sub-project/:subId', (req: Request, res: Response) => {
  // TODO: implement get design confirmation by sub-project ID
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Get design confirmation not yet implemented' });
});

router.post('/entrust', (req: Request, res: Response) => {
  // TODO: implement create design entrustment
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Design entrustment not yet implemented' });
});

router.post('/upload-drawing', (req: Request, res: Response) => {
  // TODO: implement upload engineering drawings
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Upload drawing not yet implemented' });
});

router.post('/review', (req: Request, res: Response) => {
  // TODO: implement design review (pass/fail)
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Design review not yet implemented' });
});

router.post('/submit-budget', (req: Request, res: Response) => {
  // TODO: implement submit budget to HQ for approval
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Submit budget not yet implemented' });
});

router.post('/hq-approve', (req: Request, res: Response) => {
  // TODO: implement record HQ approval result
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'HQ approval not yet implemented' });
});
