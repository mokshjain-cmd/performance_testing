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

  // Group readings by deviceType
  const deviceMap: Record<string, any[]> = {};
  readings.forEach(r => {
    const device = r.meta.deviceType;
    if (!deviceMap[device]) deviceMap[device] = [];
    deviceMap[device].push(r);
  });

  // Device stats
  const deviceStats = Object.entries(deviceMap).map(([deviceType, arr]) =>
    calcDeviceStats(deviceType, arr)
  );

  // Pairwise stats - Only Luna vs other devices
  const deviceTypes = Object.keys(deviceMap);
  const pairwiseComparisons = [];
  
  // Only do pairwise analysis for Luna vs rest of the devices
  if (deviceMap['luna']) {
    for (const deviceType of deviceTypes) {
      if (deviceType !== 'luna') {
        pairwiseComparisons.push(
          ...calcPairwiseStats('luna', deviceMap['luna'], deviceType, deviceMap[deviceType])
        );
      }
    }
  }

  // Save analysis
  const analysis = await SessionAnalysis.create({
    sessionId,
    userId: session.userId,
    activityType: session.activityType,
    startTime: session.startTime,
    endTime: session.endTime,
    deviceStats,
    pairwiseComparisons,
    isValid: true,
    computedAt: new Date(),
  });
  return analysis;
}
