import React, { type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Header } from '../common';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {

  const navigate = useNavigate();
  const location = useLocation();
  const [isLoggedIn, setIsLoggedIn] = React.useState(!!localStorage.getItem('userId'));

  React.useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('userId'));
  }, [location.pathname]);

  const handleLogin = () => navigate('/login');
  const handleLogout = () => {
    localStorage.removeItem('userId');
    setIsLoggedIn(false);
    navigate('/login');
  };
  const handleNavigate = (route: string) => {
    if (route === 'dashboard') navigate('/dashboard');
    else if (route === 'create-session') navigate('/session/new');
    else navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        isLoggedIn={isLoggedIn}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onNavigate={handleNavigate}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-gray-500 text-sm">
            © 2026 Performance Testing Platform
          </p>
        </div>
      </footer>
    </div>
  );
}
