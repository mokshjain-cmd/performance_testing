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
export async function updateFirmwarePerformanceForLuna(firmwareVersion: string, metric: 'HR' | 'SPO2' | 'Sleep' | 'Activity' | 'SkinTemp' | 'Workout' | 'HRV' = 'HR') {
  // Find all sessions and analyses for Luna with this firmware and metric
  const sessions = await Session.find({ 'devices.deviceType': 'luna', 'devices.firmwareVersion': firmwareVersion, metric, benchmarkDeviceType: { $ne: null, $exists: true } }).lean();
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

  // Handle Workout metric (uses workoutStats)
  if (metric === 'Workout') {
    let totalMAE = 0, totalRMSE = 0, totalPearson = 0, totalMAPE = 0;
    let totalCalBias = 0, totalStepsBias = 0, totalDistBias = 0;
    let countHr = 0, countCal = 0, countSteps = 0, countDist = 0;
    const userSet = new Set<string>();
    const activityMap = new Map<string, { sum: number, count: number }>();

    for (const analysis of analyses) {
      if (!analysis.workoutStats) continue;
      
      const workoutStats = analysis.workoutStats as any;
      
      // Count sessions with benchmark comparison
      if (workoutStats.benchmarkComparison) {
        const bc = workoutStats.benchmarkComparison;
        
        // HR metrics
        if (bc.hrMae !== undefined) {
          totalMAE += bc.hrMae;
          totalRMSE += bc.hrRmse || 0;
          totalPearson += bc.hrPearsonR || 0;
          totalMAPE += bc.hrMape || 0;
          countHr++;
        }
        
        // Calories bias
        if (bc.caloriesBias !== undefined) {
          totalCalBias += bc.caloriesBias;
          countCal++;
        }
        
        // Steps bias
        if (bc.stepsBias !== undefined || bc.stepsDifference !== undefined) {
          totalStepsBias += bc.stepsBias ?? bc.stepsDifference ?? 0;
          countSteps++;
        }
        
        // Distance bias
        if (bc.distanceBias !== undefined || bc.distanceDifference !== undefined) {
          totalDistBias += bc.distanceBias ?? bc.distanceDifference ?? 0;
          countDist++;
        }
        
        // Track by sport type (as activityType)
        const sportType = `sport_${workoutStats.sportType}`;
        const a = activityMap.get(sportType) || { sum: 0, count: 0 };
        const sessionAccuracy = 100 - (bc.hrMape || 0);
        a.sum += sessionAccuracy;
        a.count++;
        activityMap.set(sportType, a);
      }
      
      if (analysis.userId) userSet.add(String(analysis.userId));
    }

    const doc: Partial<IFirmwarePerformance> = {
      firmwareVersion,
      metric,
      totalSessions: analyses.length,
      totalUsers: userSet.size,
      overallAccuracy: countHr > 0 ? {
        avgMAE: totalMAE / countHr,
        avgRMSE: totalRMSE / countHr,
        avgMAPE: totalMAPE / countHr,
        avgPearson: totalPearson / countHr,
      } : undefined,
      workoutStats: {
        avgHrMae: countHr > 0 ? totalMAE / countHr : undefined,
        avgHrPearson: countHr > 0 ? totalPearson / countHr : undefined,
        avgCaloriesBias: countCal > 0 ? totalCalBias / countCal : undefined,
        avgStepsBias: countSteps > 0 ? totalStepsBias / countSteps : undefined,
        avgDistanceBias: countDist > 0 ? totalDistBias / countDist : undefined,
      },
      activityWise: Array.from(activityMap.entries()).map(([activityType, { sum, count }]) => ({
        activityType,
        avgAccuracy: count ? sum / count : 0,
        totalSessions: count,
      })),
      computedAt: new Date(),
    };

    try {
      await FirmwarePerformance.findOneAndUpdate(
        { firmwareVersion, metric },
        doc,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log('Firmware performance (Workout) updated for Luna version:', firmwareVersion, {
        avgCalBias: doc.workoutStats?.avgCaloriesBias?.toFixed(2),
        avgStepsBias: doc.workoutStats?.avgStepsBias?.toFixed(0),
        avgDistBias: doc.workoutStats?.avgDistanceBias?.toFixed(2),
      });
    } catch (err) {
      console.error('Error updating firmware performance (Workout) for Luna version:', firmwareVersion, err);
      return;
    }
    
    return;
  }

  // For HR/SPO2 metrics - use pairwiseComparisons
  // Convert metric to lowercase for comparison (stored as 'hr', 'spo2' in DB)
  const metricLower = metric.toLowerCase();

  // Aggregate overall accuracy — independent per-field counters, since a
  // manual-entry session (no mae/rmse/mape/pearsonR, only meanBias) must
  // still count toward avgBias/totalSessions without being dropped entirely.
  let totalMAE = 0, totalRMSE = 0, totalPearson = 0, totalMAPE = 0, totalBias = 0;
  let countMAE = 0, countRMSE = 0, countPearson = 0, countMAPE = 0, countBias = 0;
  let sessionsWithComparison = 0;
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

    if (pair && (pair.mape !== undefined || pair.meanBias !== undefined)) {
      sessionsWithComparison++;
      if (typeof pair.mae === 'number') { totalMAE += pair.mae; countMAE++; }
      if (typeof pair.rmse === 'number') { totalRMSE += pair.rmse; countRMSE++; }
      if (typeof pair.pearsonR === 'number') { totalPearson += pair.pearsonR; countPearson++; }
      if (typeof pair.mape === 'number') { totalMAPE += pair.mape; countMAPE++; }
      if (typeof pair.meanBias === 'number') { totalBias += pair.meanBias; countBias++; }

      // Calculate accuracy from MAPE: accuracy = 100 - MAPE (only when MAPE exists)
      if (typeof pair.mape === 'number') {
        const sessionAccuracy = 100 - pair.mape;

        // Activity
        if (analysis.activityType) {
          const a = activityMap.get(analysis.activityType) || { sum: 0, count: 0 };
          a.sum += sessionAccuracy;
          a.count++;
          activityMap.set(analysis.activityType, a);
        }
      }
    }
    if (analysis.userId) userSet.add(String(analysis.userId));
  }

  // Prepare doc
  const doc: Partial<IFirmwarePerformance> = {
    firmwareVersion,
    metric,
    totalSessions: sessionsWithComparison,
    totalUsers: userSet.size,
    overallAccuracy: sessionsWithComparison ? {
      avgMAE: countMAE ? totalMAE / countMAE : undefined,
      avgRMSE: countRMSE ? totalRMSE / countRMSE : undefined,
      avgMAPE: countMAPE ? totalMAPE / countMAPE : undefined,
      avgPearson: countPearson ? totalPearson / countPearson : undefined,
      avgBias: countBias ? totalBias / countBias : undefined,
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
