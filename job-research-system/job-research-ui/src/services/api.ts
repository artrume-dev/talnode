/**
 * Centralized API Client
 *
 * Provides a configured axios instance with automatic authentication,
 * error handling, and request/response transformations.
 */

import axios from 'axios';
import { authService } from './auth';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================================
// REQUEST INTERCEPTOR
// ============================================================================

apiClient.interceptors.request.use(
  (config) => {
    // Add authentication token
    const token = authService.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log requests in development
    if (import.meta.env.DEV) {
      console.log(`🔵 ${config.method?.toUpperCase()} ${config.url}`, config.data);
    }

    return config;
  },
  (error) => {
    console.error('❌ Request error:', error);
    return Promise.reject(error);
  }
);

// ============================================================================
// RESPONSE INTERCEPTOR
// ============================================================================

apiClient.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (import.meta.env.DEV) {
      console.log(`🟢 ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    }

    return response;
  },
  async (error) => {
    const originalRequest: any = error.config;

    // Handle 401 Unauthorized - Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh the token
        const newToken = await authService.refreshToken();

        // Update the authorization header
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }

        // Retry the original request
        return apiClient(originalRequest);
      } catch (refreshError) {
        // Refresh failed, clear tokens and redirect to login
        authService.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    console.error('❌ Response error:', error.response?.status, error.message);

    return Promise.reject(error);
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Type-safe GET request
 */
export const get = (url: string, params?: any) => {
  return apiClient.get(url, { params });
};

/**
 * Type-safe POST request
 */
export const post = (url: string, data?: any, config?: any) => {
  return apiClient.post(url, data, config);
};

/**
 * Type-safe PUT request
 */
export const put = (url: string, data?: any) => {
  return apiClient.put(url, data);
};

/**
 * Type-safe DELETE request
 */
export const del = (url: string) => {
  return apiClient.delete(url);
};

/**
 * Type-safe PATCH request
 */
export const patch = (url: string, data?: any) => {
  return apiClient.patch(url, data);
};

// ============================================================================
// SPECIALIZED API FUNCTIONS
// ============================================================================

/**
 * Upload file with progress tracking
 */
export const uploadFile = (
  url: string,
  file: File | FormData,
  onUploadProgress?: (progressEvent: any) => void
) => {
  const formData = file instanceof FormData ? file : new FormData();
  if (!(file instanceof FormData)) {
    formData.append('file', file);
  }

  return apiClient.post(url, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress,
  });
};

/**
 * Download file
 */
export const downloadFile = async (url: string, filename: string): Promise<void> => {
  const response = await apiClient.get(url, {
    responseType: 'blob',
  });

  const blob = new Blob([response.data]);
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(link.href);
};

// Export the configured axios instance as default
export default apiClient;
