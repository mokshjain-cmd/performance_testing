import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Header } from '../common';
import { isLoggedIn as checkIsLoggedIn, logout } from '../../utils/auth';

interface DashboardLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  sidebar,
  children,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = React.useState(checkIsLoggedIn());

  React.useEffect(() => {
    setIsLoggedIn(checkIsLoggedIn());
  }, [location.pathname]);

  const handleLogin = () => navigate('/login');
  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
    navigate('/login');
  };
  const handleNavigate = (route: string) => {
    if (route === 'dashboard') {
      // Navigate to appropriate dashboard based on role
      const userRole = localStorage.getItem('userRole');
      if (userRole === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } else if (route === 'create-session') {
      navigate('/session/new');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50">
      <Header
        isLoggedIn={isLoggedIn}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
      />
      <div className="flex flex-1 overflow-hidden">
      
      {/* Sidebar */}
      <div
        className="
          w-[270px]
          m-4
          p-6
          flex
          flex-col
          min-h-[96vh]
          bg-white/80
          backdrop-blur-xl
          shadow-[0_8px_32px_rgba(0,0,0,0.06)]
          border
          border-gray-100/50
          rounded-2xl
        "
      >
        {sidebar}
      </div>

      {/* Main Content */}
      <div
        className="
          flex-1
          m-4
          p-10
          overflow-y-auto
          bg-white/60
          backdrop-blur-xl
          rounded-2xl
          shadow-[0_8px_32px_rgba(0,0,0,0.06)]
          border
          border-gray-100/50
        "
      >
        {children}
      </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
