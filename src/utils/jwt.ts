import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export const generateToken = (payload: object, expiresIn: string | number = '1d'): string => {
  const options: SignOptions = { expiresIn: expiresIn as SignOptions['expiresIn'] };
  return jwt.sign(payload, JWT_SECRET, options);
};

export const verifyToken = (token: string): any => {
  return jwt.verify(token, JWT_SECRET);
};
