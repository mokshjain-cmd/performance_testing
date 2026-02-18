import FirmwarePerformance, { IFirmwarePerformance } from '../models/FirmwarePerformance';
import Session from '../models/Session';
import SessionAnalysis from '../models/SessionAnalysis';
import { Types } from 'mongoose';

/**
 * Update or create the FirmwarePerformance document for a Luna firmware version.
 * Should be called after session analysis and user accuracy summary update.
 */
export async function updateFirmwarePerformanceForLuna(firmwareVersion: string) {
  // Find all sessions and analyses for Luna with this firmware
  const sessions = await Session.find({ 'devices.deviceType': 'luna', 'devices.firmwareVersion': firmwareVersion }).lean();
  if (!sessions.length) return;
  const sessionIds = sessions.map(s => s._id);
  const analyses = await SessionAnalysis.find({ sessionId: { $in: sessionIds } }).lean();
  if (!analyses.length) return;

  // Helper: get session by id
  const sessionMap = new Map(sessions.map(s => [String(s._id), s]));

  // Aggregate overall accuracy
  let totalMAE = 0, totalRMSE = 0, totalPearson = 0, totalMAPE = 0, count = 0;
  const activityMap = new Map<string, { sum: number, count: number }>();
  const userSet = new Set<string>();

  for (const analysis of analyses) {
    // Get session to access benchmarkDeviceType
    const session = sessionMap.get(String(analysis.sessionId));
    if (!session) continue;
    
    // Find the Luna vs benchmark device comparison
    const pair = analysis.pairwiseComparisons?.find(
      (p: any) => p.d1 === 'luna' && p.d2 === session.benchmarkDeviceType
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
        { firmwareVersion },
        doc,
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }catch(err){
    console.error('Error updating firmware performance for Luna version:', firmwareVersion, err);
    return;
  }
  
  console.log('Firmware performance updated for Luna version:', firmwareVersion);
}
