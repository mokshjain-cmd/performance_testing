/**
 * Manual ETL: pulls the last ~70 days of wear data from the fitness
 * product's ebdb_stage MySQL warehouse (VPN-only, private network) for
 * each user_id listed in fitnessAgeTargets.ts, runs the Fitness Age
 * engine (fitnessAgeEngine.ts — a faithful port of
 * notes/unified_fitness_age_engine.py), and writes the result into this
 * platform's own MongoDB. The running server never talks to ebdb_stage —
 * only this script does, and only when you run it by hand while on VPN:
 *
 *   npm run etl:fitness-age
 *
 * Users can live in either of two source environments (stage / uat) —
 * different hosts, same username/password. Each target in
 * fitnessAgeTargets.ts picks its environment via `env: 'stage' | 'uat'`
 * (defaults to 'stage'). Fill in FITNESS_DB_HOST_STAGE / _UAT /
 * FITNESS_DB_USER / FITNESS_DB_PASSWORD in server/.env before running
 * (left blank intentionally) — only the host(s) your configured targets
 * actually use need to be filled in.
 *
 * Where the RESULTS get written (Mongo) is a separate, independent switch
 * from the general server ENV flag — see resolveMongoTarget() below.
 * Defaults to the dev/test database; writing to production requires
 * FITNESS_ETL_MONGO_TARGET=production AND typing the database name to
 * confirm, since this also mutates real Users documents (auto-linking).
 */
import dotenv from 'dotenv';
dotenv.config();

import mysql from 'mysql2/promise';
import mongoose from 'mongoose';
import readline from 'readline';
import User from '../models/Users';
import FitnessAgeProfile from '../models/FitnessAgeProfile';
import {
  FITNESS_AGE_TARGETS,
  FitnessAgeTarget,
  FitnessAgeSourceEnv,
  FitnessAgeDemographicsOverride,
} from './fitnessAgeTargets';
import {
  DayRecord,
  Demographics,
  generateAllWindows,
} from './fitnessAgeEngine';

function applyDemographicsOverride(
  demo: Demographics,
  override: FitnessAgeDemographicsOverride | undefined
): Demographics {
  if (!override) return demo;

  const merged: Demographics = { ...demo };
  if (override.heightCm != null) merged.height = override.heightCm / 100.0;
  if (override.weightKg != null) merged.weight = override.weightKg;
  if (override.dob != null) {
    merged.age = (Date.now() - new Date(override.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  } else if (override.age != null) {
    merged.age = override.age;
  }
  merged.bmi = merged.height > 0 ? merged.weight / (merged.height * merged.height) : 0;
  return merged;
}

const DEMOGRAPHICS_SCHEMA = 'stage_user_details';

// Schema/database name differs by source env (stage vs uat), unlike the
// host/user/password which are otherwise the same shape across both.
function dbNameFor(env: FitnessAgeSourceEnv): string {
  const envVarName = env === 'uat' ? 'FITNESS_DB_NAME_UAT' : 'FITNESS_DB_NAME_STAGE';
  const explicit = process.env[envVarName];
  if (explicit) return explicit;
  if (env === 'uat') return 'ebdb';
  return process.env.FITNESS_DB_NAME || 'ebdb_stage';
}

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    throw new Error(
      `${name} is not set. Fill in the FITNESS_DB_* variables in server/.env ` +
        `(and make sure you're connected to VPN) before running this ETL.`
    );
  }
  return val;
}

function hostEnvVarFor(env: FitnessAgeSourceEnv): string {
  return env === 'uat' ? 'FITNESS_DB_HOST_UAT' : 'FITNESS_DB_HOST_STAGE';
}

// ── Mongo target (independent of the server's general ENV flag) ──────────

type MongoTarget = 'dev' | 'production';

