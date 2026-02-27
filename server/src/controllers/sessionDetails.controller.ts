import { Request, Response } from 'express';
import Session from '../models/Session';
import SessionAnalysis from '../models/SessionAnalysis';
import NormalizedReading from '../models/NormalizedReadings';

export const getSessionFullDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    // Get session
    const session = await Session.findById(id)
      .populate('userId', 'email name')
      .lean();
    if (!session) {
      res.status(404).json({ success: false, message: 'Session not found' });
      return;
    }

    // Get analysis
    const analysis = await SessionAnalysis.findOne({ sessionId: id }).lean();

    // Get readings for each device in session, within session time
    const startTime = session.startTime;
    const endTime = session.endTime;
    const deviceTypes = session.devices.map((d: any) => d.deviceType);
    const points: Record<string, any[]> = {};
    
    // Determine which metric to fetch based on session's metric field
    const metric = session.metric || 'HR';
    
    // Build projection based on metric type
    const projection: any = {
      timestamp: 1,
      'meta.deviceType': 1,
      _id: 0
    };
    
    // Add appropriate metric field to projection
    if (metric === 'HR') {
      projection['metrics.heartRate'] = 1;
    } else if (metric === 'SPO2') {
      projection['metrics.spo2'] = 1;
    } else if (metric === 'Sleep') {
      projection['metrics.sleep'] = 1;
    } else if (metric === 'Calories') {
      projection['metrics.calories'] = 1;
    } else if (metric === 'Steps') {
      projection['metrics.steps'] = 1;
    } else {
      // Default to heartRate if unknown metric
      projection['metrics.heartRate'] = 1;
    }
    
    const readings = await NormalizedReading.find(
      {
        'meta.sessionId': id,
        timestamp: { $gte: startTime, $lte: endTime },
      },
      projection
    )
    .sort({ timestamp: 1 })
    .lean();

    // Build points object with appropriate metric data
    for (const reading of readings) {
      const deviceType = reading.meta.deviceType;

      if (!points[deviceType]) {
        points[deviceType] = [];
      }

      // Create metrics object with the appropriate metric value
      const metricsData: any = {};
      const metricsObj = reading.metrics as any;
      
      if (metric === 'HR') {
        metricsData.heartRate = metricsObj?.heartRate ?? null;
      } else if (metric === 'SPO2') {
        metricsData.spo2 = metricsObj?.spo2 ?? null;
      } else if (metric === 'Sleep') {
        metricsData.sleep = metricsObj?.sleep ?? null;
      } else if (metric === 'Calories') {
        metricsData.calories = metricsObj?.calories ?? null;
      } else if (metric === 'Steps') {
        metricsData.steps = metricsObj?.steps ?? null;
      } else {
        // Default to heartRate
        metricsData.heartRate = metricsObj?.heartRate ?? null;
      }

      points[deviceType].push({
        timestamp: reading.timestamp,
        metrics: metricsData
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
