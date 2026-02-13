import { Request, Response, NextFunction } from 'express';
import { SessionService } from '../services/session.service';
import path from 'path';

export class SessionController {
  private sessionService: SessionService;

  constructor() {
    this.sessionService = new SessionService();
  }

  /**
   * Create a new session with device files
   * Expects multipart/form-data with:
   * - sessionName, activity, startTime, endTime
   * - deviceTypes[] - array of device types
   * - deviceFiles[] - array of raw files (matched by index with deviceTypes)
   */
  public createSession = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { sessionName, activity, startTime, endTime, deviceTypes } = req.body;

      // Validation
      if (!sessionName || !activity || !startTime || !endTime) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: sessionName, activity, startTime, endTime'
        });
        return;
      }

      if (!deviceTypes || (Array.isArray(deviceTypes) ? deviceTypes.length === 0 : !deviceTypes)) {
        res.status(400).json({
          success: false,
          message: 'At least one device type is required'
        });
        return;
      }

      // Get uploaded files
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No files uploaded. Please upload device raw files'
        });
        return;
      }

      // Parse deviceTypes (could be string or array)
      const deviceTypesArray = Array.isArray(deviceTypes) 
        ? deviceTypes 
        : [deviceTypes];

      // Validate file count matches device count
      if (files.length !== deviceTypesArray.length) {
        res.status(400).json({
          success: false,
          message: `Number of files (${files.length}) must match number of devices (${deviceTypesArray.length})`
        });
        return;
      }

      // Map files to devices
      const devices = files.map((file, index) => ({
        deviceType: deviceTypesArray[index],
        filePath: file.path,
        fileName: file.filename
      }));

      // Create session
      const session = await this.sessionService.createSession({
        sessionName,
        activity,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        devices
      });

      res.status(201).json({
        success: true,
        message: 'Session created successfully',
        data: session
      });
    } catch (error) {
      console.error('Error creating session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create session',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get session by ID
   */
  public getSession = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;

      const session = await this.sessionService.getSessionById(id);

      if (!session) {
        res.status(404).json({
          success: false,
          message: 'Session not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: session
      });
    } catch (error) {
      console.error('Error fetching session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch session',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Get all sessions
   */
  public getAllSessions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const sessions = await this.sessionService.getAllSessions();

      res.status(200).json({
        success: true,
        count: sessions.length,
        data: sessions
      });
    } catch (error) {
      console.error('Error fetching sessions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sessions',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  /**
   * Delete session
   */
  public deleteSession = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;

      const deleted = await this.sessionService.deleteSession(id);

      if (!deleted) {
        res.status(404).json({
          success: false,
          message: 'Session not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Session deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete session',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}
