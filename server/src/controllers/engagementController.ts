import { Request, Response } from 'express';
import { engagementService } from '../services/engagement.service';
import DailyEngagementMetrics from '../models/DailyEngagementMetrics';
import User from '../models/Users';
import { storageService } from '../services/storage.service';
import path from 'path';
import fs from 'fs/promises';

export class EngagementController {
  
  /**
   * Upload daily logs for processing
   * POST /api/engagement/upload-logs
   * Body: multipart/form-data with files and user mappings (email instead of userId)
   * Expected format: 
   *   - files: array of log files
   *   - email_<fieldname>: user email for each file
   *   - date_<fieldname>: date for each file (optional, defaults to current date)
   */
  async uploadLogs(req: Request, res: Response): Promise<void> {
    try {
      console.log('📤 Received log upload request');
      
      // Check if files were uploaded
      if (!req.files || Object.keys(req.files).length === 0) {
        res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
        return;
      }
      
      // Parse the uploaded files and user mappings
      // Expected format: files array with metadata
      const files = req.files as any; // Type depends on your multer setup
      
      // Process each file
      const results = [];
      for (const file of Object.values(files)) {
        try {
          const fileData = file as any;
          const email = req.body[`email_${fileData.fieldname}`];
          const date = req.body[`date_${fileData.fieldname}`] || new Date();
          
          if (!email) {
            results.push({
              fileName: fileData.originalname,
              status: 'failed',
              error: 'Email not provided for this file'
            });
            continue;
          }
          
          // Find user by email
          const user = await User.findOne({ email: email.toLowerCase().trim() });
          
          if (!user) {
            results.push({
              fileName: fileData.originalname,
              email,
              status: 'failed',
              error: `User not found with email: ${email}`
            });
            continue;
          }
          
          console.log(`📝 Processing log file for user ${user.name} (${user.email}): ${fileData.path}`);
          
          // Process the log file with user's MongoDB ObjectId
          await engagementService.processLogFile(
            fileData.path,
            user._id.toString(),
            new Date(date)
          );
          
          results.push({
            fileName: fileData.originalname,
            email: user.email,
            userName: user.name,
            userId: user._id,
            status: 'success'
          });
        } catch (error: any) {
          console.error(`❌ Error processing log file ${(file as any).originalname}:`, error);
          results.push({
            fileName: (file as any).originalname,
            status: 'failed',
            error: error.message
          });
        }
      }
      
      res.status(200).json({
        success: true,
        message: 'Log upload completed',
        results
      });
      
    } catch (error: any) {
      console.error('❌ Error uploading logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to upload logs',
        error: error.message
      });
    }
  }
  
  /**
   * Get all users engagement overview
   * GET /api/engagement/users
   */
  async getAllUsersEngagement(req: Request, res: Response) {
    try {
      const engagementData = await engagementService.getAllUsersEngagement();
      
      return res.status(200).json({
        success: true,
        data: engagementData
      });
      
    } catch (error: any) {
      console.error('❌ Error fetching users engagement:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch users engagement',
        error: error.message
      });
    }
  }
  
  /**
   * Get specific user engagement details
   * GET /api/engagement/users/:userId
   */
  async getUserEngagement(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const days = parseInt(req.query.days as string) || 30;
      
      const engagementData = await engagementService.getUserEngagementSummary(userId, days);
      
      return res.status(200).json({
        success: true,
        data: engagementData
      });
      
    } catch (error: any) {
      console.error('❌ Error fetching user engagement:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch user engagement',
        error: error.message
      });
    }
  }
  
  /**
   * Get user engagement metrics for specific date range and metric type
   * GET /api/engagement/users/:userId/metrics
   */
  async getUserMetrics(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { startDate, endDate, metricType } = req.query;
      
      const query: any = { userId };
      
      if (startDate || endDate) {
        query.date = {};
        if (startDate) query.date.$gte = new Date(startDate as string);
        if (endDate) query.date.$lte = new Date(endDate as string);
      }
      
      const metrics = await DailyEngagementMetrics.find(query)
        .sort({ date: -1 })
        .limit(90); // Max 90 days
      
      // Filter by metric type if specified
      if (metricType && typeof metricType === 'string') {
        const filteredData = metrics.map(m => ({
          _id: m._id,
          userId: m.userId,
          date: m.date,
          deviceType: m.deviceType,
          engagementScore: m.engagementScore,
          [metricType]: (m as any)[metricType]
        }));
        
        return res.status(200).json({
          success: true,
          data: filteredData
        });
      }
      
      return res.status(200).json({
        success: true,
        data: metrics
      });
      
    } catch (error: any) {
      console.error('❌ Error fetching user metrics:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch user metrics',
        error: error.message
      });
    }
  }
  
  /**
   * Get inactive users (for device reclaim)
   * GET /api/engagement/inactive-users
   */
  async getInactiveUsers(req: Request, res: Response) {
    try {
      const daysThreshold = parseInt(req.query.days as string) || 14;
      
      const allUsers = await engagementService.getAllUsersEngagement();
      
      const inactiveUsers = allUsers.filter(
        user => user.consecutiveInactiveDays >= daysThreshold
      );
      
      return res.status(200).json({
        success: true,
        count: inactiveUsers.length,
        data: inactiveUsers
      });
      
    } catch (error: any) {
      console.error('❌ Error fetching inactive users:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch inactive users',
        error: error.message
      });
    }
  }
  
  /**
   * Get engagement statistics
   * GET /api/engagement/stats
   */
  async getEngagementStats(req: Request, res: Response) {
    try {
      const allUsers = await engagementService.getAllUsersEngagement();
      
      const stats = {
        totalUsers: allUsers.length,
        activeUsers: allUsers.filter(u => u.status === 'active').length,
        decliningUsers: allUsers.filter(u => u.status === 'declining').length,
        inactiveUsers: allUsers.filter(u => u.status === 'inactive').length,
        avgEngagementScore: Math.round(
          allUsers.reduce((sum, u) => sum + u.avgEngagementScore, 0) / allUsers.length
        ),
        lastUpdated: new Date()
      };
      
      return res.status(200).json({
        success: true,
        data: stats
      });
      
    } catch (error: any) {
      console.error('❌ Error fetching engagement stats:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch engagement stats',
        error: error.message
      });
    }
  }

  /**
   * Get users list (optimized for UI) - NEW
   * GET /api/engagement/users/list
   * Returns: userId, name, email, lastActiveDate, status, avgScore
   */
  async getUsersList(req: Request, res: Response) {
    try {
      const usersList = await engagementService.getUsersList();
      
      return res.status(200).json({
        success: true,
        count: usersList.length,
        data: usersList
      });
      
    } catch (error: any) {
      console.error('❌ Error fetching users list:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch users list',
        error: error.message
      });
    }
  }

  /**
   * Get user overview with all dates - NEW
   * GET /api/engagement/users/:userId/overview
   * Returns: user info + all dates with data
   */
  async getUserOverview(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      
      const overview = await engagementService.getUserOverview(userId);
      
      return res.status(200).json({
        success: true,
        data: overview
      });
      
    } catch (error: any) {
      console.error('❌ Error fetching user overview:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch user overview',
        error: error.message
      });
    }
  }

  /**
   * Get detailed metrics for specific date - NEW
   * GET /api/engagement/users/:userId/date/:date
   * Returns: all metrics for that specific date
   */
  async getUserDateMetrics(req: Request, res: Response) {
    try {
      const { userId, date } = req.params;
      
      const metrics = await engagementService.getUserDateMetrics(
        userId,
        new Date(date)
      );
      
      if (!metrics) {
        return res.status(404).json({
          success: false,
          message: 'No data found for this date'
        });
      }
      
      return res.status(200).json({
        success: true,
        data: metrics
      });
      
    } catch (error: any) {
      console.error('❌ Error fetching date metrics:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch date metrics',
        error: error.message
      });
    }
  }

  /**
   * Get metrics for date range - NEW
   * GET /api/engagement/users/:userId/range
   * Query: startDate, endDate, metricType (optional)
   */
  async getMetricsDateRange(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { startDate, endDate, metricType } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'startDate and endDate are required'
        });
      }
      
      const metrics = await engagementService.getMetricsDateRange(
        userId,
        new Date(startDate as string),
        new Date(endDate as string),
        metricType as string | undefined
      );
      
      return res.status(200).json({
        success: true,
        count: metrics.length,
        data: metrics
      });
      
    } catch (error: any) {
      console.error('❌ Error fetching date range metrics:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch date range metrics',
        error: error.message
      });
    }
  }
}

export const engagementController = new EngagementController();
