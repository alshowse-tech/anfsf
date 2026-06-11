import { Router, Request, Response } from 'express';

export const router = Router();

// Contractor payment application (auxiliary)
router.post('/applications', (req: Request, res: Response) => {
  // TODO: implement contractor payment application
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Create payment application not yet implemented' });
});

router.get('/applications/sub-project/:subId', (req: Request, res: Response) => {
  // TODO: implement get payment applications by sub-project
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Get payment applications not yet implemented' });
});

// Department monthly plan submission
router.post('/plans/department', (req: Request, res: Response) => {
  // TODO: implement department monthly payment plan submission
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Submit department plan not yet implemented' });
});

router.get('/plans/pending', (req: Request, res: Response) => {
  // TODO: implement get pending plans for planning dept
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Get pending plans not yet implemented' });
});

// Planning department selection
router.put('/plans/:planId/select', (req: Request, res: Response) => {
  // TODO: implement planning department selection of items
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Select plan items not yet implemented' });
});

// Approval
router.put('/plans/:planId/submit-approval', (req: Request, res: Response) => {
  // TODO: implement submit plan for approval
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Submit for approval not yet implemented' });
});

router.put('/plans/:planId/approve', (req: Request, res: Response) => {
  // TODO: implement approve payment plan
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Approve plan not yet implemented' });
});

// Finance confirmation
router.put('/invoices/:recordId/confirm', (req: Request, res: Response) => {
  // TODO: implement finance invoice confirmation
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Confirm invoice not yet implemented' });
});

router.put('/invoices/:recordId/mark-paid', (req: Request, res: Response) => {
  // TODO: implement mark payment as completed
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Mark paid not yet implemented' });
});

// Reports
router.get('/comparison', (req: Request, res: Response) => {
  // TODO: implement payment plan vs actual comparison
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Payment comparison not yet implemented' });
});
