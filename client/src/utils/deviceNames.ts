/**
 * Convert backend device names to user-facing display names
 * Backend uses 'luna' but we show 'Falcon' to users
 */
export const getDeviceDisplayName = (deviceName: string): string => {
  if (deviceName.toLowerCase() === 'luna') {
    return 'Falcon';
  }
  // Capitalize first letter for other devices
  return deviceName.charAt(0).toUpperCase() + deviceName.slice(1).toLowerCase();
};
