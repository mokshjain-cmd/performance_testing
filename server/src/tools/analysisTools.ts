import ss from "simple-statistics";

/**
 * Calculate per-device statistics
 */
export function calcDeviceStats(deviceType: string, readings: any[]) {
  if (!readings?.length) {
    return { deviceType };
  }

  const firmwareVersion = readings[0]?.meta?.firmwareVersion;

  const totalSamples = readings.length;

  const hrArr = readings
    .map(r => r.metrics?.heartRate)
    .filter((v: number | null | undefined) => v !== null && v !== undefined);

  const validSamples = hrArr.length;
  const nullSamples = totalSamples - validSamples;
  const dropRate = totalSamples ? nullSamples / totalSamples : 0;

  const availability = totalSamples
    ? validSamples / totalSamples
    : 0;

  return {
    deviceType,
    firmwareVersion,
    totalSamples,
    validSamples,
    nullSamples,
    dropRate,
    availability,
    hr: hrArr.length
      ? {
          min: ss.min(hrArr),
          max: ss.max(hrArr),
          avg: ss.mean(hrArr),
          median: ss.median(hrArr),
          stdDev: ss.standardDeviation(hrArr),
          range: ss.max(hrArr) - ss.min(hrArr),
        }
      : undefined,
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
  toleranceMs: number = 1000 // default ±1 sec
) {
  if (!arr1?.length || !arr2?.length) {
    return [{ d1, d2, metric: "hr", matchedTimestamps: 0 }];
  }

  // Sort by timestamp
  const sorted1 = [...arr1].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  const sorted2 = [...arr2].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  let i = 0;
  let j = 0;

  const matched: [number, number][] = [];

  while (i < sorted1.length && j < sorted2.length) {
    const t1 = sorted1[i].timestamp.getTime();
    const t2 = sorted2[j].timestamp.getTime();

    const v1 = sorted1[i].metrics?.heartRate;
    const v2 = sorted2[j].metrics?.heartRate;

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
    return [{ d1, d2, metric: "hr", matchedTimestamps: 0 }];
  }

  const arrA = matched.map(([a]) => a);
  const arrB = matched.map(([, b]) => b);

  const diffs = arrA.map((a, i) => a - arrB[i]);

    // Calculate MAE manually since ss.meanAbsoluteError does not exist
    const mae = arrA.length ? arrA.reduce((sum, a, i) => sum + Math.abs(a - arrB[i]), 0) / arrA.length : 0;
    const rmse = ss.rootMeanSquare(diffs);
    const pearsonR = ss.sampleCorrelation(arrA, arrB);
  const rSquared = pearsonR * pearsonR;
  const meanBias = ss.mean(diffs);
  const sdDiff = ss.standardDeviation(diffs);

  const upperLoA = meanBias + 1.96 * sdDiff;
  const lowerLoA = meanBias - 1.96 * sdDiff;

  const totalValidD1 = arr1.filter(
    r => r.metrics?.heartRate !== null && r.metrics?.heartRate !== undefined
  ).length;

  const totalValidD2 = arr2.filter(
    r => r.metrics?.heartRate !== null && r.metrics?.heartRate !== undefined
  ).length;

  const coverageVsD1 = totalValidD1 ? n / totalValidD1 : 0;
  const coverageVsD2 = totalValidD2 ? n / totalValidD2 : 0;

  return [
    {
      d1,
      d2,
      metric: "hr",
      matchedTimestamps: n,
      toleranceMs,
      mae,
      rmse,
      pearsonR,
      rSquared,
      meanBias,
      sdDiff,
      upperLoA,
      lowerLoA,
      coverageVsD1,
      coverageVsD2,
    },
  ];
}
