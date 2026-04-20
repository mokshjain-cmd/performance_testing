import { Types } from "mongoose";
import Session from "../../models/Session";
import SessionAnalysis from "../../models/SessionAnalysis";
import User from "../../models/Users";

interface ISkinTempGlobalStats {
  avgMean: number;
  avgMin: number;
  avgMax: number;
  avgRange: number;
  avgBias?: number;
  lunaAvg?: number;
  benchmarkAvg?: number;
  // Legacy fields - undefined for bias-only comparisons
  avgCorrelation?: number;
  avgMAE?: number;
  avgMAPE?: number;
  avgRMSE?: number;
}

interface IAdminSkinTempGlobalSummary {
  totalSessions: number;
  totalUsers: number;
  latestFirmwareVersion?: string;
  skinTempStats: ISkinTempGlobalStats;
  userSummaries?: Array<{
    userId: string;
    userName?: string;
    totalSessions: number;
    avgMean: number;
    avgRange: number;
    avgCorrelation?: number;
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
  avgBias?: number;
  sessionCount: number;
}

// Helper functions
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
 * AdminSkinTempSummaryService
 * Provides admin-facing global skin temperature insights
 */
export class AdminSkinTempSummaryService {
  /**
   * Get global SkinTemp summary across all users
   */
  static async getGlobalSummary(latestFirmwareOnly: boolean = false): Promise<IAdminSkinTempGlobalSummary> {
    try {
      // Find all SkinTemp sessions
      const sessions = await Session.find({
        metric: "SkinTemp",
      }).lean();

      if (sessions.length === 0) {
        return {
          totalSessions: 0,
          totalUsers: 0,
          skinTempStats: {
            avgMean: 0,
            avgMin: 0,
            avgMax: 0,
            avgRange: 0,
          },
        };
      }

      // Get unique users
      const userIds = [...new Set(sessions.map(s => s.userId.toString()))];

      // Fetch users for names
      const users = await User.find({ _id: { $in: userIds } }).lean();
      const userMap = new Map(users.map((u: any) => [u._id.toString(), u]));

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

      // Group by user for user summaries
      const userStats = new Map<string, {
        totalSessions: number;
        sumMean: number;
        sumRange: number;
        sumCorrelation: number;
        validCount: number;
        comparisonCount: number;
      }>();

      for (const session of sessions) {
        const analysis = analysisMap.get(session._id.toString());
        const lunaDevice = getLunaStats(analysis?.deviceStats || []);
        const pairwise = getPairwiseComparison(analysis?.pairwiseComparisons || []);
        const lunaStats = lunaDevice?.skinTemp;

        const userId = session.userId.toString();

        if (!userStats.has(userId)) {
          userStats.set(userId, {
            totalSessions: 0,
            sumMean: 0,
            sumRange: 0,
            sumCorrelation: 0,
            validCount: 0,
            comparisonCount: 0,
          });
        }

        const userStat = userStats.get(userId)!;
        userStat.totalSessions++;

        if (lunaStats) {
          validSessions++;
          userStat.validCount++;
          totalMean += lunaStats.avg || 0;
          totalMin += lunaStats.min || 0;
          totalMax += lunaStats.max || 0;
          totalRange += lunaStats.range || 0;
          userStat.sumMean += lunaStats.avg || 0;
          userStat.sumRange += lunaStats.range || 0;
        }

        if (pairwise) {
          sessionsWithComparison++;
          userStat.comparisonCount++;
          // Bias is always available (the only meaningful metric for Apple comparison)
          totalBias += pairwise.meanBias || 0;
          totalLunaAvg += pairwise.lunaAvg || 0;
          totalBenchmarkAvg += pairwise.benchmarkAvg || 0;
          // These may be undefined for bias-only comparisons (Apple Health)
          if (pairwise.pearsonR !== undefined) {
            totalCorrelation += pairwise.pearsonR;
            userStat.sumCorrelation += pairwise.pearsonR;
          }
          if (pairwise.mae !== undefined) totalMAE += pairwise.mae;
          if (pairwise.mape !== undefined) totalMAPE += pairwise.mape;
          if (pairwise.rmse !== undefined) totalRMSE += pairwise.rmse;
        }
      }

      // Build user summaries
      const userSummaries = Array.from(userStats.entries()).map(([userId, stats]) => {
        const user: any = userMap.get(userId);
        return {
          userId,
          userName: user?.name || user?.email,
          totalSessions: stats.totalSessions,
          avgMean: stats.validCount > 0 ? stats.sumMean / stats.validCount : 0,
          avgRange: stats.validCount > 0 ? stats.sumRange / stats.validCount : 0,
          avgCorrelation: stats.comparisonCount > 0 ? stats.sumCorrelation / stats.comparisonCount : undefined,
        };
      });

      const result: IAdminSkinTempGlobalSummary = {
        totalSessions: sessions.length,
        totalUsers: userIds.length,
        skinTempStats: {
          avgMean: validSessions > 0 ? totalMean / validSessions : 0,
          avgMin: validSessions > 0 ? totalMin / validSessions : 0,
          avgMax: validSessions > 0 ? totalMax / validSessions : 0,
          avgRange: validSessions > 0 ? totalRange / validSessions : 0,
        },
        userSummaries,
      };

      if (sessionsWithComparison > 0) {
        result.skinTempStats.avgBias = totalBias / sessionsWithComparison;
        result.skinTempStats.lunaAvg = totalLunaAvg / sessionsWithComparison;
        result.skinTempStats.benchmarkAvg = totalBenchmarkAvg / sessionsWithComparison;
        // These may be undefined for bias-only comparisons
        if (totalCorrelation > 0) result.skinTempStats.avgCorrelation = totalCorrelation / sessionsWithComparison;
        if (totalMAE > 0) result.skinTempStats.avgMAE = totalMAE / sessionsWithComparison;
        if (totalMAPE > 0) result.skinTempStats.avgMAPE = totalMAPE / sessionsWithComparison;
        if (totalRMSE > 0) result.skinTempStats.avgRMSE = totalRMSE / sessionsWithComparison;
      }

      return result;
    } catch (error) {
      console.error("[AdminSkinTempSummaryService] Error getting global summary:", error);
      throw error;
    }
  }

