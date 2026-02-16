
import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { Layout } from '../components/layout';

interface User {
  _id: string;
  name: string;
  email: string;
}

interface Device {
  _id: string;
  deviceId: string;
  deviceType: string;
  firmwareVersion: string;
}

interface Session {
  _id: string;
  userId: User;
  activityType: string;
  startTime: string;
  endTime: string;
  durationSec: number;
  devices: Device[];
  benchmarkDeviceType: string;
  bandPosition: string;
  isValid: boolean;
  createdAt: string;
  updatedAt: string;
  name?: string;
}

interface DeviceStats {
  deviceType: string;
  firmwareVersion: string;
  hr: {
    min: number;
    max: number;
    avg: number;
    median: number;
    stdDev: number;
    range: number;
  };
}

interface PairwiseComparison {
  d1: string;
  d2: string;
  metric: string;
  mae: number;
  rmse: number;
  pearsonR: number;
  meanBias: number;
}

interface Analysis {
  _id: string;
  sessionId: string;
  userId: string;
  activityType: string;
  startTime: string;
  endTime: string;
  deviceStats: DeviceStats[];
  pairwiseComparisons: PairwiseComparison[];
  isValid: boolean;
  computedAt: string;
}

interface DevicePoint {
  timestamp: string;
  metrics: {
    heartRate: number | null;
  };
}

interface SessionFullDetails {
  session: Session;
  analysis: Analysis;
  points: Record<string, DevicePoint[]>;
}

