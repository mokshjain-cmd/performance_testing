import NormalizedReading from '../models/NormalizedReadings';
import SessionAnalysis from '../models/SessionAnalysis';
import Session from '../models/Session';
import { Types } from 'mongoose';
import { calcDeviceStats, calcPairwiseStats } from '../tools/analysisTools';

export async function analyzeSession(sessionId: Types.ObjectId) {
  // Get session and readings
  const session = await Session.findById(sessionId);
  if (!session) throw new Error('Session not found');
  const readings = await NormalizedReading.find({ 'meta.sessionId': sessionId });

  // Determine metric from session (HR, SPO2, etc.)
  const metric = session.metric || 'HR';

  // Group readings by deviceType
  const deviceMap: Record<string, any[]> = {};
  readings.forEach(r => {
    const device = r.meta.deviceType;
    if (!deviceMap[device]) deviceMap[device] = [];
    deviceMap[device].push(r);
  });

  // Device stats
  const deviceStats = Object.entries(deviceMap).map(([deviceType, arr]) => {
    return calcDeviceStats(deviceType, arr, metric);
  });

  // Pairwise stats - Only Luna vs other devices
  const deviceTypes = Object.keys(deviceMap);
  const pairwiseComparisons = [];
  
  // Only do pairwise analysis for Luna vs rest of the devices
  for (let i = 0; i < deviceTypes.length; i++) {
    for (let j = i + 1; j < deviceTypes.length; j++) {

      const deviceA = deviceTypes[i];
      const deviceB = deviceTypes[j];

      pairwiseComparisons.push(
        ...calcPairwiseStats(
          deviceA,
          deviceMap[deviceA],
          deviceB,
          deviceMap[deviceB],
          metric
        )
      );
    }
  }

  // Save or update analysis (upsert to prevent duplicates)
  const analysis = await SessionAnalysis.findOneAndUpdate(
    { sessionId },
    {
      sessionId,
      userId: session.userId,
      activityType: session.activityType,
      metric: session.metric,
      startTime: session.startTime,
      endTime: session.endTime,
      deviceStats,
      pairwiseComparisons,
      isValid: true,
      computedAt: new Date(),
    },
    { upsert: true, new: true }
  );
  return analysis;
}
