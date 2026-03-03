import Session from '../models/Session';
import SessionAnalysis from '../models/SessionAnalysis';
import BenchmarkComparisonSummary from '../models/BenchmarkComparisonSummary';

/**
 * Update benchmark comparison summary for a specific device type
 * Aggregates Luna vs benchmark device stats across all sessions
 * @param benchmarkDeviceType - The device type to compare against Luna (e.g., 'polar', 'coros')
 * @param metric - The metric to calculate comparison for (HR, SPO2, etc.)
 */
export async function updateBenchmarkComparisonSummary(benchmarkDeviceType: string, metric: 'HR' | 'SPO2' | 'Sleep' | 'Calories' | 'Steps' = 'HR') {
  console.log(`\n🔄 Updating BenchmarkComparisonSummary for: ${benchmarkDeviceType}, metric: ${metric}`);

  // Handle Sleep metric differently (uses sleepStats instead of pairwiseComparisons)
  if (metric === 'Sleep') {
    const analyses = await SessionAnalysis.find({
      isValid: true,
      metric: 'Sleep',
      'sleepStats': { $exists: true },
    }).populate('sessionId');

    if (analyses.length === 0) {
      console.log(`⚠️ No sleep sessions found for ${benchmarkDeviceType}`);
      return null;
    }

    // Filter for sessions with this benchmark device
    const filteredAnalyses = [];
    for (const analysis of analyses) {
      const session: any = analysis.sessionId;
      if (session && session.benchmarkDeviceType === benchmarkDeviceType) {
        filteredAnalyses.push(analysis);
      }
    }

    if (filteredAnalyses.length === 0) {
      console.log(`⚠️ No sleep sessions found with benchmark device: ${benchmarkDeviceType}`);
      return null;
    }

    let totalAccuracy = 0, totalKappa = 0, totalSleepBias = 0, totalDeepBias = 0, totalRemBias = 0;
    let countComparison = 0;

    filteredAnalyses.forEach((analysis) => {
      const sleepStats = analysis.sleepStats;
      if (!sleepStats) return;

      if (sleepStats.epochAccuracyPercent !== undefined) {
        totalAccuracy += sleepStats.epochAccuracyPercent;
        totalKappa += sleepStats.kappaScore || 0;
        totalSleepBias += sleepStats.totalSleepDiffSec || 0;
        totalDeepBias += sleepStats.deepDiffSec || 0;
        totalRemBias += sleepStats.remDiffSec || 0;
        countComparison++;
      }
    });

    const summary = {
      benchmarkDeviceType,
      metric,
      totalSessions: filteredAnalyses.length,
      sleepStats: countComparison > 0 ? {
        avgAccuracyPercent: totalAccuracy / countComparison,
        avgKappa: totalKappa / countComparison,
        avgTotalSleepBiasSec: totalSleepBias / countComparison,
        avgDeepBiasSec: totalDeepBias / countComparison,
        avgRemBiasSec: totalRemBias / countComparison,
      } : undefined,
      lastUpdated: new Date(),
    };

    const result = await BenchmarkComparisonSummary.findOneAndUpdate(
      { benchmarkDeviceType, metric },
      summary,
      { upsert: true, new: true }
    );

    console.log(`✅ BenchmarkComparisonSummary (Sleep) updated for ${benchmarkDeviceType}:`, {
      totalSessions: summary.totalSessions,
      avgAccuracyPercent: summary.sleepStats?.avgAccuracyPercent?.toFixed(2),
      avgKappa: summary.sleepStats?.avgKappa?.toFixed(3),
    });

    return result;
  }

  // For HR/SPO2 metrics - use pairwiseComparisons
  // Convert metric to lowercase for comparison (stored as 'hr', 'spo2' in DB)
  const metricLower = metric.toLowerCase();

  // Get all session analyses that have Luna vs this benchmark device comparisons for this metric
  const analyses = await SessionAnalysis.find({
    isValid: true,
    metric,
    pairwiseComparisons: {
      $elemMatch: {
        d1: 'luna',
        d2: benchmarkDeviceType,
        metric: metricLower,
      },
    },
  });

  if (analyses.length === 0) {
    console.log(`⚠️ No sessions found with Luna vs ${benchmarkDeviceType} comparisons`);
    return null;
  }

  // Aggregate stats from pairwise comparisons
  let totalMAE = 0;
  let totalRMSE = 0;
  let totalMAPE = 0;
  let totalPearson = 0;
  let totalBias = 0;
  let countMAE = 0;
  let countRMSE = 0;
  let countMAPE = 0;
  let countPearson = 0;
  let countBias = 0;

  analyses.forEach((analysis) => {
    analysis.pairwiseComparisons.forEach((comparison) => {
      // Only process Luna vs specific benchmark device
      if (
        comparison.d1 === 'luna' &&
        comparison.d2 === benchmarkDeviceType &&
        comparison.metric === metricLower
      ) {
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
        if (comparison.meanBias !== undefined && comparison.meanBias !== null) {
          totalBias += comparison.meanBias;
          countBias++;
        }
      }
    });
  });

  const summary = {
    benchmarkDeviceType,
    metric,
    totalSessions: analyses.length,
    hrStats: {
      avgMAE: countMAE > 0 ? totalMAE / countMAE : undefined,
      avgRMSE: countRMSE > 0 ? totalRMSE / countRMSE : undefined,
      avgMAPE: countMAPE > 0 ? totalMAPE / countMAPE : undefined,
      avgPearson: countPearson > 0 ? totalPearson / countPearson : undefined,
      avgBias: countBias > 0 ? totalBias / countBias : undefined,
    },
    lastUpdated: new Date(),
  };

  // Upsert the summary
  const result = await BenchmarkComparisonSummary.findOneAndUpdate(
    { benchmarkDeviceType, metric },
    summary,
    { upsert: true, new: true }
  );

  console.log(`✅ BenchmarkComparisonSummary updated for ${benchmarkDeviceType}:`, {
    totalSessions: summary.totalSessions,
    avgMAE: summary.hrStats.avgMAE?.toFixed(2),
    avgRMSE: summary.hrStats.avgRMSE?.toFixed(2),
    avgMAPE: summary.hrStats.avgMAPE?.toFixed(2),
    avgPearson: summary.hrStats.avgPearson?.toFixed(3),
    avgBias: summary.hrStats.avgBias?.toFixed(2),
  });

  return result;
}

