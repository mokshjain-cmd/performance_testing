import React from 'react';
import { LogIn, PlusCircle, LayoutDashboard, LogOut, Shield } from 'lucide-react';
import { getUserRole } from '../../utils/auth';

interface Props {
  isLoggedIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
  onNavigate: (route: string) => void;
}

const Header: React.FC<Props> = ({ isLoggedIn, onLogin, onLogout, onNavigate }) => {
  const userRole = getUserRole();
  const isAdmin = userRole === 'admin';

  return (
    <header className="w-full bg-white/80 backdrop-blur-xl border-b border-gray-200/50 shadow-sm px-6 h-14 flex items-center justify-between sticky top-0 z-50">
      {/* Left Section - Logo & Navigation */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 mr-4">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-sm">PT</span>
          </div>
          <span className="font-semibold text-gray-800 text-sm hidden sm:block">Performance Testing</span>
        </div>
        
        {isLoggedIn && (
          <>
            <div className="h-6 w-px bg-gray-300 hidden sm:block"></div>
            
            <button
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100/80 hover:text-gray-900 transition-all duration-200 flex items-center gap-1.5"
              onClick={() => onNavigate('dashboard')}
            >
              {isAdmin ? <Shield size={16} /> : <LayoutDashboard size={16} />}
              <span className="hidden sm:inline">{isAdmin ? 'Admin' : 'Dashboard'}</span>
            </button>
            <button
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100/80 hover:text-gray-900 transition-all duration-200 flex items-center gap-1.5"
              onClick={() => onNavigate('create-session')}
            >
              <PlusCircle size={16} />
              <span className="hidden sm:inline">New Session</span>
            </button>
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
    </header>
  );
};

export default Header;
