import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';

export const generateAccessToken = (payload: object, expiresIn: string | number = '15m'): string => {
  const options: SignOptions = { expiresIn: expiresIn as SignOptions['expiresIn'] };
  return jwt.sign(payload, JWT_SECRET, options);
};

export const generateRefreshToken = (payload: object, expiresIn: string | number = '7d'): string => {
  const options: SignOptions = { expiresIn: expiresIn as SignOptions['expiresIn'] };
  return jwt.sign(payload, JWT_REFRESH_SECRET, options);
};

export const verifyAccessToken = (token: string): any => {
  return jwt.verify(token, JWT_SECRET);
};

export const verifyRefreshToken = (token: string): any => {
  return jwt.verify(token, JWT_REFRESH_SECRET);
};
