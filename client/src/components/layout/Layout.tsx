import React, { type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Header } from '../common';
import { isLoggedIn as checkIsLoggedIn, logout } from '../../utils/auth';

interface LayoutProps {
  children: ReactNode;
  fullWidth?: boolean;
}

export default function Layout({ children, fullWidth = false }: LayoutProps) {

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50">
      <Header
        isLoggedIn={isLoggedIn}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
      />

      {/* Main Content */}
      <main className={fullWidth ? "px-6 py-8" : "max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-12"}>
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white/60 backdrop-blur-xl border-t border-gray-200/50 mt-auto">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 py-6">
          <p className="text-center text-gray-500 text-sm">
            © 2026 Performance Testing Platform
          </p>
        </div>
      </footer>
    </div>
  );
}
