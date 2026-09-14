import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string | number;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  console.error(`[SERVER-ERROR] ${req.method} ${req.originalUrl}:`, err);

  // Check for duplicate MySQL entry (e.g. unique email)
  if (err.code === 'ER_DUP_ENTRY' || (err.message && err.message.includes('Duplicate entry'))) {
    res.status(409).json({
      success: false,
      message: 'A record with this information already exists.',
    });
    return;
  }

  // Check for foreign key violation
  if (err.code === 'ER_NO_REFERENCED_ROW_2' || (err.message && err.message.includes('foreign key constraint fails'))) {
    res.status(400).json({
      success: false,
      message: 'Referenced user or entity does not exist.',
    });
    return;
  }

  // Custom status code if provided
  const statusCode = err.statusCode || 500;
  let clientMessage = err.message || 'An unexpected internal server error occurred.';

  // Mask raw SQL query disclosures in production/500 errors
  if (statusCode === 500 && (err.message.includes('SQL') || err.message.includes('mysql'))) {
    clientMessage = 'A database error occurred. Please try again later.';
  }

  res.status(statusCode).json({
    success: false,
    message: clientMessage,
  });
};
