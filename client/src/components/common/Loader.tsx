import React from 'react';

const spinnerStyle: React.CSSProperties = {
  width: 48,
  height: 48,
  border: '6px solid #e0e7ff',
  borderTop: '6px solid #38bdf8',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite',
  margin: 'auto',
};

const Loader: React.FC = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 120 }}>
    <div style={spinnerStyle} />
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

export default Loader;
