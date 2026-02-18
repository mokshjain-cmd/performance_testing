import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { ReactNode } from 'react';

interface TesterRouteProps {
  children: ReactNode;
}

/**
 * Protected route that only allows tester users
 * Redirects to login if not authenticated
 * Redirects to admin dashboard if authenticated but is admin
 */
const TesterRoute = ({ children }: TesterRouteProps) => {
  const { isLoggedIn, isAdmin } = useAuth();
  
  if (!isLoggedIn) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }
  
  if (isAdmin) {
    // Redirect to admin dashboard if admin
    return <Navigate to="/admin/dashboard" replace />;
  }
  
  return <>{children}</>;
};

export default TesterRoute;
