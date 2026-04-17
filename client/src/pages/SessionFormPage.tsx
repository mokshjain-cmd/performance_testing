import { useState, useEffect } from 'react';
import { Layout } from '../components/layout';
import { Button, Input, Select, Card } from '../components/common';
import apiClient from '../services/api';
import { getMetricIcon } from '../utils/benchmarkCompatibility';

const ACTIVITY_OPTIONS = [
  { value: 'daily', label: 'Daily (Continuous Monitoring)' },
  { value: 'sitting', label: 'Sitting' },
  { value: 'strength training', label: 'Strength Training' },
  { value: 'walk', label: 'Walk' },
  { value: 'running', label: 'Running' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'badminton', label: 'Badminton' },
  { value: 'table tennis', label: 'Table Tennis' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'swimming', label: 'Swimming' },
  { value: 'hiking', label: 'Hiking' },
  { value: 'gym workout', label: 'Gym Workout' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'sleeping', label: 'Sleeping' },
  { value: 'other', label: 'Other' },
];

const METRIC_OPTIONS = [
  { value: 'HR', label: 'Heart Rate', icon: '❤️' },
  { value: 'SPO2', label: 'Blood Oxygen', icon: '🫁' },
  { value: 'Sleep', label: 'Sleep', icon: '😴' },
  { value: 'Activity', label: 'Activity', icon: '🏃' },
  { value: 'Workout', label: 'Workout', icon: '💪' },
  { value: 'Stress', label: 'Stress (Beta)', icon: '😰' },
  { value: 'SkinTemp', label: 'Skin Temperature (Beta)', icon: '🌡️' },
];

const BENCHMARK_DEVICE_OPTIONS = [
  { value: 'polar', label: 'Polar' },
  { value: 'apple', label: 'Apple Watch' },
  { value: 'masimo', label: 'Masimo' },
  { value: 'garmin', label: 'Garmin' },
];

const BAND_POSITION_OPTIONS = [
  { value: 'wrist', label: 'Wrist' },
  { value: 'bicep', label: 'Bicep' },
];

const MOBILE_TYPE_OPTIONS = [
  { value: 'Android', label: 'Android' },
  { value: 'iOS', label: 'iOS' },
];

const APP_PLATFORM_OPTIONS = [
  { value: 'NoiseFit', label: 'NoiseFit (Legacy Format)' },
  { value: 'Luna', label: 'Luna (App Logs)' },
];

interface SessionResult {
  metric: string;
  status: 'success' | 'failed';
  sessionId?: string;
  error?: string;
}