function getMongoUri(target: MongoTarget): string {
  if (target === 'production') {
    const uri = process.env.MONGODB_URI || process.env.MONGODB_URI_PROD;
    if (!uri) {
      throw new Error(
        'MONGODB_URI is not set — required to target production Mongo (FITNESS_ETL_MONGO_TARGET=production).'
      );
    }
    return uri;
  }
  return process.env.MONGODB_URI_DEV || 'mongodb://localhost:27017/performance_testing';
}

function dbNameFromUri(uri: string): string {
  try {
    const withoutQuery = uri.split('?')[0];
    const parts = withoutQuery.split('/');
    return parts[parts.length - 1] || '(unknown)';
  } catch {
    return '(unknown)';
  }
}

function askQuestion(prompt: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function confirmProductionWrite(dbName: string): Promise<boolean> {
  const answer = await askQuestion(
    `\n⚠️  This will write to PRODUCTION Mongo — database "${dbName}" — including auto-linking\n` +
      `   real Users documents. Type the database name ("${dbName}") to confirm, anything else aborts: `
  );
  return answer.trim() === dbName;
}

/**
 * Deliberately separate from the server's ENV flag: this script can mutate
 * real production Users documents (auto-linking), so hitting prod requires
 * an explicit, dedicated opt-in (FITNESS_ETL_MONGO_TARGET=production) plus
 * a typed confirmation — a stray/forgotten ENV=production in .env can never
 * accidentally point this script at prod. Any unrecognized value falls back
 * to 'dev', the safe default.
 */
async function resolveMongoTarget(): Promise<string> {
  const raw = (process.env.FITNESS_ETL_MONGO_TARGET || 'dev').trim().toLowerCase();
  const target: MongoTarget = raw === 'production' || raw === 'prod' ? 'production' : 'dev';
  const uri = getMongoUri(target);
  const dbName = dbNameFromUri(uri);

  console.log(`\n🗄️  Mongo target: ${target.toUpperCase()} (database "${dbName}")`);

  if (target === 'production') {
    const confirmed = await confirmProductionWrite(dbName);
    if (!confirmed) {
      console.log('\n🛑 Aborted — production write not confirmed.');
      process.exit(0);
    }
  }

  return uri;
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface SleepRow {
  date: string;
  asleep_min: number | null;
  resting_hr: number | null;
  start_time: string | null;
  end_time: string | null;
}

interface HrRow {
  date: string;
  hr_rhr: number | null;
}

interface ActivityRow {
  date: string;
  activity_type: string | null;
  duration: number | null;
  warm_up_minutes: number | null;
  fat_burn_minutes: number | null;
  aerobic_minutes: number | null;
  anaerobic_minutes: number | null;
  extreme_min: number | null;
  heart_rate_maximum: number | null;
}

interface StepRow {
  date: string;
  steps: number | null;
}

const STRENGTH_TYPES = new Set([
  'functional strength training', 'strength_training', 'yoga', 'weightlifting', 'crossfit', 'pilates',
  'core_training', 'powerlifting', 'barbell_training', 'dumbbells', 'squats', 'deadlifts',
  'waist_and_abdomen_training', 'upper_limb_training', 'lower_limb_training', 'back_training',
  'abs', 'dumbbell_training', 'weight_training', 'cross_training', 'cross-training',
  'cross-training_crossfit', 'functional_training', 'free_workout', 'free workout', 'workout',
  'fitness', 'calisthenics', 'pull_ups', 'push_ups', 'sit_ups', 'plank', 'bench press', 'lunges',
]);

class FitnessAgeDbClient {
  constructor(private pool: mysql.Pool, private dbName: string) {}

  async fetchDemographics(userId: number): Promise<Demographics> {
    const demo: Demographics = {
      age: 30.0,
      sex: 'male',
      weight: 70.0,
      height: 1.7,
      genderMale: 1,
      bmi: 24.2,
    };

    const [rows] = await this.pool.query<any[]>(
      `SELECT * FROM ${DEMOGRAPHICS_SCHEMA}.user_infos WHERE user_id = ?`,
      [userId]
    );
    const row = (rows as any[])[0];
    if (row) {
      if (row.dob) {
        const dob = new Date(row.dob);
        demo.age = (Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
      }
      if (row.gender) {
        demo.sex = ['woman', 'female'].includes(String(row.gender).toLowerCase()) ? 'female' : 'male';
      }
      if (row.weight && row.weight > 30) {
        demo.weight = parseFloat(row.weight);
      }
      const rawHeight = row.height ? parseFloat(row.height) : null;
      if (rawHeight) {
        if (rawHeight > 100 && rawHeight < 250) demo.height = rawHeight / 100.0;
        else if (rawHeight > 1.0 && rawHeight < 2.5) demo.height = rawHeight;
      }
    }
    demo.genderMale = demo.sex === 'male' ? 1 : 0;
    demo.bmi = demo.height > 0 ? demo.weight / (demo.height * demo.height) : 0;
    return demo;
  }

  async extractCleanDays(userId: number, startDate: string, endDate: string): Promise<DayRecord[]> {
    const range = [userId, startDate, endDate];

    const [sleepV1] = await this.pool.query<any[]>(
      `SELECT date, total_duration as asleep_min, hr_min as resting_hr, start_time, end_time
       FROM ${this.dbName}.sleep_activities WHERE user_id = ? AND date BETWEEN ? AND ?`,
      range
    );
    const [sleepV2] = await this.pool.query<any[]>(
      `SELECT date, total_duration as asleep_min, resting_hr, start_time, end_time
       FROM ${this.dbName}.sleep_activities_v2 WHERE user_id = ? AND date BETWEEN ? AND ?`,
      range
    );

    // Anti-duplication: collapse identical v1 and v2 records (same date +
    // start_time) while preserving naps (distinct start_times survive).
    // v1 is concatenated first and wins ties, matching the Python
    // drop_duplicates(subset=['date','start_time'], keep='first').
    const segmentsByDate = new Map<string, Map<string, SleepRow>>();
    for (const r of [...(sleepV1 as any[]), ...(sleepV2 as any[])]) {
      const d = toDateString(new Date(r.date));
      const restingHr = r.resting_hr && r.resting_hr !== 0 ? parseFloat(r.resting_hr) : null;
      const seg: SleepRow = {
        date: d,
        asleep_min: r.asleep_min != null ? parseFloat(r.asleep_min) : null,
        resting_hr: restingHr,
        start_time: r.start_time ?? null,
        end_time: r.end_time ?? null,
      };
      if (!segmentsByDate.has(d)) segmentsByDate.set(d, new Map());
      const dayMap = segmentsByDate.get(d)!;
      const dupKey = String(seg.start_time); // null start_times collapse to one
      if (!dayMap.has(dupKey)) dayMap.set(dupKey, seg);
    }

    const [hrV1] = await this.pool.query<any[]>(
      `SELECT date, resting_hr as hr_rhr FROM ${this.dbName}.heart_rates WHERE user_id = ? AND date BETWEEN ? AND ?`,
      range
    );
    const [hrV2] = await this.pool.query<any[]>(
      `SELECT date, resting_hr as hr_rhr FROM ${this.dbName}.heart_rates_v2 WHERE user_id = ? AND date BETWEEN ? AND ?`,
      range
    );
    const hrSumByDate = new Map<string, { sum: number; count: number }>();
    for (const r of [...(hrV1 as any[]), ...(hrV2 as any[])]) {
      if (r.hr_rhr == null) continue;
      const d = toDateString(new Date(r.date));
      const entry = hrSumByDate.get(d) || { sum: 0, count: 0 };
      entry.sum += parseFloat(r.hr_rhr);
      entry.count += 1;
      hrSumByDate.set(d, entry);
    }
    const hrByDate = new Map<string, number>();
    for (const [d, { sum, count }] of hrSumByDate) {
      const avg = sum / count;
      if (avg !== 0) hrByDate.set(d, avg);
    }

    // Fill each segment's missing resting_hr from the day's heart_rates
    // average (left-merge semantics), then aggregate all of a day's sleep
    // segments: total sleep is summed (naps included) and capped at 16h,
    // resting_hr is averaged, start_time is the first and end_time the last.
    interface DaySleep {
      Sleep_Hours: number | null;
      Resting_HR: number | null;
      start_time: string | null;
      end_time: string | null;
    }
    const sleepByDate = new Map<string, DaySleep>();
    for (const [d, dayMap] of segmentsByDate) {
      const segs = [...dayMap.values()];
      let asleepSum = 0;
      let hasAsleep = false;
      const rhrVals: number[] = [];
      for (const seg of segs) {
        if (seg.resting_hr == null && hrByDate.has(d)) {
          seg.resting_hr = hrByDate.get(d)!;
        }
        if (seg.asleep_min != null) {
          asleepSum += seg.asleep_min;
          hasAsleep = true;
        }
        if (seg.resting_hr != null) rhrVals.push(seg.resting_hr);
      }
      const sleepHours = hasAsleep ? Math.min(asleepSum / 60.0, 16.0) : null;
      const restingHr =
        rhrVals.length > 0 ? rhrVals.reduce((a, b) => a + b, 0) / rhrVals.length : null;
      sleepByDate.set(d, {
        Sleep_Hours: sleepHours,
        Resting_HR: restingHr,
        start_time: segs[0]?.start_time ?? null,
        end_time: segs[segs.length - 1]?.end_time ?? null,
      });
    }

    const [actRows] = await this.pool.query<any[]>(
      `SELECT date, activity_type, duration, warm_up_minutes, fat_burn_minutes, aerobic_minutes, anaerobic_minutes, extreme_min, heart_rate_maximum
       FROM ${this.dbName}.activities WHERE user_id = ? AND date BETWEEN ? AND ?`,
      range
    );
    const actsByDate = new Map<
      string,
      {
        Strength_Hours: number | null;
        Z13_Cardio_Hours: number | null;
        Z45_Cardio_Hours: number | null;
        Max_HR: number | null;
      }
    >();
    const actGroups = new Map<string, ActivityRow[]>();
    for (const r of actRows as any[]) {
      const d = toDateString(new Date(r.date));
      if (!actGroups.has(d)) actGroups.set(d, []);
      actGroups.get(d)!.push(r);
    }
    for (const [d, rows] of actGroups) {
      let strH = 0.0;
      let z13H = 0.0;
      let z45H = 0.0;
      let hasCardio = false;
      let hasStr = false;
      let dailyMaxHr = 0;
      for (const a of rows) {
        const actType = String(a.activity_type ?? '').toLowerCase().trim();
        const duration = a.duration != null ? Number(a.duration) : 0;
        const warmUp = a.warm_up_minutes != null ? Number(a.warm_up_minutes) : 0;
        const fatBurn = a.fat_burn_minutes != null ? Number(a.fat_burn_minutes) : 0;
        const aerobic = a.aerobic_minutes != null ? Number(a.aerobic_minutes) : 0;
        const anaerobic = a.anaerobic_minutes != null ? Number(a.anaerobic_minutes) : 0;
        const extreme = a.extreme_min != null ? Number(a.extreme_min) : 0;
        const maxHr = a.heart_rate_maximum != null ? Number(a.heart_rate_maximum) : 0;
        if (maxHr > dailyMaxHr) dailyMaxHr = maxHr;

        if (STRENGTH_TYPES.has(actType) || actType.includes('strength') || actType.includes('training')) {
          strH += duration / 3600.0;
          hasStr = true;
        }

        let z13Sec = warmUp + fatBurn + aerobic;
        const z45Sec = anaerobic + extreme;

        // Cardio is agnostic of label: any logged zone minutes count as
        // cardio volume, plus a keyword fallback for manual logs.
        if (
          z13Sec > 0 ||
          z45Sec > 0 ||
          actType.includes('run') ||
          actType.includes('walk') ||
          actType.includes('cycle') ||
          actType.includes('swim')
        ) {
          hasCardio = true;
        } else if (!hasStr && duration > 0 && z13Sec === 0 && z45Sec === 0) {
          // Not a strength workout, has duration but no HR zones logged:
          // credit the duration to moderate Z1-3 cardio so activity isn't lost.
          hasCardio = true;
          z13Sec = duration;
        }
        z13H += z13Sec / 3600.0;
        z45H += z45Sec / 3600.0;
      }
      actsByDate.set(d, {
        Strength_Hours: hasStr ? strH : null,
        Z13_Cardio_Hours: hasCardio ? z13H : null,
        Z45_Cardio_Hours: hasCardio ? z45H : null,
        Max_HR: dailyMaxHr > 0 ? dailyMaxHr : null,
      });
    }

    let stepRows: any[];
    try {
      [stepRows] = await this.pool.query<any[]>(
        `SELECT date, steps FROM step_activities.step_activities_v4 WHERE user_id = ? AND date BETWEEN ? AND ?`,
        range
      );
    } catch {
      [stepRows] = await this.pool.query<any[]>(
        `SELECT date, steps FROM step_activity.step_activities_v4 WHERE user_id = ? AND date BETWEEN ? AND ?`,
        range
      );
    }
    const stepsByDate = new Map<string, number>();
    for (const r of stepRows as any[]) {
      const d = toDateString(new Date(r.date));
      stepsByDate.set(d, (stepsByDate.get(d) || 0) + (r.steps != null ? parseFloat(r.steps) : 0));
    }

    // Full calendar range, then left-merge everything in (mirrors the
    // pd.date_range + merge chain in extract_data()).
    const allDays: DayRecord[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let t = start.getTime(); t <= end.getTime(); t += 24 * 60 * 60 * 1000) {
      const d = toDateString(new Date(t));
      const sleep = sleepByDate.get(d);
      const acts = actsByDate.get(d);
      const steps = stepsByDate.has(d) ? stepsByDate.get(d)! : null;

      allDays.push({
        date: d,
        Sleep_Hours: sleep?.Sleep_Hours ?? null,
        Resting_HR: sleep?.Resting_HR ?? null,
        start_time: sleep?.start_time ?? null,
        end_time: sleep?.end_time ?? null,
        Strength_Hours: acts?.Strength_Hours ?? null,
        Z13_Cardio_Hours: acts?.Z13_Cardio_Hours ?? null,
        Z45_Cardio_Hours: acts?.Z45_Cardio_Hours ?? null,
        Max_HR: acts?.Max_HR ?? null,
        Steps: steps,
      });
    }

    return allDays.filter(
      (d) =>
        d.Sleep_Hours != null ||
        d.Resting_HR != null ||
        d.Steps != null ||
        d.Strength_Hours != null ||
        d.Z13_Cardio_Hours != null ||
        d.Z45_Cardio_Hours != null
    );
  }
}

async function runForTarget(client: FitnessAgeDbClient, target: FitnessAgeTarget) {
  const env: FitnessAgeSourceEnv = target.env || 'stage';
  const endDate = new Date();
  endDate.setDate(endDate.getDate() - 1); // today's data is still partial, so cut off at the previous day
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - 70); // 10-day buffer over the 60-day window

  const demo = applyDemographicsOverride(
    await client.fetchDemographics(target.fitnessAppUserId),
    target.demographicsOverride
  );
  const cleanDays = await client.extractCleanDays(
    target.fitnessAppUserId,
    toDateString(startDate),
    toDateString(endDate)
  );
  const result = generateAllWindows(cleanDays, demo, endDate);

  let linkedUserId: mongoose.Types.ObjectId | null = null;
  if (target.email) {
    const user = await User.findOne({ email: target.email.toLowerCase().trim() });
    if (user) {
      linkedUserId = user._id as mongoose.Types.ObjectId;
      if (user.metadata?.fitnessAppUserId !== target.fitnessAppUserId) {
        user.metadata = { ...user.metadata, fitnessAppUserId: target.fitnessAppUserId };
        await user.save();
      }
    }
  }

  await FitnessAgeProfile.findOneAndUpdate(
    { fitnessAppUserId: target.fitnessAppUserId },
    {
      fitnessAppUserId: target.fitnessAppUserId,
      displayName: target.displayName,
      linkedUserId,
      status: result.status,
      message: result.message,
      demographics: result.demographics
        ? {
            age: result.demographics.age,
            sex: result.demographics.sex,
            weight: result.demographics.weight,
            height: result.demographics.height,
            bmi: result.demographics.bmi,
          }
        : undefined,
      windows: {
        sixtyDay: result.windows.sixtyDay,
        sevenDay: result.windows.sevenDay,
      },
      computedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  console.log(
    `  ✅ ${target.displayName} (user_id ${target.fitnessAppUserId}, ${env}) — ` +
      `60d: ${'error' in result.windows.sixtyDay ? result.windows.sixtyDay.error : result.windows.sixtyDay.fitness_age?.toFixed(1) + 'y'}` +
      (target.email ? (linkedUserId ? ` — 🔗 linked to ${target.email}` : ` — ⚠️ not linked (no account found)`) : '')
  );
}

async function main() {
  if (FITNESS_AGE_TARGETS.length === 0) {
    console.log(
      'No targets configured. Add entries to server/src/scripts/fitnessAgeTargets.ts and re-run.'
    );
    return;
  }

  // Resolve (and, if production, confirm) the Mongo target before opening
  // any MySQL connections — no point connecting to ebdb_stage just to abort.
  const mongoUri = await resolveMongoTarget();

  // Same username/password across environments — only the host differs.
  const dbUser = requireEnv('FITNESS_DB_USER');
  const dbPassword = requireEnv('FITNESS_DB_PASSWORD');
  const port = Number(process.env.FITNESS_DB_PORT) || 3306;

  // Only connect to the environment(s) actually referenced by configured
  // targets — no need to fill in both hosts if you only use one.
  const neededEnvs = Array.from(
    new Set(FITNESS_AGE_TARGETS.map((t) => t.env || 'stage'))
  ) as FitnessAgeSourceEnv[];

  const pools = new Map<FitnessAgeSourceEnv, mysql.Pool>();
  const clients = new Map<FitnessAgeSourceEnv, FitnessAgeDbClient>();

  for (const env of neededEnvs) {
    const host = requireEnv(hostEnvVarFor(env));
    console.log(`🔌 Connecting to ${env} (${host}:${port}, db "${dbNameFor(env)}") (requires VPN)...`);
    const pool = mysql.createPool({
      host,
      user: dbUser,
      password: dbPassword,
      port,
      connectTimeout: 8000,
      dateStrings: true,
      connectionLimit: 4,
    });
    pools.set(env, pool);
    clients.set(env, new FitnessAgeDbClient(pool, dbNameFor(env)));
  }

  await mongoose.connect(mongoUri);
  console.log('✅ MongoDB connected successfully');

  console.log(`\n🧮 Computing Fitness Age for ${FITNESS_AGE_TARGETS.length} user(s)...\n`);
  for (const target of FITNESS_AGE_TARGETS) {
    const env = target.env || 'stage';
    try {
      await runForTarget(clients.get(env)!, target);
    } catch (err) {
      console.error(`  ❌ Failed for ${target.displayName} (user_id ${target.fitnessAppUserId}, ${env}):`, err);
    }
  }

  for (const pool of pools.values()) {
    await pool.end();
  }
  await mongoose.disconnect();
  console.log('MongoDB disconnected');
  console.log('\n🏁 Done.');
}

main().catch((err) => {
  console.error('\n❌ ETL run failed:', err.message || err);
  process.exit(1);
});
