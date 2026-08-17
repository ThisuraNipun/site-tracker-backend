import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { sendError } from '../utils/response';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const token = req.cookies.token;

  if (!token) {
    sendError(res, 401, 'No token provided');
    return;
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    sendError(res, 401, 'Invalid or expired token');
  }
};
