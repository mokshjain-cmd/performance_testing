import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface MetricData {
  _id: string;
  userId: string;
  date: string;
  hr?: any;
  sleep?: any;
  activity?: any;
  spo2?: any;
  workouts?: any[];
  engagementScore: number;
}

const UserEngagementDetailPage = () => {
  const { userId } = useParams<{ userId: string }>();
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'hr' | 'sleep' | 'activity' | 'spo2'>('hr');
  const [dateRange, setDateRange] = useState(7);

  useEffect(() => {
    fetchUserData();
  }, [userId, dateRange]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Fetch user engagement summary
      const summaryResponse = await fetch(`/api/engagement/users/${userId}?days=${dateRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const summaryData = await summaryResponse.json();
      
      if (summaryData.success) {
        setUserInfo(summaryData.data);
        setMetrics(summaryData.data.metrics || []);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const dates = metrics.map(m => new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })).reverse();
  
  const hrChartData = {
    labels: dates,
    datasets: [
      {
        label: 'Avg HR',
        data: metrics.map(m => m.hr?.avgHR || null).reverse(),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Max HR',
        data: metrics.map(m => m.hr?.maxHR || null).reverse(),
        borderColor: 'rgb(251, 146, 60)',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.4,
      },
      {
        label: 'Min HR',
        data: metrics.map(m => m.hr?.minHR || null).reverse(),
        borderColor: 'rgb(147, 197, 253)',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.4,
      }
    ]
  };

  const sleepChartData = {
    labels: dates,
    datasets: [
      {
        label: 'Sleep Score',
        data: metrics.map(m => m.sleep?.sleepScore || null).reverse(),
        borderColor: 'rgb(139, 92, 246)',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
        tension: 0.4,
      }
    ]
  };

  const activityChartData = {
    labels: dates,
    datasets: [
      {
        label: 'Steps',
        data: metrics.map(m => m.activity?.steps || 0).reverse(),
        backgroundColor: 'rgb(59, 130, 246)',
      }
    ]
  };

  const spo2ChartData = {
    labels: dates,
    datasets: [
      {
        label: 'Avg SpO2',
        data: metrics.map(m => m.spo2?.avgSpO2 || null).reverse(),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">User not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">User Engagement Details</h1>
        <div className="flex items-center gap-4">
          <div className="text-gray-600">
            <span className="font-semibold">Status:</span>{' '}
            <span className={`
              ${userInfo.status === 'active' ? 'text-green-600' : ''}
              ${userInfo.status === 'declining' ? 'text-yellow-600' : ''}
              ${userInfo.status === 'inactive' ? 'text-red-600' : ''}
              font-semibold
            `}>
              {userInfo.status?.toUpperCase()}
            </span>
          </div>
          <div className="text-gray-600">
            <span className="font-semibold">Last Active:</span>{' '}
            {userInfo.lastActiveDate 
              ? new Date(userInfo.lastActiveDate).toLocaleDateString()
              : 'Never'}
          </div>
          <div className="text-gray-600">
            <span className="font-semibold">Inactive Days:</span> {userInfo.consecutiveInactiveDays}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Avg Engagement</div>
          <div className="text-3xl font-bold">{userInfo.avgEngagementScore}</div>
          <div className="text-xs text-gray-500">Last {dateRange} days</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Days with Data</div>
          <div className="text-3xl font-bold">{userInfo.totalDays}</div>
          <div className="text-xs text-gray-500">of {dateRange} days</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">HR Coverage</div>
          <div className="text-3xl font-bold">
            {metrics.filter(m => m.hr?.hasData).length}
          </div>
          <div className="text-xs text-gray-500">days</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Sleep Coverage</div>
          <div className="text-3xl font-bold">
            {metrics.filter(m => m.sleep?.hasData).length}
          </div>
          <div className="text-xs text-gray-500">days</div>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setDateRange(7)}
          className={`px-4 py-2 rounded-lg ${dateRange === 7 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          7 Days
        </button>
        <button
          onClick={() => setDateRange(14)}
          className={`px-4 py-2 rounded-lg ${dateRange === 14 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          14 Days
        </button>
        <button
          onClick={() => setDateRange(30)}
          className={`px-4 py-2 rounded-lg ${dateRange === 30 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          30 Days
        </button>
      </div>

      {/* Metric Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('hr')}
          className={`px-4 py-2 rounded-lg ${activeTab === 'hr' ? 'bg-red-600 text-white' : 'bg-gray-200'}`}
        >
          Heart Rate
        </button>
        <button
          onClick={() => setActiveTab('sleep')}
          className={`px-4 py-2 rounded-lg ${activeTab === 'sleep' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}
        >
          Sleep
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-2 rounded-lg ${activeTab === 'activity' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Activity
        </button>
        <button
          onClick={() => setActiveTab('spo2')}
          className={`px-4 py-2 rounded-lg ${activeTab === 'spo2' ? 'bg-green-600 text-white' : 'bg-gray-200'}`}
        >
          SpO2
        </button>
      </div>

      {/* Charts */}
      <div className="bg-white rounded-lg shadow p-6">
        <div style={{ height: '400px' }}>
          {activeTab === 'hr' && <Line data={hrChartData} options={chartOptions} />}
          {activeTab === 'sleep' && <Line data={sleepChartData} options={chartOptions} />}
          {activeTab === 'activity' && <Bar data={activityChartData} options={chartOptions} />}
          {activeTab === 'spo2' && <Line data={spo2ChartData} options={chartOptions} />}
        </div>
      </div>

      {/* Detailed Metrics Table */}
      <div className="mt-8 bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Daily Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Engagement</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">HR Points</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sleep Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Steps</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SpO2 Points</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {metrics.slice().reverse().map((metric) => (
                <tr key={metric._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {new Date(metric.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                    {metric.engagementScore}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {metric.hr?.hasData ? metric.hr.dataPoints : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {metric.sleep?.hasData ? metric.sleep.sleepScore : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {metric.activity?.hasData ? metric.activity.steps?.toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {metric.spo2?.hasData ? metric.spo2.dataPoints : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserEngagementDetailPage;
