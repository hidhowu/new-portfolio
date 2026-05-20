import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }
  logger.error({ err, url: req.url }, 'Unhandled error');

  // Prisma unknown-argument errors usually mean a migration hasn't been applied yet.
  const msg: string = err?.message || '';
  if (err?.name === 'PrismaClientValidationError' || /Unknown arg|Unknown field/i.test(msg)) {
    return res.status(500).json({
      error: 'Database schema mismatch — your Prisma client is out of date. Run "npx prisma migrate deploy" (or "npx prisma migrate dev") inside the cms folder, then restart the server.',
      detail: process.env.NODE_ENV === 'production' ? undefined : msg,
    });
  }

  if (process.env.NODE_ENV !== 'production') {
    return res.status(500).json({ error: 'Internal server error', detail: msg });
  }
  res.status(500).json({ error: 'Internal server error' });
}
