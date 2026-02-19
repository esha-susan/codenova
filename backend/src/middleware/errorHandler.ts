import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err.statusCode ?? 500;
  const isProduction = process.env.NODE_ENV === 'production';

  console.error(`[ERROR] ${err.message}`, {
    statusCode,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(statusCode).json({
    error: err.name || 'InternalServerError',
    message: isProduction && statusCode === 500
      ? 'A deep corruption has disrupted the Grid. Our Architects are investigating.'
      : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
};

export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    error: 'NotFound',
    message: `The path "${req.path}" leads nowhere in Emberwood. Check your rune map.`,
  });
};