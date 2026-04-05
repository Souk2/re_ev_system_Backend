import { Router } from 'express';
import { login, getProfile, changePassword } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { validateLogin, validateChangePassword, validate } from '../middleware/validation';
import { loginLimiter, loginLimiterStrict } from '../middleware/rateLimiter';

const router = Router();

// Public routes (with rate limiting for login)
router.post('/login', loginLimiter, validateLogin, validate, login);

// Protected routes
router.get('/profile', authenticate, getProfile);
router.put('/change-password', authenticate, validateChangePassword, validate, changePassword);

export default router;
