import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthPayload {
  userId: string;
  role: string;
  department: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  // TODO: implement JWT authentication
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing or invalid token' });
    return;
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as AuthPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ code: 'TOKEN_EXPIRED', message: 'Token is invalid or expired' });
  }
}

export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // TODO: implement role-based authorization
    if (!req.user) {
      res.status(401).json({ code: 'UNAUTHORIZED', message: 'Not authenticated' });
      return;
    }
    
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ code: 'FORBIDDEN', message: 'Insufficient permissions' });
      return;
    }
    
    next();
  };
}
