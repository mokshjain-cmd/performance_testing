import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';
import type { UserSummary } from '../../types';

interface BarProps {
  data: { name: string; accuracy: number }[];
  title: string;
  color: string;
  yLabel?: string;
}

const BarGraph: React.FC<BarProps> = ({ data, title, color, yLabel }) => (
  <div className="bg-white rounded-lg shadow p-4 mb-6">
    <h3 className="mb-2 font-semibold text-lg">{title}</h3>
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 16 }}>
        <XAxis dataKey="name" />
        <YAxis label={yLabel ? { value: yLabel, angle: -90, position: 'insideLeft' } : undefined} />
        <Tooltip formatter={(v: any) => v?.toFixed ? v.toFixed(2) + '%' : v} />
        <Legend />
        <Bar dataKey="accuracy" fill={color} radius={[6, 6, 0, 0]}>
          <LabelList dataKey="accuracy" position="top" formatter={(v: any) => v?.toFixed ? v.toFixed(1) + '%' : v} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
);

export default BarGraph;