  /**
   * Get global SkinTemp trend data
   */
  static async getAccuracyTrend(startDate?: string, endDate?: string): Promise<ISkinTempTrendData[]> {
    try {
      const query: any = { metric: "SkinTemp" };

      if (startDate || endDate) {
        query.startTime = {};
        if (startDate) query.startTime.$gte = new Date(startDate);
        if (endDate) query.startTime.$lte = new Date(endDate);
      }

      const sessions = await Session.find(query).sort({ startTime: 1 }).lean();

      if (sessions.length === 0) {
        return [];
      }

      const sessionIds = sessions.map(s => s._id);
      const analyses = await SessionAnalysis.find({
        sessionId: { $in: sessionIds },
      }).lean();

      const analysisMap = new Map(analyses.map(a => [a.sessionId.toString(), a]));

      // Group by date
      const dateGroups = new Map<string, {
        sessions: number;
        sumLunaAvg: number;
        sumLunaMin: number;
        sumLunaMax: number;
        sumBenchmarkAvg: number;
        sumBenchmarkMin: number;
        sumBenchmarkMax: number;
        sumBias: number;
        validCount: number;
        benchmarkCount: number;
        biasCount: number;
      }>();

      for (const session of sessions) {
        const dateKey = session.startTime.toISOString().split('T')[0];
        const analysis = analysisMap.get(session._id.toString());
        const lunaDevice = getLunaStats(analysis?.deviceStats || []);
        const benchmarkDevice = getBenchmarkStats(analysis?.deviceStats || []);
        const lunaStats = lunaDevice?.skinTemp;
        const benchmarkStats = benchmarkDevice?.skinTemp;

        if (!dateGroups.has(dateKey)) {
          dateGroups.set(dateKey, {
            sessions: 0,
            sumLunaAvg: 0,
            sumLunaMin: 0,
            sumLunaMax: 0,
            sumBenchmarkAvg: 0,
            sumBenchmarkMin: 0,
            sumBenchmarkMax: 0,
            sumBias: 0,
            validCount: 0,
            benchmarkCount: 0,
            biasCount: 0,
          });
        }

        const group = dateGroups.get(dateKey)!;
        group.sessions++;

        if (lunaStats) {
          group.validCount++;
          group.sumLunaAvg += lunaStats.avg || 0;
          group.sumLunaMin += lunaStats.min || 0;
          group.sumLunaMax += lunaStats.max || 0;
        }

        if (benchmarkStats) {
          group.benchmarkCount++;
          group.sumBenchmarkAvg += benchmarkStats.avg || 0;
          group.sumBenchmarkMin += benchmarkStats.min || 0;
          group.sumBenchmarkMax += benchmarkStats.max || 0;
          
          // Calculate bias for this session (Luna - Benchmark)
          if (lunaStats && typeof lunaStats.avg === 'number' && typeof benchmarkStats.avg === 'number') {
            group.sumBias += lunaStats.avg - benchmarkStats.avg;
            group.biasCount++;
          }
        }
      }

      // Convert to array
      return Array.from(dateGroups.entries()).map(([dateKey, group]) => {
        const result: ISkinTempTrendData = {
          date: new Date(dateKey),
          lunaAvg: group.validCount > 0 ? group.sumLunaAvg / group.validCount : 0,
          lunaMin: group.validCount > 0 ? group.sumLunaMin / group.validCount : 0,
          lunaMax: group.validCount > 0 ? group.sumLunaMax / group.validCount : 0,
          sessionCount: group.sessions,
        };

        if (group.benchmarkCount > 0) {
          result.benchmarkAvg = group.sumBenchmarkAvg / group.benchmarkCount;
          result.benchmarkMin = group.sumBenchmarkMin / group.benchmarkCount;
          result.benchmarkMax = group.sumBenchmarkMax / group.benchmarkCount;
        }

        if (group.biasCount > 0) {
          result.avgBias = group.sumBias / group.biasCount;
        }

        return result;
      });
    } catch (error) {
      console.error("[AdminSkinTempSummaryService] Error getting trend:", error);
      throw error;
    }
  }

