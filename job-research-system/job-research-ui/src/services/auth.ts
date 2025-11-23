/**
 * Authentication Service
 *
 * Handles all authentication-related API calls and token management
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

// Token storage keys
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

export const authService = {
  /**
   * Store tokens in localStorage
   */
  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  /**
   * Get access token from localStorage
   */
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  /**
   * Get refresh token from localStorage
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  /**
   * Clear all tokens from localStorage
   */
  clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  },

  // ============================================================================
  // AUTHENTICATION API CALLS
  // ============================================================================

  /**
   * Register a new user
   */
  async register(data: {
    email: string;
    password: string;
    fullName: string;
  }): Promise<{
    user: any;
    tokens: { accessToken: string; refreshToken: string };
  }> {
    const response = await axios.post(`${API_BASE_URL}/auth/register`, data);

    if (response.data.success) {
      this.setTokens(
        response.data.tokens.accessToken,
        response.data.tokens.refreshToken
      );
    }

    return response.data;
  },

  /**
   * Login user
   */
  async login(data: {
    email: string;
    password: string;
  }): Promise<{
    user: any;
    tokens: { accessToken: string; refreshToken: string };
  }> {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, data);

    if (response.data.success) {
      this.setTokens(
        response.data.tokens.accessToken,
        response.data.tokens.refreshToken
      );
    }

    return response.data;
  },

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      const token = this.getAccessToken();
      if (token) {
        await axios.post(
          `${API_BASE_URL}/auth/logout`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
      }
    } finally {
      this.clearTokens();
    }
  },

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<string> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refreshToken,
    });

    if (response.data.success) {
      const newAccessToken = response.data.accessToken;
      localStorage.setItem(ACCESS_TOKEN_KEY, newAccessToken);
      return newAccessToken;
    }

    throw new Error('Token refresh failed');
  },

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<any> {
    const token = this.getAccessToken();

    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await axios.get(`${API_BASE_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data.user;
  },

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<void> {
    await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email });
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    await axios.post(`${API_BASE_URL}/auth/reset-password`, {
      token,
      newPassword,
    });
  },
};

// ============================================================================
// AXIOS INTERCEPTORS
// ============================================================================

/**
 * Add authorization header to all requests
 */
axios.interceptors.request.use(
  (config) => {
    const token = authService.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Handle 401 errors and refresh token
 */
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await authService.refreshToken();

        // Update the authorization header
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }

        // Retry the original request
        return axios(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        authService.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
