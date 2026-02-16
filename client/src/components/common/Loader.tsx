import React from 'react';



const Loader: React.FC = () => (
  <div className="flex justify-center items-center min-h-[120px] bg-transparent">
    <div className="w-12 h-12 border-4 border-indigo-100 border-t-sky-400 rounded-full animate-spin shadow-md bg-gradient-to-br from-slate-50 to-slate-100" />
  </div>
);

export default Loader;
