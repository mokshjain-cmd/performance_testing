import { Types } from 'mongoose';
import Session from '../../models/Session';
import SessionAnalysis from '../../models/SessionAnalysis';

const round2 = (v: number) => Math.round(v * 100) / 100;
const dateKey = (d: Date) => d.toISOString().slice(0, 10);

export class UserHrvSummaryService {
  static async getUserHrvOverview(userId: Types.ObjectId | string) {
    const sessions = await Session.find({ userId, metric: 'HRV', isValid: true }).lean();
    const sessionIds = sessions.map((s) => s._id);
    const analyses = await SessionAnalysis.find({ sessionId: { $in: sessionIds } }).lean();

    let hrvSum = 0, hrvCount = 0;
    let biasSum = 0, biasCount = 0;
    for (const a of analyses) {
      const hrv = (a as any).hrvStats?.hrv;
      if (typeof hrv?.lunaAvg === 'number') { hrvSum += hrv.lunaAvg; hrvCount++; }
      if (typeof hrv?.meanBias === 'number') { biasSum += hrv.meanBias; biasCount++; }
    }

    return {
      totalNights: sessions.length,
      avgHrvOverall: hrvCount ? round2(hrvSum / hrvCount) : null,
      overallAvgBias: biasCount ? round2(biasSum / biasCount) : null,
    };
  }

  static async getRecentNights(userId: Types.ObjectId | string, limit = 5) {
    const sessions = await Session.find({ userId, metric: 'HRV', isValid: true })
      .sort({ startTime: -1 })
      .limit(limit)
      .lean();
    const sessionIds = sessions.map((s) => s._id);
    const analyses = await SessionAnalysis.find({ sessionId: { $in: sessionIds } }).lean();
    const analysisMap = new Map(analyses.map((a) => [String(a.sessionId), a]));

    return sessions.map((session) => {
      const hrvStats = (analysisMap.get(String(session._id)) as any)?.hrvStats;
      return {
        sessionId: session._id,
        startTime: session.startTime,
        endTime: session.endTime,
        benchmarkDeviceType: hrvStats?.benchmarkDeviceType ?? session.benchmarkDeviceType,
        falconHrv: hrvStats?.hrv?.lunaAvg ?? null,
        benchmarkHrv: hrvStats?.hrv?.benchmarkAvg ?? null,
        meanBias: hrvStats?.hrv?.meanBias ?? null,
      };
    });
  }

  /** Day-bucketed Falcon-vs-benchmark HRV trend, for the 10/30-day toggle chart. */
  static async getHrvTrend(userId: Types.ObjectId | string, days: number) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const sessions = await Session.find({
      userId,
      metric: 'HRV',
      isValid: true,
      startTime: { $gte: since },
    })
      .sort({ startTime: 1 })
      .lean();
    const sessionIds = sessions.map((s) => s._id);
    const analyses = await SessionAnalysis.find({ sessionId: { $in: sessionIds } }).lean();
    const analysisMap = new Map(analyses.map((a) => [String(a.sessionId), a]));

    const byDay = new Map<
      string,
      { falconSum: number; falconCount: number; benchSum: number; benchCount: number; benchmarkDeviceType?: string }
    >();

    for (const session of sessions) {
      const hrvStats = (analysisMap.get(String(session._id)) as any)?.hrvStats;
      const key = dateKey(session.startTime);
      const bucket = byDay.get(key) || { falconSum: 0, falconCount: 0, benchSum: 0, benchCount: 0 };
      if (typeof hrvStats?.hrv?.lunaAvg === 'number') {
        bucket.falconSum += hrvStats.hrv.lunaAvg;
        bucket.falconCount++;
      }
      if (typeof hrvStats?.hrv?.benchmarkAvg === 'number') {
        bucket.benchSum += hrvStats.hrv.benchmarkAvg;
        bucket.benchCount++;
        bucket.benchmarkDeviceType = hrvStats.benchmarkDeviceType;
      }
      byDay.set(key, bucket);
    }

    return Array.from(byDay.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, b]) => ({
        date,
        falconAvg: b.falconCount ? round2(b.falconSum / b.falconCount) : null,
        benchmarkAvg: b.benchCount ? round2(b.benchSum / b.benchCount) : null,
        benchmarkDeviceType: b.benchmarkDeviceType ?? null,
      }));
  }
}
