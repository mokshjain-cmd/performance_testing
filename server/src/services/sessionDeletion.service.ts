import Session from '../models/Session';
import SessionAnalysis from '../models/SessionAnalysis';
import NormalizedReading from '../models/NormalizedReadings';
import SleepStageEpoch from '../models/SleepStageEpoch';
import { Types } from 'mongoose';
import { updateUserAccuracySummary } from './userAccuracySummary.service';
import { updateFirmwarePerformanceForLuna } from './firmwarePerformance.service';
import { updateActivityPerformanceSummary } from './activityPerformanceSummary.service';
import { updateAdminDailyTrend } from './adminDailyTrend.service';
import { updateAdminGlobalSummary } from './adminGlobalSummary.service';
import { updateBenchmarkComparisonSummary } from './benchmarkComparisonSummary.service';
import storageService from './storage.service';

/**
 * Delete a session and all related data, then recalculate summaries
 */
export async function deleteSession(sessionId: Types.ObjectId | string) {
  // 1. Find the session first to get metadata
  const session = await Session.findById(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }

  const userId = session.userId;
  const activityType = session.activityType;
  const metric = session.metric || 'HR';
  const startTime = session.startTime;
  
  // Find Luna firmware version used in this session (only one version per session)
  const lunaDevice = session.devices?.find(d => d.deviceType === 'luna');
  const firmwareVersion = lunaDevice?.firmwareVersion;

  // Get benchmark devices used in this session for later recalculation
  const benchmarkDevices = session.devices
    ?.filter(d => d.deviceType !== 'luna')
    .map(d => d.deviceType) || [];

  // 2. Delete raw files from Google Cloud Storage
  if(process.env.ENV==='production') {
    try {
        console.log(`🗑️ Deleting raw files from GCS for session ${sessionId}`);
        await storageService.deleteSessionFiles(sessionId.toString());
        console.log(`✅ Raw files deleted from GCS for session ${sessionId}`);
      } catch (error) {
        console.error(`⚠️ Error deleting raw files from GCS:`, error);
        // Continue with deletion even if GCS deletion fails
      }
  }
  

  // 3. Delete all related data
  await Promise.all([
    // Delete normalized readings (for HR/SPO2/etc.)
    NormalizedReading.deleteMany({ 'meta.sessionId': sessionId }),
    
    // Delete sleep stage epochs (for Sleep sessions)
    SleepStageEpoch.deleteMany({ 'meta.sessionId': sessionId }),
    
    // Delete session analysis
    SessionAnalysis.deleteOne({ sessionId }),
    
    // Delete the session itself
    Session.deleteOne({ _id: sessionId })
  ]);

  console.log(`✅ Deleted session ${sessionId} and all related data`);

  // 4. Recalculate user accuracy summary
  if (userId) {
    await updateUserAccuracySummary(userId as Types.ObjectId, metric);
    console.log(`✅ Recalculated user accuracy summary for user ${userId} metric ${metric}`);
  }

  // 5. Recalculate firmware performance for affected Luna firmware version
  if (firmwareVersion) {
    await updateFirmwarePerformanceForLuna(firmwareVersion, metric);
    console.log(`✅ Recalculated firmware performance for version ${firmwareVersion} metric ${metric}`);
  }

  // 6. Recalculate activity performance summary (only for HR sessions)
  if (activityType && metric === 'HR') {
    await updateActivityPerformanceSummary(activityType);
    console.log(`✅ Recalculated activity performance for ${activityType}`);
  }

  // 7. Recalculate admin daily trend for session date
  if (startTime) {
    await updateAdminDailyTrend(startTime, metric, true);
    console.log(`✅ Recalculated admin daily trend for session date metric ${metric}`);
  }

  // 8. Recalculate benchmark comparison summaries for devices used in this session
  for (const deviceType of benchmarkDevices) {
    await updateBenchmarkComparisonSummary(deviceType, metric);
    console.log(`✅ Recalculated benchmark comparison for ${deviceType} metric ${metric}`);
  }

  // 9. Recalculate admin global summary (filtered by latest firmware)
  await updateAdminGlobalSummary(metric, true);
  console.log(`✅ Recalculated admin global summary for metric ${metric}`);

  return {
    success: true,
    deletedSessionId: sessionId,
    recalculated: {
      userId: userId,
      firmwareVersion: firmwareVersion,
      activityType: activityType,
      benchmarkDevices: benchmarkDevices,
    }
  };
}
