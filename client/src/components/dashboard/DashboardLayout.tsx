import React from 'react';

interface DashboardLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  sidebar,
  children,
}) => {
  return (
    <div className="flex h-screen bg-[#ececf0]">
      
      {/* Sidebar */}
      <div
        className="
          w-[260px]
          m-3
          p-5
          flex
          flex-col
          min-h-[96vh]
          bg-gradient-to-br from-[#f5f6fa] to-[#e9e9ee]
          shadow-[2px_0_16px_0_rgba(60,60,67,0.08)]
          rounded-tr-[18px]
          rounded-br-[18px]
        "
      >
        {sidebar}
      </div>

      {/* Main Content */}
      <div
        className="
          flex-1
          m-3
          p-10
          overflow-y-auto
          bg-gradient-to-br from-[#fafdff] to-[#f3f4f8]
          rounded-[18px]
          shadow-[0_4px_32px_0_rgba(60,60,67,0.10)]
        "
      >
        {children}
      </div>
    </div>
  );
};

export default DashboardLayout;
