import UserAccuracySummary, { IUserAccuracySummary } from '../models/UserAccuracySummary';
import Session from '../models/Session';
import SessionAnalysis from '../models/SessionAnalysis';
import { Types } from 'mongoose';

/**
 * Recalculate and update the UserAccuracySummary for a user.
 * Call this after a new session analysis is created or updated.
 * @param userId - The user ID to update summary for
 * @param metric - The metric to calculate summary for (HR, SPO2, etc.)
 */
export async function updateUserAccuracySummary(userId: Types.ObjectId | string, metric: 'HR' | 'SPO2' | 'Sleep' | 'Calories' | 'Steps' = 'HR') {
  // Get all sessions for the user with this metric
  const sessions = await Session.find({ userId, metric }).lean();
  
  // If no sessions remain, delete the UserAccuracySummary document
  if (!sessions.length) {
    await UserAccuracySummary.deleteOne({ userId, metric });
    console.log(`✅ Deleted UserAccuracySummary for user ${userId} metric ${metric} (no sessions remaining)`);
    return;
  }

  // Get all analyses for the user's sessions
  const sessionIds = sessions.map(s => s._id);
  const analyses = await SessionAnalysis.find({ sessionId: { $in: sessionIds } }).lean();
  
  // If no analyses, update with basic session count only
  if (!analyses.length) {
    await UserAccuracySummary.findOneAndUpdate(
      { userId, metric },
      {
        userId: new Types.ObjectId(userId),
        metric,
        totalSessions: sessions.length,
        activityWiseAccuracy: [],
        firmwareWiseAccuracy: [],
        bandPositionWiseAccuracy: [],
        lastUpdated: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`✅ Updated UserAccuracySummary for user ${userId} metric ${metric} (sessions exist but no analyses yet)`);
    return;
  }

  // Helper: get session by id
  const sessionMap = new Map(sessions.map(s => [String(s._id), s]));

  // Convert metric to lowercase for comparison (stored as 'hr', 'spo2' in DB)
  const metricLower = metric.toLowerCase();

  // Overall accuracy (averages)
  let totalMAE = 0, totalRMSE = 0, totalPearson = 0, totalMAPE = 0, count = 0;
  let bestSession: any = null;
  let worstSession: any = null;
  let bestAccuracy = Infinity; // Lower MAPE is better
  let worstAccuracy = -Infinity; // Higher MAPE is worse

  // For activity, firmware, band position
  const activityMap = new Map<string, { sum: number, count: number, duration: number }>();
  const firmwareMap = new Map<string, { sum: number, count: number }>();
  const bandMap = new Map<string, { sum: number, count: number, duration: number }>();

  for (const analysis of analyses) {
    // Get session to access benchmarkDeviceType
    const session = sessionMap.get(String(analysis.sessionId));
    if (!session) continue;
    const duration = (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000;
    
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
      
      // For best session (lower MAPE = higher accuracy)
      if (pair.mape < bestAccuracy) {
        bestAccuracy = pair.mape;
        bestSession = {
          sessionId: analysis.sessionId,
          activityType: session.activityType,
          accuracyPercent: sessionAccuracy,
        };
      }
      
      // For worst session (higher MAPE = lower accuracy)
      if (pair.mape > worstAccuracy) {
        worstAccuracy = pair.mape;
        worstSession = {
          sessionId: analysis.sessionId,
          activityType: session.activityType,
          accuracyPercent: sessionAccuracy,
        };
      }
      // Activity
      if (session.activityType) {
        const a = activityMap.get(session.activityType) || { sum: 0, count: 0, duration: 0 };
        a.sum += sessionAccuracy;
        a.count++;
        a.duration += duration;
        activityMap.set(session.activityType, a);
      }
      // Firmware
        // --- Firmware (ONLY for Luna watch under test) ---
        const lunaDevice = (analysis.deviceStats || []).find(
        (stat: any) =>
            stat.deviceType?.toLowerCase() === 'luna'
        );

        if (lunaDevice?.firmwareVersion) {
        const firmwareVersion = lunaDevice.firmwareVersion;

        const f = firmwareMap.get(firmwareVersion) || {
            sum: 0,
            count: 0,
        };

        f.sum += sessionAccuracy; // session accuracy from MAPE
        f.count += 1;             // count session once
        firmwareMap.set(firmwareVersion, f);
        }

      // Band position
      if (session.bandPosition) {
        const b = bandMap.get(session.bandPosition) || { sum: 0, count: 0, duration: 0 };
        b.sum += sessionAccuracy;
        b.count++;
        b.duration += duration;
        bandMap.set(session.bandPosition, b);
      }
    }
  }

  // Prepare summary doc
  const summary: Partial<IUserAccuracySummary> = {
    userId: new Types.ObjectId(userId),
    metric,
    totalSessions: sessions.length,
    overallAccuracy: count ? {
      avgMAE: totalMAE / count,
      avgRMSE: totalRMSE / count,
      avgPearson: totalPearson / count,
      avgMAPE: totalMAPE / count,
    } : undefined,
    bestSession: bestSession || undefined,
    worstSession: worstSession || undefined,
    activityWiseAccuracy: Array.from(activityMap.entries()).map(([activityType, v]) => ({
      activityType,
      avgAccuracy: v.count ? v.sum / v.count : 0,
      totalSessions: v.count,
      totalDurationSec: v.duration,
    })),
    firmwareWiseAccuracy: Array.from(firmwareMap.entries()).map(([firmwareVersion, v]) => ({
      firmwareVersion,
      avgAccuracy: v.count ? v.sum / v.count : 0,
      totalSessions: v.count,
    })),
    bandPositionWiseAccuracy: Array.from(bandMap.entries()).map(([bandPosition, v]) => ({
      bandPosition,
      avgAccuracy: v.count ? v.sum / v.count : 0,
      totalSessions: v.count,
      totalDurationSec: v.duration,
    })),
    lastUpdated: new Date(),
  };

  // Upsert summary
  await UserAccuracySummary.findOneAndUpdate(
    { userId, metric },
    summary,
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}
