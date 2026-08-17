import { Response } from 'express';

export const sendSuccess = (res: Response, statusCode: number, data?: any, message?: string) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

export const sendError = (res: Response, statusCode: number, error: string) => {
  return res.status(statusCode).json({
    success: false,
    error
  });
};
