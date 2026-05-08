// src/pages/ManualActivityFormPage.tsx

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
  { value: 'luna ring', label: 'Luna Ring' },
  { value: 'evie', label: 'Evie' },
];


export default function ManualActivityFormPage() {
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [firmwareVersions, setFirmwareVersions] = useState<
    Array<{ value: string; label: string }>
  >([]);

  // =====================================
  // META DATA
  // =====================================
  const [metaData, setMetaData] = useState({
    sessionName: '',
    activityDate: '',
    firmwareVersion: '',
    benchmarkDeviceType: '',
  });

  // =====================================
  // LUNA DATA
  // IMPORTANT:
  // THESE NAMES MUST MATCH BACKEND SERVICE
  // =====================================
  const [lunaData, setLunaData] = useState({
    steps: '',
    caloriesTotal: '',
    caloriesActive: '',
    caloriesBasal: '',
    distanceMeters: '',
  });

  // =====================================
  // BENCHMARK DATA
  // =====================================
  const [benchmarkData, setBenchmarkData] = useState({
    steps: '',
    caloriesTotal: '',
    caloriesActive: '',
    caloriesBasal: '',
    distanceMeters: '',
  });

  // =====================================
  // FETCH FW
  // =====================================
  useEffect(() => {
    apiClient
      .get('/devices/firmware?deviceType=luna')
      .then((res) => {
        if (res.data.success && res.data.data) {
          setFirmwareVersions(
            res.data.data.map((v: string) => ({
              value: v,
              label: v,
            }))
          );
        }
      })
      .catch((err) =>
        console.error(
          'Error fetching firmware versions:',
          err
        )
      );
  }, []);

  // =====================================
  // HANDLERS
  // =====================================
  const handleMetaChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement
    >
  ) => {
    setMetaData({
      ...metaData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLunaChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setLunaData({
      ...lunaData,
      [e.target.name]: e.target.value,
    });
  };

  const handleBenchmarkChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setBenchmarkData({
      ...benchmarkData,
      [e.target.name]: e.target.value,
    });
  };

  // =====================================
  // HELPER
  // =====================================
  const hasData = (data: Record<string, string>) => {
    return Object.values(data).some(
      (v) => v !== '' && v !== '0'
    );
  };

  // =====================================
  // SUBMIT
  // =====================================
  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setIsSubmitting(true);

    try {
      /**
       * IMPORTANT:
       * FIELD NAMES MUST MATCH:
       *
       * backend expects:
       * caloriesTotal
       * caloriesActive
       * caloriesBasal
       */

      const payload = {
        sessionName:
          metaData.sessionName ||
          `Manual Activity - ${metaData.activityDate}`,

        activityDate: metaData.activityDate,

        firmwareVersion:
          metaData.firmwareVersion,

        benchmarkDeviceType:
          metaData.benchmarkDeviceType ||
          undefined,

        luna: hasData(lunaData)
          ? {
              steps: Number(
                lunaData.steps || 0
              ),

              caloriesTotal: Number(
                lunaData.caloriesTotal || 0
              ),

              caloriesActive: Number(
                lunaData.caloriesActive || 0
              ),

              caloriesBasal: Number(
                lunaData.caloriesBasal || 0
              ),

              distanceMeters: Number(
                lunaData.distanceMeters || 0
              ),
            }
          : undefined,

        benchmark:
          metaData.benchmarkDeviceType &&
          hasData(benchmarkData)
            ? {
                steps: Number(
                  benchmarkData.steps || 0
                ),

                caloriesTotal: Number(
                  benchmarkData.caloriesTotal ||
                    0
                ),

                caloriesActive: Number(
                  benchmarkData.caloriesActive ||
                    0
                ),

                caloriesBasal: Number(
                  benchmarkData.caloriesBasal ||
                    0
                ),

                distanceMeters: Number(
                  benchmarkData.distanceMeters ||
                    0
                ),
              }
            : undefined,
      };

      console.log(
        '🚀 MANUAL ACTIVITY PAYLOAD:',
        payload
      );

      await apiClient.post(
        '/sessions/create-manual-activity',
        payload
      );

      alert(
        '✅ Manual Activity Session created successfully!'
      );

      navigate('/dashboard');
    } catch (error: any) {
      console.error(error);

      alert(
        `❌ Failed to create session: ${
          error.response?.data?.message ||
          error.message
        }`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      {/* HEADER */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Manual Activity Entry
          </h1>

          <p className="text-sm text-gray-600 mt-1">
            Enter activity values manually
            without uploading log files.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() =>
            navigate('/sessions/create')
          }
        >
          Back to Upload
        </Button>
      </div>

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="space-y-6"
      >
        {/* ================================= */}
        {/* SECTION 1 */}
        {/* ================================= */}
        <Card title="1. Session Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Session Name (Optional)"
              name="sessionName"
              value={metaData.sessionName}
              onChange={handleMetaChange}
              placeholder="e.g. Monday Activity"
            />

            <Input
              type="date"
              label="Activity Date"
              name="activityDate"
              value={metaData.activityDate}
              onChange={handleMetaChange}
              required
            />

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
              value={
                metaData.benchmarkDeviceType
              }
              onChange={handleMetaChange}
              options={
                BENCHMARK_DEVICE_OPTIONS
              }
            />
          </div>
        </Card>

        {/* ================================= */}
        {/* SECTION 2 */}
        {/* ================================= */}
        <Card title="2. Falcon (Luna) Activity Data">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="number"
              label="Steps"
              name="steps"
              value={lunaData.steps}
              onChange={handleLunaChange}
            />

            <Input
              type="number"
              label="Total Calories (kcal)"
              name="caloriesTotal"
              value={lunaData.caloriesTotal}
              onChange={handleLunaChange}
            />

            <Input
              type="number"
              label="Active Calories (kcal)"
              name="caloriesActive"
              value={lunaData.caloriesActive}
              onChange={handleLunaChange}
            />

            <Input
              type="number"
              label="Basal Calories (kcal)"
              name="caloriesBasal"
              value={lunaData.caloriesBasal}
              onChange={handleLunaChange}
            />

            <Input
              type="number"
              label="Distance (Meters)"
              name="distanceMeters"
              value={lunaData.distanceMeters}
              onChange={handleLunaChange}
            />
          </div>
        </Card>

        {/* ================================= */}
        {/* SECTION 3 */}
        {/* ================================= */}
        {metaData.benchmarkDeviceType && (
          <Card
            title={`3. ${metaData.benchmarkDeviceType.toUpperCase()} Activity Data`}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="number"
                label="Steps"
                name="steps"
                value={benchmarkData.steps}
                onChange={
                  handleBenchmarkChange
                }
              />

              <Input
                type="number"
                label="Total Calories (kcal)"
                name="caloriesTotal"
                value={
                  benchmarkData.caloriesTotal
                }
                onChange={
                  handleBenchmarkChange
                }
              />

              <Input
                type="number"
                label="Active Calories (kcal)"
                name="caloriesActive"
                value={
                  benchmarkData.caloriesActive
                }
                onChange={
                  handleBenchmarkChange
                }
              />

              <Input
                type="number"
                label="Basal Calories (kcal)"
                name="caloriesBasal"
                value={
                  benchmarkData.caloriesBasal
                }
                onChange={
                  handleBenchmarkChange
                }
              />

              <Input
                type="number"
                label="Distance (Meters)"
                name="distanceMeters"
                value={
                  benchmarkData.distanceMeters
                }
                onChange={
                  handleBenchmarkChange
                }
              />
            </div>
          </Card>
        )}

        {/* ================================= */}
        {/* SUBMIT */}
        {/* ================================= */}
        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? 'Saving Manual Session...'
            : 'Create Manual Activity Session'}
        </Button>
      </form>
    </Layout>
  );
}