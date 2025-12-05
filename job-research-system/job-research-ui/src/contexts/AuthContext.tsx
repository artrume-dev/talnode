/**
 * Authentication Context
 *
 * Provides authentication state and methods throughout the application
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { authService } from '../services/auth';

interface User {
  id: number;
  email: string;
  fullName: string;
  headline?: string;
  currentPosition?: string;
  subscriptionStatus: string;
  paymentStatus: string;
  createdAt: string;
  lastLogin?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user on mount
  useEffect(() => {
    loadUser();
  }, []);

  /**
   * Load current user from API
   */
  const loadUser = async () => {
    try {
      if (authService.isAuthenticated()) {
        const userData = await authService.getCurrentUser();
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      authService.clearTokens();
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Login user
   */
  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });
      setUser(response.user);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed';
      throw new Error(message);
    }
  };

  /**
   * Register new user
   */
  const register = async (email: string, password: string, fullName: string) => {
    try {
      const response = await authService.register({ email, password, fullName });
      setUser(response.user);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Registration failed';
      throw new Error(message);
    }
  };

  /**
   * Logout user
   */
  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
    }
  };

  /**
   * Refresh user data
   */
  const refreshUser = async () => {
    try {
      const userData = await authService.getCurrentUser();
      setUser(userData);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to use auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
