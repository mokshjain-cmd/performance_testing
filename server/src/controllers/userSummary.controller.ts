import { Request, Response } from 'express';
import UserAccuracySummary from '../models/UserAccuracySummary';
import User from '../models/Users';

// GET /api/users/summary - Get user summary
// If userId param provided (admin only), get that user's summary  
// Otherwise, get authenticated user's summary from JWT
// Query params: metric (optional, defaults to 'HR')
export const getUserOverallSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    // Admin can view any user by providing userId in URL param
    // Regular users get their own summary from JWT
    const targetUserId = req.params.userId || req.userId;
    const metric = (req.query.metric as string) || 'HR';
    
    if (!targetUserId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    
    const summary = await UserAccuracySummary.findOne({ userId: targetUserId, metric })
      .populate('userId', 'name email')
      .lean();
    
    if (!summary) {
      // Return empty summary structure for users without any sessions yet
      const user = await User.findById(targetUserId, 'name email').lean();
      res.json({ 
        success: true, 
        summary: {
          userId: user,
          metric,
          totalSessions: 0,
          overallAccuracy: {},
          activityWiseAccuracy: [],
          firmwareWiseAccuracy: [],
          bandPositionWiseAccuracy: [],
          lastUpdated: new Date()
        }
      });
      return;
    }
    
    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
