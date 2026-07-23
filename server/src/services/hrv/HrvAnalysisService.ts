import { Types } from 'mongoose';
import Session from '../../models/Session';
import SessionAnalysis from '../../models/SessionAnalysis';
import HrvReading, { IHrvReading } from '../../models/HrvReading';
import { computeHrvComparison } from '../../parsers/hrv/computeHrvComparison';
import { IHrvTick } from '../../parsers/hrv/types';

function toTicks(readings: IHrvReading[]): IHrvTick[] {
  return readings.map((r) => ({
    unixSec: Math.floor(r.timestamp.getTime() / 1000),
    hrv: r.hrv ?? null,
    hr: r.hr ?? null,
  }));
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/**
 * HrvAnalysisService
 *
 * Computes the session-level HRV/HR comparison. The HRV comparison is the
 * ONLY thing written into pairwiseComparisons (metric:'hrv') — that's what
 * feeds the generic admin/user/benchmark/firmware aggregators automatically.
 * The HR channel stays confined to hrvStats.hr, which those aggregators never
 * read, so it only ever shows up on the session detail page.
 */
export class HrvAnalysisService {
  static async analyzeSession(sessionId: Types.ObjectId | string): Promise<void> {
    const session = await Session.findById(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const lunaReadings = await HrvReading.find({ 'meta.sessionId': session._id, 'meta.deviceType': 'luna' }).lean();
    const lunaTicks = toTicks(lunaReadings as unknown as IHrvReading[]);

    let benchmarkTicks: IHrvTick[] = [];
    if (session.benchmarkDeviceType) {
      const benchmarkReadings = await HrvReading.find({
        'meta.sessionId': session._id,
        'meta.deviceType': session.benchmarkDeviceType,
      }).lean();
      benchmarkTicks = toTicks(benchmarkReadings as unknown as IHrvReading[]);
    }

    const lunaAvg = (field: 'hrv' | 'hr') => {
      const vals = lunaTicks.map((t) => t[field]).filter((v): v is number => v != null);
      return vals.length ? round2(vals.reduce((s, v) => s + v, 0) / vals.length) : undefined;
    };

    const hrvComparison = benchmarkTicks.length ? computeHrvComparison(lunaTicks, benchmarkTicks, 'hrv') : null;
    const hrComparison = benchmarkTicks.length ? computeHrvComparison(lunaTicks, benchmarkTicks, 'hr') : null;

    // Displayed session window = the actual data window, resolved only now
    // (after analysis), NOT the nominal 21:00->09:00 submission window. When a
    // benchmark exists we show the overlapping window (the only region that's
    // actually comparable); a Falcon-only night falls back to Falcon's own
    // first/last reading. This is what the session card & detail header show.
    const lunaUnix = lunaTicks.map((t) => t.unixSec).sort((a, b) => a - b);
    let windowStartSec: number | undefined;
    let windowEndSec: number | undefined;
    if (hrvComparison) {
      windowStartSec = hrvComparison.overlapStartSec;
      windowEndSec = hrvComparison.overlapEndSec;
    } else if (lunaUnix.length) {
      windowStartSec = lunaUnix[0];
      windowEndSec = lunaUnix[lunaUnix.length - 1];
    }

    if (windowStartSec != null && windowEndSec != null && windowEndSec >= windowStartSec) {
      session.startTime = new Date(windowStartSec * 1000);
      session.endTime = new Date(windowEndSec * 1000);
      session.durationSec = windowEndSec - windowStartSec;
      await session.save();
    }

    const hrvStats = {
      benchmarkDeviceType: session.benchmarkDeviceType,
      hrv: hrvComparison
        ? { ...hrvComparison }
        : { lunaAvg: lunaAvg('hrv') },
      hr: hrComparison
        ? { ...hrComparison }
        : { lunaAvg: lunaAvg('hr') },
    };

    // Only the HRV channel rolls up into the generic aggregators — and only
    // when a benchmark comparison actually exists (a Falcon-only night with
    // no benchmark upload writes no pairwiseComparisons entry at all, so it
    // never pollutes admin/user bias averages with a phantom zero-bias).
    const pairwiseComparisons = hrvComparison
      ? [
          {
            d1: 'luna',
            d2: session.benchmarkDeviceType,
            metric: 'hrv',
            mae: hrvComparison.mae,
            rmse: hrvComparison.rmse,
            mape: hrvComparison.mape,
            pearsonR: hrvComparison.pearsonR,
            coverage: hrvComparison.coverage,
            meanBias: hrvComparison.meanBias,
            blandAltman: hrvComparison.blandAltman,
          },
        ]
      : [];

    await SessionAnalysis.findOneAndUpdate(
      { sessionId: session._id },
      {
        sessionId: session._id,
        userId: session.userId,
        activityType: session.activityType,
        metric: 'HRV',
        startTime: session.startTime,
        endTime: session.endTime,
        deviceStats: [],
        pairwiseComparisons,
        hrvStats,
        isValid: true,
        computedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    console.log(
      `[HrvAnalysisService] Session ${sessionId} analyzed — HRV meanBias=${hrvComparison?.meanBias ?? 'n/a'}, HR meanBias=${hrComparison?.meanBias ?? 'n/a'}`
    );
  }

  /**
   * Manual entry: only ever has a single scalar HRV value per device for the
   * whole night, so mae/rmse/mape/pearsonR/coverage/blandAltman can't be
   * computed — meanBias is the only comparison metric. Unlike Sleep's manual
   * entry (which never touches pairwiseComparisons), this DOES write a
   * bias-only pairwiseComparisons entry — otherwise a manual night's bias
   * would never reach the admin/firmware/benchmark aggregates at all.
   */
  static async analyzeManualSession(
    sessionId: Types.ObjectId | string,
    manualData: { lunaHrv: number; benchmarkHrv?: number; benchmarkDeviceType?: string }
  ): Promise<void> {
    const session = await Session.findById(sessionId);
    if (!session) throw new Error(`Session not found: ${sessionId}`);

    const { lunaHrv, benchmarkHrv, benchmarkDeviceType } = manualData;
    const hasBenchmark = benchmarkHrv != null && benchmarkDeviceType != null;
    const meanBias = hasBenchmark ? round2(lunaHrv - benchmarkHrv!) : undefined;

    const hrvStats = {
      benchmarkDeviceType,
      hrv: {
        lunaAvg: lunaHrv,
        benchmarkAvg: benchmarkHrv,
        meanBias,
      },
    };

    const pairwiseComparisons = hasBenchmark
      ? [{ d1: 'luna', d2: benchmarkDeviceType, metric: 'hrv', meanBias }]
      : [];

    await SessionAnalysis.findOneAndUpdate(
      { sessionId: session._id },
      {
        sessionId: session._id,
        userId: session.userId,
        activityType: session.activityType,
        metric: 'HRV',
        startTime: session.startTime,
        endTime: session.endTime,
        deviceStats: [],
        pairwiseComparisons,
        hrvStats,
        isValid: true,
        computedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    console.log(`[HrvAnalysisService] Manual session ${sessionId} analyzed — meanBias=${meanBias ?? 'n/a'}`);
  }
}
