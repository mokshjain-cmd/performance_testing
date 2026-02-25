import { Router } from 'express';
import {
  requestLoginOTP,
  verifyLoginOTP,
  requestSignupOTP,
  verifySignupOTP,
  getCurrentUser
} from '../controllers/auth.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/auth/login/request-otp
 * @desc    Request OTP for login
 * @access  Public
 */
router.post('/login/request-otp', requestLoginOTP);

/**
 * @route   POST /api/auth/login/verify-otp
 * @desc    Verify OTP and login
 * @access  Public
 */
router.post('/login/verify-otp', verifyLoginOTP);

/**
 * @route   POST /api/auth/signup/request-otp
 * @desc    Request OTP for signup
 * @access  Public
 */
router.post('/signup/request-otp', requestSignupOTP);

/**
 * @route   POST /api/auth/signup/verify-otp
 * @desc    Verify OTP and complete signup
 * @access  Public
 */
router.post('/signup/verify-otp', verifySignupOTP);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user details
 * @access  Private (requires JWT)
 */
router.get('/me', authenticateJWT, getCurrentUser);

export default router;
