import React from 'react';

interface HrvTrendToggleProps {
  days: number;
  onChange: (days: number) => void;
}

export const HrvTrendToggle: React.FC<HrvTrendToggleProps> = ({ days, onChange }) => (
  <div className="flex gap-2">
    <button
      onClick={() => onChange(10)}
      className={`px-4 py-2 rounded-lg text-sm font-medium ${days === 10 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
    >
      10 Days
    </button>
    <button
      onClick={() => onChange(30)}
      className={`px-4 py-2 rounded-lg text-sm font-medium ${days === 30 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
    >
      30 Days
    </button>
  </div>
);

export default HrvTrendToggle;
