import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout';
import { Button, Input, Select, Card } from '../components/common';
import apiClient from '../services/api';

const HRV_BENCHMARK_DEVICE_OPTIONS = [
  { value: 'whoop', label: 'WHOOP' },
  { value: 'garmin', label: 'Garmin' },
  { value: 'luna ring', label: 'Luna Ring' },
];

export default function ManualHrvFormPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [firmwareVersions, setFirmwareVersions] = useState<Array<{ value: string; label: string }>>([]);

  const [metaData, setMetaData] = useState({
    sessionName: '',
    hrvDate: '',
    firmwareVersion: '',
    benchmarkDeviceType: '',
  });

  const [falconHrv, setFalconHrv] = useState('');
  const [benchmarkHrv, setBenchmarkHrv] = useState('');

  useEffect(() => {
    apiClient
      .get('/devices/firmware?deviceType=luna')
      .then((res) => {
        if (res.data.success && res.data.data) {
          setFirmwareVersions(res.data.data.map((v: string) => ({ value: v, label: v })));
        }
      })
      .catch((err) => console.error('Error fetching firmware versions:', err));
  }, []);

  const handleMetaChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setMetaData({ ...metaData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        sessionName: metaData.sessionName || `Manual HRV - ${metaData.hrvDate}`,
        hrvDate: metaData.hrvDate,
        firmwareVersion: metaData.firmwareVersion,
        benchmarkDeviceType: metaData.benchmarkDeviceType || undefined,
        manualData: {
          luna: { hrvValue: Number(falconHrv) },
          benchmark: metaData.benchmarkDeviceType ? { hrvValue: Number(benchmarkHrv) } : undefined,
        },
      };

      await apiClient.post('/sessions/create-manual-hrv', payload);

      alert('✅ Manual HRV Session created successfully!');
      navigate('/hrv');
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
          <h1 className="text-2xl font-bold text-gray-900">Manual HRV Entry</h1>
          <p className="text-gray-600 text-sm mt-1">Enter a night's HRV values manually without log files.</p>
        </div>
        <Button variant="primary" onClick={() => navigate('/sessions/create')}>
          Back to File Upload
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card title="1. Session Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Session Name (Optional)"
              name="sessionName"
              value={metaData.sessionName}
              onChange={handleMetaChange}
              placeholder="e.g., Monday Night HRV"
            />
            <Input type="date" label="Night Date" name="hrvDate" value={metaData.hrvDate} onChange={handleMetaChange} required />
            <Select
              label="Falcon Firmware Version"
              name="firmwareVersion"
              value={metaData.firmwareVersion}
              onChange={handleMetaChange}
              options={firmwareVersions}
              required
            />
            <Select
              label="Benchmark Device (Optional)"
              name="benchmarkDeviceType"
              value={metaData.benchmarkDeviceType}
              onChange={handleMetaChange}
              options={HRV_BENCHMARK_DEVICE_OPTIONS}
            />
          </div>
        </Card>

        <Card title="2. HRV Values">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="number"
              label="Falcon HRV (ms)"
              value={falconHrv}
              onChange={(e) => setFalconHrv(e.target.value)}
              required
            />
            {metaData.benchmarkDeviceType && (
              <Input
                type="number"
                label={`${metaData.benchmarkDeviceType.toUpperCase()} HRV (ms)`}
                value={benchmarkHrv}
                onChange={(e) => setBenchmarkHrv(e.target.value)}
                required
              />
            )}
          </div>
        </Card>

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Saving Manual Session...' : 'Create Manual HRV Session'}
        </Button>
      </form>
    </Layout>
  );
}
