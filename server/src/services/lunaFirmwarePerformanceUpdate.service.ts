import { updateFirmwarePerformanceForLuna } from './firmwarePerformance.service';
import Session from '../models/Session';

/**
 * After session analysis and user accuracy summary update, update Luna firmware performance.
 * This should be called with the sessionId that was just analyzed.
 */
export async function updateLunaFirmwarePerformanceForSession(sessionId: string) {
  // Find the session and its Luna firmware version
  const session = await Session.findById(sessionId).lean();
  if (!session) return;
  const lunaDevice = (session.devices || []).find((d: any) => d.deviceType?.toLowerCase() === 'luna');
  console.log('Luna device for session', sessionId, ':', lunaDevice);
  if (!lunaDevice?.firmwareVersion) return;
  const metric = session.metric || 'HR';
  console.log('Updating firmware performance for Luna version:', lunaDevice.firmwareVersion, 'metric:', metric);
  await updateFirmwarePerformanceForLuna(lunaDevice.firmwareVersion, metric);
}
