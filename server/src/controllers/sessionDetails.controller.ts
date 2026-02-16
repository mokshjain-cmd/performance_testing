import { Request, Response } from 'express';
import Session from '../models/Session';
import SessionAnalysis from '../models/SessionAnalysis';
import NormalizedReading from '../models/NormalizedReadings';

export const getSessionFullDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Get session
    const session = await Session.findById(id)
      .populate('userId', 'email name')
      .lean();
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    // Get analysis
    const analysis = await SessionAnalysis.findOne({ sessionId: id }).lean();

    // Get readings for each device in session, within session time
    const startTime = session.startTime;
    const endTime = session.endTime;
    const deviceTypes = session.devices.map((d: any) => d.deviceType);
    const points: Record<string, any[]> = {};
    const readings = await NormalizedReading.find(
    {
        'meta.sessionId': id,
        timestamp: { $gte: startTime, $lte: endTime },
    },
    {
        timestamp: 1,
        'metrics.heartRate': 1,
        'meta.deviceType': 1,
        _id: 0
    }
    )
    .sort({ timestamp: 1 })
    .lean();

    for (const reading of readings) {
        const deviceType = reading.meta.deviceType;

        if (!points[deviceType]) {
            points[deviceType] = [];
        }

        points[deviceType].push({
          timestamp: reading.timestamp,
          metrics: {
            heartRate: reading.metrics?.heartRate ?? null
          }
        });
    }

    res.json({
      success: true,
      session,
      analysis,
      points,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
