
import { useState, useEffect } from 'react';
import { Layout } from '../components/layout';
import { Button, Input, Select, Card } from '../components/common';
import apiClient from '../services/api';

const DEVICE_OPTIONS = [
  { label: 'Falcon', value: 'luna', always: true },
  { label: 'Polar', value: 'polar', hrOnly: true },
  { label: 'Masimo', value: 'masimo', spo2Only: true },
  { label: 'Apple', value: 'apple', hrCompatible: true, sleepCompatible: true, activityCompatible: true, spo2DailyCompatible: true },
];

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
  { value: 'HR', label: 'Heart Rate (HR)' },
  { value: 'SPO2', label: 'Blood Oxygen (SPO2)' },
  { value: 'Sleep', label: 'Sleep' },
  { value: 'Activity', label: 'Activity (Steps/Calories/Distance)' },
];

const BENCHMARK_DEVICE_OPTIONS_HR = [
  { value: 'polar', label: 'Polar' },
  { value: 'apple', label: 'Apple' },
];

const BENCHMARK_DEVICE_OPTIONS_SPO2 = [
  { value: 'masimo', label: 'Masimo' },
];

const BENCHMARK_DEVICE_OPTIONS_SPO2_DAILY = [
  { value: 'masimo', label: 'Masimo' },
  { value: 'apple', label: 'Apple' },
];

const BENCHMARK_DEVICE_OPTIONS_SLEEP = [
  { value: 'apple', label: 'Apple' },
];

const BENCHMARK_DEVICE_OPTIONS_ACTIVITY = [
  { value: 'apple', label: 'Apple' },
];

const BAND_POSITION_OPTIONS = [
  { value: 'wrist', label: 'Wrist' },
  { value: 'bicep', label: 'Bicep' },
];

const MOBILE_TYPE_OPTIONS = [
  { value: 'Android', label: 'Android' },
  { value: 'iOS', label: 'iOS' },
];

