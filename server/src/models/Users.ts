import { Schema, model, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  createdAt: Date;
  metadata?: {
    age?: number;
    gender?: string;
    weight?: number;
    height?: number;
  };
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    metadata: {
      age: Number,
      gender: String,
      weight: Number,
      height: Number,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default model<IUser>("User", UserSchema);
