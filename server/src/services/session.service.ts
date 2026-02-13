import Session, { ISession, ISessionDevice } from '../models/session.model';
import Device, { IDevice } from '../models/device.model';

export interface CreateSessionData {
  sessionName: string;
  activity: string;
  startTime: Date;
  endTime: Date;
  devices: Array<{
    deviceType: string;
    filePath: string;
    fileName: string;
  }>;
}

export class SessionService {
  /**
   * Create a new session with device data
   */
  public async createSession(data: CreateSessionData): Promise<ISession> {
    // Find or create device details for each device type
    const sessionDevices: ISessionDevice[] = await Promise.all(
      data.devices.map(async (device) => {
        // Try to find existing device by deviceType
        let deviceDetails = await Device.findOne({ 
          deviceType: device.deviceType 
        });

        // If device doesn't exist, you could create a basic entry
        // or leave deviceDetails as undefined
        // For now, we'll just reference it if it exists

        return {
          deviceType: device.deviceType,
          deviceDetails: deviceDetails?._id,
          rawFilePath: device.filePath,
          rawFileName: device.fileName
        };
      })
    );

    // Create session
    const session = new Session({
      sessionName: data.sessionName,
      activity: data.activity,
      startTime: data.startTime,
      endTime: data.endTime,
      devices: sessionDevices
    });

    await session.save();
    
    // Populate device details before returning
    await session.populate('devices.deviceDetails');
    
    return session;
  }

  /**
   * Get session by ID
   */
  public async getSessionById(sessionId: string): Promise<ISession | null> {
    return await Session.findById(sessionId)
      .populate('devices.deviceDetails')
      .exec();
  }

  /**
   * Get all sessions
   */
  public async getAllSessions(): Promise<ISession[]> {
    return await Session.find()
      .populate('devices.deviceDetails')
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Delete session by ID
   */
  public async deleteSession(sessionId: string): Promise<boolean> {
    const result = await Session.findByIdAndDelete(sessionId);
    return result !== null;
  }

  /**
   * Get device by type
   */
  public async getDeviceByType(deviceType: string): Promise<IDevice | null> {
    return await Device.findOne({ deviceType });
  }

  /**
   * Create or update device
   */
  public async createOrUpdateDevice(deviceData: Partial<IDevice>): Promise<IDevice> {
    if (!deviceData.deviceType) {
      throw new Error('Device type is required');
    }

    const existingDevice = await Device.findOne({ 
      deviceType: deviceData.deviceType 
    });

    if (existingDevice) {
      // Update existing device
      Object.assign(existingDevice, deviceData);
      await existingDevice.save();
      return existingDevice;
    } else {
      // Create new device
      const device = new Device(deviceData);
      await device.save();
      return device;
    }
  }
}
