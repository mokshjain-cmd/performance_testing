import { Request, Response } from 'express';
import UserAccuracySummary from '../models/UserAccuracySummary';
import User from '../models/Users';

// GET /api/user-summary/:userId
export const getUserOverallSummary = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const summary = await UserAccuracySummary.findOne({ userId })
      .populate('userId', 'name email')
      .lean();
    if (!summary) {
      return res.status(404).json({ success: false, message: 'No summary found for user' });
    }
    res.json({ success: true, summary });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
