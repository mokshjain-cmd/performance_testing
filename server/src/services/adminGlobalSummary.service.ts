import Session from '../models/Session';
import SessionAnalysis from '../models/SessionAnalysis';
import NormalizedReading from '../models/NormalizedReadings';
import AdminGlobalSummary from '../models/AdminGlobalSummary';

/**
 * Update admin global summary
 * Aggregates overall Luna performance across all users and sessions
 * This should be called after each session ingestion/analysis
 */
export async function updateAdminGlobalSummary() {
  console.log('\n🔄 Updating AdminGlobalSummary...');

  // Get all valid sessions
  const sessions = await Session.find({ isValid: true });

  if (sessions.length === 0) {
    console.log('⚠️ No valid sessions found');
    return null;
  }

  // Count unique users
  const uniqueUserIds = new Set(sessions.map(s => s.userId.toString()));

  // Count total Luna readings
  const totalReadings = await NormalizedReading.countDocuments({
    'meta.deviceType': 'luna',
  });

  // Get all session analyses with Luna comparisons
  const analyses = await SessionAnalysis.find({
    isValid: true,
    'pairwiseComparisons.0': { $exists: true },
  });

  // Helper: get session by id
  const sessionMap = new Map(sessions.map(s => [String(s._id), s]));

  // Aggregate Luna stats from pairwise comparisons (Luna vs benchmark device)
  let totalMAE = 0;
  let totalRMSE = 0;
  let totalMAPE = 0;
  let totalPearson = 0;
  let totalCoverage = 0;
  let totalBias = 0;
  let countMAE = 0;
  let countRMSE = 0;
  let countMAPE = 0;
  let countPearson = 0;
  let countCoverage = 0;
  let countBias = 0;

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
      if (comparison.mape !== undefined && comparison.mape !== null) {
        totalMAPE += comparison.mape;
        countMAPE++;
      }
      if (comparison.pearsonR !== undefined && comparison.pearsonR !== null) {
        totalPearson += comparison.pearsonR;
        countPearson++;
      }
      if (comparison.coverage !== undefined && comparison.coverage !== null) {
        totalCoverage += comparison.coverage * 100; // Convert to percentage
        countCoverage++;
      }
      if (comparison.meanBias !== undefined && comparison.meanBias !== null) {
        totalBias += comparison.meanBias;
        countBias++;
      }
    }
  });

  const summary = {
    totalUsers: uniqueUserIds.size,
    totalSessions: sessions.length,
    totalReadings,
    lunaStats: {
      avgMAE: countMAE > 0 ? totalMAE / countMAE : undefined,
      avgRMSE: countRMSE > 0 ? totalRMSE / countRMSE : undefined,
      avgMAPE: countMAPE > 0 ? totalMAPE / countMAPE : undefined,
      avgPearson: countPearson > 0 ? totalPearson / countPearson : undefined,
      avgCoveragePercent: countCoverage > 0 ? totalCoverage / countCoverage : undefined,
      avgBias: countBias > 0 ? totalBias / countBias : undefined,
    },
    computedAt: new Date(),
  };

  // Delete existing and create new (since there's only one global summary)
  await AdminGlobalSummary.deleteMany({});
  const result = await AdminGlobalSummary.create(summary);

  console.log('✅ AdminGlobalSummary updated:', {
    totalUsers: summary.totalUsers,
    totalSessions: summary.totalSessions,
    totalReadings: summary.totalReadings,
    avgMAE: summary.lunaStats.avgMAE?.toFixed(2),
    avgRMSE: summary.lunaStats.avgRMSE?.toFixed(2),
    avgMAPE: summary.lunaStats.avgMAPE?.toFixed(2),
    avgPearson: summary.lunaStats.avgPearson?.toFixed(3),
    avgCoveragePercent: summary.lunaStats.avgCoveragePercent?.toFixed(1),
    avgBias: summary.lunaStats.avgBias?.toFixed(2),
  });

  return result;
}
