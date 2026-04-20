import React, { useEffect, useState } from 'react';
import { Card } from '../common';
import { skintempService } from '../../services/skintemp.service';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, ReferenceLine } from 'recharts';
import { Info, Thermometer, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';

interface FirmwareComparison {
  firmwareVersion: string;
  totalSessions: number;
  lunaAvg: number;
  benchmarkAvg: number;
  avgBias: number;
}

type SortKey = 'firmwareVersion' | 'totalSessions' | 'lunaAvg' | 'benchmarkAvg' | 'avgBias';
type SortOrder = 'asc' | 'desc';

const AdminSkinTempFirmwareTab: React.FC = () => {
  const [firmwareData, setFirmwareData] = useState<FirmwareComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('firmwareVersion');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await skintempService.getAdminFirmwareComparison();
        setFirmwareData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load firmware data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const getSortedData = () => {
    return [...firmwareData].sort((a, b) => {
      const aValue = a[sortKey];
      const bValue = b[sortKey];

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }

      const numA = aValue as number;
      const numB = bValue as number;
      return sortOrder === 'asc' ? numA - numB : numB - numA;
    });
  };

  const getChartData = () => {
    return firmwareData.map(fw => ({
      name: fw.firmwareVersion,
      bias: fw.avgBias,
      sessions: fw.totalSessions,
    }));
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return null;
    return sortOrder === 'asc' 
      ? <ChevronUp className="w-4 h-4 inline ml-1" /> 
      : <ChevronDown className="w-4 h-4 inline ml-1" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading firmware comparison...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-red-600">{error}</div>
      </div>
    );
  }

  if (firmwareData.length === 0) {
    return (
      <Card>
        <div className="text-center py-8">
          <Thermometer className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">No firmware comparison data available</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Firmware Comparison Table */}
      <Card>
        <h3 className="text-lg font-semibold mb-4">Firmware Comparison Overview</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('firmwareVersion')}
                >
                  Firmware <SortIcon column="firmwareVersion" />
                </th>
                <th 
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('totalSessions')}
                >
                  Sessions <SortIcon column="totalSessions" />
                </th>
                <th 
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('lunaAvg')}
                >
                  Falcon Avg <SortIcon column="lunaAvg" />
                </th>
                <th 
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('benchmarkAvg')}
                >
                  Apple Avg <SortIcon column="benchmarkAvg" />
                </th>
                <th 
                  className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('avgBias')}
                >
                  Bias <SortIcon column="avgBias" />
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getSortedData().map((fw) => (
                <tr key={fw.firmwareVersion} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {fw.firmwareVersion}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {fw.totalSessions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 text-center font-medium">
                    {fw.lunaAvg > 0 ? `${fw.lunaAvg.toFixed(2)}°C` : '--'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 text-center font-medium">
                    {fw.benchmarkAvg > 0 ? `${fw.benchmarkAvg.toFixed(2)}°C` : '--'}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-center font-bold ${
                    fw.avgBias >= 0 ? 'text-red-500' : 'text-blue-500'
                  }`}>
                    {fw.lunaAvg > 0 ? `${fw.avgBias >= 0 ? '+' : ''}${fw.avgBias.toFixed(2)}°C` : '--'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Info Note */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
          <h4 className="font-semibold text-blue-800 flex items-center gap-2">
            <Info className="w-4 h-4" />
            How to Interpret:
          </h4>
          <p className="text-sm text-blue-700 mt-2">
            <strong>Bias:</strong> Falcon reading - Apple Watch reading. 
            Positive = Falcon reads higher | Negative = Falcon reads lower | Target: Close to 0°C
          </p>
          <p className="text-xs text-blue-600 mt-2">
            Note: Apple Watch provides a single average temperature per sleep session, so only bias comparison is meaningful.
          </p>
        </div>
      </Card>

      {/* Bias Bar Chart */}
      <Card>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-purple-500" />
          Bias by Firmware Version
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={getChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis 
              tickFormatter={(val) => `${val}°C`}
              domain={['auto', 'auto']}
            />
            <Tooltip 
              formatter={(value: number | undefined) => {
                const v = value ?? 0;
                return [`${v >= 0 ? '+' : ''}${v.toFixed(2)}°C`, 'Bias'];
              }}
              labelFormatter={(label) => `Firmware: ${label}`}
            />
            <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
            <Bar dataKey="bias" name="Bias">
              {getChartData().map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.bias >= 0 ? '#ef4444' : '#3b82f6'} 
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-500 text-center mt-2">
          Red bars = Falcon reads higher | Blue bars = Falcon reads lower
        </p>
      </Card>
    </div>
  );
};

export default AdminSkinTempFirmwareTab;
