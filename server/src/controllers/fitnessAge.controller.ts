import { Request, Response } from 'express';
import FitnessAgeProfile from '../models/FitnessAgeProfile';

export class FitnessAgeController {
  /**
   * GET /api/fitness-age/me
   * Returns the logged-in user's own Fitness Age snapshot, or a clear
   * "not linked yet" / "not computed yet" state instead of an error.
   */
  async getMyFitnessAge(req: Request, res: Response) {
    try {
      const fitnessAppUserId = req.user?.metadata?.fitnessAppUserId;

      if (!fitnessAppUserId) {
        return res.status(200).json({
          success: true,
          linked: false,
          message: 'Your account isn\'t linked to a Fitness Age profile yet. Ask your admin to link it.',
        });
      }

      const profile = await FitnessAgeProfile.findOne({ fitnessAppUserId });

      if (!profile) {
        return res.status(200).json({
          success: true,
          linked: true,
          computed: false,
          message: 'Your Fitness Age hasn\'t been computed yet. Check back after the next data refresh.',
        });
      }

      return res.status(200).json({
        success: true,
        linked: true,
        computed: true,
        data: profile,
      });
    } catch (error: any) {
      console.error('❌ Error fetching own fitness age:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch fitness age',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/fitness-age/admin/users
   * Left-panel list for admins — only users we actually have a snapshot
   * for, resolving display name/email from the linked platform account
   * when one exists.
   */
  async getAdminUsersList(req: Request, res: Response) {
    try {
      const profiles = await FitnessAgeProfile.find()
        .populate('linkedUserId', 'name email')
        .sort({ computedAt: -1 })
        .lean();

      const data = profiles.map((p: any) => ({
        fitnessAppUserId: p.fitnessAppUserId,
        name: p.linkedUserId?.name || p.displayName,
        email: p.linkedUserId?.email || null,
        isLinked: !!p.linkedUserId,
        status: p.status,
        fitnessAge: p.windows?.sixtyDay?.fitness_age ?? null,
        chronoAge: p.demographics?.age ?? null,
        computedAt: p.computedAt,
      }));

      return res.status(200).json({ success: true, count: data.length, data });
    } catch (error: any) {
      console.error('❌ Error fetching admin fitness age user list:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch fitness age users',
        error: error.message,
      });
    }
  }

  /**
   * GET /api/fitness-age/admin/users/:fitnessAppUserId
   */
  async getAdminUserDetail(req: Request, res: Response) {
    try {
      const fitnessAppUserId = parseInt(req.params.fitnessAppUserId, 10);
      if (Number.isNaN(fitnessAppUserId)) {
        return res.status(400).json({ success: false, message: 'Invalid fitnessAppUserId' });
      }

      const profile = await FitnessAgeProfile.findOne({ fitnessAppUserId })
        .populate('linkedUserId', 'name email')
        .lean();

      if (!profile) {
        return res.status(404).json({ success: false, message: 'No fitness age profile found for this user' });
      }

      return res.status(200).json({ success: true, data: profile });
    } catch (error: any) {
      console.error('❌ Error fetching admin fitness age detail:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch fitness age detail',
        error: error.message,
      });
    }
  }
}

export const fitnessAgeController = new FitnessAgeController();