export default function SessionFormPage() {
  const [formData, setFormData] = useState({
    activity: '',
    metric: 'HR',
    startTime: '',
    endTime: '',
    sleepDate: '', // For Sleep sessions: the morning date (night before -> this morning)
    activityDate: '', // For Activity sessions: the date of the activity
    dailyDate: '', // For HR/SPO2 daily sessions: the date for continuous monitoring
    benchmarkDeviceType: '',
    bandPosition: '',
    firmwareVersion: '',
    mobileType: 'Android', // For Sleep/Activity with Falcon: Android or iOS
    devices: ['luna'],
  });
  const [deviceFiles, setDeviceFiles] = useState<{ [key: string]: File | null }>({ luna: null });
  const [responseData, setResponseData] = useState<any>(null);
  const [fileInputKey, setFileInputKey] = useState<number>(0);
  const [firmwareVersions, setFirmwareVersions] = useState<Array<{ value: string; label: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Fetch firmware versions for Falcon
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // If metric changed to Activity, add Apple as benchmark device
    if (name === 'metric' && value === 'Activity') {
      const compatibleDevices = formData.devices.filter(d => d === 'luna' || d === 'apple');
      const updatedDevices = compatibleDevices.includes('apple') 
        ? compatibleDevices 
        : [...compatibleDevices, 'apple'];
      setFormData({
        ...formData,
        metric: value,
        benchmarkDeviceType: 'apple',
        devices: updatedDevices.length > 0 ? updatedDevices : ['luna', 'apple'],
      });
      // Remove files for incompatible devices
      const newDeviceFiles = { ...deviceFiles };
      Object.keys(newDeviceFiles).forEach(d => {
        if (d !== 'luna' && d !== 'apple') {
          delete newDeviceFiles[d];
        }
      });
      // Initialize apple file input if not present
      if (!newDeviceFiles.apple) {
        newDeviceFiles.apple = null;
      }
      setDeviceFiles(newDeviceFiles);
    }
    // If metric changed to Sleep, add Apple as benchmark device and set activity to 'sleeping'
    else if (name === 'metric' && value === 'Sleep') {
      const compatibleDevices = formData.devices.filter(d => d === 'luna' || d === 'apple');
      const updatedDevices = compatibleDevices.includes('apple') 
        ? compatibleDevices 
        : [...compatibleDevices, 'apple'];
      setFormData({
        ...formData,
        metric: value,
        activity: 'sleeping', // Fixed activity for Sleep
        benchmarkDeviceType: 'apple',
        devices: updatedDevices.length > 0 ? updatedDevices : ['luna', 'apple'],
      });
      // Remove files for incompatible devices
      const newDeviceFiles = { ...deviceFiles };
      Object.keys(newDeviceFiles).forEach(d => {
        if (d !== 'luna' && d !== 'apple') {
          delete newDeviceFiles[d];
        }
      });
      // Initialize apple file input if not present
      if (!newDeviceFiles.apple) {
        newDeviceFiles.apple = null;
      }
      setDeviceFiles(newDeviceFiles);
    }
    // If metric changed to SPO2, remove incompatible devices
    else if (name === 'metric' && value === 'SPO2') {
      const compatibleDevices = formData.devices.filter(d => d === 'luna' || d === 'masimo');
      // Ensure masimo is in devices since it's the benchmark for SPO2
      const updatedDevices = compatibleDevices.includes('masimo') 
        ? compatibleDevices 
        : [...compatibleDevices, 'masimo'];
      setFormData({
        ...formData,
        metric: value,
        benchmarkDeviceType: 'masimo',
        devices: updatedDevices.length > 0 ? updatedDevices : ['luna', 'masimo'],
      });
      // Remove files for incompatible devices
      const newDeviceFiles = { ...deviceFiles };
      Object.keys(newDeviceFiles).forEach(d => {
        if (d !== 'luna' && d !== 'masimo') {
          delete newDeviceFiles[d];
        }
      });
      // Initialize masimo file input if not present
      if (!newDeviceFiles.masimo) {
        newDeviceFiles.masimo = null;
      }
      setDeviceFiles(newDeviceFiles);
    }
    // If activity type changed to/from 'daily' for SPO2 or HR, handle Apple device
    else if (name === 'activity' && (formData.metric === 'SPO2' || formData.metric === 'HR')) {
      if (value === 'daily') {
        // Add Apple as option for daily activity
        const updatedDevices = formData.devices;
        setFormData({
          ...formData,
          activity: value,
        });
      } else {
        // Remove Apple when switching away from daily (for SPO2 only, keep for HR)
        const updatedDevices = formData.metric === 'SPO2' 
          ? formData.devices.filter(d => d !== 'apple')
          : formData.devices;
        const newBenchmark = formData.benchmarkDeviceType === 'apple' && formData.metric === 'SPO2'
          ? 'masimo'
          : formData.benchmarkDeviceType === 'apple' && formData.metric === 'HR'
          ? 'polar'
          : formData.benchmarkDeviceType;
        setFormData({
          ...formData,
          activity: value,
          devices: updatedDevices,
          benchmarkDeviceType: newBenchmark,
        });
        // Remove Apple files if present and metric is SPO2
        if (formData.metric === 'SPO2') {
          const newDeviceFiles = { ...deviceFiles };
          delete newDeviceFiles.apple;
          setDeviceFiles(newDeviceFiles);
        }
      }
    }
    // If metric changed FROM Activity to something else, remove activity-only devices
    else if (name === 'metric' && formData.metric === 'Activity' && value !== 'Activity') {
      const compatibleDevices = formData.devices.filter(d => d !== 'apple');
      // If switching to HR, ensure polar is added as benchmark device
      const updatedDevices = value === 'HR' && !compatibleDevices.includes('polar')
        ? [...compatibleDevices, 'polar']
        : value === 'SPO2' && !compatibleDevices.includes('masimo')
        ? [...compatibleDevices, 'masimo']
        : compatibleDevices;
      setFormData({
        ...formData,
        metric: value,
        benchmarkDeviceType: value === 'HR' ? 'polar' : value === 'SPO2' ? 'masimo' : '',
        devices: updatedDevices.length > 0 ? updatedDevices : ['luna'],
      });
      // Remove apple files if present
      const newDeviceFiles = { ...deviceFiles };
      delete newDeviceFiles.apple;
      // Initialize benchmark device file input if needed
      if (value === 'HR' && !newDeviceFiles.polar) {
        newDeviceFiles.polar = null;
      } else if (value === 'SPO2' && !newDeviceFiles.masimo) {
        newDeviceFiles.masimo = null;
      }
      setDeviceFiles(newDeviceFiles);
    }
    // If metric changed FROM Sleep to something else, keep Apple if switching to HR, remove otherwise
    else if (name === 'metric' && formData.metric === 'Sleep' && value !== 'Sleep') {
      let compatibleDevices = formData.devices;
      
      // Keep Apple for HR, remove for other metrics
      if (value !== 'HR' && value !== 'Activity') {
        compatibleDevices = compatibleDevices.filter(d => d !== 'apple');
      }
      
      // If switching to HR, ensure polar is added as benchmark device
      const updatedDevices = value === 'HR' && !compatibleDevices.includes('polar')
        ? [...compatibleDevices, 'polar']
        : value === 'SPO2' && !compatibleDevices.includes('masimo')
        ? [...compatibleDevices, 'masimo']
        : compatibleDevices;
      setFormData({
        ...formData,
        metric: value,
        benchmarkDeviceType: value === 'HR' ? 'polar' : value === 'SPO2' ? 'masimo' : '',
        devices: updatedDevices.length > 0 ? updatedDevices : ['luna'],
      });
      // Remove apple files if switching to SPO2 or other non-compatible metrics
      const newDeviceFiles = { ...deviceFiles };
      if (value !== 'HR' && value !== 'Activity') {
        delete newDeviceFiles.apple;
      }
      // Initialize benchmark device file input if needed
      if (value === 'HR' && !newDeviceFiles.polar) {
        newDeviceFiles.polar = null;
      } else if (value === 'SPO2' && !newDeviceFiles.masimo) {
        newDeviceFiles.masimo = null;
      }
      setDeviceFiles(newDeviceFiles);
    }
    // If metric changed FROM SPO2 to something else (but not Sleep), remove SPO2-only devices
    else if (name === 'metric' && formData.metric === 'SPO2' && value !== 'SPO2') {
      const compatibleDevices = formData.devices.filter(d => d !== 'masimo');
      // If switching to HR, ensure polar is added as benchmark device
      const updatedDevices = value === 'HR' && !compatibleDevices.includes('polar')
        ? [...compatibleDevices, 'polar']
        : compatibleDevices;
      setFormData({
        ...formData,
        metric: value,
        benchmarkDeviceType: value === 'HR' ? 'polar' : '',
        devices: updatedDevices.length > 0 ? updatedDevices : ['luna'],
      });
      // Remove masimo files if present
      const newDeviceFiles = { ...deviceFiles };
      delete newDeviceFiles.masimo;
      // Initialize polar file input if HR metric
      if (value === 'HR' && !newDeviceFiles.polar) {
        newDeviceFiles.polar = null;
      }
      setDeviceFiles(newDeviceFiles);
    }
    // If benchmark device is changed, automatically select that device
    else if (name === 'benchmarkDeviceType' && value) {
      const updatedDevices = formData.devices.includes(value)
        ? formData.devices
        : [...formData.devices, value];
      setFormData({
        ...formData,
        benchmarkDeviceType: value,
        devices: updatedDevices,
      });
      // Initialize file input for the new device if not present
      if (!deviceFiles[value]) {
        setDeviceFiles(prev => ({ ...prev, [value]: null }));
      }
    }
    else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleDeviceToggle = (device: string) => {
    setFormData((prev) => {
      // Prevent deselecting benchmark device
      if (device === prev.benchmarkDeviceType && prev.devices.includes(device)) {
        alert(`Cannot deselect ${DEVICE_OPTIONS.find(d => d.value === device)?.label || device} as it is the selected benchmark device.`);
        return prev;
      }
      
      const devices = prev.devices.includes(device)
        ? prev.devices.filter((d) => d !== device)
        : [...prev.devices, device];
      return { ...prev, devices };
    });
    setDeviceFiles((prev) => ({ ...prev, [device]: null }));
  };

  const handleFileChange = (device: string, file: File | null) => {
    setDeviceFiles((prev) => ({ ...prev, [device]: file }));
  };


  // Helper to ensure time string has seconds (YYYY-MM-DDTHH:mm:ss)
  const ensureSeconds = (val: string) => {
    if (!val) return '';
    // If already has seconds
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(val)) return val;
    // If missing seconds, add :00
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val)) return val + ':00';
    return val;
  };

  // Helper to format ISO datetime: 2026-02-13T15:40:00.000Z -> 2026-02-13 15:40:00
  const formatISODateTime = (isoString: string) => {
    const [date, timeWithMs] = isoString.split('T');
    const time = timeWithMs.split('.')[0]; // Remove milliseconds and Z
    return `${date} ${time}`;
  };

  // Helper to compute session name from start time: "19-feb-26 | 17:45"
  const computeSessionName = (startTimeValue: string) => {
    if (!startTimeValue) return '';

    try {
      const date = new Date(startTimeValue);

      const day = String(date.getDate()).padStart(2, '0');
      const monthNames = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
      const month = monthNames[date.getMonth()];
      const year = String(date.getFullYear()).slice(-2);

      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');

      return `${day}-${month}-${year} | ${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Validate that all selected devices have files uploaded
    const missingFiles = formData.devices.filter(device => !deviceFiles[device]);
    if (missingFiles.length > 0) {
      const deviceNames = missingFiles.map(d => DEVICE_OPTIONS.find(opt => opt.value === d)?.label || d).join(', ');
      alert(`Please upload files for all selected devices: ${deviceNames}`);
      setIsSubmitting(false);
      return;
    }
    
    const form = new FormData();
    // Get userId from localStorage
    const userId = localStorage.getItem('userId');
    if (!userId) {
      alert('User not logged in. Please login first.');
      setIsSubmitting(false);
      return;
    }
    // For Sleep sessions, compute startTime/endTime from sleepDate
    // sleepDate represents the morning date, so sleep session is from previous night (10 PM) to morning (8 AM)
    // For Activity sessions, use activityDate to compute a default time range
    // For HR/SPO2 daily sessions, use dailyDate for full day (00:00 to 23:59)
    let startTime, endTime;
    if (formData.metric === 'Sleep' && formData.sleepDate) {
      const morningDate = new Date(formData.sleepDate);
      // Start: Previous day at 10:00 PM (22:00)
      const startDate = new Date(morningDate);
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(22, 0, 0, 0);
      // End: Morning date at 8:00 AM
      const endDate = new Date(morningDate);
      endDate.setHours(8, 0, 0, 0);
      startTime = startDate.toISOString().slice(0, 19); // Remove milliseconds and Z
      endTime = endDate.toISOString().slice(0, 19);
    } else if (formData.metric === 'Activity' && formData.activityDate) {
      // For Activity, use the full day (00:00 to 23:59)
      const activityDay = new Date(formData.activityDate);
      const startDate = new Date(activityDay);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(activityDay);
      endDate.setHours(23, 59, 59, 0);
      startTime = startDate.toISOString().slice(0, 19);
      endTime = endDate.toISOString().slice(0, 19);
    } else if ((formData.metric === 'HR' || formData.metric === 'SPO2') && formData.activity === 'daily' && formData.dailyDate) {
      // For HR/SPO2 daily monitoring, use the full day (00:00 to 23:59)
      const dailyDay = new Date(formData.dailyDate);
      const startDate = new Date(dailyDay);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dailyDay);
      endDate.setHours(23, 59, 59, 0);
      startTime = startDate.toISOString().slice(0, 19);
      endTime = endDate.toISOString().slice(0, 19);
    } else {
      startTime = ensureSeconds(formData.startTime);
      endTime = ensureSeconds(formData.endTime);
    }
    
    // Compute session name from start time
    // For Activity sessions and HR/SPO2 daily sessions, use just the date without time
    let sessionName: string;
    if (formData.metric === 'Activity' && formData.activityDate) {
      // Format: "02-mar-26" (date only, no time)
      const date = new Date(formData.activityDate + 'T00:00:00'); // Parse as local date
      const day = String(date.getDate()).padStart(2, '0');
      const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const month = monthNames[date.getMonth()];
      const year = String(date.getFullYear()).slice(-2);
      sessionName = `${day}-${month}-${year}`;
    } else if ((formData.metric === 'HR' || formData.metric === 'SPO2') && formData.activity === 'daily' && formData.dailyDate) {
      // Format: "02-mar-26" (date only, no time)
      const date = new Date(formData.dailyDate + 'T00:00:00'); // Parse as local date
      const day = String(date.getDate()).padStart(2, '0');
      const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const month = monthNames[date.getMonth()];
      const year = String(date.getFullYear()).slice(-2);
      sessionName = `${day}-${month}-${year}`;
    } else {
      sessionName = computeSessionName(startTime);
    }
    
    // Attach session fields
    form.append('userId', userId);
    form.append('sessionName', sessionName);
    // For Activity metric, send 'daily' as default activity type
    form.append('activityType', formData.metric === 'Activity' ? 'daily' : formData.activity);
    form.append('metric', formData.metric);
    
    // For Sleep sessions, send sleepDate instead of startTime/endTime
    // For Activity sessions, send activityDate instead of startTime/endTime
    // For HR/SPO2 daily sessions, send dailyDate instead of startTime/endTime
    if (formData.metric === 'Sleep' && formData.sleepDate) {
      form.append('sleepDate', formData.sleepDate);
    } else if (formData.metric === 'Activity' && formData.activityDate) {
      form.append('activityDate', formData.activityDate);
    } else if ((formData.metric === 'HR' || formData.metric === 'SPO2') && formData.activity === 'daily' && formData.dailyDate) {
      form.append('dailyDate', formData.dailyDate);
    } else {
      form.append('startTime', startTime);
      form.append('endTime', endTime);
    }
    
    form.append('benchmarkDeviceType', formData.benchmarkDeviceType);
    form.append('bandPosition', formData.bandPosition);
    form.append('firmwareVersion', formData.firmwareVersion);
    form.append('mobileType', formData.mobileType);
    // Attach files (fieldname = deviceType)
    formData.devices.forEach((device) => {
      if (deviceFiles[device]) {
        form.append(device, deviceFiles[device] as File, deviceFiles[device]!.name);
      }
    });

    try {
      const res = await apiClient.post('/sessions/create', form, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const data = res.data;
      setResponseData(data);
      setIsSubmitting(false);
      alert('Session created successfully!');
      // Reset form
      setFormData({
        activity: '',
        metric: 'HR',
        startTime: '',
        endTime: '',
        sleepDate: '',
        activityDate: '',
        dailyDate: '',
        benchmarkDeviceType: '',
        bandPosition: '',
        firmwareVersion: '',
        mobileType: 'Android',
        devices: ['luna'],
      });
      setDeviceFiles({ luna: null });
      setFileInputKey(prev => prev + 1); // Force file input reset
    } catch (err) {
      alert('Error creating session.');
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <Card title="Create New Session">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Select
            label="Metric"
            name="metric"
            value={formData.metric}
            onChange={handleChange}
            options={METRIC_OPTIONS}
            placeholder="Select metric type"
            required
          />
          {formData.metric !== 'Activity' && (
            <>
              <Select
                label="Activity"
                name="activity"
                value={formData.activity}
                onChange={handleChange}
                options={ACTIVITY_OPTIONS}
                placeholder="Select activity type"
                required
                disabled={formData.metric === 'Sleep'}
              />
              {formData.metric === 'Sleep' && (
                <p className="text-xs text-gray-500 -mt-4 ml-1">
                  Sleep sessions are fixed to sleeping activity
                </p>
              )}
            </>
          )}
          
          {formData.metric === 'Sleep' ? (
            <div>
              <Input
                type="date"
                label="Sleep Date (Morning Date)"
                name="sleepDate"
                value={formData.sleepDate}
                onChange={handleChange}
                required
              />
              <p className="text-xs text-gray-500 mt-1 ml-1">
                ℹ️ Enter the morning date when you woke up. The session will be computed from the previous night (10 PM) to this morning (8 AM).
              </p>
            </div>
          ) : formData.metric === 'Activity' ? (
            <div>
              <Input
                type="date"
                label="Activity Date"
                name="activityDate"
                value={formData.activityDate}
                onChange={handleChange}
                required
              />
              <p className="text-xs text-gray-500 mt-1 ml-1">
                ℹ️ Enter the date for which you want to track activity data (steps, calories, distance).
              </p>
            </div>
          ) : (formData.metric === 'HR' || formData.metric === 'SPO2') && formData.activity === 'daily' ? (
            <div>
              <Input
                type="date"
                label="Daily Monitoring Date"
                name="dailyDate"
                value={formData.dailyDate}
                onChange={handleChange}
                required
              />
              <p className="text-xs text-gray-500 mt-1 ml-1">
                ℹ️ Enter the date for continuous {formData.metric} monitoring (00:00:00 - 23:59:59).
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
            label="Benchmark Device Type"
            name="benchmarkDeviceType"
            value={formData.benchmarkDeviceType}
            onChange={handleChange}
            options={
              formData.metric === 'SPO2' 
                ? (formData.activity === 'daily' ? BENCHMARK_DEVICE_OPTIONS_SPO2_DAILY : BENCHMARK_DEVICE_OPTIONS_SPO2)
                : formData.metric === 'Sleep' 
                ? BENCHMARK_DEVICE_OPTIONS_SLEEP 
                : formData.metric === 'Activity' 
                ? BENCHMARK_DEVICE_OPTIONS_ACTIVITY 
                : (formData.activity === 'daily' ? [...BENCHMARK_DEVICE_OPTIONS_HR] : BENCHMARK_DEVICE_OPTIONS_HR)
            }
            placeholder="Select benchmark device"
            required
          />
          {formData.benchmarkDeviceType && (
            <p className="text-xs text-blue-600 -mt-4 ml-1">
              ℹ️ {DEVICE_OPTIONS.find(d => d.value === formData.benchmarkDeviceType)?.label} will be automatically selected as a device below
            </p>
          )}
          {formData.metric === 'Sleep' && formData.benchmarkDeviceType === 'apple' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 -mt-2">
              <p className="text-sm text-blue-800 font-medium mb-1">📦 Apple Health Sleep Data</p>
              <p className="text-xs text-blue-700">
                You can upload the exported ZIP file from Apple Health (export.xml will be automatically extracted) or upload a CSV file directly.
              </p>
              <p className="text-xs text-blue-600 mt-2">
                To export from iPhone: Health app → Profile → Export All Health Data
              </p>
            </div>
          )}
          <Select
            label="Band Position"
            name="bandPosition"
            value={formData.bandPosition}
            onChange={handleChange}
            options={BAND_POSITION_OPTIONS}
            placeholder="Select band position"
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

          {(formData.metric === 'Sleep' || formData.metric === 'Activity' || ((formData.metric === 'HR' || formData.metric === 'SPO2') && formData.activity === 'daily')) && (
            <Select
              label="Mobile Type (Falcon Device)"
              name="mobileType"
              value={formData.mobileType}
              onChange={handleChange}
              options={MOBILE_TYPE_OPTIONS}
              placeholder="Select mobile type"
              required
            />
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">Select Devices</label>
            <div className="flex gap-6">
              {DEVICE_OPTIONS.filter((opt) => {
                // Always show Falcon
                if (opt.always) return true;
                // For SPO2, show masimo always, and Apple only for daily activity
                if (formData.metric === 'SPO2') {
                  if (opt.spo2Only) return true;
                  if (opt.spo2DailyCompatible && formData.activity === 'daily') return true;
                  return false;
                }
                // For Sleep, only show Sleep-compatible devices
                if (formData.metric === 'Sleep') return opt.sleepCompatible;
                // For Activity, only show Activity-compatible devices (Apple for benchmark)
                if (formData.metric === 'Activity') return opt.activityCompatible;
                // For HR, show polar always, and Apple only for daily activity
                if (formData.metric === 'HR') {
                  if (opt.hrOnly) return true;
                  if (opt.hrCompatible && formData.activity === 'daily') return true;
                  return false;
                }
                // For other metrics, hide device-specific devices
                return !opt.hrOnly && !opt.spo2Only && !opt.sleepCompatible;
              }).map((opt) => {
                const isBenchmark = opt.value === formData.benchmarkDeviceType;
                const isDisabled = !!opt.always || isBenchmark;
                return (
                  <label key={opt.value} className={`flex items-center gap-2 ${isDisabled ? 'cursor-not-allowed opacity-75' : 'cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      checked={formData.devices.includes(opt.value)}
                      disabled={isDisabled}
                      onChange={() => handleDeviceToggle(opt.value)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      {opt.label}
                      {isBenchmark && <span className="ml-1 text-xs text-blue-600">(Benchmark)</span>}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-2 ml-1">
              ⚠️ Files must be uploaded for all selected devices before submission
            </p>
          </div>

          {/* Per-device file upload */}
          {formData.devices.map((device) => {
            // For Apple Health data, accept ZIP files (contains export.xml) or XML files
            // For HR: XML or ZIP containing export.xml
            // For Sleep/Activity/SPO2: ZIP containing export.xml or CSV
            const acceptedFormats = device === 'apple'
              ? ".xml,.XML,.zip,.ZIP,.csv,.CSV"
              : ".csv,.CSV,.txt,.TXT";
            
            return (
              <div key={device} className="flex flex-col gap-3">
                <label className="text-sm font-medium text-gray-700">
                  Upload {DEVICE_OPTIONS.find((d) => d.value === device)?.label} File
                  <span className="text-red-500 ml-1">*</span>
                  {device === 'apple' && (
                    <span className="text-xs text-gray-500 ml-2">
                      {formData.metric === 'HR' && '(ZIP with export.xml or XML file)'}
                      {(formData.metric === 'Sleep' || formData.metric === 'Activity' || formData.metric === 'SPO2') && '(ZIP with export.xml or CSV)'}
                    </span>
                  )}
                </label>
                <input
                  key={`${device}-${fileInputKey}`}
                  type="file"
                  accept={acceptedFormats}
                  onChange={(e) => handleFileChange(device, e.target.files?.[0] || null)}
                  required
                  className="block w-full text-sm text-gray-600 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-blue-500 file:to-blue-600 file:text-white hover:file:from-blue-600 hover:file:to-blue-700 file:cursor-pointer file:shadow-sm file:transition-all cursor-pointer border border-gray-200 rounded-xl p-3 bg-white/50 backdrop-blur-sm hover:border-gray-300 transition-all"
                />
                {device === 'apple' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                    <p className="text-xs text-blue-700">
                      <strong>To export from iPhone:</strong> Health app → Profile → Export All Health Data
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      Upload the ZIP file directly or extract and upload the export.xml file
                    </p>
                  </div>
                )}
                {deviceFiles[device] && (
                  <span className="text-xs text-gray-500 ml-1">Selected: {deviceFiles[device]?.name}</span>
                )}
              </div>
            );
          })}

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        </form>
      </Card>

      {responseData?.success && responseData?.data && (
        <Card title="Session Created Successfully" className="mt-8">
          <div className="space-y-8">
            {/* Session ID */}
            <div className="pb-4 border-b border-gray-200">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Session ID</p>
              <p className="text-sm font-mono text-gray-800 bg-gray-50 px-3 py-2 rounded">
                {responseData.data._id}
              </p>
            </div>

            {/* Session Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Activity Type</p>
                <p className="text-sm font-semibold text-gray-900 capitalize">
                  {responseData.data.activityType}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Band Position</p>
                <p className="text-sm font-semibold text-gray-900 capitalize">
                  {responseData.data.bandPosition}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Benchmark Device</p>
                <p className="text-sm font-semibold text-gray-900 capitalize">
                  {responseData.data.benchmarkDeviceType}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Duration</p>
                <p className="text-sm font-semibold text-gray-900">
                  {responseData.data.durationSec} seconds
                </p>
              </div>
            </div>

            {/* Time Information */}
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Start Time</p>
                <p className="text-sm text-gray-900 font-mono">
                  {formatISODateTime(responseData.data.startTime)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">End Time</p>
                <p className="text-sm text-gray-900 font-mono">
                  {formatISODateTime(responseData.data.endTime)}
                </p>
              </div>
            </div>

            {/* Devices Section */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Devices</p>
              <div className="space-y-2">
                {responseData.data.devices.map((device: any) => (
                  <div
                    key={device._id}
                    className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-900 capitalize">
                        {device.deviceType}
                      </span>
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-600">ID: {device.deviceId}</span>
                    </div>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-medium">
                      v{device.firmwareVersion}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Badge */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Status:</span>
                <span
                  className={`text-xs px-2 py-1 rounded font-medium ${
                    responseData.data.isValid
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {responseData.data.isValid ? 'Valid' : 'Invalid'}
                </span>
              </div>
            </div>
          </div>
        </Card>
      )}
    </Layout>
  );
}
