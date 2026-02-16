import React from 'react';

const DashboardLayout: React.FC<{ sidebar: React.ReactNode; children: React.ReactNode }> = ({ sidebar, children }) => {
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <div style={{ width: 250, background: '#f5f5f5', padding: 16 }}>
        {sidebar}
      </div>
      <div style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  );
};

export default DashboardLayout;