/**
 * Update benchmark comparison summaries for all devices used in a session
 * @param sessionId - The session ID to process
 */
export async function updateBenchmarkComparisonSummariesForSession(sessionId: any) {
  console.log(`\n🔄 Updating BenchmarkComparisonSummaries for session: ${sessionId}`);

  // Get the session analysis
  const analysis = await SessionAnalysis.findOne({ sessionId }).populate('sessionId');

  if (!analysis) {
    console.log('⚠️ No analysis found for this session');
    return [];
  }

  const metric = analysis.metric || 'HR';
  const session: any = analysis.sessionId;

  // Handle Sleep metric
  if (metric === 'Sleep' && session && session.benchmarkDeviceType) {
    const result = await updateBenchmarkComparisonSummary(session.benchmarkDeviceType, metric);
    return result ? [result] : [];
  }

  // For HR/SPO2 - use pairwiseComparisons
  if (!analysis.pairwiseComparisons || analysis.pairwiseComparisons.length === 0) {
    console.log('⚠️ No pairwise comparisons found for this session');
    return [];
  }

  // Extract unique benchmark device types (d2) from Luna comparisons
  const benchmarkDevices = new Set<string>();
  analysis.pairwiseComparisons.forEach((comparison) => {
    if (comparison.d1 === 'luna' && comparison.d2 && comparison.d2 !== 'luna') {
      benchmarkDevices.add(comparison.d2);
    }
  });

  // Update summary for each benchmark device
  const results = [];
  for (const deviceType of benchmarkDevices) {
    const result = await updateBenchmarkComparisonSummary(deviceType, metric);
    if (result) {
      results.push(result);
    }
  }

  console.log(`✅ Updated ${results.length} BenchmarkComparisonSummaries`);
  return results;
}