  /**
   * Get firmware comparison for SkinTemp
   * Groups sessions by firmware version and calculates bias stats
   */
  static async getFirmwareComparison(): Promise<Array<{
    firmwareVersion: string;
    totalSessions: number;
    lunaAvg: number;
    benchmarkAvg: number;
    avgBias: number;
  }>> {
    try {
      // Find all SkinTemp sessions
      const sessions = await Session.find({
        metric: "SkinTemp",
      }).lean();

      if (sessions.length === 0) {
        return [];
      }

      // Fetch session analyses
      const sessionIds = sessions.map(s => s._id);
      const analyses = await SessionAnalysis.find({
        sessionId: { $in: sessionIds },
      }).lean();

      const analysisMap = new Map(analyses.map(a => [a.sessionId.toString(), a]));

      // Group by firmware version
      const firmwareGroups = new Map<string, {
        totalSessions: number;
        sumLunaAvg: number;
        sumBenchmarkAvg: number;
        sumBias: number;
        validCount: number;
      }>();

      for (const session of sessions) {
        const analysis = analysisMap.get(session._id.toString());
        const pairwise = getPairwiseComparison(analysis?.pairwiseComparisons || []);
        
        // Get firmware version from session devices
        const lunaDevice = session.devices?.find((d: any) => d.deviceType === 'luna');
        const firmwareVersion = lunaDevice?.firmwareVersion || 'Unknown';

        if (!firmwareGroups.has(firmwareVersion)) {
          firmwareGroups.set(firmwareVersion, {
            totalSessions: 0,
            sumLunaAvg: 0,
            sumBenchmarkAvg: 0,
            sumBias: 0,
            validCount: 0,
          });
        }

        const group = firmwareGroups.get(firmwareVersion)!;
        group.totalSessions++;

        // Only count sessions with valid pairwise comparison
        if (pairwise && pairwise.meanBias !== undefined) {
          group.validCount++;
          group.sumBias += pairwise.meanBias || 0;
          group.sumLunaAvg += pairwise.lunaAvg || 0;
          group.sumBenchmarkAvg += pairwise.benchmarkAvg || 0;
        }
      }

      // Convert to array
      return Array.from(firmwareGroups.entries())
        .map(([firmwareVersion, group]) => ({
          firmwareVersion,
          totalSessions: group.totalSessions,
          lunaAvg: group.validCount > 0 ? Math.round((group.sumLunaAvg / group.validCount) * 100) / 100 : 0,
          benchmarkAvg: group.validCount > 0 ? Math.round((group.sumBenchmarkAvg / group.validCount) * 100) / 100 : 0,
          avgBias: group.validCount > 0 ? Math.round((group.sumBias / group.validCount) * 100) / 100 : 0,
        }))
        .sort((a, b) => a.firmwareVersion.localeCompare(b.firmwareVersion));
    } catch (error) {
      console.error("[AdminSkinTempSummaryService] Error getting firmware comparison:", error);
      throw error;
    }
  }

