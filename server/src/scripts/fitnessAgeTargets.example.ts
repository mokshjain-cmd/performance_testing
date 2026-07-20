/**
 * Template — copy this file to `fitnessAgeTargets.ts` (gitignored, since
 * that file ends up holding real user_ids/names/emails — PII that
 * shouldn't be committed) and edit the copy before running
 * `npm run etl:fitness-age`.
 *
 * - fitnessAppUserId: the real user_id from ebdb_stage.user_infos.
 * - displayName: shown in the UI. Required for "extra" users who aren't
 *   onboarded on this platform yet (no matching email below).
 * - email (optional): if it matches an existing platform user's email,
 *   that account gets linked automatically — the tester will then see
 *   their own Fitness Age tab. Leave it out for extra/preview users.
 * - env (optional): which source database this user lives in — 'stage' or
 *   'uat'. Same username/password across both, only the host differs
 *   (FITNESS_DB_HOST_STAGE / FITNESS_DB_HOST_UAT in .env). Defaults to
 *   'stage' if omitted.
 */
export type FitnessAgeSourceEnv = 'stage' | 'uat';

export interface FitnessAgeTarget {
  fitnessAppUserId: number;
  displayName: string;
  email?: string;
  env?: FitnessAgeSourceEnv;
}

export const FITNESS_AGE_TARGETS: FitnessAgeTarget[] = [
  // { fitnessAppUserId: 254885, displayName: 'Jane Doe', email: 'jane@nexxbase.com', env: 'stage' },
  // { fitnessAppUserId: 118220, displayName: 'Preview User', env: 'uat' },
];
