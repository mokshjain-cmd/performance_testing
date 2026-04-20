import { Types } from "mongoose";
import Session from "../../models/Session";
import SessionAnalysis from "../../models/SessionAnalysis";
import NormalizedReading from "../../models/NormalizedReadings";

interface ISkinTempStats {
  mean: number;
  min: number;
  max: number;
  range: number;
  count: number;
}

interface ISkinTempComparison {
  correlation?: number;
  mae?: number;
  mape?: number;
  rmse?: number;
  bias?: number;
}

interface IUserSkinTempOverview {
  totalSessions: number;
  avgMean: number;
  avgMin: number;
  avgMax: number;
  avgRange: number;
  comparison?: {
    avgBias: number;
    lunaAvg: number;
    benchmarkAvg: number;
    // Legacy fields - undefined for bias-only comparisons
    avgCorrelation?: number;
    avgMAE?: number;
    avgMAPE?: number;
    avgRMSE?: number;
  };
  sessions: Array<{
    sessionId: string;
    date: Date;
    luna: ISkinTempStats;
    benchmark?: ISkinTempStats;
    comparison?: ISkinTempComparison;
  }>;
}

interface ISkinTempSessionView {
  session: {
    sessionId: string;
    name?: string;
    date: Date;
  };
  luna: ISkinTempStats;
  benchmark?: ISkinTempStats;
  comparison?: ISkinTempComparison;
  readings?: Array<{
    timestamp: Date;
    luna: number | null;
    benchmark?: number | null;
  }>;
}

interface ISkinTempTrendData {
  date: Date;
  lunaAvg: number;
  lunaMin: number;
  lunaMax: number;
  benchmarkAvg?: number;
  benchmarkMin?: number;
  benchmarkMax?: number;
}

// Helper to extract device stats from array
function getLunaStats(deviceStats: any[]): any | undefined {
  return deviceStats?.find((d: any) => d.deviceType === 'luna');
}

function getBenchmarkStats(deviceStats: any[]): any | undefined {
  return deviceStats?.find((d: any) => d.deviceType !== 'luna');
}

function getPairwiseComparison(comparisons: any[]): any | undefined {
  return comparisons?.find((c: any) => c.metric === 'skinTemp' || c.metric === 'SkinTemp');
}

/**
 * UserSkinTempSummaryService
 * Provides user-facing skin temperature insights
 */
export class UserSkinTempSummaryService {
  /**
   * Get user SkinTemp overview (across all sessions)
   */
  static async getUserSkinTempOverview(userId: Types.ObjectId | string): Promise<IUserSkinTempOverview> {
    try {
      // Find all SkinTemp sessions for user
      const sessions = await Session.find({
        userId,
        metric: "SkinTemp",
      }).sort({ startTime: -1 }).lean();

      if (sessions.length === 0) {
        return {
          totalSessions: 0,
          avgMean: 0,
          avgMin: 0,
          avgMax: 0,
          avgRange: 0,
          sessions: [],
        };
      }

      // Fetch session analyses
      const sessionIds = sessions.map(s => s._id);
      const analyses = await SessionAnalysis.find({
        sessionId: { $in: sessionIds },
      }).lean();

      const analysisMap = new Map(analyses.map(a => [a.sessionId.toString(), a]));

      // Aggregate stats
      let totalMean = 0, totalMin = 0, totalMax = 0, totalRange = 0;
      let totalCorrelation = 0, totalMAE = 0, totalMAPE = 0, totalRMSE = 0, totalBias = 0;
      let totalLunaAvg = 0, totalBenchmarkAvg = 0;
      let sessionsWithComparison = 0;
      let validSessions = 0;

      const sessionDetails = sessions.map(session => {
        const analysis = analysisMap.get(session._id.toString());
        const lunaDevice = getLunaStats(analysis?.deviceStats || []);
        const benchmarkDevice = getBenchmarkStats(analysis?.deviceStats || []);
        const pairwise = getPairwiseComparison(analysis?.pairwiseComparisons || []);

        const lunaStats = lunaDevice?.skinTemp;
        const benchmarkStats = benchmarkDevice?.skinTemp;

        if (lunaStats) {
          validSessions++;
          totalMean += lunaStats.avg || 0;
          totalMin += lunaStats.min || 0;
          totalMax += lunaStats.max || 0;
          totalRange += lunaStats.range || 0;
        }

        let comparison: ISkinTempComparison | undefined;
        if (pairwise) {
          sessionsWithComparison++;
          // Bias is always available (the only meaningful metric for Apple comparison)
          totalBias += pairwise.meanBias || 0;
          totalLunaAvg += pairwise.lunaAvg || 0;
          totalBenchmarkAvg += pairwise.benchmarkAvg || 0;
          // These may be undefined for bias-only comparisons (Apple Health)
          if (pairwise.pearsonR !== undefined) totalCorrelation += pairwise.pearsonR;
          if (pairwise.mae !== undefined) totalMAE += pairwise.mae;
          if (pairwise.mape !== undefined) totalMAPE += pairwise.mape;
          if (pairwise.rmse !== undefined) totalRMSE += pairwise.rmse;
          comparison = {
            bias: pairwise.meanBias,
            correlation: pairwise.pearsonR,
            mae: pairwise.mae,
            mape: pairwise.mape,
            rmse: pairwise.rmse,
          };
        }

        return {
          sessionId: session._id.toString(),
          date: session.startTime,
          luna: {
            mean: lunaStats?.avg || 0,
            min: lunaStats?.min || 0,
            max: lunaStats?.max || 0,
            range: lunaStats?.range || 0,
            count: 0, // Not stored directly in deviceStats
          },
          benchmark: benchmarkStats ? {
            mean: benchmarkStats.avg || 0,
            min: benchmarkStats.min || 0,
            max: benchmarkStats.max || 0,
            range: benchmarkStats.range || 0,
            count: 0,
          } : undefined,
          comparison,
        };
      });

      const result: IUserSkinTempOverview = {
        totalSessions: sessions.length,
        avgMean: validSessions > 0 ? totalMean / validSessions : 0,
        avgMin: validSessions > 0 ? totalMin / validSessions : 0,
        avgMax: validSessions > 0 ? totalMax / validSessions : 0,
        avgRange: validSessions > 0 ? totalRange / validSessions : 0,
        sessions: sessionDetails,
      };

      if (sessionsWithComparison > 0) {
        result.comparison = {
          avgBias: totalBias / sessionsWithComparison,
          lunaAvg: totalLunaAvg / sessionsWithComparison,
          benchmarkAvg: totalBenchmarkAvg / sessionsWithComparison,
          // These may be undefined for bias-only comparisons
          avgCorrelation: totalCorrelation > 0 ? totalCorrelation / sessionsWithComparison : undefined,
          avgMAE: totalMAE > 0 ? totalMAE / sessionsWithComparison : undefined,
          avgMAPE: totalMAPE > 0 ? totalMAPE / sessionsWithComparison : undefined,
          avgRMSE: totalRMSE > 0 ? totalRMSE / sessionsWithComparison : undefined,
        };
      }

      return result;
    } catch (error) {
      console.error("[UserSkinTempSummaryService] Error getting overview:", error);
      throw error;
    }
  }

