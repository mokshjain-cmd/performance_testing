import React, { useState } from 'react';
import { LogIn, PlusCircle, LayoutDashboard, LogOut, Shield, Cpu, Settings, TrendingUp } from 'lucide-react';
import { getUserRole } from '../../utils/auth';
import DeviceManagement from '../admin/DeviceManagement';

interface Props {
  isLoggedIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onNavigate: (route: string) => void;
}

const Header: React.FC<Props> = ({ isLoggedIn, onLogin, onLogout, onNavigate }) => {
  const userRole = getUserRole();
  const isAdmin = userRole === 'admin';
  const [showDeviceManagement, setShowDeviceManagement] = useState(false);

  return (
    <header className="w-full bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm px-6 h-14 flex items-center justify-between sticky top-0 z-50">
      {/* Left Section - Logo & Navigation */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 mr-4">
          <div className="w-9 h-9 flex items-center justify-center">
            <img src="/n_logo.png" alt="Noise Logo" className="w-9 h-9 object-contain" />
          </div>
          <span className="font-semibold text-gray-800 text-sm hidden sm:block">Noise-Benchmarking Platform</span>
        </div>
        
        {isLoggedIn && (
          <>
            <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>
            
            <button
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-red-700 hover:bg-red-50 hover:text-red-900 transition-all duration-200 flex items-center gap-1.5 border border-red-200"
              onClick={() => onNavigate('dashboard')}
            >
              {isAdmin ? <Shield size={16} /> : <LayoutDashboard size={16} />}
              <span className="hidden sm:inline">{isAdmin ? 'Dashboard' : 'Dashboard'}</span>
            </button>
            {!isAdmin && (
              <button
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100/80 hover:text-gray-900 transition-all duration-200 flex items-center gap-1.5"
                onClick={() => onNavigate('create-session')}
              >
                <PlusCircle size={16} />
                <span className="hidden sm:inline">New Session</span>
              </button>
            )}
            {isAdmin && (
              <button
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-50 hover:text-blue-900 transition-all duration-200 flex items-center gap-1.5 border border-blue-200"
                onClick={() => setShowDeviceManagement(true)}
                title="Manage Devices"
              >
                <Cpu size={16} />
                <span className="hidden sm:inline">Devices</span>
              </button>
            )}
            {isAdmin && (
              <button
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-purple-700 hover:bg-purple-50 hover:text-purple-900 transition-all duration-200 flex items-center gap-1.5 border border-purple-200"
                onClick={() => onNavigate('admin/firmware-config')}
                title="Configure Firmware"
              >
                <Settings size={16} />
                <span className="hidden sm:inline">Firmware</span>
              </button>
            )}
            {isAdmin && (
              <button
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-green-700 hover:bg-green-50 hover:text-green-900 transition-all duration-200 flex items-center gap-1.5 border border-green-200"
                onClick={() => onNavigate('admin/engagement')}
                title="User Engagement Monitoring"
              >
                <TrendingUp size={16} />
                <span className="hidden sm:inline">Performance Testing</span>
              </button>
            )}
          </>
        )}
      </div>

      {/* Right Section - Auth */}
      <div className="flex items-center gap-2">
        {!isLoggedIn ? (
          <button
            className="px-4 py-1.5 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 transition-all duration-200 flex items-center gap-1.5 shadow-sm"
            onClick={onLogin}
          >
            <LogIn size={16} />
            <span>Login</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {isAdmin && (
              <span className="px-2 py-1 rounded-md text-xs font-medium bg-purple-100 text-purple-700 hidden sm:flex items-center gap-1">
                <Shield size={12} />
                Admin
              </span>
            )}
            <button
              className="p-2 rounded-lg text-gray-700 hover:bg-gray-100/80 transition-all duration-200"
              onClick={onLogout}
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        )}
      </div>
      
      {/* Device Management Modal */}
      <DeviceManagement 
        isOpen={showDeviceManagement} 
        onClose={() => setShowDeviceManagement(false)} 
      />
    </header>
  );
};

export default Header;
