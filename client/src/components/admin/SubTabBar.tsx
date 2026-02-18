import React from 'react';

type SubTab = 'overview' | 'activity' | 'benchmark' | 'firmware';

interface SubTabBarProps {
  activeTab: SubTab;
  onSelectTab: (tab: SubTab) => void;
}

const TABS = [
  { value: 'overview' as SubTab, label: 'Overview' },
  { value: 'activity' as SubTab, label: 'Activity-wise Analysis' },
  { value: 'benchmark' as SubTab, label: 'Benchmark Device' },
  { value: 'firmware' as SubTab, label: 'Firmware-wise' },
];

const SubTabBar: React.FC<SubTabBarProps> = ({ activeTab, onSelectTab }) => {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] border border-gray-100/50 p-2">
      <div className="flex gap-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          
          return (
            <button
              key={tab.value}
              onClick={() => onSelectTab(tab.value)}
              className={`
                flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive 
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md' 
                  : 'text-gray-600 hover:bg-gray-100'
                }
              `}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SubTabBar;
export type { SubTab };
