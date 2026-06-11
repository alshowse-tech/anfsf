import { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  console.error(`[Error] ${statusCode}: ${message}`, err.stack);
  
  res.status(statusCode).json({
    code: err.code || 'INTERNAL_ERROR',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

export class ApiError extends Error {
  statusCode: number;
  code: string;
  
  constructor(statusCode: number, message: string, code: string = 'API_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'ApiError';
  }
}