  /**
   * Get single SkinTemp session view
   */
  static async getSingleSessionView(
    sessionId: string,
    includeReadings: boolean = true
  ): Promise<ISkinTempSessionView> {
    try {
      const session = await Session.findById(sessionId).lean();
      if (!session) {
        throw new Error("Session not found");
      }

      const analysis = await SessionAnalysis.findOne({ sessionId }).lean();
      const lunaDevice = getLunaStats(analysis?.deviceStats || []);
      const benchmarkDevice = getBenchmarkStats(analysis?.deviceStats || []);
      const pairwise = getPairwiseComparison(analysis?.pairwiseComparisons || []);

      const lunaStats = lunaDevice?.skinTemp;
      const benchmarkStats = benchmarkDevice?.skinTemp;

      const result: ISkinTempSessionView = {
        session: {
          sessionId: session._id.toString(),
          name: session.name,
          date: session.startTime,
        },
        luna: {
          mean: lunaStats?.avg || 0,
          min: lunaStats?.min || 0,
          max: lunaStats?.max || 0,
          range: lunaStats?.range || 0,
          count: 0,
        },
      };

      if (benchmarkStats) {
        result.benchmark = {
          mean: benchmarkStats.avg || 0,
          min: benchmarkStats.min || 0,
          max: benchmarkStats.max || 0,
          range: benchmarkStats.range || 0,
          count: 0,
        };
      }

      if (pairwise) {
        result.comparison = {
          correlation: pairwise.pearsonR || 0,
          mae: pairwise.mae || 0,
          mape: pairwise.mape || 0,
          rmse: pairwise.rmse || 0,
        };
      }

      // Include raw readings if requested
      if (includeReadings) {
        const readings = await NormalizedReading.find({
          "meta.sessionId": sessionId,
          "metrics.skinTemp": { $exists: true },
        }).sort({ timestamp: 1 }).lean();

        result.readings = readings.map((r: any) => ({
          timestamp: r.timestamp,
          luna: r.metrics.skinTemp ?? null,
          benchmark: undefined, // Benchmark readings stored separately
        }));
      }

      return result;
    } catch (error) {
      console.error("[UserSkinTempSummaryService] Error getting session view:", error);
      throw error;
    }
  }

  /**
   * Get SkinTemp trend data for charts
   */
  static async getSkinTempTrend(userId: Types.ObjectId | string): Promise<ISkinTempTrendData[]> {
    try {
      const sessions = await Session.find({
        userId,
        metric: "SkinTemp",
      }).sort({ startTime: 1 }).lean();

      if (sessions.length === 0) {
        return [];
      }

      const sessionIds = sessions.map(s => s._id);
      const analyses = await SessionAnalysis.find({
        sessionId: { $in: sessionIds },
      }).lean();

      const analysisMap = new Map(analyses.map(a => [a.sessionId.toString(), a]));

      return sessions.map(session => {
        const analysis = analysisMap.get(session._id.toString());
        const lunaDevice = getLunaStats(analysis?.deviceStats || []);
        const benchmarkDevice = getBenchmarkStats(analysis?.deviceStats || []);

        const lunaStats = lunaDevice?.skinTemp;
        const benchmarkStats = benchmarkDevice?.skinTemp;

        const data: ISkinTempTrendData = {
          date: session.startTime,
          lunaAvg: lunaStats?.avg || 0,
          lunaMin: lunaStats?.min || 0,
          lunaMax: lunaStats?.max || 0,
        };

        if (benchmarkStats) {
          data.benchmarkAvg = benchmarkStats.avg;
          data.benchmarkMin = benchmarkStats.min;
          data.benchmarkMax = benchmarkStats.max;
        }

        return data;
      });
    } catch (error) {
      console.error("[UserSkinTempSummaryService] Error getting trend:", error);
      throw error;
    }
  }
}
