import React, { useEffect, useState } from 'react';
import { Card } from '../components/common';
import apiClient from '../services/api';
import DashboardLayout from '../components/dashboard/DashboardLayout';

interface FirmwareConfig {
  _id: string;
  metric: 'HR' | 'SPO2' | 'Sleep' | 'Calories' | 'Steps';
  latestFirmwareVersion: string;
  description?: string;
  updatedAt: string;
  updatedBy?: string;
}

const FirmwareConfigPage: React.FC = () => {
  const [configs, setConfigs] = useState<FirmwareConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingMetric, setEditingMetric] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    latestFirmwareVersion: '',
    description: '',
  });
  const [saveLoading, setSaveLoading] = useState(false);

  const metrics: Array<'HR' | 'SPO2' | 'Sleep' | 'Calories' | 'Steps'> = [
    'HR',
    'SPO2',
    'Sleep',
    'Calories',
    'Steps',
  ];

  useEffect(() => {
    fetchConfigs();
  }, []);

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/firmware-config');
      setConfigs(response.data.data || []);
    } catch (error) {
      console.error('Error fetching firmware configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (metric: string) => {
    const config = configs.find((c) => c.metric === metric);
    if (config) {
      setFormData({
        latestFirmwareVersion: config.latestFirmwareVersion,
        description: config.description || '',
      });
    } else {
      setFormData({
        latestFirmwareVersion: '',
        description: '',
      });
    }
    setEditingMetric(metric);
  };

  const handleSave = async () => {
    if (!editingMetric || !formData.latestFirmwareVersion.trim()) {
      alert('Please enter a firmware version');
      return;
    }

    setSaveLoading(true);
    try {
      await apiClient.put(`/firmware-config/${editingMetric}`, formData);
      await fetchConfigs();
      setEditingMetric(null);
      setFormData({ latestFirmwareVersion: '', description: '' });
    } catch (error: any) {
      console.error('Error updating firmware config:', error);
      alert(error.response?.data?.message || 'Failed to update firmware configuration');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCancel = () => {
    setEditingMetric(null);
    setFormData({ latestFirmwareVersion: '', description: '' });
  };

  const getConfig = (metric: string) => {
    return configs.find((c) => c.metric === metric);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <DashboardLayout
      sidebar={
        <div className="space-y-4">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900">Settings</h2>
            <p className="text-xs text-gray-500 mt-1">Admin Configuration</p>
          </div>
          
          <button
            className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-purple-100 to-blue-100 text-blue-600 shadow-md flex items-center gap-3"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Firmware Config</span>
          </button>
          
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">
              Configure latest firmware versions to filter global overview metrics.
            </p>
          </div>
        </div>
      }
    >
      <div className="p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Firmware Configuration</h1>
          <p className="text-gray-600 mt-2">
            Configure the latest firmware versions for each metric type. The global overview will only display data from sessions using these firmware versions.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {metrics.map((metric) => {
              const config = getConfig(metric);
              const isEditing = editingMetric === metric;

              return (
                <Card key={metric}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">{metric}</h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            config
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {config ? 'Configured' : 'Not Configured'}
                        </span>
                      </div>

                      {isEditing ? (
                        <div className="space-y-4 mt-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Latest Firmware Version *
                            </label>
                            <input
                              type="text"
                              value={formData.latestFirmwareVersion}
                              onChange={(e) =>
                                setFormData({ ...formData, latestFirmwareVersion: e.target.value })
                              }
                              placeholder="e.g., v2.1.5"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Description (Optional)
                            </label>
                            <textarea
                              value={formData.description}
                              onChange={(e) =>
                                setFormData({ ...formData, description: e.target.value })
                              }
                              placeholder="Brief description of changes in this version"
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={handleSave}
                              disabled={saveLoading}
                              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                              {saveLoading ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={handleCancel}
                              disabled={saveLoading}
                              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {config ? (
                            <div className="space-y-2">
                              <div>
                                <span className="text-sm text-gray-600">Current Version: </span>
                                <span className="text-lg font-semibold text-blue-600">
                                  {config.latestFirmwareVersion}
                                </span>
                              </div>
                              {config.description && (
                                <p className="text-sm text-gray-600">{config.description}</p>
                              )}
                              <div className="text-xs text-gray-500">
                                Last updated: {formatDate(config.updatedAt)}
                                {config.updatedBy && ` by ${config.updatedBy}`}
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-500">
                              No firmware version configured. Click "Configure" to set the latest version.
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    {!isEditing && (
                      <button
                        onClick={() => handleEdit(metric)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {config ? 'Edit' : 'Configure'}
                      </button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-2">How it works:</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
            <li>
              Set the latest firmware version for each metric type (HR, SpO2, Sleep, etc.)
            </li>
            <li>
              The global overview dashboard will automatically filter to show only data from sessions using these firmware versions
            </li>
            <li>
              This ensures you're seeing the most relevant and up-to-date performance metrics
            </li>
            <li>
              You can still view data from all firmware versions in the "Firmware-wise" comparison tab
            </li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FirmwareConfigPage;
