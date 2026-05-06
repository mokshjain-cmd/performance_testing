import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout';
import { Button, Input, Select, Card } from '../components/common';
import apiClient from '../services/api';

const BENCHMARK_DEVICE_OPTIONS = [
  { value: 'polar', label: 'Polar' },
  { value: 'zepp', label: 'AmazeFit' },
  { value: 'apple', label: 'Apple Watch' },
  { value: 'whoop', label: 'WHOOP' },
  { value: 'coros', label: 'Coros' },
  { value: 'masimo', label: 'Masimo' },
  { value: 'garmin', label: 'Garmin' },
];

// --- Custom Component for Hours & Minutes Input ---
interface DurationInputProps {
  label: string;
  valueSec: number;
  onChange: (newSec: number) => void;
  required?: boolean;
}

function DurationInput({ label, valueSec, onChange, required }: DurationInputProps) {
  const hours = Math.floor(valueSec / 3600);
  const mins = Math.floor((valueSec % 3600) / 60);

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const h = parseInt(e.target.value) || 0;
    onChange(h * 3600 + mins * 60);
  };

  const handleMinsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const m = parseInt(e.target.value) || 0;
    onChange(hours * 3600 + m * 60);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="number"
            min="0"
            value={hours || ''}
            onChange={handleHoursChange}
            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border"
            placeholder="0"
          />
          <span className="absolute right-3 top-2.5 text-gray-400 font-medium">h</span>
        </div>
        <div className="relative flex-1">
          <input
            type="number"
            min="0"
            max="59"
            value={mins || ''}
            onChange={handleMinsChange}
            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2.5 border"
            placeholder="0"
          />
          <span className="absolute right-3 top-2.5 text-gray-400 font-medium">m</span>
        </div>
      </div>
    </div>
  );
}
// ------------------------------------------------

