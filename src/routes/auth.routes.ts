import { Router } from 'express';
import { register, login, getMe, logout, refreshToken } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { loginLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', loginLimiter, login);
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);
router.post('/refresh-token', refreshToken);

export default router;
