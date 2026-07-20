import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  role: 'tester' | 'admin';
  createdAt: Date;
  metadata?: {
    age?: number;
    gender?: string;
    weight?: number;
    height?: number;
    fitnessAppUserId?: number;
  };
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    role: {
      type: String,
      enum: ['tester', 'admin'],
      default: 'tester',
      required: true
    },
    metadata: {
      age: Number,
      gender: String,
      weight: Number,
      height: Number,
      // Links this platform account to their real user_id in the fitness
      // product's ebdb_stage warehouse, set by an admin running the
      // Fitness Age ETL script. Unset = "not linked yet".
      fitnessAppUserId: { type: Number, index: true },
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default model<IUser>("User", UserSchema);
