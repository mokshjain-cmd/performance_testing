import { useEffect, useState } from 'react';
import apiClient from '../services/api';
import {
  Activity,
  Cpu,
  Users,
  Watch,
  Clock,
  Trophy,
  Target,
  Zap,
} from 'lucide-react';

import { Layout } from '../components/layout';
import { Card } from '../components/common';

interface HomeStats {
  totalWorkoutSessions: number;
  totalSessions: number;
  totalUsers: number;

  totalLunaReadings: number;
  totalReadings: number;

  totalHoursTested: number;
  totalDaysOfData: number;

  totalFirmwareReleases: number;
  latestFirmware: string | null;

  totalDevicesBenchmarked: number;
  benchmarkDevices: string[];

  activitiesCovered: number;

  workouts: {
    sportType: number;
    name: string;
    sessions: number;
  }[];
}
const formatMillions = (value: number) => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return value.toLocaleString();
};
export default function HomePage() {
  const [stats, setStats] = useState<HomeStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHomeStats = async () => {
      try {
        const { data } = await apiClient.get('/home');

        setStats(data.data);
      } catch (error) {
        console.error('Failed to load home stats', error);
      } finally {
        setLoading(false);
      }
    };

    loadHomeStats();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-20 text-gray-500">
          Loading platform statistics...
        </div>
      </Layout>
    );
  }

  if (!stats) return null;

  return (
    <Layout>
      <div className="space-y-8">

        {/* Hero */}
        <Card>
          <div className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50 via-white to-purple-50 rounded-xl" />

            <div className="relative p-2">
              <h1 className="text-4xl font-bold text-gray-900">
                Noise Benchmarking Platform
              </h1>

              <p className="mt-3 text-gray-600 max-w-3xl">
                Continuous validation of firmware, sensors and algorithms
                against industry benchmark devices.
              </p>

              <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">

                <StatBox
                  icon={<Activity size={18} />}
                  label="Workout Sessions"
                  value={stats.totalWorkoutSessions.toLocaleString()}
                />

                <StatBox
                  icon={<Zap size={18} />}
                  label="Luna Readings"
                  value={formatMillions(stats.totalLunaReadings)}
                />

                <StatBox
                  icon={<Watch size={18} />}
                  label="Benchmark Devices"
                  value={stats.totalDevicesBenchmarked}
                />

                <StatBox
                  icon={<Cpu size={18} />}
                  label="Firmware Releases"
                  value={stats.totalFirmwareReleases}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* KPI Grid */}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">

          <MetricCard
            title="Total Sessions"
            value={stats.totalSessions.toLocaleString()}
            icon={<Activity size={20} />}
          />

          <MetricCard
            title="Total Users"
            value={stats.totalUsers.toLocaleString()}
            icon={<Users size={20} />}
          />

          <MetricCard
            title="Hours Tested"
            value={`${stats.totalHoursTested.toFixed(1)} Hrs`}
            icon={<Clock size={20} />}
          />

          <MetricCard
            title="Days of Data"
            value={stats.totalDaysOfData.toLocaleString()}
            icon={<Target size={20} />}
          />

        </div>

        {/* Data Scale */}

        <Card title="Data Collection Scale">
          <div className="grid md:grid-cols-2 gap-6">

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-6">
              <p className="text-sm text-blue-600 font-medium">
                Luna Readings Collected
              </p>

              <h2 className="text-4xl font-bold text-blue-900 mt-2">
                {formatMillions(stats.totalLunaReadings)}
              </h2>
            </div>

            <div className="rounded-xl border border-purple-100 bg-purple-50 p-6">
              <p className="text-sm text-purple-600 font-medium">
                Total Readings Across All Devices
              </p>

              <h2 className="text-4xl font-bold text-purple-900 mt-2">
                {formatMillions(stats.totalReadings)}
              </h2>
            </div>

          </div>
        </Card>

        {/* Devices */}

        <Card title="Benchmark Devices">
          <div className="flex flex-wrap gap-3">
            {stats.benchmarkDevices.map((device) => (
              <span
                key={device}
                className="px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium"
              >
                {device.toUpperCase()}
              </span>
            ))}
          </div>
        </Card>

        {/* Firmware */}

        <Card title="Firmware Progress">
          <div className="grid md:grid-cols-2 gap-6">

            <div className="p-5 rounded-xl bg-gray-50">
              <div className="text-sm text-gray-500">
                Firmware Releases
              </div>

              <div className="text-4xl font-bold mt-2 text-gray-900">
                {stats.totalFirmwareReleases}
              </div>
            </div>

            <div className="p-5 rounded-xl bg-gray-50">
              <div className="text-sm text-gray-500">
                Latest Firmware
              </div>

              <div className="text-4xl font-bold mt-2 text-gray-900">
                {stats.latestFirmware || '-'}
              </div>
            </div>

          </div>
        </Card>

        {/* Activities */}

        <Card title="Workout Coverage">
          <div className="mb-4 text-sm text-gray-500">
            {stats.activitiesCovered} activity types benchmarked
          </div>

          <div className="flex flex-wrap gap-2">
            {stats.workouts.map((workout) => (
              <div
                key={workout.sportType}
                className="px-3 py-2 rounded-lg bg-gray-50 border border-gray-200"
              >
                <div className="font-medium text-gray-800">
                  {workout.name}
                </div>

                <div className="text-xs text-gray-500">
                  {workout.sessions} sessions
                </div>
              </div>
            ))}
          </div>
        </Card>

      </div>
    </Layout>
  );
}

function StatBox({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl bg-white/80 backdrop-blur border border-gray-100 p-4">
      <div className="text-blue-600 mb-2">{icon}</div>

      <div className="text-2xl font-bold text-gray-900">
        {value}
      </div>

      <div className="text-xs text-gray-500 mt-1">
        {label}
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-gray-500 text-sm">{title}</div>

        <div className="text-blue-500">{icon}</div>
      </div>

      <div className="mt-3 text-3xl font-bold text-gray-900">
        {value}
      </div>
    </div>
  );
}