export default function SessionFormPage() {
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['HR']);
  const [formData, setFormData] = useState({
    activityType: 'daily',
    date: '',
    startTime: '',
    endTime: '',
    benchmarkDeviceType: '',
    bandPosition: 'wrist',
    firmwareVersion: '',
    mobileType: 'Android',
    appPlatform: 'Luna',
  });
  const [deviceFiles, setDeviceFiles] = useState<{ [key: string]: File | null }>({ luna: null });
  const [firmwareVersions, setFirmwareVersions] = useState<Array<{ value: string; label: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: string }>({});
  const [sessionResults, setSessionResults] = useState<SessionResult[]>([]);
  const [fileInputKey, setFileInputKey] = useState<number>(0);

  useEffect(() => {
    apiClient.get('/devices/firmware?deviceType=luna')
      .then(res => {
        if (res.data.success && res.data.data) {
          const versions = res.data.data.map((version: string) => ({
            value: version,
            label: version,
          }));
          setFirmwareVersions(versions);
        }
      })
      .catch(err => console.error('Error fetching firmware versions:', err));
  }, []);

  const shouldShowDateOnly = selectedMetrics.length > 1 || formData.activityType === 'daily';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleMetricToggle = (metric: string) => {
    setSelectedMetrics(prev => {
      if (prev.includes(metric)) {
        if (prev.length === 1) {
          alert('At least one metric must be selected');
          return prev;
        }
        return prev.filter(m => m !== metric);
      } else {
        return [...prev, metric];
      }
    });
  };

  const handleFileChange = (device: string, file: File | null) => {
    setDeviceFiles((prev) => ({ ...prev, [device]: file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setUploadProgress({});
    setSessionResults([]);

    const userId = localStorage.getItem('userId');
    if (!userId) {
      alert('User not logged in. Please login first.');
      setIsSubmitting(false);
      return;
    }

    if (!deviceFiles.luna) {
      alert('Please upload Falcon (Luna) log file');
      setIsSubmitting(false);
      return;
    }

    if (formData.benchmarkDeviceType && !deviceFiles[formData.benchmarkDeviceType]) {
      alert(`Please upload ${formData.benchmarkDeviceType} benchmark file`);
      setIsSubmitting(false);
      return;
    }

    let sessionName: string;
    let startTimeStr: string = '';
    let endTimeStr: string = '';
    let dateForMetric: string = '';

    if (shouldShowDateOnly) {
      const targetDate = new Date(formData.date + 'T00:00:00');
      const day = String(targetDate.getDate()).padStart(2, '0');
      const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const month = monthNames[targetDate.getMonth()];
      const year = String(targetDate.getFullYear()).slice(-2);
      sessionName = `${day}-${month}-${year}`;
      dateForMetric = formData.date;
    } else {
      const startDate = new Date(formData.startTime);
      const day = String(startDate.getDate()).padStart(2, '0');
      const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const month = monthNames[startDate.getMonth()];
      const year = String(startDate.getFullYear()).slice(-2);
      const hours = String(startDate.getHours()).padStart(2, '0');
      const minutes = String(startDate.getMinutes()).padStart(2, '0');
      sessionName = `${day}-${month}-${year} | ${hours}:${minutes}`;
      startTimeStr = formData.startTime;
      endTimeStr = formData.endTime;
    }

    const results: SessionResult[] = [];
    const sessionPromises = selectedMetrics.map(async (metric) => {
      try {
        setUploadProgress(prev => ({ ...prev, [metric]: 'uploading...' }));

        const form = new FormData();
        form.append('userId', userId);
        form.append('sessionName', sessionName);
        form.append('metric', metric);

        if (metric === 'Sleep') {
          form.append('activityType', 'sleeping');
          form.append('sleepDate', dateForMetric || formData.date);
        } else if (metric === 'Activity') {
          form.append('activityType', 'daily');
          form.append('activityDate', dateForMetric || formData.date);
        } else if (metric === 'Workout') {
          form.append('activityType', 'daily');
          form.append('workoutDate', dateForMetric || formData.date);
        } else if (shouldShowDateOnly) {
          form.append('activityType', formData.activityType);
          form.append('dailyDate', dateForMetric);
        } else {
          form.append('activityType', formData.activityType);
          form.append('startTime', startTimeStr);
          form.append('endTime', endTimeStr);
        }

        form.append('benchmarkDeviceType', formData.benchmarkDeviceType);
        form.append('bandPosition', formData.bandPosition);
        form.append('firmwareVersion', formData.firmwareVersion);
        form.append('mobileType', formData.mobileType);
        form.append('appPlatform', formData.appPlatform);
        form.append('luna', deviceFiles.luna as File);

        if (formData.benchmarkDeviceType && deviceFiles[formData.benchmarkDeviceType]) {
          form.append(formData.benchmarkDeviceType, deviceFiles[formData.benchmarkDeviceType] as File);
        }

        setUploadProgress(prev => ({ ...prev, [metric]: 'processing...' }));

        const res = await apiClient.post('/sessions/create', form, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        setUploadProgress(prev => ({ ...prev, [metric]: 'completed ✓' }));

        results.push({
          metric,
          status: 'success',
          sessionId: res.data.data._id
        });

        return { status: 'success', metric };

      } catch (error: any) {
        setUploadProgress(prev => ({ ...prev, [metric]: 'failed ✗' }));

        results.push({
          metric,
          status: 'failed',
          error: error.response?.data?.message || error.message || 'Unknown error'
        });

        return { status: 'failed', metric, error };
      }
    });

    await Promise.allSettled(sessionPromises);

    setSessionResults(results);
    setIsSubmitting(false);

    const successCount = results.filter(r => r.status === 'success').length;
    const failCount = results.filter(r => r.status === 'failed').length;

    if (failCount === 0) {
      alert(`✅ Successfully created ${successCount} session(s)!`);
      setFormData({
        activityType: 'daily',
        date: '',
        startTime: '',
        endTime: '',
        benchmarkDeviceType: '',
        bandPosition: 'wrist',
        firmwareVersion: '',
        mobileType: 'Android',
        appPlatform: 'Luna',
      });
      setDeviceFiles({ luna: null });
      setSelectedMetrics(['HR']);
      setFileInputKey(prev => prev + 1);
    } else {
      alert(`⚠️ Created ${successCount} session(s). ${failCount} failed. See results below.`);
    }
  };

  return (
    <Layout>
      <Card title="Create Multi-Metric Session">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Metrics to Analyze
            </label>
            <div className="grid grid-cols-2 gap-3">
              {METRIC_OPTIONS.map(option => {
                const isSelected = selectedMetrics.includes(option.value);
                
                return (
                  <label
                    key={option.value}
                    className={`
                      flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all
                      ${isSelected 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 bg-white hover:border-gray-300'
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleMetricToggle(option.value)}
                      className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-2xl">{option.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{option.label}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {selectedMetrics.length === 1 ? (
            <Select
              label="Activity Type"
              name="activityType"
              value={formData.activityType}
              onChange={handleChange}
              options={ACTIVITY_OPTIONS}
              placeholder="Select activity type"
              required
            />
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Activity Type
              </label>
              <input
                type="text"
                value="daily"
                disabled
                className="block w-full px-4 py-2.5 text-sm text-gray-500 bg-gray-100 border border-gray-300 rounded-lg cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">
                Multiple metrics selected - automatically set to "daily" monitoring
              </p>
            </div>
          )}

          {shouldShowDateOnly ? (
            <div>
              <Input
                type="date"
                label="Date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {selectedMetrics.length > 1 
                  ? 'All selected metrics will be analyzed for this date (full day 00:00 - 23:59)'
                  : 'Daily monitoring for this date (full day 00:00 - 23:59)'
                }
              </p>
            </div>
          ) : (
            <>
              <Input
                type="datetime-local"
                label="Start Time"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                required
              />
              <Input
                type="datetime-local"
                label="End Time"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                required
              />
            </>
          )}

          <Select
            label="Benchmark Device (Optional)"
            name="benchmarkDeviceType"
            value={formData.benchmarkDeviceType}
            onChange={handleChange}
            options={BENCHMARK_DEVICE_OPTIONS}
            placeholder="Select benchmark device (optional)"
          />

          <Select
            label="Band Position"
            name="bandPosition"
            value={formData.bandPosition}
            onChange={handleChange}
            options={BAND_POSITION_OPTIONS}
            required
          />

          <Select
            label="Falcon Firmware Version"
            name="firmwareVersion"
            value={formData.firmwareVersion}
            onChange={handleChange}
            options={firmwareVersions}
            placeholder="Select firmware version"
            required
          />

          <Select
            label="Mobile Type"
            name="mobileType"
            value={formData.mobileType}
            onChange={handleChange}
            options={MOBILE_TYPE_OPTIONS}
            required
          />

          <Select
            label="App Platform"
            name="appPlatform"
            value={formData.appPlatform}
            onChange={handleChange}
            options={APP_PLATFORM_OPTIONS}
            required
          />

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Upload Falcon (Luna) Log File <span className="text-red-500">*</span>
              </label>
              <input
                key={`luna-${fileInputKey}`}
                type="file"
                accept=".txt,.TXT"
                onChange={(e) => handleFileChange('luna', e.target.files?.[0] || null)}
                required
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-blue-500 file:to-blue-600 file:text-white hover:file:from-blue-600 hover:file:to-blue-700 file:cursor-pointer file:shadow-sm file:transition-all cursor-pointer border border-gray-200 rounded-xl p-3"
              />
              {deviceFiles.luna && (
                <span className="text-xs text-gray-500 ml-1 mt-1 block">
                  Selected: {deviceFiles.luna.name}
                </span>
              )}
            </div>

            {formData.benchmarkDeviceType && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Upload {BENCHMARK_DEVICE_OPTIONS.find(d => d.value === formData.benchmarkDeviceType)?.label} File
                </label>
                <input
                  key={`${formData.benchmarkDeviceType}-${fileInputKey}`}
                  type="file"
                  accept={formData.benchmarkDeviceType === 'apple' ? '.xml,.XML,.zip,.ZIP,.csv,.CSV' : '.csv,.CSV'}
                  onChange={(e) => handleFileChange(formData.benchmarkDeviceType, e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-600 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-blue-500 file:to-blue-600 file:text-white hover:file:from-blue-600 hover:file:to-blue-700 file:cursor-pointer file:shadow-sm file:transition-all cursor-pointer border border-gray-200 rounded-xl p-3"
                />
                {deviceFiles[formData.benchmarkDeviceType] && (
                  <span className="text-xs text-gray-500 ml-1 mt-1 block">
                    Selected: {deviceFiles[formData.benchmarkDeviceType]?.name}
                  </span>
                )}
              </div>
            )}
          </div>

          {isSubmitting && Object.keys(uploadProgress).length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Upload Progress</h4>
              <div className="space-y-2">
                {selectedMetrics.map(metric => (
                  <div key={metric} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{getMetricIcon(metric)} {metric}</span>
                    <span className={`text-xs ${
                      uploadProgress[metric]?.includes('✓') ? 'text-green-600' :
                      uploadProgress[metric]?.includes('✗') ? 'text-red-600' :
                      'text-blue-600'
                    }`}>
                      {uploadProgress[metric] || 'pending...'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            variant="primary" 
            size="lg" 
            className="w-full" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating Sessions...' : `Create ${selectedMetrics.length} Session(s)`}
          </Button>
        </form>
      </Card>

      {sessionResults.length > 0 && (
        <Card title="Session Creation Results" className="mt-8">
          <div className="space-y-3">
            {sessionResults.map((result, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                  result.status === 'success'
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getMetricIcon(result.metric)}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{result.metric}</p>
                    {result.status === 'success' && result.sessionId && (
                      <p className="text-xs text-gray-600 font-mono">ID: {result.sessionId}</p>
                    )}
                    {result.status === 'failed' && result.error && (
                      <p className="text-xs text-red-600">{result.error}</p>
                    )}
                  </div>
                </div>
                <div>
                  {result.status === 'success' ? (
                    <span className="text-green-600 font-semibold">✓ Success</span>
                  ) : (
                    <span className="text-red-600 font-semibold">✗ Failed</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Total Sessions:</span>
              <span className="font-semibold">{sessionResults.length}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-green-600">Successful:</span>
              <span className="font-semibold text-green-600">
                {sessionResults.filter(r => r.status === 'success').length}
              </span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-red-600">Failed:</span>
              <span className="font-semibold text-red-600">
                {sessionResults.filter(r => r.status === 'failed').length}
              </span>
            </div>
          </div>
        </Card>
      )}
    </Layout>
  );
}