const DashboardPage: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionDetails, setSessionDetails] = useState<SessionFullDetails | null>(null);
  const [loading, setLoading] = useState(false);

  const userId = localStorage.getItem('userId');

  useEffect(() => {
    
    if (userId) {
      axios.get(`http://localhost:3000/api/sessions/all/${userId}`)
        .then(res => setSessions(res.data.data || []))
        .catch(() => setSessions([]));
    }
  }, [userId]);

  useEffect(() => {
    if (selectedSessionId) {
      setLoading(true);
      axios.get(`http://localhost:3000/api/sessions/full/${selectedSessionId}`)
        .then(res => {
          setSessionDetails(res.data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [selectedSessionId]);

  // Prepare chart data
  const getChartData = () => {
    if (!sessionDetails) return [];
    // Merge device points by timestamp
    const deviceTypes = Object.keys(sessionDetails.points);
    const allTimestamps = Array.from(new Set(
      deviceTypes.flatMap(dt => sessionDetails.points[dt].map(p => p.timestamp))
    ));
    allTimestamps.sort();
    return allTimestamps.map(ts => {
      const row: any = { timestamp: ts };
      deviceTypes.forEach(dt => {
        const point = sessionDetails.points[dt].find(p => p.timestamp === ts);
        row[dt] = point ? point.metrics.heartRate : null;
      });
      return row;
    });
  };

  return (
    <Layout>
      <div style={{ display: 'flex', height: '100vh' }}>
        {/* Sidebar */}
        <div style={{ width: 250, background: '#f5f5f5', padding: 16, overflowY: 'auto' }}>
          <h2>Sessions</h2>
          {sessions.length === 0 && <div>No sessions found.</div>}
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {sessions.map(s => (
              <li key={s._id} style={{ marginBottom: 8 }}>
                <button
                  style={{
                    width: '100%',
                    padding: 8,
                    background: selectedSessionId === s._id ? '#d1eaff' : '#fff',
                    border: '1px solid #ccc',
                    borderRadius: 4,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onClick={() => setSelectedSessionId(s._id)}
                >
                  {s.name || s._id}
                </button>
              </li>
            ))}
          </ul>
        </div>
        {/* Main Content */}
        <div style={{ flex: 1, padding: 32 }}>
          {loading && <div>Loading session details...</div>}
          {!loading && sessionDetails && (
            <>
              {/* Session Details */}
              <div style={{ marginBottom: 24, padding: 16, background: '#f9fafb', borderRadius: 8, boxShadow: '0 1px 4px #eee' }}>
                <h2 style={{ marginBottom: 8 }}>Session Details</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                  <div><strong>ID:</strong> <span style={{ background: '#e0e7ff', borderRadius: 4, padding: '2px 6px' }}>{sessionDetails.session._id}</span></div>
                  <div><strong>User:</strong> <span style={{ background: '#e0e7ff', borderRadius: 4, padding: '2px 6px' }}>{sessionDetails.session.userId?.name} ({sessionDetails.session.userId?.email})</span></div>
                  <div><strong>Activity:</strong> <span style={{ background: '#fef9c3', borderRadius: 4, padding: '2px 6px' }}>{sessionDetails.session.activityType}</span></div>
                  <div><strong>Start:</strong> <span style={{ background: '#bbf7d0', borderRadius: 4, padding: '2px 6px' }}>{new Date(sessionDetails.session.startTime).toLocaleString()}</span></div>
                  <div><strong>End:</strong> <span style={{ background: '#fca5a5', borderRadius: 4, padding: '2px 6px' }}>{new Date(sessionDetails.session.endTime).toLocaleString()}</span></div>
                  <div><strong>Duration:</strong> <span style={{ background: '#f3e8ff', borderRadius: 4, padding: '2px 6px' }}>{sessionDetails.session.durationSec}s</span></div>
                  <div><strong>Devices:</strong> {sessionDetails.session.devices.map(d => (
                    <span key={d.deviceType} style={{ background: '#bae6fd', borderRadius: 4, padding: '2px 6px', marginRight: 4 }}>{d.deviceType}</span>
                  ))}</div>
                  <div><strong>Benchmark:</strong> <span style={{ background: '#fcd34d', borderRadius: 4, padding: '2px 6px' }}>{sessionDetails.session.benchmarkDeviceType}</span></div>
                  <div><strong>Band Position:</strong> <span style={{ background: '#fef08a', borderRadius: 4, padding: '2px 6px' }}>{sessionDetails.session.bandPosition}</span></div>
                  <div><strong>Valid:</strong> <span style={{ background: sessionDetails.session.isValid ? '#bbf7d0' : '#fecaca', borderRadius: 4, padding: '2px 6px' }}>{sessionDetails.session.isValid ? 'Yes' : 'No'}</span></div>
                </div>
              </div>

              {/* Analysis Section */}
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ marginBottom: 8 }}>Session Analysis</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                  {/* Device Stats */}
                  {sessionDetails.analysis?.deviceStats?.map((stat: any, idx: number) => (
                    <div key={idx} style={{ background: '#f1f5f9', borderRadius: 8, padding: 12, minWidth: 220, boxShadow: '0 1px 4px #eee' }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{stat.deviceType} <span style={{ background: '#e0e7ff', borderRadius: 4, padding: '2px 6px', fontSize: 12 }}>{stat.firmwareVersion}</span></div>
                      <div><strong>HR Min:</strong> <span style={{ background: '#fef9c3', borderRadius: 4, padding: '2px 6px' }}>{stat.hr.min}</span></div>
                      <div><strong>HR Max:</strong> <span style={{ background: '#fef9c3', borderRadius: 4, padding: '2px 6px' }}>{stat.hr.max}</span></div>
                      <div><strong>HR Avg:</strong> <span style={{ background: '#bbf7d0', borderRadius: 4, padding: '2px 6px' }}>{stat.hr.avg}</span></div>
                      <div><strong>HR Median:</strong> <span style={{ background: '#f3e8ff', borderRadius: 4, padding: '2px 6px' }}>{stat.hr.median}</span></div>
                      <div><strong>HR StdDev:</strong> <span style={{ background: '#fca5a5', borderRadius: 4, padding: '2px 6px' }}>{stat.hr.stdDev}</span></div>
                      <div><strong>HR Range:</strong> <span style={{ background: '#bae6fd', borderRadius: 4, padding: '2px 6px' }}>{stat.hr.range}</span></div>
                    </div>
                  ))}
                  {/* Pairwise Comparisons */}
                  {sessionDetails.analysis?.pairwiseComparisons?.map((pair: any, idx: number) => (
                    <div key={idx} style={{ background: '#fef9c3', borderRadius: 8, padding: 12, minWidth: 260, boxShadow: '0 1px 4px #eee' }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>Pairwise: <span style={{ background: '#e0e7ff', borderRadius: 4, padding: '2px 6px', fontSize: 12 }}>{pair.d1} vs {pair.d2}</span></div>
                      <div><strong>MAE:</strong> <span style={{ background: '#bbf7d0', borderRadius: 4, padding: '2px 6px' }}>{pair.mae}</span></div>
                      <div><strong>RMSE:</strong> <span style={{ background: '#f3e8ff', borderRadius: 4, padding: '2px 6px' }}>{pair.rmse}</span></div>
                      <div><strong>Pearson R:</strong> <span style={{ background: '#bae6fd', borderRadius: 4, padding: '2px 6px' }}>{pair.pearsonR}</span></div>
                      <div><strong>Mean Bias:</strong> <span style={{ background: '#fca5a5', borderRadius: 4, padding: '2px 6px' }}>{pair.meanBias}</span></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Graph Section */}
              <div style={{ height: 400, background: '#fff', borderRadius: 8, boxShadow: '0 1px 4px #eee', padding: 16 }}>
                <h2 style={{ marginBottom: 8 }}>Heart Rate Graph</h2>
                <ResponsiveContainer width="100%" height="90%">
                  <LineChart data={getChartData()}>
                    <XAxis dataKey="timestamp" tickFormatter={t => new Date(t).toLocaleTimeString()} />
                    <YAxis label={{ value: 'Heart Rate', angle: -90, position: 'insideLeft' }} />
                    <Tooltip labelFormatter={t => new Date(t).toLocaleString()} />
                    <Legend />
                    {Object.keys(sessionDetails.points).map(deviceType => (
                      <Line
                        key={deviceType}
                        type="monotone"
                        dataKey={deviceType}
                        stroke={deviceType === 'luna' ? '#8884d8' : '#82ca9d'}
                        dot={false}
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
          {!loading && !sessionDetails && <div>Select a session to view details.</div>}
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;