  /**
   * Get benchmark comparison for SkinTemp
   * Groups sessions by benchmark device type and calculates bias stats
   */
  static async getBenchmarkComparison(): Promise<Array<{
    benchmarkDeviceType: string;
    totalSessions: number;
    lunaAvg: number;
    benchmarkAvg: number;
    avgBias: number;
  }>> {
    try {
      // Find all SkinTemp sessions with benchmark device
      const sessions = await Session.find({
        metric: "SkinTemp",
        benchmarkDeviceType: { $exists: true, $ne: null },
      }).lean();

      if (sessions.length === 0) {
        return [];
      }

      // Fetch session analyses
      const sessionIds = sessions.map(s => s._id);
      const analyses = await SessionAnalysis.find({
        sessionId: { $in: sessionIds },
      }).lean();

      const analysisMap = new Map(analyses.map(a => [a.sessionId.toString(), a]));

      // Group by benchmark device type
      const benchmarkGroups = new Map<string, {
        totalSessions: number;
        sumLunaAvg: number;
        sumBenchmarkAvg: number;
        sumBias: number;
        validCount: number;
      }>();

      for (const session of sessions) {
        const analysis = analysisMap.get(session._id.toString());
        const pairwise = getPairwiseComparison(analysis?.pairwiseComparisons || []);
        
        const benchmarkDeviceType = session.benchmarkDeviceType || 'Unknown';

        if (!benchmarkGroups.has(benchmarkDeviceType)) {
          benchmarkGroups.set(benchmarkDeviceType, {
            totalSessions: 0,
            sumLunaAvg: 0,
            sumBenchmarkAvg: 0,
            sumBias: 0,
            validCount: 0,
          });
        }

        const group = benchmarkGroups.get(benchmarkDeviceType)!;
        group.totalSessions++;

        // Only count sessions with valid pairwise comparison
        if (pairwise && pairwise.meanBias !== undefined) {
          group.validCount++;
          group.sumBias += pairwise.meanBias || 0;
          group.sumLunaAvg += pairwise.lunaAvg || 0;
          group.sumBenchmarkAvg += pairwise.benchmarkAvg || 0;
        }
      }

      // Convert to array
      return Array.from(benchmarkGroups.entries())
        .map(([benchmarkDeviceType, group]) => ({
          benchmarkDeviceType,
          totalSessions: group.totalSessions,
          lunaAvg: group.validCount > 0 ? Math.round((group.sumLunaAvg / group.validCount) * 100) / 100 : 0,
          benchmarkAvg: group.validCount > 0 ? Math.round((group.sumBenchmarkAvg / group.validCount) * 100) / 100 : 0,
          avgBias: group.validCount > 0 ? Math.round((group.sumBias / group.validCount) * 100) / 100 : 0,
        }))
        .sort((a, b) => a.benchmarkDeviceType.localeCompare(b.benchmarkDeviceType));
    } catch (error) {
      console.error("[AdminSkinTempSummaryService] Error getting benchmark comparison:", error);
      throw error;
    }
  }
}
