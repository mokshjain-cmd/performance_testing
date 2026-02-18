import Session from '../models/Session';
import SessionAnalysis from '../models/SessionAnalysis';
import AdminDailyTrend from '../models/AdminDailyTrend';

/**
 * Update admin daily trend for a specific date
 * Aggregates Luna performance stats for all sessions on that date
 * @param date - The date to update (will be normalized to midnight UTC)
 */
export async function updateAdminDailyTrend(date: Date) {
  // Normalize to midnight UTC
  const dateOnly = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    0, 0, 0, 0
  ));

  const nextDay = new Date(dateOnly);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  console.log(`\n🔄 Updating AdminDailyTrend for date: ${dateOnly.toISOString().split('T')[0]}`);

  // Get all sessions that started on this date
  const sessions = await Session.find({
    startTime: {
      $gte: dateOnly,
      $lt: nextDay,
    },
    isValid: true,
  });

  if (sessions.length === 0) {
    console.log(`⚠️ No sessions found for date: ${dateOnly.toISOString().split('T')[0]}`);
    return null;
  }

  // Get unique users for this date
  const uniqueUserIds = new Set(sessions.map(s => s.userId.toString()));

  // Get session analyses for these sessions
  const sessionIds = sessions.map(s => s._id);
  const analyses = await SessionAnalysis.find({
    sessionId: { $in: sessionIds },
    isValid: true,
    'pairwiseComparisons.0': { $exists: true },
  });

  // Helper: get session by id
  const sessionMap = new Map(sessions.map(s => [String(s._id), s]));

  // Aggregate Luna stats from pairwise comparisons (Luna vs benchmark device)
  let totalMAE = 0;
  let totalRMSE = 0;
  let totalPearson = 0;
  let totalCoverage = 0;
  let countMAE = 0;
  let countRMSE = 0;
  let countPearson = 0;
  let countCoverage = 0;

  analyses.forEach((analysis) => {
    // Get session to access benchmarkDeviceType
    const session = sessionMap.get(String(analysis.sessionId));
    if (!session) return;

    // Find Luna vs benchmark device comparison
    const comparison = analysis.pairwiseComparisons.find(
      (p: any) => p.d1 === 'luna' && p.d2 === session.benchmarkDeviceType && p.metric === 'hr'
    );

    if (comparison) {
      if (comparison.mae !== undefined && comparison.mae !== null) {
        totalMAE += comparison.mae;
        countMAE++;
      }
      if (comparison.rmse !== undefined && comparison.rmse !== null) {
        totalRMSE += comparison.rmse;
        countRMSE++;
      }
      if (comparison.pearsonR !== undefined && comparison.pearsonR !== null) {
        totalPearson += comparison.pearsonR;
        countPearson++;
      }
      if (comparison.coverage !== undefined && comparison.coverage !== null) {
        totalCoverage += comparison.coverage * 100; // Convert to percentage
        countCoverage++;
      }
    }
  });

  const trend = {
    date: dateOnly,
    totalSessions: sessions.length,
    totalUsers: uniqueUserIds.size,
    lunaStats: {
      avgMAE: countMAE > 0 ? totalMAE / countMAE : undefined,
      avgRMSE: countRMSE > 0 ? totalRMSE / countRMSE : undefined,
      avgPearson: countPearson > 0 ? totalPearson / countPearson : undefined,
      avgCoveragePercent: countCoverage > 0 ? totalCoverage / countCoverage : undefined,
    },
    computedAt: new Date(),
  };

  // Upsert the daily trend
  const result = await AdminDailyTrend.findOneAndUpdate(
    { date: dateOnly },
    trend,
    { upsert: true, new: true }
  );

  console.log(`✅ AdminDailyTrend updated for ${dateOnly.toISOString().split('T')[0]}:`, {
    totalSessions: trend.totalSessions,
    totalUsers: trend.totalUsers,
    avgMAE: trend.lunaStats.avgMAE?.toFixed(2),
    avgRMSE: trend.lunaStats.avgRMSE?.toFixed(2),
    avgPearson: trend.lunaStats.avgPearson?.toFixed(3),
    avgCoveragePercent: trend.lunaStats.avgCoveragePercent?.toFixed(1),
  });

  return result;
}
