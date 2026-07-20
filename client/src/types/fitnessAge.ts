export interface FitnessAgeMetric {
  value: number | null;
  target: number;
  delta_years?: number | null;
}

export interface FitnessAgeWindow {
  fitness_age: number | null;
  total_delta: number | null;
  pace_of_aging: number | null;
  metrics: {
    vo2_jackson: FitnessAgeMetric;
    vo2_ensemble: { value: number | null; target: number };
    resting_hr: FitnessAgeMetric;
    sleep_hours: FitnessAgeMetric;
    sleep_consistency: FitnessAgeMetric;
    daily_steps: FitnessAgeMetric;
    weekly_strength: FitnessAgeMetric;
  };
}

export interface FitnessAgeWindowError {
  error: string;
}

export type FitnessAgeWindowOutcome = FitnessAgeWindow | FitnessAgeWindowError;

export function isWindowError(w: FitnessAgeWindowOutcome | undefined | null): w is FitnessAgeWindowError {
  return !!w && 'error' in w;
}

export interface FitnessAgeDemographics {
  age: number;
  sex: string;
  weight: number;
  height: number;
  bmi: number;
}

export interface FitnessAgeProfile {
  _id: string;
  fitnessAppUserId: number;
  displayName: string;
  linkedUserId?: { _id: string; name: string; email: string } | string | null;
  status: 'success' | 'error';
  message?: string;
  demographics?: FitnessAgeDemographics;
  windows: {
    sixtyDay?: FitnessAgeWindowOutcome;
    sevenDay?: FitnessAgeWindowOutcome;
  };
  computedAt: string;
}

export interface MyFitnessAgeResponse {
  success: boolean;
  linked: boolean;
  computed?: boolean;
  message?: string;
  data?: FitnessAgeProfile;
}

export interface FitnessAgeAdminListItem {
  fitnessAppUserId: number;
  name: string;
  email: string | null;
  isLinked: boolean;
  status: 'success' | 'error';
  fitnessAge: number | null;
  chronoAge: number | null;
  computedAt: string;
}
