import Session from '../models/Session';
import SessionAnalysis from '../models/SessionAnalysis';
import ActivityPerformanceSummary from '../models/ActivityPerformanceSummay';

/**
 * Update activity performance summary for a specific activity type
 * Aggregates Luna pairwise comparison stats across all sessions of that activity
 */
export async function updateActivityPerformanceSummary(activityType: string) {
  console.log(`\n🔄 Updating ActivityPerformanceSummary for: ${activityType}`);

  // Get all valid HR sessions for this activity type (exclude SPO2/other metrics)
  const sessions = await Session.find({
    activityType,
    metric: 'HR',
    isValid: true,
  });

  if (sessions.length === 0) {
    console.log(`⚠️ No sessions found for activity: ${activityType}`);
    return null;
  }

  // Get session analyses
  const sessionIds = sessions.map((s: any) => s._id);
  const analyses = await SessionAnalysis.find({
    sessionId: { $in: sessionIds },
    isValid: true,
    'pairwiseComparisons.0': { $exists: true }, // Has at least one comparison
  });

  // Helper: get session by id
  const sessionMap = new Map(sessions.map((s: any) => [String(s._id), s]));

  // Aggregate Luna pairwise comparisons (Luna vs benchmark device)
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

  const summary = {
    activityType,
    totalSessions: analyses.length,
    avgMAE: countMAE > 0 ? totalMAE / countMAE : undefined,
    avgRMSE: countRMSE > 0 ? totalRMSE / countRMSE : undefined,
    avgPearson: countPearson > 0 ? totalPearson / countPearson : undefined,
    avgCoveragePercent: countCoverage > 0 ? totalCoverage / countCoverage : undefined,
    lastUpdated: new Date(),
  };

  // Upsert the summary
  const result = await ActivityPerformanceSummary.findOneAndUpdate(
    { activityType },
    summary,
    { upsert: true, new: true }
  );

  console.log(`✅ ActivityPerformanceSummary updated for ${activityType}:`, {
    totalSessions: summary.totalSessions,
    avgMAE: summary.avgMAE?.toFixed(2),
    avgRMSE: summary.avgRMSE?.toFixed(2),
    avgPearson: summary.avgPearson?.toFixed(3),
    avgCoveragePercent: summary.avgCoveragePercent?.toFixed(1),
  });

  return result;
}
