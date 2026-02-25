import apiClient from './api';

interface OTPResponse {
  success: boolean;
  message: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'tester';
  };
}

interface SignupResponse {
  success: boolean;
  message: string;
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'tester';
  };
}

interface CurrentUserResponse {
  success: boolean;
  user: {
    id: string;
    name: string;
    email: string;
    role: 'admin' | 'tester';
    createdAt: string;
  };
}

/**
 * Authentication Service
 * Handles all authentication-related API calls
 */
class AuthService {
  /**
   * Request OTP for login
   */
  async requestLoginOTP(email: string): Promise<OTPResponse> {
    const response = await apiClient.post('/auth/login/request-otp', { email });
    return response.data;
  }

  /**
   * Verify OTP and login
   */
  async verifyLoginOTP(email: string, otp: string): Promise<LoginResponse> {
    const response = await apiClient.post('/auth/login/verify-otp', {
      email,
      otp,
    });
    
    // Store token and user info in localStorage
    if (response.data.success) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('userId', response.data.user.id);
      localStorage.setItem('userRole', response.data.user.role);
    }
    
    return response.data;
  }

  /**
   * Request OTP for signup
   */
  async requestSignupOTP(email: string): Promise<OTPResponse> {
    const response = await apiClient.post('/auth/signup/request-otp', { email });
    return response.data;
  }

  /**
   * Verify OTP and complete signup
   */
  async verifySignupOTP(
    email: string,
    otp: string,
    name: string,
    role: 'admin' | 'tester' = 'tester'
  ): Promise<SignupResponse> {
    const response = await apiClient.post('/auth/signup/verify-otp', {
      email,
      otp,
      name,
      role,
    });
    
    // Store token and user info in localStorage
    if (response.data.success) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('userId', response.data.user.id);
      localStorage.setItem('userRole', response.data.user.role);
    }
    
    return response.data;
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<CurrentUserResponse> {
    const response = await apiClient.get('/auth/me');
    return response.data;
  }

  /**
   * Logout user
   */
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }

  /**
   * Get stored user from localStorage
   */
  getStoredUser(): { id: string; name: string; email: string; role: 'admin' | 'tester' } | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
}

export const authService = new AuthService();
