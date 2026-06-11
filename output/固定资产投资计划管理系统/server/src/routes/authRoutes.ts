import { Router, Request, Response } from 'express';

export const router = Router();

router.post('/login', (req: Request, res: Response) => {
  // TODO: implement user login
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Login not yet implemented' });
});

router.post('/logout', (req: Request, res: Response) => {
  // TODO: implement user logout
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Logout not yet implemented' });
});

router.get('/me', (req: Request, res: Response) => {
  // TODO: implement get current user info
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Get user info not yet implemented' });
});

router.put('/password', (req: Request, res: Response) => {
  // TODO: implement change password
  res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Change password not yet implemented' });
});
