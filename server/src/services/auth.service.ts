import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import OTP from '../models/OTP';
import User from '../models/Users';
import { mailService } from './mail.service';

const JWT_SECRET = process.env.JWT_SECRET || "";
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];
const OTP_EXPIRY_MINUTES = 10;

interface TokenPayload {
  userId: string;
  email: string;
  role: 'tester' | 'admin';
}

class AuthService {
  /**
   * Generate a 6-digit OTP
   */
  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Validate email domain (only @nexxbase.com allowed)
   */
  isValidNexxbaseEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@nexxbase\.com$/i;
    return emailRegex.test(email);
  }

  /**
   * Send OTP to email
   */
  async sendOTP(email: string, purpose: 'login' | 'signup'): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`📧 Sending OTP for ${purpose} to ${email}...`);

      // Validate email domain
      if (!this.isValidNexxbaseEmail(email)) {
        console.log(`❌ Invalid email domain: ${email}`);
        return {
          success: false,
          message: 'Only @nexxbase.com email addresses are allowed'
        };
      }

      // For signup, check if user already exists
      if (purpose === 'signup') {
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
          console.log(`❌ User already exists: ${email}`);
          return {
            success: false,
            message: 'User already exists. Please login instead.'
          };
        }
      }

      // For login, check if user exists
      if (purpose === 'login') {
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
          console.log(`❌ User not found: ${email}`);
          return {
            success: false,
            message: 'User not found. Please sign up first.'
          };
        }
      }

      // Delete any existing unverified OTPs for this email and purpose
      await OTP.deleteMany({ email: email.toLowerCase(), purpose, verified: false });

      // Generate new OTP
      const otpCode = this.generateOTP();
      console.log(`🔢 Generated OTP: ${otpCode}`);

      // Hash OTP before storing
      const hashedOTP = await bcrypt.hash(otpCode, 10);

      // Calculate expiry time
      const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

      // Save OTP to database
      await OTP.create({
        email: email.toLowerCase(),
        otp: hashedOTP,
        purpose,
        expiresAt
      });

      // Send OTP via email
      const emailSubject = purpose === 'login' 
        ? 'Your Login OTP - Performance Testing Platform'
        : 'Welcome! Your Signup OTP - Performance Testing Platform';

      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">${purpose === 'login' ? 'Login' : 'Sign Up'} Verification</h2>
          <p>Hi there,</p>
          <p>Your OTP for ${purpose === 'login' ? 'logging in' : 'signing up'} to the Performance Testing Platform is:</p>
          
          <div style="background-color: #f3f4f6; border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0; text-align: center;">
            <h1 style="margin: 0; color: #1f2937; font-size: 32px; letter-spacing: 8px;">${otpCode}</h1>
          </div>
          
          <p><strong>This OTP will expire in ${OTP_EXPIRY_MINUTES} minutes.</strong></p>
          <p>If you didn't request this OTP, please ignore this email.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #6b7280;">
            This is an automated email from the Performance Testing Platform.<br>
            Please do not reply to this email.
          </p>
        </div>
      `;

      const emailText = `
Hi there,

Your OTP for ${purpose === 'login' ? 'logging in' : 'signing up'} to the Performance Testing Platform is: ${otpCode}

This OTP will expire in ${OTP_EXPIRY_MINUTES} minutes.

If you didn't request this OTP, please ignore this email.

---
This is an automated email from the Performance Testing Platform.
Please do not reply to this email.
      `;

      const emailSent = await mailService.sendMail({
        from: `"${process.env.MAIL_FROM_NAME}" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: emailSubject,
        text: emailText,
        html: emailHtml,
        replyTo: process.env.MAIL_REPLY_TO || 'noreply@perftesting.com'
      });

      if (!emailSent) {
        console.log(`❌ Failed to send OTP email to ${email}`);
        return {
          success: false,
          message: 'Failed to send OTP email. Please try again.'
        };
      }

      console.log(`✅ OTP sent successfully to ${email}`);
      return {
        success: true,
        message: `OTP sent successfully to ${email}. Please check your email.`
      };

    } catch (error) {
      console.error('❌ Error sending OTP:', error);
      return {
        success: false,
        message: 'An error occurred while sending OTP. Please try again.'
      };
    }
  }

  /**
   * Verify OTP
   */
  async verifyOTP(email: string, otp: string, purpose: 'login' | 'signup'): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🔍 Verifying OTP for ${purpose}: ${email}`);

      // Find the most recent unverified OTP for this email and purpose
      const otpRecord = await OTP.findOne({
        email: email.toLowerCase(),
        purpose,
        verified: false,
        expiresAt: { $gt: new Date() }
      }).sort({ createdAt: -1 });

      if (!otpRecord) {
        console.log(`❌ No valid OTP found for ${email}`);
        return {
          success: false,
          message: 'Invalid or expired OTP. Please request a new one.'
        };
      }

      // Verify OTP
      const isValid = await bcrypt.compare(otp, otpRecord.otp);

      if (!isValid) {
        console.log(`❌ Invalid OTP provided for ${email}`);
        return {
          success: false,
          message: 'Invalid OTP. Please try again.'
        };
      }

      // Mark OTP as verified
      otpRecord.verified = true;
      await otpRecord.save();

      console.log(`✅ OTP verified successfully for ${email}`);
      return {
        success: true,
        message: 'OTP verified successfully'
      };

    } catch (error) {
      console.error('❌ Error verifying OTP:', error);
      return {
        success: false,
        message: 'An error occurred while verifying OTP. Please try again.'
      };
    }
  }

  /**
   * Generate JWT token
   */
  generateToken(userId: string, email: string, role: 'tester' | 'admin'): string {
    const payload: TokenPayload = {
      userId,
      email,
      role
    };

    const options = { expiresIn: JWT_EXPIRES_IN };
    return jwt.sign(payload, JWT_SECRET, options);
  }

  /**
   * Verify JWT token
   */
  verifyToken(token: string): TokenPayload | null {
    try {
        //console.log('JWT Secret is set:', JWT_SECRET);
      const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;

      console.log(`✅ Token verified for user: ${decoded.email}`);
      return decoded;
    } catch (error) {
      console.error('❌ Token verification failed:', error);
      return null;
    }
  }

  /**
   * Create new user (for signup)
   */
  async createUser(email: string, name: string, role: 'tester' | 'admin' = 'tester') {
    try {
      console.log(`👤 Creating new user: ${email}`);

      const user = await User.create({
        email: email.toLowerCase(),
        name,
        role
      });

      console.log(`✅ User created successfully: ${email}`);
      return user;
    } catch (error) {
      console.error('❌ Error creating user:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();
