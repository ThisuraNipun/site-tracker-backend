import { Router } from 'express';
import { register, login, getMe, logout, refreshToken, forgotPassword, resetPassword, changePassword } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { loginLimiter } from '../middlewares/rateLimiter.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', loginLimiter, login);
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);
router.post('/refresh-token', refreshToken);

// Password Management
router.post('/forgot-password', loginLimiter, forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/change-password', authenticate, changePassword);

export default router;
