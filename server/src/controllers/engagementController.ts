import { Request, Response } from 'express';
import { engagementService } from '../services/engagement.service';
import DailyEngagementMetrics from '../models/DailyEngagementMetrics';
import User from '../models/Users';
import { storageService } from '../services/storage.service';
import path from 'path';
import fs from 'fs/promises';

export class EngagementController {
  
  /**
   * Upload daily logs for processing (ASYNC - Returns immediately after validation)
   * POST /api/engagement/upload-logs
   * Body: multipart/form-data with files and user mappings (email instead of userId)
   * Expected format: 
   *   - files: array of log files
   *   - email_<fieldname>: user email for each file
   *   - date_<fieldname>: date for each file (optional, defaults to current date)
   * 
   * Processing happens in background - check server logs for results
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
      const files = req.files as any;
      
      // Quick validation: Check users exist and metadata is present
      const validatedFiles = [];
      const rejectedFiles = [];
      
      for (const file of Object.values(files)) {
        const fileData = file as any;
        const email = req.body[`email`];
        const date = req.body[`date_${fileData.fieldname}`] || new Date();
        
        // Validate email provided
        if (!email) {
          rejectedFiles.push({
            fileName: fileData.originalname,
            reason: 'Email not provided for this file'
          });
          // Delete rejected file immediately
          await fs.unlink(fileData.path).catch((err) => 
            console.error(`Failed to delete rejected file: ${fileData.path}`, err)
          );
          continue;
        }
        
        // Verify user exists
        const user = await User.findOne({ email: email.toLowerCase().trim() });
        
        if (!user) {
          rejectedFiles.push({
            fileName: fileData.originalname,
            email,
            reason: `User not found with email: ${email}`
          });
          // Delete rejected file immediately
          await fs.unlink(fileData.path).catch((err) => 
            console.error(`Failed to delete rejected file: ${fileData.path}`, err)
          );
          continue;
        }
        
        // File is valid - add to processing queue
        validatedFiles.push({
          filePath: fileData.path,
          fileName: fileData.originalname,
          userId: user._id.toString(),
          userName: user.name,
          email: user.email,
          date: new Date(date)
        });
      }
      
      // Return response immediately after validation
      const allRejected = validatedFiles.length === 0;
      const allAccepted = rejectedFiles.length === 0;
      
      res.status(allRejected ? 400 : 202).json({
        success: !allRejected,
        message: allRejected 
          ? 'All files rejected. Please check validation errors.'
          : allAccepted
            ? 'All files accepted for processing. Processing will continue in background.'
            : 'Some files accepted for processing. Check rejected files for errors.',
        accepted: validatedFiles.length,
        rejected: rejectedFiles.length,
        acceptedFiles: validatedFiles.map(f => ({
          fileName: f.fileName,
          email: f.email,
          userName: f.userName
        })),
        rejectedFiles: rejectedFiles,
        note: allRejected ? 'Fix validation errors and retry' : 'Check server logs for processing results'
      });
      
      // Process files in background (fire-and-forget)
      if (validatedFiles.length > 0) {
        this.processFilesInBackground(validatedFiles);
      }
      
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
   * Process files in background (async - no client response)
   * Handles parsing, DB save, and file cleanup
   */
  private async processFilesInBackground(
    files: Array<{
      filePath: string;
      fileName: string;
      userId: string;
      userName: string;
      email: string;
      date: Date;
    }>
  ): Promise<void> {
    console.log(`🔄 Starting background processing for ${files.length} files`);
    
    for (const fileInfo of files) {
      try {
        console.log(`📝 Processing log file for user ${fileInfo.userName} (${fileInfo.email}): ${fileInfo.filePath}`);
        
        // Parse and save to database
        await engagementService.processLogFile(
          fileInfo.filePath,
          fileInfo.userId,
          fileInfo.date
        );
        
        console.log(`✅ Successfully processed ${fileInfo.fileName} for ${fileInfo.email}`);
        
        // TODO: Upload to GCS for archival before deletion
        // await storageService.uploadFile(fileInfo.filePath, `engagement-logs/${fileInfo.date}/${fileInfo.email}/`);
        
        // Delete the local file after successful processing
        await fs.unlink(fileInfo.filePath);
        console.log(`🗑️  Deleted local file: ${fileInfo.filePath}`);
        
      } catch (error: any) {
        console.error(`❌ BACKGROUND PROCESSING FAILED for ${fileInfo.fileName} (${fileInfo.email}):`, error);
        console.error(`   File path: ${fileInfo.filePath}`);
        console.error(`   Error details:`, error.message);
        
        // Keep file for debugging if processing failed
        console.warn(`⚠️  Keeping file for manual review: ${fileInfo.filePath}`);
      }
    }
    
    console.log(`🏁 Background processing completed for ${files.length} files`);
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
