import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import User from '../models/Users';

/**
 * Request OTP for login
 * POST /api/auth/login/request-otp
 * Body: { email: string }
 */
export const requestLoginOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('\n📨 Request Login OTP');
    console.log(`   Email: ${req.body.email}`);

    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Email is required'
      });
      return;
    }

    const result = await authService.sendOTP(email, 'login');

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('❌ Error in requestLoginOTP:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

/**
 * Verify OTP and login
 * POST /api/auth/login/verify-otp
 * Body: { email: string, otp: string }
 */
export const verifyLoginOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('\n🔐 Verify Login OTP');
    console.log(`   Email: ${req.body.email}`);

    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({
        success: false,
        message: 'Email and OTP are required'
      });
      return;
    }

    // Verify OTP
    const verifyResult = await authService.verifyOTP(email, otp, 'login');

    if (!verifyResult.success) {
      res.status(400).json(verifyResult);
      return;
    }

    // Get user details
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found'
      });
      return;
    }

    // Generate JWT token
    const token = authService.generateToken(
      user._id.toString(),
      user.email,
      user.role
    );

    console.log(`✅ Login successful for ${email}`);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Error in verifyLoginOTP:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

/**
 * Request OTP for signup
 * POST /api/auth/signup/request-otp
 * Body: { email: string }
 */
export const requestSignupOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('\n📨 Request Signup OTP');
    console.log(`   Email: ${req.body.email}`);

    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        message: 'Email is required'
      });
      return;
    }

    const result = await authService.sendOTP(email, 'signup');

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('❌ Error in requestSignupOTP:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

/**
 * Verify OTP and complete signup
 * POST /api/auth/signup/verify-otp
 * Body: { email: string, otp: string, name: string, role?: 'tester' | 'admin' }
 */
export const verifySignupOTP = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('\n🔐 Verify Signup OTP');
    console.log(`   Email: ${req.body.email}`);

    const { email, otp, name, role } = req.body;

    if (!email || !otp || !name) {
      res.status(400).json({
        success: false,
        message: 'Email, OTP, and name are required'
      });
      return;
    }

    // Verify OTP
    const verifyResult = await authService.verifyOTP(email, otp, 'signup');

    if (!verifyResult.success) {
      res.status(400).json(verifyResult);
      return;
    }

    // Create new user
    const userRole = role === 'admin' ? 'admin' : 'tester'; // Default to tester
    const user = await authService.createUser(email, name, userRole);

    // Generate JWT token
    const token = authService.generateToken(
      user._id.toString(),
      user.email,
      user.role
    );

    console.log(`✅ Signup successful for ${email}`);

    res.status(201).json({
      success: true,
      message: 'Signup successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('❌ Error in verifySignupOTP:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};

/**
 * Get current user details
 * GET /api/auth/me
 * Requires authentication
 */
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  try {
    // User is already attached to req by auth middleware
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
      return;
    }

    res.status(200).json({
      success: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        createdAt: req.user.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Error in getCurrentUser:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred. Please try again.'
    });
  }
};
