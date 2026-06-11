// [generated]
import { Request, Response, NextFunction } from 'express';

// TODO: implement authentication middleware
const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // TODO: check session validity and attach user to request
  next();
};

export default authMiddleware;
