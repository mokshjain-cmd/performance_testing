import React, { useState, useEffect } from 'react';
import { X, Trash2, Plus, Loader2 } from 'lucide-react';
import { deviceService } from '../../services/device.service';
import type { Device, CreateDeviceRequest } from '../../services/device.service';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const DeviceManagement: React.FC<Props> = ({ isOpen, onClose }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<CreateDeviceRequest>({
    deviceType: 'luna',
    hardwareVersion: '',
    firmwareVersion: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchDevices();
    }
  }, [isOpen]);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await deviceService.getAllDevices();
      setDevices(response.data || []);
    } catch (err: any) {
      console.error('Error fetching devices:', err);
      setError(err.response?.data?.message || 'Failed to fetch devices');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (deviceId: string) => {
    if (!window.confirm('Are you sure you want to delete this device?')) {
      return;
    }

    try {
      await deviceService.deleteDevice(deviceId);
      setSuccessMessage('Device deleted successfully');
      fetchDevices();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete device');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firmwareVersion.trim() || !formData.hardwareVersion.trim()) {
      setError('All fields are required');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await deviceService.createDevice(formData);
      setSuccessMessage('Device created successfully');
      setFormData({
        deviceType: 'luna',
        hardwareVersion: '',
        firmwareVersion: '',
      });
      fetchDevices();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create device');
      setTimeout(() => setError(null), 3000);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 flex-shrink-0">
          <h2 className="text-2xl font-bold text-gray-800">Device Management</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/50 transition-colors"
            title="Close"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6"
          style={{ maxHeight: 'calc(85vh - 88px)' }}
        >
          {/* Alerts */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <span className="font-medium">Error:</span> {error}
            </div>
          )}
          
          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <span className="font-medium">Success:</span> {successMessage}
            </div>
          )}

          {/* Existing Devices */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              Existing Devices ({devices.length})
              {loading && <Loader2 size={16} className="animate-spin text-blue-500" />}
            </h3>
            
            {/* Debug info */}

            
           
            
            {loading && devices.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Loader2 size={32} className="animate-spin mx-auto mb-2 text-blue-500" />
                <p>Loading devices...</p>
              </div>
            ) : devices.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg text-gray-500">
                <p>No devices found</p>
                <p className="text-sm mt-1">Create a device using the form below</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs bg-green-100 p-2 rounded mb-2">Rendering {devices.length} devices...</div>
                {devices.map((device) => (
                  <div
                    key={device._id}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium uppercase">
                          {device.deviceType}
                        </span>
                        <span className="text-gray-600">•</span>
                        <span className="text-sm text-gray-600">
                          <span className="font-medium">FW:</span> {device.firmwareVersion}
                        </span>
                        <span className="text-gray-600">•</span>
                        <span className="text-sm text-gray-600">
                          <span className="font-medium">HW:</span> {device.hardwareVersion}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Created: {new Date(device.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(device._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete device"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Device Form */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Plus size={20} className="text-green-600" />
              Add New Device
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4 bg-gradient-to-br from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
              <div>
                <label htmlFor="deviceType" className="block text-sm font-medium text-gray-700 mb-2">
                  Device Type <span className="text-red-500">*</span>
                </label>
                <select
                  id="deviceType"
                  value={formData.deviceType}
                  onChange={(e) => setFormData({ ...formData, deviceType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="luna">luna</option>
                  <option value="whoop">whoop</option>
                  <option value="amazfit">amazfit</option>
                  <option value="polar">polar</option>
                  <option value="apple">apple</option>
                </select>
              </div>

              <div>
                <label htmlFor="hardwareVersion" className="block text-sm font-medium text-gray-700 mb-2">
                  Hardware Version <span className="text-red-500">*</span>
                </label>
                <input
                  id="hardwareVersion"
                  type="text"
                  value={formData.hardwareVersion}
                  onChange={(e) => setFormData({ ...formData, hardwareVersion: e.target.value })}
                  placeholder="e.g., luna-HW-1.0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="firmwareVersion" className="block text-sm font-medium text-gray-700 mb-2">
                  Firmware Version <span className="text-red-500">*</span>
                </label>
                <input
                  id="firmwareVersion"
                  type="text"
                  value={formData.firmwareVersion}
                  onChange={(e) => setFormData({ ...formData, firmwareVersion: e.target.value })}
                  placeholder="e.g., 1.2.3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-medium rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    Create Device
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceManagement;
