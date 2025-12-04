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

// ============================================================================
// AI JOB ANALYSIS
// ============================================================================

export interface AIJobAnalysisResult {
  overall_score: number;
  overall_stars: number;
  recommendation: 'high' | 'medium' | 'low' | 'pass';

  role_alignment: {
    score: number;
    stars: number;
    reasoning: string;
  };
  technical_match: {
    score: number;
    stars: number;
    reasoning: string;
  };
  company_fit: {
    score: number;
    stars: number;
    reasoning: string;
  };
  growth_potential: {
    score: number;
    stars: number;
    reasoning: string;
  };
  practical_factors: {
    score: number;
    stars: number;
    reasoning: string;
  };

  strong_matches: string[];
  gaps: string[];
  red_flags: string[];
  application_strategy: string;
  talking_points: string[];
}

export interface ReasoningStep {
  type: 'info' | 'tool_call' | 'tool_result' | 'analysis' | 'complete' | 'result' | 'error';
  message: string;
  timestamp: number;
  data?: any;
}

/**
 * Analyze job with AI (GPT-4o Mini) with streaming progress
 * Uses LLM to provide deep 5-category analysis
 * @param jobId Job ID to analyze
 * @param cvId CV ID to use for analysis
 * @param onProgress Callback for progress updates
 * @returns Promise resolving to analysis result
 */
