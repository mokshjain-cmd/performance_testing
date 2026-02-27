import ss from "simple-statistics";

/**
 * Calculate per-device statistics
 */
export function calcDeviceStats(deviceType: string, readings: any[], metric: string = 'HR') {
  if (!readings?.length) {
    return { deviceType };
  }

  const firmwareVersion = readings[0]?.meta?.firmwareVersion;

  const totalSamples = readings.length;

  // Extract values based on metric type
  let valueArr: number[] = [];
  let metricKey = '';
  
  if (metric === 'HR') {
    metricKey = 'hr';
    valueArr = readings
      .map(r => r.metrics?.heartRate)
      .filter((v: number | null | undefined) => v !== null && v !== undefined);
  } else if (metric === 'SPO2') {
    metricKey = 'spo2';
    valueArr = readings
      .map(r => r.metrics?.spo2)
      .filter((v: number | null | undefined) => v !== null && v !== undefined);
  } else if (metric === 'Sleep') {
    metricKey = 'sleep';
    valueArr = readings
      .map(r => r.metrics?.sleep)
      .filter((v: number | null | undefined) => v !== null && v !== undefined);
  } else if (metric === 'Calories') {
    metricKey = 'calories';
    valueArr = readings
      .map(r => r.metrics?.calories)
      .filter((v: number | null | undefined) => v !== null && v !== undefined);
  } else if (metric === 'Steps') {
    metricKey = 'steps';
    valueArr = readings
      .map(r => r.metrics?.steps)
      .filter((v: number | null | undefined) => v !== null && v !== undefined);
  }



  const validSamples = valueArr.length;
  const nullSamples = totalSamples - validSamples;
  const dropRate = totalSamples ? nullSamples / totalSamples : 0;

  const availability = totalSamples
    ? validSamples / totalSamples
    : 0;

  const stats: any = {
    deviceType,
    firmwareVersion,
    totalSamples,
    validSamples,
    nullSamples,
    dropRate,
    availability,
  };

  // Add metric-specific statistics
  if (valueArr.length) {
    stats[metricKey] = {
      min: ss.min(valueArr),
      max: ss.max(valueArr),
      avg: ss.mean(valueArr),
      median: ss.median(valueArr),
      stdDev: ss.standardDeviation(valueArr),
      range: ss.max(valueArr) - ss.min(valueArr),
    };
  }

  return stats;
}

/**
 * Calculate Bland-Altman plot data
 * Used to assess agreement between two measurement methods
 */
export function calcBlandAltman(values1: number[], values2: number[]) {
  if (!values1?.length || !values2?.length || values1.length !== values2.length) {
    return null;
  }

  const differences: number[] = [];
  const averages: number[] = [];

  // Calculate differences and averages for each paired measurement
  for (let i = 0; i < values1.length; i++) {
    if (values1[i] != null && values2[i] != null) {
      const diff = values1[i] - values2[i];
      const avg = (values1[i] + values2[i]) / 2;
      differences.push(diff);
      averages.push(avg);
    }
  }

  if (differences.length === 0) return null;

  // Calculate mean difference (bias)
  const meanDifference = differences.reduce((sum, d) => sum + d, 0) / differences.length;

  // Calculate standard deviation of differences
  const variance = differences.reduce((sum, d) => sum + Math.pow(d - meanDifference, 2), 0) / differences.length;
  const stdDifference = Math.sqrt(variance);

  // Calculate limits of agreement (mean ± 1.96 * SD)
  const upperLimit = meanDifference + 1.96 * stdDifference;
  const lowerLimit = meanDifference - 1.96 * stdDifference;

  // Calculate percentage of points within limits (should be ~95%)
  const withinLimits = differences.filter(d => d >= lowerLimit && d <= upperLimit).length;
  const percentageInLimits = (withinLimits / differences.length) * 100;

  return {
    differences,
    averages,
    meanDifference,
    stdDifference,
    upperLimit,
    lowerLimit,
    percentageInLimits,
  };
}

/**
 * Pairwise device comparison with tolerance matching
 */
