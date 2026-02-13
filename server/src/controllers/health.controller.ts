import { Request, Response } from 'express';
import { HealthService } from '../services/health.service';

export class HealthController {
  private healthService: HealthService;

  constructor() {
    this.healthService = new HealthService();
  }

  public getHealth = async (req: Request, res: Response): Promise<void> => {
    try {
      const healthData = await this.healthService.checkHealth();
      
      res.status(200).json({
        success: true,
        data: healthData
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };
}