export const analyzeJobWithAI = async (
  jobId: number,
  cvId: number,
  onProgress?: (step: ReasoningStep) => void
): Promise<AIJobAnalysisResult> => {
  // If progress callback is provided, use streaming
  if (onProgress) {
    return new Promise((resolve, reject) => {
      const token = authService.getAccessToken();
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      // Use fetch with ReadableStream for Server-Sent Events
      console.log('🌐 Starting streaming request to:', `${API_BASE_URL}/jobs/ai-analyze`);
      
      fetch(`${API_BASE_URL}/jobs/ai-analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ job_id: jobId, cv_id: cvId, stream: true }),
      })
        .then(async (response) => {
          console.log('📡 Response received:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            ok: response.ok,
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Response error:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
          }

          // Check if response is actually a stream
          const contentType = response.headers.get('content-type');
          console.log('📦 Content-Type:', contentType);
          
          if (!contentType?.includes('text/event-stream')) {
            console.warn('⚠️ Response is not text/event-stream, got:', contentType);
          }

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          if (!reader) {
            console.error('❌ No response body reader available');
            throw new Error('No response body reader available');
          }

          console.log('✅ Starting to read stream...');
          console.log('📊 Stream reader available:', !!reader);
          console.log('📊 Response body available:', !!response.body);

          let receivedResult = false;
          let lastStepType: string | null = null;
          let chunkCount = 0;
          let totalBytesReceived = 0;
          const startTime = Date.now();
          
          // Set a timeout to detect if stream is stuck
          const streamTimeout = setTimeout(() => {
            if (chunkCount === 0 && !receivedResult) {
              console.error('❌ Stream timeout: No data received after 10 seconds');
              reject(new Error('Stream timeout: No data received from server. Check backend logs and network connection.'));
            }
          }, 10000);
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              chunkCount++;
              
              const elapsed = Date.now() - startTime;
              console.log(`📦 Read chunk #${chunkCount} (${elapsed}ms elapsed), done:`, done, 'hasValue:', !!value, 'valueLength:', value?.length);
              
              if (done) {
                clearTimeout(streamTimeout);
                console.log('🏁 Stream ended. Buffer remaining:', buffer);
                console.log('📊 Last step type received:', lastStepType);
                console.log('✅ Result received:', receivedResult);
                
                // Process any remaining buffer before checking for result
                if (buffer.trim()) {
                  const lines = buffer.split('\n');
                  for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (!trimmedLine || trimmedLine === ': connected') continue;
                    
                    // Try both formats
                    let jsonStr = '';
                    if (trimmedLine.startsWith('data: ')) {
                      jsonStr = trimmedLine.slice(6);
                    } else if (trimmedLine.startsWith(':')) {
                      // Skip SSE comments
                      continue;
                    } else {
                      jsonStr = trimmedLine;
                    }
                    
                    try {
                      const step: ReasoningStep = JSON.parse(jsonStr);
                      console.log('📊 Final step from buffer:', step);
                      onProgress(step);
                      if (step.type === 'result') {
                        console.log('✅ Found result in final buffer');
                        receivedResult = true;
                        resolve(step.data);
                        return;
                      }
                      lastStepType = step.type;
                    } catch (e) {
                      // Not JSON, continue
                      console.debug('Not JSON in buffer:', trimmedLine);
                    }
                  }
                }
                
                // If we reach here without a result, provide helpful error message
                if (lastStepType === 'complete') {
                  console.warn('⚠️ Stream ended after "complete" step but no result received. This might be a timing issue.');
                  reject(new Error('Analysis completed but final result was not received. This may be a network timing issue. Please try again.'));
                } else {
                  console.warn('⚠️ Stream ended without result. Last step type:', lastStepType);
                  reject(new Error('Stream ended without result. The analysis may have failed or the connection was interrupted.'));
                }
                break;
              }

              if (!value) {
                console.warn('⚠️ Received null/undefined value in chunk #' + chunkCount);
                continue;
              }
              
              totalBytesReceived += value.length;
              const chunk = decoder.decode(value, { stream: true });
              console.log(`📥 Received chunk #${chunkCount} (${value.length} bytes, total: ${totalBytesReceived} bytes)`);
              console.log(`📥 Chunk preview:`, chunk.substring(0, 300));
              console.log(`📥 Full chunk:`, JSON.stringify(chunk));
              buffer += chunk;
              
              // Clear timeout once we receive data
              if (chunkCount === 1) {
                clearTimeout(streamTimeout);
              }
              
              // Process complete lines
              const lines = buffer.split('\n');
              buffer = lines.pop() || ''; // Keep incomplete line in buffer

              console.log('📋 Processing', lines.length, 'lines from chunk');

              for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || trimmedLine === ': connected') {
                  console.log('⏭️ Skipping empty/comment line:', trimmedLine);
                  continue;
                }

                console.log('🔍 Processing line:', trimmedLine.substring(0, 150));

                // SSE format: "data: {...}\n\n"
                if (trimmedLine.startsWith('data: ')) {
                  try {
                    const jsonStr = trimmedLine.slice(6); // Remove "data: "
                    const step: ReasoningStep = JSON.parse(jsonStr);
                    
                    console.log('✅ Successfully parsed reasoning step:', {
                      type: step.type,
                      message: step.message ? step.message.substring(0, 50) : 'No message',
                      timestamp: step.timestamp,
                    });
                    
                    lastStepType = step.type;
                    
                    // Call progress callback
                    console.log('📞 Calling onProgress callback with step:', step.type);
                    try {
                      onProgress(step);
                      console.log('✅ onProgress callback completed successfully');
                    } catch (callbackError) {
                      console.error('❌ Error in onProgress callback:', callbackError);
                    }

                    if (step.type === 'result') {
                      console.log('🎉 Received final result');
                      receivedResult = true;
                      resolve(step.data);
                      return;
                    } else if (step.type === 'error') {
                      console.error('❌ Received error:', step.message);
                      reject(new Error(step.message));
                      return;
                    }
                  } catch (e) {
                    console.error('❌ Failed to parse SSE data:', e, 'Line:', trimmedLine);
                  }
                } else {
                  // Sometimes SSE sends just the data without "data: " prefix
                  try {
                    const step: ReasoningStep = JSON.parse(trimmedLine);
                    console.log('✅ Parsed reasoning step (no prefix):', step);
                    lastStepType = step.type;
                    onProgress(step);

                    if (step.type === 'result') {
                      console.log('🎉 Received final result');
                      receivedResult = true;
                      resolve(step.data);
                      return;
                    } else if (step.type === 'error') {
                      console.error('❌ Received error:', step.message);
                      reject(new Error(step.message));
                      return;
                    }
                  } catch (e) {
                    // Not JSON, skip
                    console.debug('⏭️ Skipping non-JSON line:', trimmedLine);
                  }
                }
              }
            }
          } catch (streamError) {
            console.error('❌ Stream reading error:', streamError);
            reject(streamError);
          }
        })
        .catch((error) => {
          console.error('Fetch error:', error);
          reject(error);
        });
    });
  } else {
    // Non-streaming mode (backward compatibility)
    const response = await post('/jobs/ai-analyze', { job_id: jobId, cv_id: cvId });
    return response.data.analysis;
  }
};

/**
 * Record user feedback for AI analysis (RLHF training data)
 */
export const recordAIAnalysisFeedback = async (
  analysisId: number,
  feedback: {
    rating?: number;           // 1-5 stars
    was_helpful?: boolean;     // thumbs up/down
    feedback_text?: string;
    actual_outcome?: 'applied' | 'rejected' | 'interviewed' | 'offered';
    outcome_notes?: string;
  }
): Promise<void> => {
  await post('/jobs/ai-analyze/feedback', {
    analysis_id: analysisId,
    ...feedback,
  });
};

// Export the configured axios instance as default
export default apiClient;
