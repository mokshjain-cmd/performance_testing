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

export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

export const getUser = (): { id: string; name: string; email: string; role: 'admin' | 'tester' } | null => {
  const userStr = localStorage.getItem('user');
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

export const isAdmin = (): boolean => {
  return getUserRole() === 'admin';
};

export const isTester = (): boolean => {
  return getUserRole() === 'tester';
};

export const isLoggedIn = (): boolean => {
  return !!getToken() && !!getUserId();
};

export const logout = (): void => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('userId');
  localStorage.removeItem('userRole');
};

export const setAuth = (userId: string, role: 'admin' | 'tester'): void => {
  localStorage.setItem('userId', userId);
  localStorage.setItem('userRole', role);
};

export const setAuthToken = (token: string, user: { id: string; name: string; email: string; role: 'admin' | 'tester' }): void => {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('userId', user.id);
  localStorage.setItem('userRole', user.role);
};

export const getAuthHeaders = (): Record<string, string> => {
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};
