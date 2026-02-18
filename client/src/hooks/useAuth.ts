import { useState, useEffect } from 'react';
import { getUserId, getUserRole } from '../utils/auth';

interface UseAuthReturn {
  userId: string | null;
  userRole: 'admin' | 'tester' | null;
  isAdmin: boolean;
  isTester: boolean;
  isLoggedIn: boolean;
}

/**
 * Custom hook to access user authentication state
 * 
 * @returns {UseAuthReturn} Object containing userId, userRole, and helper booleans
 * 
 * @example
 * const { userId, userRole, isAdmin, isLoggedIn } = useAuth();
 * 
 * if (isAdmin) {
 *   // Show admin features
 * }
 */
export function useAuth(): UseAuthReturn {
  const [userId, setUserId] = useState<string | null>(getUserId());
  const [userRole, setUserRole] = useState<'admin' | 'tester' | null>(getUserRole());

  useEffect(() => {
    // Listen for storage changes (e.g., logout in another tab)
    const handleStorageChange = () => {
      setUserId(getUserId());
      setUserRole(getUserRole());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    userId,
    userRole,
    isAdmin: userRole === 'admin',
    isTester: userRole === 'tester',
    isLoggedIn: !!userId,
  };
}
