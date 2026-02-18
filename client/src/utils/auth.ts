/**
 * Authentication utilities for accessing user info from localStorage
 */

export const getUserId = (): string | null => {
  return localStorage.getItem('userId');
};

export const getUserRole = (): 'admin' | 'tester' | null => {
  const role = localStorage.getItem('userRole');
  return role as 'admin' | 'tester' | null;
};

export const isAdmin = (): boolean => {
  return getUserRole() === 'admin';
};

export const isTester = (): boolean => {
  return getUserRole() === 'tester';
};

export const isLoggedIn = (): boolean => {
  return !!getUserId();
};

export const logout = (): void => {
  localStorage.removeItem('userId');
  localStorage.removeItem('userRole');
};

export const setAuth = (userId: string, role: 'admin' | 'tester'): void => {
  localStorage.setItem('userId', userId);
  localStorage.setItem('userRole', role);
};

export const getAuthHeaders = (): Record<string, string> => {
  const userId = getUserId();
  return userId ? { 'X-User-Id': userId } : {};
};
