import { useEffect, useState } from 'react';
import { Card } from '../common';
import Loader from '../common/Loader';
import { getAdminHrvFirmwarePerformance } from '../../services/hrv.service';

interface FirmwareRow {
  firmwareVersion: string;
  totalSessions: number;
  overallAccuracy?: { avgBias?: number };
}

/** Simplified per the product ask — just total sessions + avg bias per firmware version. */
export default function AdminHrvFirmwareTab() {
  const [rows, setRows] = useState<FirmwareRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminHrvFirmwarePerformance()
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;

  return (
    <Card>
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Firmware-wise Performance</h3>
      {rows.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">No data yet</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Firmware Version</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Sessions</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Bias</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.map((row) => (
                <tr key={row.firmwareVersion} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{row.firmwareVersion}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{row.totalSessions}</td>
                  <td className="px-4 py-3 text-sm">
                    {row.overallAccuracy?.avgBias != null ? (
                      <span className={row.overallAccuracy.avgBias >= 0 ? 'text-red-500' : 'text-blue-500'}>
                        {row.overallAccuracy.avgBias >= 0 ? '+' : ''}
                        {row.overallAccuracy.avgBias.toFixed(1)} ms
                      </span>
                    ) : (
                      <span className="text-gray-400">--</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