export default function ManualSleepFormPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [firmwareVersions, setFirmwareVersions] = useState<Array<{ value: string; label: string }>>([]);

  // Session Metadata
  const [metaData, setMetaData] = useState({
    sessionName: '',
    sleepDate: '',
    firmwareVersion: '',
    benchmarkDeviceType: '',
  });

  // Luna Sleep Data
  const [lunaData, setLunaData] = useState({
    totalSleepSec: 0,
    deepSec: 0,
    remSec: 0,
    lightSec: 0,
    awakeSec: 0,
    sleepScore: '',
    sleepOnsetTime: '', // Will capture format: YYYY-MM-DDTHH:mm
    finalWakeTime: '',
  });

  // Benchmark Sleep Data
  const [benchmarkData, setBenchmarkData] = useState({
    totalSleepSec: 0,
    deepSec: 0,
    remSec: 0,
    lightSec: 0,
    awakeSec: 0,
    sleepOnsetTime: '',
    finalWakeTime: '',
  });

  useEffect(() => {
    apiClient.get('/devices/firmware?deviceType=luna')
      .then(res => {
        if (res.data.success && res.data.data) {
          setFirmwareVersions(res.data.data.map((v: string) => ({ value: v, label: v })));
        }
      })
      .catch(err => console.error('Error fetching firmware versions:', err));
  }, []);

  const handleMetaChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setMetaData({ ...metaData, [e.target.name]: e.target.value });
  };

  const handleLunaTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLunaData({ ...lunaData, [e.target.name]: e.target.value });
  };

  const handleBenchmarkTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBenchmarkData({ ...benchmarkData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Build the JSON payload strictly matching the backend interface
      // Converts local datetime string to strict ISO format for DB
      const payload = {
        sessionName: metaData.sessionName || `Manual Sleep - ${metaData.sleepDate}`,
        sleepDate: metaData.sleepDate,
        firmwareVersion: metaData.firmwareVersion,
        benchmarkDeviceType: metaData.benchmarkDeviceType || undefined,
        manualData: {
          luna: {
            totalSleepSec: lunaData.totalSleepSec,
            deepSec: lunaData.deepSec,
            remSec: lunaData.remSec,
            lightSec: lunaData.lightSec,
            awakeSec: lunaData.awakeSec,
            sleepScore: lunaData.sleepScore ? Number(lunaData.sleepScore) : undefined,
            sleepOnsetTime: lunaData.sleepOnsetTime ? `${lunaData.sleepOnsetTime}:00.000Z` : undefined,
            finalWakeTime: lunaData.finalWakeTime ? `${lunaData.finalWakeTime}:00.000Z` : undefined,
          },
          benchmark: metaData.benchmarkDeviceType ? {
            totalSleepSec: benchmarkData.totalSleepSec,
            deepSec: benchmarkData.deepSec,
            remSec: benchmarkData.remSec,
            lightSec: benchmarkData.lightSec,
            awakeSec: benchmarkData.awakeSec,
            ssleepOnsetTime: benchmarkData.sleepOnsetTime ? `${benchmarkData.sleepOnsetTime}:00.000Z` : undefined,
            finalWakeTime: benchmarkData.finalWakeTime ? `${benchmarkData.finalWakeTime}:00.000Z` : undefined,
          } : undefined
        }
      };

      await apiClient.post('/sessions/create-manual-sleep', payload);
      
      alert('✅ Manual Sleep Session created successfully!');
      navigate('/dashbaord'); // Redirect back to sessions list

    } catch (error: any) {
      alert(`❌ Failed to create session: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manual Sleep Entry</h1>
          <p className="text-gray-600 text-sm mt-1">Enter sleep stages and timings manually without log files.</p>
        </div>
        <Button variant="primary" onClick={() => navigate('/sessions/create')}>
          Back to File Upload
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: METADATA */}
        <Card title="1. Session Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Session Name (Optional)" name="sessionName" value={metaData.sessionName} onChange={handleMetaChange} placeholder="e.g., Monday Night Sleep" />
            <Input type="date" label="Sleep Date" name="sleepDate" value={metaData.sleepDate} onChange={handleMetaChange} required />
            <Select label="Falcon Firmware Version" name="firmwareVersion" value={metaData.firmwareVersion} onChange={handleMetaChange} options={firmwareVersions} required />
            <Select label="Benchmark Device (Optional)" name="benchmarkDeviceType" value={metaData.benchmarkDeviceType} onChange={handleMetaChange} options={BENCHMARK_DEVICE_OPTIONS} />
          </div>
        </Card>

        {/* SECTION 2: LUNA DATA */}
        <Card title="2. Falcon (Luna) Sleep Data">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-100">
            <Input type="datetime-local" label="Sleep Onset Time (Bedtime)" name="sleepOnsetTime" value={lunaData.sleepOnsetTime} onChange={handleLunaTextChange} />
            <Input type="datetime-local" label="Final Wake Time" name="finalWakeTime" value={lunaData.finalWakeTime} onChange={handleLunaTextChange} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <DurationInput label="Total Time in Bed" valueSec={lunaData.totalSleepSec} onChange={(val) => setLunaData({ ...lunaData, totalSleepSec: val })} required />
            <DurationInput label="Deep Sleep" valueSec={lunaData.deepSec} onChange={(val) => setLunaData({ ...lunaData, deepSec: val })} required />
            <DurationInput label="REM Sleep" valueSec={lunaData.remSec} onChange={(val) => setLunaData({ ...lunaData, remSec: val })} required />
            <DurationInput label="Light Sleep" valueSec={lunaData.lightSec} onChange={(val) => setLunaData({ ...lunaData, lightSec: val })} required />
            <DurationInput label="Awake Time" valueSec={lunaData.awakeSec} onChange={(val) => setLunaData({ ...lunaData, awakeSec: val })} required />
            <Input type="number" label="Sleep Score (Optional)" name="sleepScore" value={lunaData.sleepScore} onChange={handleLunaTextChange} />
          </div>
        </Card>

        {/* SECTION 3: BENCHMARK DATA (Conditional) */}
        {metaData.benchmarkDeviceType && (
          <Card title={`3. ${metaData.benchmarkDeviceType.toUpperCase()} Sleep Data`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-100">
              <Input type="datetime-local" label="Sleep Onset Time (Bedtime)" name="sleepOnsetTime" value={benchmarkData.sleepOnsetTime} onChange={handleBenchmarkTextChange} />
              <Input type="datetime-local" label="Final Wake Time" name="finalWakeTime" value={benchmarkData.finalWakeTime} onChange={handleBenchmarkTextChange} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <DurationInput label="Total Time in Bed" valueSec={benchmarkData.totalSleepSec} onChange={(val) => setBenchmarkData({ ...benchmarkData, totalSleepSec: val })} required />
              <DurationInput label="Deep Sleep" valueSec={benchmarkData.deepSec} onChange={(val) => setBenchmarkData({ ...benchmarkData, deepSec: val })} required />
              <DurationInput label="REM Sleep" valueSec={benchmarkData.remSec} onChange={(val) => setBenchmarkData({ ...benchmarkData, remSec: val })} required />
              <DurationInput label="Light Sleep" valueSec={benchmarkData.lightSec} onChange={(val) => setBenchmarkData({ ...benchmarkData, lightSec: val })} required />
              <DurationInput label="Awake Time" valueSec={benchmarkData.awakeSec} onChange={(val) => setBenchmarkData({ ...benchmarkData, awakeSec: val })} required />
            </div>
          </Card>
        )}

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Saving Manual Session...' : 'Create Manual Sleep Session'}
        </Button>
      </form>
    </Layout>
  );
}