import Session from '../models/Session';
import SessionAnalysis from '../models/SessionAnalysis';
import NormalizedReading from '../models/NormalizedReadings';
import WorkoutReading from '../models/WorkoutReading';
import AdminGlobalSummary from '../models/AdminGlobalSummary';
import { getLatestFirmwareVersion } from '../controllers/firmwareConfig.controller';

/**
 * Update admin global summary
 * Aggregates overall Luna performance across all users and sessions
 * This should be called after each session ingestion/analysis
 * @param metric - The metric to calculate summary for (HR, SPO2, etc.)
 * @param latestFirmwareOnly - Whether to filter by latest firmware version only (default: true)
 */
export async function updateAdminGlobalSummary(
  metric: 'HR' | 'SPO2' | 'Sleep' | 'Activity' | 'SkinTemp' | 'Workout' | 'HRV' = 'HR',
  latestFirmwareOnly: boolean = true
) {
  console.log(`\n🔄 ========================================`);
  console.log(`🔄 Updating AdminGlobalSummary for metric: ${metric}`);
  console.log(`🔄 latestFirmwareOnly: ${latestFirmwareOnly}`);
  console.log(`🔄 ========================================`);

  let sessions;
  let latestFirmware: string | null = null;

  if (latestFirmwareOnly) {
    // Get the latest firmware version from configuration
    latestFirmware = await getLatestFirmwareVersion(metric);
    
    console.log(`[AdminGlobalSummary] 📋 Firmware Config Check:`);
    console.log(`[AdminGlobalSummary]    - Configured latest firmware: ${latestFirmware || 'NOT SET'}`);
    
    if (latestFirmware) {
      console.log(`[AdminGlobalSummary] 🔍 Filtering by latest firmware: "${latestFirmware}"`);
      
      // Find sessions where luna device has the latest firmware version
      const allSessions = await Session.find({
        isValid: true,
        metric,
        benchmarkDeviceType: { $ne: null, $exists: true },
      });
      
      console.log(`[AdminGlobalSummary] 📊 Total valid sessions for ${metric}: ${allSessions.length}`);
      
      // Show firmware versions of all sessions for debugging
      if (allSessions.length > 0) {
        console.log(`[AdminGlobalSummary] 📝 Session firmware versions:`);
        allSessions.forEach((s) => {
          const lunaDevice = s.devices.find((d: any) => d.deviceType === "luna");
          const fw = lunaDevice?.firmwareVersion;
          const matches = fw === latestFirmware;
          console.log(`[AdminGlobalSummary]    - Session ${s._id}: firmware="${fw}" ${matches ? '✅ MATCH' : '❌ NO MATCH'}`);
        });
      }
      
      // Filter sessions by firmware version
      sessions = allSessions.filter((session) => {
        const lunaDevice = session.devices.find((d: any) => d.deviceType === "luna");
        return lunaDevice?.firmwareVersion === latestFirmware;
      });
      
      console.log(`[AdminGlobalSummary] ✅ Sessions matching firmware "${latestFirmware}": ${sessions.length}`);
    } else {
      console.log(`[AdminGlobalSummary] ⚠️  No latest firmware configured for ${metric}, using all sessions`);
      sessions = await Session.find({ isValid: true, metric, benchmarkDeviceType: { $ne: null, $exists: true } });
      console.log(`[AdminGlobalSummary] 📊 Total sessions (no filter): ${sessions.length}`);
      
      // Extract firmware from most recent session if no config exists
      if (sessions.length > 0) {
        const sortedSessions = [...sessions].sort((a, b) => 
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        );
        const mostRecentSession = sortedSessions[0];
        const lunaDevice = mostRecentSession.devices.find((d: any) => d.deviceType === "luna");
        if (lunaDevice?.firmwareVersion) {
          latestFirmware = lunaDevice.firmwareVersion;
          console.log(`[AdminGlobalSummary] 📱 Using firmware from most recent session: ${latestFirmware}`);
        }
      }
    }
  } else {
    // Get all valid sessions for this metric
    console.log(`[AdminGlobalSummary] 🔓 Firmware filtering disabled, fetching all sessions`);
    sessions = await Session.find({ isValid: true, metric, benchmarkDeviceType: { $ne: null, $exists: true } });
    console.log(`[AdminGlobalSummary] 📊 Total sessions: ${sessions.length}`);
    
    // Extract firmware from most recent session
    if (sessions.length > 0) {
      const sortedSessions = [...sessions].sort((a, b) => 
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
      const mostRecentSession = sortedSessions[0];
      const lunaDevice = mostRecentSession.devices.find((d: any) => d.deviceType === "luna");
      if (lunaDevice?.firmwareVersion) {
        latestFirmware = lunaDevice.firmwareVersion;
        console.log(`[AdminGlobalSummary] 📱 Using firmware from most recent session: ${latestFirmware}`);
      }
    }
  }

  if (sessions.length === 0) {
    console.log(`[AdminGlobalSummary] ⚠️  ========================================`);
    console.log(`[AdminGlobalSummary] ⚠️  NO VALID SESSIONS FOUND!`);
    console.log(`[AdminGlobalSummary] ⚠️  Returning null - no AdminGlobalSummary created`);
    console.log(`[AdminGlobalSummary] ⚠️  ========================================`);
    return null;
  }
  
  console.log(`[AdminGlobalSummary] ✅ Proceeding with ${sessions.length} sessions`);

  // Count unique users
  const uniqueUserIds = new Set(sessions.map(s => s.userId.toString()));

  // Get session IDs from filtered sessions
  const sessionIds = sessions.map(s => s._id);

  // Count total Luna readings ONLY for filtered sessions
  const totalReadings = await NormalizedReading.countDocuments({
    'meta.deviceType': 'luna',
    'meta.sessionId': { $in: sessionIds }
  });

  console.log(`[AdminGlobalSummary] 📊 Total readings for filtered sessions: ${totalReadings}`);

  // Handle Sleep metric differently (uses sleepStats instead of pairwiseComparisons)
  if (metric === 'Sleep') {
    const sessionIds = sessions.map(s => s._id);
    const analyses = await SessionAnalysis.find({
      sessionId: { $in: sessionIds },
      isValid: true,
      'sleepStats': { $exists: true },
    });

    if (analyses.length === 0) {
      console.log('⚠️ No sleep analysis data available');
      return null;
    }

    let totalAccuracy = 0;
    let totalKappa = 0;
    let totalSleepBias = 0;
    let totalDeepBias = 0;
    let totalRemBias = 0;
    let totalSleep = 0;
    let deepSum = 0;
    let remSum = 0;
    let lightSum = 0;
    let countComparison = 0;

    analyses.forEach((analysis) => {
      const sleepStats = analysis.sleepStats;
      if (!sleepStats) return;

      // Total sleep time
      if (sleepStats.totalSleepLunaSec !== undefined) {
        totalSleep += sleepStats.totalSleepLunaSec;
        deepSum += sleepStats.deepLunaSec || 0;
        remSum += sleepStats.remLunaSec || 0;
        lightSum += sleepStats.lightLunaSec || 0;
      }

      // Comparison metrics (if benchmark available)
      if (sleepStats.epochAccuracyPercent !== undefined) {
        countComparison++;
        totalAccuracy += sleepStats.epochAccuracyPercent;
        totalKappa += sleepStats.kappaScore || 0;
        totalSleepBias += sleepStats.totalSleepDiffSec || 0;
        totalDeepBias += sleepStats.deepDiffSec || 0;
        totalRemBias += sleepStats.remDiffSec || 0;
      }
    });

    const count = analyses.length;
    const avgTotalSleep = totalSleep / count;

    const summary = {
      metric,
      totalUsers: uniqueUserIds.size,
      totalSessions: sessions.length,
      totalReadings,
      sleepStats: {
        avgAccuracyPercent: countComparison > 0 ? totalAccuracy / countComparison : undefined,
        avgKappa: countComparison > 0 ? totalKappa / countComparison : undefined,
        avgTotalSleepBiasSec: countComparison > 0 ? totalSleepBias / countComparison : undefined,
        avgDeepBiasSec: countComparison > 0 ? totalDeepBias / countComparison : undefined,
        avgRemBiasSec: countComparison > 0 ? totalRemBias / countComparison : undefined,
        avgTotalSleepSec: avgTotalSleep,
        avgDeepPercent: avgTotalSleep > 0 ? (deepSum / count / avgTotalSleep) * 100 : undefined,
        avgRemPercent: avgTotalSleep > 0 ? (remSum / count / avgTotalSleep) * 100 : undefined,
      },
      latestFirmwareVersion: latestFirmware || undefined,
      computedAt: new Date(),
    };

    console.log(`[AdminGlobalSummary] 💾 Saving Sleep summary to database...`);
    console.log(`[AdminGlobalSummary]    - Deleting old document for metric: ${metric}`);
    await AdminGlobalSummary.deleteOne({ metric });
    console.log(`[AdminGlobalSummary]    - Creating new document...`);
    const result = await AdminGlobalSummary.create(summary);
    console.log(`[AdminGlobalSummary] ✅ AdminGlobalSummary (Sleep) SiasAVED to database!`);
    console.log(`[AdminGlobalSummary]    - Document ID: ${result._id}`);
    console.log(`[AdminGlobalSummary]    - Total Users: ${summary.totalUsers}`);
    console.log(`[AiasdminGlobalSummary]    - Total Sessions: ${summary.totalSessions}`);
    console.log(`[AdminGlobalSummary]    - Firmware: ${summary.latestFirmwareVersion || 'NONE'}`);
    console.log(`[AdminGlobalSummary]  ias  - Avg Accuracy: ${summary.sleepStats.avgAccuracyPercent?.toFixed(2)}%`);
    console.log(`[AdminGlobalSummary] ========================================\n`);

    return result;
  }

  // Handle Workout metric (uses workoutStats.benchmarkComparison)
  if (metric === 'Workout') {
    const sessionIds = sessions.map(s => s._id);
    
    // Count workout readings (stored in WorkoutReading, not NormalizedReading)
    const workoutTotalReadings = await WorkoutReading.countDocuments({
      'meta.deviceType': 'luna',
      'meta.sessionId': { $in: sessionIds }
    });
    
    const analyses = await SessionAnalysis.find({
      sessionId: { $in: sessionIds },
      isValid: true,
      'workoutStats': { $exists: true },
    });

    let totalMAE = 0, totalRMSE = 0, totalMAPE = 0, totalPearson = 0, totalBias = 0;
    let totalCalBias = 0, totalStepsBias = 0, totalDistBias = 0;
    let countHr = 0, countCal = 0, countSteps = 0, countDist = 0;
    let totalWorkouts = analyses.length;

    analyses.forEach((analysis) => {
      const workoutStats = (analysis as any).workoutStats;
      if (workoutStats?.benchmarkComparison) {
        const bc = workoutStats.benchmarkComparison;
        
        // HR metrics
        if (bc.hrMae !== undefined) {
          totalMAE += bc.hrMae;
          totalRMSE += bc.hrRmse || 0;
          totalMAPE += bc.hrMape || 0;
          totalPearson += bc.hrPearsonR || 0;
          totalBias += bc.hrMeanBias || 0;
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
      }
    });

    const summary: any = {
      metric,
      totalUsers: uniqueUserIds.size,
      totalSessions: totalWorkouts,
      totalReadings: workoutTotalReadings,
      lunaStats: countHr > 0 ? {
        avgMAE: totalMAE / countHr,
        avgRMSE: totalRMSE / countHr,
        avgMAPE: totalMAPE / countHr,
        avgPearson: totalPearson / countHr,
        avgBias: totalBias / countHr,
      } : undefined,
      workoutStats: {
        avgHrMae: countHr > 0 ? totalMAE / countHr : undefined,
        avgHrPearson: countHr > 0 ? totalPearson / countHr : undefined,
        avgCaloriesBias: countCal > 0 ? totalCalBias / countCal : undefined,
        avgStepsBias: countSteps > 0 ? totalStepsBias / countSteps : undefined,
        avgDistanceBias: countDist > 0 ? totalDistBias / countDist : undefined,
      },
      latestFirmwareVersion: latestFirmware || undefined,
      computedAt: new Date(),
    };

    console.log(`[AdminGlobalSummary] 💾 Saving Workout summary to database...`);
    await AdminGlobalSummary.deleteOne({ metric });
    const result = await AdminGlobalSummary.create(summary);
    console.log(`[AdminGlobalSummary] ✅ AdminGlobalSummary (Workout) SAVED!`);
    console.log(`[AdminGlobalSummary]    - Total Users: ${summary.totalUsers}`);
    console.log(`[AdminGlobalSummary]    - Total Sessions: ${summary.totalSessions}`);
    console.log(`[AdminGlobalSummary]    - Avg MAPE: ${summary.lunaStats?.avgMAPE?.toFixed(2)}%`);
    console.log(`[AdminGlobalSummary]    - Avg Cal Bias: ${summary.workoutStats?.avgCaloriesBias?.toFixed(2)}`);
    console.log(`[AdminGlobalSummary]    - Avg Steps Bias: ${summary.workoutStats?.avgStepsBias?.toFixed(0)}`);
    console.log(`[AdminGlobalSummary]    - Avg Dist Bias: ${summary.workoutStats?.avgDistanceBias?.toFixed(2)}`);

    return result;
  }

  // For HR/SPO2 metrics - use pairwiseComparisons
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

  // Convert metric to lowercase for comparison (stored as 'hr', 'spo2' in DB)
  const metricLower = metric.toLowerCase();

  analyses.forEach((analysis) => {
    // Get session to access benchmarkDeviceType
    const session = sessionMap.get(String(analysis.sessionId));
    if (!session) return;

    // Find Luna vs benchmark device comparison
    const comparison = analysis.pairwiseComparisons.find(
      (p: any) => p.d1 === 'luna' && p.d2 === session.benchmarkDeviceType && p.metric === metricLower
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
        // comparison.coverage is already 0-100 (e.g. Workout's overlapPercent,
        // HRV's coverage) — no further scaling needed.
        totalCoverage += comparison.coverage;
        countCoverage++;
      }
      if (comparison.meanBias !== undefined && comparison.meanBias !== null) {
        totalBias += comparison.meanBias;
        countBias++;
      }
    }
  });

  const summary = {
    metric,
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
    latestFirmwareVersion: latestFirmware || undefined,
    computedAt: new Date(),
  };

  // Delete existing for this metric and create new
  console.log(`[AdminGlobalSummary] 💾 Saving HR/SPO2 summary to database...`);
  console.log(`[AdminGlobalSummary]    - Deleting old document for metric: ${metric}`);
  await AdminGlobalSummary.deleteOne({ metric });
  console.log(`[AdminGlobalSummary]    - Creating new document...`);
  const result = await AdminGlobalSummary.create(summary);
  console.log(`[AdminGlobalSummary] ✅ AdminGlobalSummary (${metric}) SAVED to database!`);
  console.log(`[AdminGlobalSummary]    - Document ID: ${result._id}`);
  console.log(`[AdminGlobalSummary]    - Total Users: ${summary.totalUsers}`);
  console.log(`[AdminGlobalSummary]    - Total Sessions: ${summary.totalSessions}`);
  console.log(`[AdminGlobalSummary]    - Total Readings: ${summary.totalReadings}`);
  console.log(`[AdminGlobalSummary]    - Firmware: ${summary.latestFirmwareVersion || 'NONE'}`);
  console.log(`[AdminGlobalSummary]    - Avg MAE: ${summary.lunaStats.avgMAE?.toFixed(2)}`);
  console.log(`[AdminGlobalSummary]    - Avg RMSE: ${summary.lunaStats.avgRMSE?.toFixed(2)}`);
  console.log(`[AdminGlobalSummary]    - Avg Pearson: ${summary.lunaStats.avgPearson?.toFixed(3)}`);
  console.log(`[AdminGlobalSummary] ========================================\n`);

  return result;
}
