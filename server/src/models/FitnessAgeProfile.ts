import { Schema, model, Document, Types } from 'mongoose';

export interface IFitnessAgeMetric {
  value: number | null;
  target: number;
  delta_years?: number | null;
}

export interface IFitnessAgeEnsembleMetric {
  value: number | null;
  target: number;
  delta_years: number | null;
  bracket: string;
  jack_weight: number;
  hrr_weight: number;
}

export interface IFitnessAgeWindow {
  fitness_age: number | null;
  total_delta: number | null;
  pace_of_aging: number | null;
  metrics: {
    vo2_jackson: { value: number | null; target: number };
    vo2_hrr: { value: number | null; target: number };
    vo2_legacy: { value: number | null; target: number };
    vo2_ensemble: IFitnessAgeEnsembleMetric;
    resting_hr: IFitnessAgeMetric;
    sleep_hours: IFitnessAgeMetric;
    sleep_consistency: IFitnessAgeMetric;
    daily_steps: IFitnessAgeMetric;
    weekly_strength: IFitnessAgeMetric;
  };
}

export interface IFitnessAgeWindowResult extends Partial<IFitnessAgeWindow> {
  error?: string;
}

export interface IFitnessAgeProfile extends Document {
  fitnessAppUserId: number;
  displayName: string;
  // Set only when this fitness-app user has also been matched to a platform
  // account (see Users.metadata.fitnessAppUserId). Null = "extra" user who
  // isn't onboarded on this platform at all.
  linkedUserId?: Types.ObjectId | null;
  status: 'success' | 'error';
  message?: string;
  demographics?: {
    age: number;
    sex: string;
    weight: number;
    height: number;
    bmi: number;
  };
  windows: {
    sixtyDay?: IFitnessAgeWindowResult;
    sevenDay?: IFitnessAgeWindowResult;
  };
  computedAt: Date;
}

const FitnessAgeMetricSchema = new Schema(
  {
    value: { type: Number, default: null },
    target: { type: Number },
    delta_years: { type: Number, default: null },
  },
  { _id: false }
);

const FitnessAgeWindowSchema = new Schema(
  {
    error: String,
    fitness_age: { type: Number, default: null },
    total_delta: { type: Number, default: null },
    pace_of_aging: { type: Number, default: null },
    metrics: {
      vo2_jackson: {
        value: { type: Number, default: null },
        target: Number,
      },
      vo2_hrr: {
        value: { type: Number, default: null },
        target: Number,
      },
      vo2_legacy: {
        value: { type: Number, default: null },
        target: Number,
      },
      vo2_ensemble: {
        value: { type: Number, default: null },
        target: Number,
        delta_years: { type: Number, default: null },
        bracket: { type: String, default: 'None' },
        jack_weight: { type: Number, default: 0 },
        hrr_weight: { type: Number, default: 0 },
      },
      resting_hr: FitnessAgeMetricSchema,
      sleep_hours: FitnessAgeMetricSchema,
      sleep_consistency: FitnessAgeMetricSchema,
      daily_steps: FitnessAgeMetricSchema,
      weekly_strength: FitnessAgeMetricSchema,
    },
  },
  { _id: false }
);

const FitnessAgeProfileSchema = new Schema<IFitnessAgeProfile>(
  {
    fitnessAppUserId: { type: Number, required: true, unique: true, index: true },
    displayName: { type: String, required: true },
    linkedUserId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    status: { type: String, enum: ['success', 'error'], required: true },
    message: String,
    demographics: {
      age: Number,
      sex: String,
      weight: Number,
      height: Number,
      bmi: Number,
    },
    windows: {
      sixtyDay: FitnessAgeWindowSchema,
      sevenDay: FitnessAgeWindowSchema,
    },
    computedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export default model<IFitnessAgeProfile>('FitnessAgeProfile', FitnessAgeProfileSchema);
