import FirmwarePerformance, { IFirmwarePerformance } from '../models/FirmwarePerformance';
import Session from '../models/Session';
import SessionAnalysis from '../models/SessionAnalysis';
import { Types } from 'mongoose';

/**
 * Update or create the FirmwarePerformance document for a Luna firmware version.
 * Should be called after session analysis and user accuracy summary update.
 * @param firmwareVersion - The firmware version to update
 * @param metric - The metric to calculate performance for (HR, SPO2, etc.)
 */
export async function updateFirmwarePerformanceForLuna(firmwareVersion: string, metric: 'HR' | 'SPO2' | 'Sleep' | 'Calories' | 'Steps' = 'HR') {
  // Find all sessions and analyses for Luna with this firmware and metric
  const sessions = await Session.find({ 'devices.deviceType': 'luna', 'devices.firmwareVersion': firmwareVersion, metric }).lean();
  if (!sessions.length) return;
  const sessionIds = sessions.map(s => s._id);
  const analyses = await SessionAnalysis.find({ sessionId: { $in: sessionIds } }).lean();
  if (!analyses.length) return;

  // Helper: get session by id
  const sessionMap = new Map(sessions.map(s => [String(s._id), s]));

  // Handle Sleep metric differently (uses sleepStats)
  if (metric === 'Sleep') {
    let totalAccuracy = 0, totalKappa = 0, totalSleepBias = 0, totalDeepBias = 0, totalRemBias = 0;
    let countComparison = 0;
    const userSet = new Set<string>();

    for (const analysis of analyses) {
      if (!analysis.sleepStats) continue;
      
      const sleepStats = analysis.sleepStats;
      
      // Count sessions with comparison data
      if (sleepStats.epochAccuracyPercent !== undefined) {
        totalAccuracy += sleepStats.epochAccuracyPercent;
        totalKappa += sleepStats.kappaScore || 0;
        totalSleepBias += sleepStats.totalSleepDiffSec || 0;
        totalDeepBias += sleepStats.deepDiffSec || 0;
        totalRemBias += sleepStats.remDiffSec || 0;
        countComparison++;
      }
      
      if (analysis.userId) userSet.add(String(analysis.userId));
    }

    const doc: Partial<IFirmwarePerformance> = {
      firmwareVersion,
      metric,
      totalSessions: analyses.length,
      totalUsers: userSet.size,
      sleepStats: countComparison > 0 ? {
        avgAccuracyPercent: totalAccuracy / countComparison,
        avgKappa: totalKappa / countComparison,
        avgTotalSleepBiasSec: totalSleepBias / countComparison,
        avgDeepBiasSec: totalDeepBias / countComparison,
        avgRemBiasSec: totalRemBias / countComparison,
      } : undefined,
      computedAt: new Date(),
    };

    try {
      await FirmwarePerformance.findOneAndUpdate(
        { firmwareVersion, metric },
        doc,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log('Firmware performance (Sleep) updated for Luna version:', firmwareVersion);
    } catch (err) {
      console.error('Error updating firmware performance for Luna version:', firmwareVersion, err);
      return;
    }
    
    return;
  }

  // For HR/SPO2 metrics - use pairwiseComparisons
  // Convert metric to lowercase for comparison (stored as 'hr', 'spo2' in DB)
  const metricLower = metric.toLowerCase();

  // Aggregate overall accuracy
  let totalMAE = 0, totalRMSE = 0, totalPearson = 0, totalMAPE = 0, count = 0;
  const activityMap = new Map<string, { sum: number, count: number }>();
  const userSet = new Set<string>();

  for (const analysis of analyses) {
    // Get session to access benchmarkDeviceType
    const session = sessionMap.get(String(analysis.sessionId));
    if (!session) continue;
    
    // Find the Luna vs benchmark device comparison for this metric
    const pair = analysis.pairwiseComparisons?.find(
      (p: any) => p.d1 === 'luna' && p.d2 === session.benchmarkDeviceType && p.metric === metricLower
    );
    
    if (pair && typeof pair.mape === 'number') {
      totalMAE += pair.mae || 0;
      totalRMSE += pair.rmse || 0;
      totalPearson += pair.pearsonR || 0;
      totalMAPE += pair.mape || 0;
      count++;
      
      // Calculate accuracy from MAPE: accuracy = 100 - MAPE
      const sessionAccuracy = 100 - (pair.mape || 0);
      
      // Activity
      if (analysis.activityType) {
        const a = activityMap.get(analysis.activityType) || { sum: 0, count: 0 };
        a.sum += sessionAccuracy;
        a.count++;
        activityMap.set(analysis.activityType, a);
      }
    }
    if (analysis.userId) userSet.add(String(analysis.userId));
  }

  // Prepare doc
  const doc: Partial<IFirmwarePerformance> = {
    firmwareVersion,
    metric,
    totalSessions: count,
    totalUsers: userSet.size,
    overallAccuracy: count ? {
      avgMAE: totalMAE / count,
      avgRMSE: totalRMSE / count,
      avgMAPE: totalMAPE / count,
      avgPearson: totalPearson / count,
    } : undefined,
    activityWise: Array.from(activityMap.entries()).map(([activityType, { sum, count }]) => ({
      activityType,
      avgAccuracy: count ? sum / count : 0,
      totalSessions: count,
    })),
    computedAt: new Date(),
  };

  // Upsert
  //console.log('Updating firmware performance for Luna version:', firmwareVersion, 'with data:', doc);
  try{
        await FirmwarePerformance.findOneAndUpdate(
        { firmwareVersion, metric },
        doc,
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }catch(err){
    console.error('Error updating firmware performance for Luna version:', firmwareVersion, err);
    return;
  }
  
  console.log('Firmware performance updated for Luna version:', firmwareVersion, 'metric:', metric);
}
