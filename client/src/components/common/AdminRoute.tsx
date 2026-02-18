import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { ReactNode } from 'react';

interface AdminRouteProps {
  children: ReactNode;
}

/**
 * Protected route that only allows admin users
 * Redirects to login if not authenticated
 * Redirects to regular dashboard if authenticated but not admin
 */
const AdminRoute = ({ children }: AdminRouteProps) => {
  const { isLoggedIn, isAdmin } = useAuth();
  
  if (!isLoggedIn) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" replace />;
  }
  
  if (!isAdmin) {
    // Redirect to regular dashboard if not admin
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

export default AdminRoute;