export function calcPairwiseStats(
  d1: string,
  arr1: any[],
  d2: string,
  arr2: any[],
  metric: string = 'HR',
  toleranceMs: number = 1000 // default ±1 sec
) {
  const metricLower = metric.toLowerCase();
  
  if (!arr1?.length || !arr2?.length) {
    return [{ d1, d2, metric: metricLower, matchedTimestamps: 0 }];
  }

  // Sort by timestamp
  const sorted1 = [...arr1].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const sorted2 = [...arr2].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  let i = 0;
  let j = 0;

  const matched: [number, number][] = [];

  // Determine which metric field to extract
  const getMetricValue = (reading: any) => {
    if (metric === 'HR') return reading.metrics?.heartRate;
    if (metric === 'SPO2') return reading.metrics?.spo2;
    if (metric === 'Sleep') return reading.metrics?.sleep;
    if (metric === 'Calories') return reading.metrics?.calories;
    if (metric === 'Steps') return reading.metrics?.steps;
    return null;
  };

  while (i < sorted1.length && j < sorted2.length) {
    const t1 = sorted1[i].timestamp.getTime();
    const t2 = sorted2[j].timestamp.getTime();

    const v1 = getMetricValue(sorted1[i]);
    const v2 = getMetricValue(sorted2[j]);

    if (Math.abs(t1 - t2) <= toleranceMs) {
      if (
        v1 !== null &&
        v2 !== null &&
        v1 !== undefined &&
        v2 !== undefined
      ) {
        matched.push([v1, v2]);
      }
      i++;
      j++;
    } else if (t1 < t2) {
      i++;
    } else {
      j++;
    }
  }

  const n = matched.length;

  if (!n) {
    return [{ d1, d2, metric: metricLower, matchedTimestamps: 0 }];
  }

  const arrA = matched.map(([a]) => a);
  const arrB = matched.map(([, b]) => b);

  const diffs = arrA.map((a, i) => a - arrB[i]);

  // Calculate MAE manually since ss.meanAbsoluteError does not exist
  const mae = arrA.length ? arrA.reduce((sum, a, i) => sum + Math.abs(a - arrB[i]), 0) / arrA.length : 0;
  
  // Calculate MAPE (Mean Absolute Percentage Error)
  // MAPE = (1/n) * Σ(|actual - predicted| / |actual|) * 100
  // Using arrB as actual (reference device) and arrA as predicted (test device)
  const mape = arrB.length 
    ? arrB.reduce((sum, actual, i) => {
        if (actual !== 0) { // Avoid division by zero
          return sum + (Math.abs(actual - arrA[i]) / Math.abs(actual));
        }
        return sum;
      }, 0) / arrB.length * 100 
    : 0;
  
  const rmse = ss.rootMeanSquare(diffs);
  let pearsonR = ss.sampleCorrelation(arrA, arrB);
  
  // Handle NaN case (occurs when one or both arrays have no variance)
  if (isNaN(pearsonR)) {
    console.log(`⚠️ Pearson correlation is NaN (likely due to constant values), setting to null`);
    pearsonR = null as any;
  }
  
  const rSquared = pearsonR !== null ? pearsonR * pearsonR : null;
  const meanBias = ss.mean(diffs);
  const sdDiff = ss.standardDeviation(diffs);

  const upperLoA = meanBias + 1.96 * sdDiff;
  const lowerLoA = meanBias - 1.96 * sdDiff;

  const totalValidD1 = arr1.filter(
    r => {
      const val = getMetricValue(r);
      return val !== null && val !== undefined;
    }
  ).length;

  const totalValidD2 = arr2.filter(
    r => {
      const val = getMetricValue(r);
      return val !== null && val !== undefined;
    }
  ).length;

  const coverageVsD1 = totalValidD1 ? n / totalValidD1 : 0;
  const coverageVsD2 = totalValidD2 ? n / totalValidD2 : 0;

  // Calculate Bland-Altman data for agreement assessment
  const blandAltman = calcBlandAltman(arrA, arrB);

  return [
    {
      d1,
      d2,
      metric: metricLower,
      matchedTimestamps: n,
      toleranceMs,
      mae,
      rmse,
      mape,
      pearsonR,
      rSquared,
      meanBias,
      sdDiff,
      upperLoA,
      lowerLoA,
      coverageVsD1,
      coverageVsD2,
      blandAltman,
    },
  ];
}
