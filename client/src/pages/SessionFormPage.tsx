
import { useState } from 'react';
import { Layout } from '../components/layout';
import { Button, Input, Card } from '../components/common';

const DEVICE_OPTIONS = [
  { label: 'Luna', value: 'luna', always: true },
  { label: 'Polar', value: 'polar' },
  { label: 'Coros', value: 'coros' },
];

export default function SessionFormPage() {
  const [formData, setFormData] = useState({
    sessionName: '',
    activity: '',
    startTime: '',
    endTime: '',
    benchmarkDeviceType: '',
    bandPosition: '',
    devices: ['luna'],
  });
  const [deviceFiles, setDeviceFiles] = useState<{ [key: string]: File | null }>({ luna: null });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleDeviceToggle = (device: string) => {
    setFormData((prev) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = new FormData();
    // Get userId from localStorage
    const userId = localStorage.getItem('userId');
    if (!userId) {
      alert('User not logged in. Please login first.');
      return;
    }
    // Attach session fields
    form.append('userId', userId);
    form.append('sessionName', formData.sessionName);
    form.append('activityType', formData.activity);
    form.append('startTime', ensureSeconds(formData.startTime));
    form.append('endTime', ensureSeconds(formData.endTime));
    form.append('benchmarkDeviceType', formData.benchmarkDeviceType);
    form.append('bandPosition', formData.bandPosition);
    // Attach files (fieldname = deviceType)
    formData.devices.forEach((device) => {
      if (deviceFiles[device]) {
        form.append(device, deviceFiles[device] as File, deviceFiles[device]!.name);
      }
    });

    try {
      const res = await fetch('http://localhost:3000/api/sessions/create', {
        method: 'POST',
        body: form,
      });
      if (!res.ok) throw new Error('Failed to create session');
      const data = await res.json();
      alert('Session created successfully!');
      // Optionally reset form or redirect
    } catch (err) {
      alert('Error creating session.');
    }
  };

  return (
    <Layout>
      <Card title="Create New Session">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            label="Session Name"
            name="sessionName"
            value={formData.sessionName}
            onChange={handleChange}
            placeholder="Enter session name"
            required
          />
          <Input
            type="text"
            label="Activity"
            name="activity"
            value={formData.activity}
            onChange={handleChange}
            placeholder="Enter activity"
            required
          />
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
          <Input
            type="text"
            label="Benchmark Device Type"
            name="benchmarkDeviceType"
            value={formData.benchmarkDeviceType}
            onChange={handleChange}
            placeholder="e.g. polar"
            required
          />
          <Input
            type="text"
            label="Band Position"
            name="bandPosition"
            value={formData.bandPosition}
            onChange={handleChange}
            placeholder="e.g. left wrist"
            required
          />

          <div>
            <label className="block font-medium mb-2">Select Devices</label>
            <div className="flex gap-4">
              {DEVICE_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.devices.includes(opt.value)}
                    disabled={!!opt.always}
                    onChange={() => handleDeviceToggle(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Per-device file upload */}
          {formData.devices.map((device) => (
            <div key={device} className="flex flex-col gap-2">
              <label className="font-medium">
                Upload {DEVICE_OPTIONS.find((d) => d.value === device)?.label} File
              </label>
              <input
                type="file"
                accept=".csv,.CSV"
                onChange={(e) => handleFileChange(device, e.target.files?.[0] || null)}
                required
              />
              {deviceFiles[device] && (
                <span className="text-xs text-gray-500">Selected: {deviceFiles[device]?.name}</span>
              )}
            </div>
          ))}

          <Button type="submit" variant="primary">
            Submit
          </Button>
        </form>
      </Card>
    </Layout>
  );
}
