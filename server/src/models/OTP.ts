import { Schema, model, Document } from "mongoose";

export interface IOTP extends Document {
  email: string;
  otp: string;
  purpose: 'login' | 'signup';
  createdAt: Date;
  expiresAt: Date;
  verified: boolean;
}

const OTPSchema = new Schema<IOTP>({
  email: { 
    type: String, 
    required: true, 
    lowercase: true,
    trim: true,
    index: true 
  },
  otp: { 
    type: String, 
    required: true 
  },
  purpose: { 
    type: String, 
    enum: ['login', 'signup'], 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    index: true
  },
  expiresAt: { 
    type: Date, 
    required: true,
    index: true
  },
  verified: { 
    type: Boolean, 
    default: false 
  }
});

// TTL index to automatically delete expired OTPs
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for quick lookups
OTPSchema.index({ email: 1, purpose: 1, verified: 1 });

export default model<IOTP>("OTP", OTPSchema);
