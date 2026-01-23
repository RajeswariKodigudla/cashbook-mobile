// API Service for Mobile App - Same as Web App
import axios from 'axios';
import { API_BASE_URL, getAuthToken, removeAuthToken } from '../config/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  timeout: 15000, // 15 second timeout to prevent hanging
});

// Request interceptor - add token to requests
api.interceptors.request.use(
  async (config) => {
    const token = await getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('📡 [INTERCEPTOR] Sending API request:', config.method?.toUpperCase(), config.url);
    console.log('📡 [INTERCEPTOR] Full URL:', (config.baseURL || '') + (config.url || ''));
    console.log('📡 [INTERCEPTOR] Has token:', !!token);
    
    // Log query parameters (params) - CRITICAL for account filtering
    if (config.params) {
      console.log('📡 [INTERCEPTOR] Query parameters (params):', config.params);
      // Build query string for visibility
      const queryString = new URLSearchParams(config.params).toString();
      console.log('📡 [INTERCEPTOR] Query string:', queryString);
      console.log('📡 [INTERCEPTOR] Full URL with params:', (config.baseURL || '') + (config.url || '') + '?' + queryString);
    }
    
    if (config.data) {
      console.log('📡 [INTERCEPTOR] Request data:', config.data);
    }
    return config;
  },
  (error) => {
    console.error('❌ API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', response.status, response.data);
    // Handle 204 No Content (common for DELETE operations)
    if (response.status === 204 || !response.data) {
      return { success: true, message: 'Operation successful' };
    }
    // CRITICAL: Return the full response.data object, not just extract it
    // This preserves the structure {success: true, data: [...]} if backend sends it
    return response.data;
  },
  async (error) => {
    // Check if this is a DELETE request - handle network errors silently
    const isDeleteRequest = error.config?.method?.toLowerCase() === 'delete';
    
    // Check for network errors (no response from server)
    const isNetworkError = !error.response && (
      error.message?.includes('Network') || 
      error.message?.includes('connect') ||
      error.message?.includes('ECONNREFUSED') ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ERR_NETWORK' ||
      error.code === 'ETIMEDOUT'
    );
    
    // For DELETE requests with network errors, return success silently
    if (isDeleteRequest && isNetworkError) {
      // Don't log as error - just return success indicator
      return { success: true, message: 'Delete request sent', networkError: true, silent: true };
    }
    
    // Log other errors normally (but reduce verbosity for network errors)
    if (!isDeleteRequest) {
      const status = error.response?.status;
      const url = error.config?.url || 'unknown';
      const method = error.config?.method?.toUpperCase() || 'REQUEST';
      
      if (isNetworkError) {
        // Brief log for network errors
        console.warn('⚠️ Network Error:', method, url);
        console.warn('  Backend may be unavailable. App will continue with offline mode.');
      } else {
        // Detailed log for other errors
        console.error('❌ API Response Error:');
        console.error('  Status:', status);
        console.error('  Method:', method);
        console.error('  URL:', url);
        console.error('  Has Response:', !!error.response);
        if (error.response?.data) {
          if (typeof error.response.data === 'string') {
            const preview = error.response.data.substring(0, 200);
            console.error('  Response Preview:', preview + (error.response.data.length > 200 ? '...' : ''));
          } else {
            console.error('  Response Data:', JSON.stringify(error.response.data, null, 2));
          }
        }
      }
    }

    // Extract common error data once
    const responseStatus = error.response?.status;
    const errorResponseData = error.response?.data;
    const isHtmlResponse = typeof errorResponseData === 'string' && errorResponseData?.includes('<!DOCTYPE html>');
    const url = error.config?.url || '';
    const method = error.config?.method?.toUpperCase() || 'REQUEST';

    // Handle 500 errors FIRST - server errors (before 404 check to avoid false positives)
    if (responseStatus === 500) {
      
      let errorMessage = 'Server error occurred. Please try again later.';
      let isDatabaseError = false;
      
      if (isHtmlResponse) {
        // Try to extract error details from Django debug page
        const exceptionMatch = errorResponseData.match(/<pre class="exception_value">([^<]+)<\/pre>/);
        if (exceptionMatch) {
          const exceptionText = exceptionMatch[1].trim();
          errorMessage = `Server error: ${exceptionText}`;
          
          // Check if this is a database connection error
          const lowerException = exceptionText.toLowerCase();
          isDatabaseError = lowerException.includes('timeout') || 
                           lowerException.includes('connection') ||
                           lowerException.includes('database') ||
                           lowerException.includes('postgres');
          
          // Provide helpful hints for common errors
          if (exceptionText.includes('does not exist')) {
            errorMessage += '\n\nThis appears to be a database schema issue. Please contact the administrator.';
          }
        } else {
          const titleMatch = errorResponseData.match(/<title>([^<]+)<\/title>/);
          if (titleMatch) {
            errorMessage = `Server error: ${titleMatch[1]}`;
          }
        }
      } else if (errorResponseData?.detail) {
        errorMessage = errorResponseData.detail;
        const lowerDetail = String(errorResponseData.detail).toLowerCase();
        isDatabaseError = lowerDetail.includes('timeout') || 
                         lowerDetail.includes('connection') ||
                         lowerDetail.includes('database');
      } else if (errorResponseData?.message) {
        errorMessage = errorResponseData.message;
        const lowerMessage = String(errorResponseData.message).toLowerCase();
        isDatabaseError = lowerMessage.includes('timeout') || 
                         lowerMessage.includes('connection') ||
                         lowerMessage.includes('database');
      } else if (errorResponseData?.error) {
        errorMessage = errorResponseData.error;
        const lowerError = String(errorResponseData.error).toLowerCase();
        isDatabaseError = lowerError.includes('timeout') || 
                         lowerError.includes('connection') ||
                         lowerError.includes('database') ||
                         lowerError.includes('postgres');
      }
      
      const serverError = new Error(errorMessage);
      serverError.status = 500;
      serverError.originalError = error;
      serverError.isHtmlResponse = isHtmlResponse;
      serverError.isDatabaseError = isDatabaseError;
      
      // Reduce logging for database connection errors (they're expected during outages)
      if (isDatabaseError) {
        // Only log database errors for non-notification endpoints to reduce noise
        // Notifications are polled frequently and will spam the console
        if (!url.includes('/notifications/')) {
          console.warn('⚠️ Database connection issue detected. Some features may be unavailable.');
        }
      } else {
        console.error('❌ 500 Server Error detected:');
        console.error('  URL:', url);
        console.error('  Method:', method);
        console.error('  Error Message:', errorMessage);
        if (isHtmlResponse && errorResponseData) {
          const exceptionMatch = errorResponseData.match(/<pre class="exception_value">([^<]+)<\/pre>/);
          if (exceptionMatch) {
            console.error('  Database Error:', exceptionMatch[1].trim());
          }
        }
      }
      throw serverError;
    }

    // Handle 404 errors - endpoint not found (AFTER 500 check to avoid false positives)
    if (responseStatus === 404) {
      let errorMessage = `Endpoint not found: ${method} ${url}`;
      
      // Provide specific messages for known endpoints
      if (url.includes('/token/') || url.includes('/token')) {
        errorMessage = 'Authentication endpoint not found. The backend API does not have authentication configured. Please contact the administrator.';
      } else if (url.includes('/register/') || url.includes('/register')) {
        errorMessage = 'Registration endpoint not found. The backend API does not have user registration configured. Please contact the administrator.';
      } else if (url.includes('/token/refresh/') || url.includes('/token/refresh')) {
        errorMessage = 'Token refresh endpoint not found. The backend API does not have token refresh configured.';
      } else if (isHtmlResponse) {
        // Try to extract useful info from HTML error page
        const titleMatch = errorResponseData.match(/<title>([^<]+)<\/title>/);
        if (titleMatch) {
          errorMessage = `Backend error: ${titleMatch[1]}`;
        } else {
          errorMessage = `Endpoint not found: ${method} ${url}. The backend API may not have this endpoint configured.`;
        }
      }
      
      const notFoundError = new Error(errorMessage);
      notFoundError.status = 404;
      notFoundError.originalError = error;
      notFoundError.isHtmlResponse = isHtmlResponse;
      console.error('❌ 404 Error detected:');
      console.error('  URL:', url);
      console.error('  Method:', method);
      console.error('  Error Message:', errorMessage);
      throw notFoundError;
    }

    if (error.response?.status === 401) {
      await removeAuthToken();
      // For login endpoint, provide more specific error message
      if (error.config?.url?.includes('/token/')) {
        const errorData = error.response?.data;
        let errorDetail = null;
        
        if (errorData) {
          errorDetail = errorData.detail || errorData.message;
          // Handle Django REST framework non-field errors
          if (!errorDetail && errorData.non_field_errors) {
            const errors = errorData.non_field_errors;
            errorDetail = Array.isArray(errors) ? errors[0] : String(errors);
          }
        }
        
        const errorMessage = errorDetail || 'Invalid username or password. Please check your credentials.';
        const loginError = new Error(errorMessage);
        // Preserve original error info for debugging
        loginError.originalError = error;
        loginError.status = 401;
        throw loginError;
      }
      const sessionError = new Error('Session expired. Please login again.');
      sessionError.originalError = error;
      sessionError.status = 401;
      throw sessionError;
    }

    if (error.response?.status === 400) {
      const errorData = error.response.data;
      if (errorData.errors) {
        const fieldErrors = Object.entries(errorData.errors)
          .map(([field, messages]) => `${field}: ${messages[0]}`)
          .join(', ');
        throw new Error(fieldErrors || errorData.message || 'Validation failed');
      }
      if (errorData.detail) {
        throw new Error(errorData.detail);
      }
      if (errorData.message) {
        throw new Error(errorData.message);
      }
      throw new Error('Invalid data. Please check all fields.');
    }

    if (!error.response) {
      // For DELETE requests, return success instead of throwing
      if (isDeleteRequest) {
        return { success: true, message: 'Delete request sent', networkError: true, silent: true };
      }
      const networkError = new Error('Cannot connect to server. Please check your internet connection.');
      networkError.code = error.code || 'NETWORK_ERROR';
      networkError.originalError = error;
      throw networkError;
    }

    // Handle other error status codes (fallback for any unhandled status codes)
    let errorMessage = `Request failed with status ${responseStatus || 'unknown'}`;
    
    // Provide specific messages for authentication endpoints
    if (url.includes('/token/') || url.includes('/register/') || url.includes('/token/refresh/')) {
      if (responseStatus === 404) {
        errorMessage = 'Authentication endpoint not found. The backend API does not have authentication configured. Please contact the administrator.';
      } else {
        errorMessage = `Authentication request failed (Status ${responseStatus}). Please check your backend configuration.`;
      }
    } else if (isHtmlResponse) {
      // Try to extract error from HTML
      const titleMatch = errorResponseData.match(/<title>([^<]+)<\/title>/);
      if (titleMatch) {
        errorMessage = `Backend error: ${titleMatch[1]}`;
      } else {
        errorMessage = `Server returned an error (Status ${responseStatus}). Please try again later.`;
      }
    } else if (errorResponseData) {
      if (typeof errorResponseData === 'object') {
        errorMessage = errorResponseData.message || errorResponseData.detail || `Server error (Status ${responseStatus})`;
      } else if (typeof errorResponseData === 'string') {
        errorMessage = errorResponseData.length > 200 ? `Server error (Status ${responseStatus})` : errorResponseData;
      } else {
        errorMessage = `Server error (Status ${responseStatus}). Please try again later.`;
      }
    } else {
      errorMessage = `Server error (Status ${responseStatus}). Please try again later.`;
    }
    
    console.error('❌ Unhandled error status:', {
      status: responseStatus,
      method,
      url,
      errorMessage,
      hasHtmlResponse: isHtmlResponse,
    });
    
    const genericError = new Error(errorMessage);
    genericError.status = responseStatus;
    genericError.originalError = error;
    throw genericError;
  }
);

// Backend Health Check & Endpoint Discovery
export const checkBackendHealth = async () => {
  try {
    // Try to get API root to see available endpoints
    // Use direct axios to avoid interceptor issues
    const directAxios = axios.create({
      baseURL: API_BASE_URL,
      headers: { 'Content-Type': 'application/json' },
      timeout: 5000,
    });
    
    const response = await directAxios.get('/');
    const endpoints = response.data;
    
    console.log('✅ Backend is accessible');
    console.log('🌐 Backend URL:', API_BASE_URL);
    console.log('📋 API Root Response:', JSON.stringify(endpoints, null, 2));
    
    // Extract endpoint names from the response
    const availableEndpoints = Object.keys(endpoints).map(key => {
      const url = endpoints[key];
      // Extract the endpoint path from the full URL
      const path = url.replace(API_BASE_URL, '').replace(/\/$/, '');
      return path || key;
    });
    
    console.log('✅ Available endpoints:', availableEndpoints);
    
    // Check for critical missing endpoints
    const missingEndpoints = [];
    const endpointKeys = Object.keys(endpoints).map(k => k.toLowerCase());
    const endpointValues = Object.values(endpoints).map(v => String(v).toLowerCase());
    
    // Check for authentication endpoints
    const hasTokenEndpoint = endpointKeys.includes('token') || 
                            endpointValues.some(v => v.includes('/token/'));
    const hasAuthStatus = endpointKeys.includes('auth') || 
                         endpointValues.some(v => v.includes('/auth/status/'));
    
    if (!hasTokenEndpoint && !hasAuthStatus) {
      missingEndpoints.push('Authentication (/token/ or /auth/status/)');
    }
    
    if (!endpointKeys.includes('register') && 
        !endpointValues.some(v => v.includes('/register/'))) {
      missingEndpoints.push('Registration (/register/)');
    }
    if (!endpointKeys.includes('summary') && 
        !endpointValues.some(v => v.includes('/summary/'))) {
      missingEndpoints.push('Transactions Summary (/transactions/summary/)');
    }
    
    // Check for auth status endpoint (optional but useful)
    if (hasAuthStatus) {
      console.log('✅ Auth status endpoint available: /auth/status/');
    }
    
    if (missingEndpoints.length > 0) {
      console.warn('⚠️ Missing critical endpoints:');
      missingEndpoints.forEach(endpoint => {
        console.warn(`   - ${endpoint}`);
      });
      console.warn('💡 These endpoints need to be added to the backend for full functionality.');
    } else {
      console.log('✅ All critical endpoints are available!');
    }
    
    return { 
      available: true, 
      endpoints: endpoints,
      availableEndpoints: availableEndpoints,
      missingEndpoints: missingEndpoints,
      message: 'Backend is accessible'
    };
  } catch (error) {
    console.warn('⚠️ Backend health check failed:', error.message);
    console.warn('⚠️ Status:', error.response?.status);
    return { 
      available: false, 
      error: error.message,
      status: error.response?.status,
      message: 'Backend may not be accessible'
    };
  }
};

// Auth API
export const authAPI = {
  login: async (username, password) => {
    console.log('📡 Sending login request to:', `${API_BASE_URL}/token/`);
    try {
      const response = await api.post('/token/', { username, password });
      console.log('📡 Login API response:', response);
      return response;
    } catch (error) {
      // If 404, try alternative endpoint patterns
      // Check both error.status (from interceptor) and error.response?.status (from axios)
      const status = error.status || error.response?.status;
      if (status === 404) {
        console.warn('⚠️ /token/ endpoint not found. Trying alternative endpoints...');
        
        // Try common alternative patterns - use axios directly to bypass interceptor
        // Note: API_BASE_URL already includes /api, so alternatives should be relative to /api
        const alternatives = [
          '/auth/token/',      // Try /api/auth/token/
          '/auth/login/',      // Try /api/auth/login/
          '/login/',           // Try /api/login/
          'auth/token',        // Try /api/auth/token (no trailing slash)
          'auth/login',        // Try /api/auth/login (no trailing slash)
          'login',             // Try /api/login (no trailing slash)
        ];
        
        // Create a temporary axios instance without interceptors for alternative attempts
        const directAxios = axios.create({
          baseURL: API_BASE_URL,
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000, // 10 second timeout for alternative endpoint attempts
        });
        
        for (const altEndpoint of alternatives) {
          try {
            // Ensure endpoint starts with / for proper URL construction
            const normalizedEndpoint = altEndpoint.startsWith('/') ? altEndpoint : `/${altEndpoint}`;
            const fullUrl = `${API_BASE_URL}${normalizedEndpoint}`;
            console.log(`🔄 Trying alternative endpoint: ${normalizedEndpoint} (full: ${fullUrl})`);
            const altResponse = await directAxios.post(normalizedEndpoint, { username, password });
            console.log(`✅ Success with ${normalizedEndpoint}:`, altResponse.data);
            return altResponse.data;
          } catch (altError) {
            const altStatus = altError.response?.status || altError.status;
            // Only log if it's not a 404 (to reduce noise)
            if (altStatus !== 404) {
              console.log(`❌ ${altEndpoint} failed with status: ${altStatus}`);
            }
          }
        }
        console.warn('⚠️ All alternative endpoints failed. Backend authentication endpoint is missing.');
      }
      throw error;
    }
  },

  register: async (userData) => {
    console.log('📡 Sending registration request to:', `${API_BASE_URL}/register/`);
    try {
      const response = await api.post('/register/', userData);
      console.log('📡 Register API response:', response);
      return response;
    } catch (error) {
      // If 404, try alternative endpoint patterns
      const status = error.status || error.response?.status;
      if (status === 404) {
        console.warn('⚠️ /register/ endpoint not found. Trying alternative endpoints...');
        
        // Try common alternative patterns - use axios directly to bypass interceptor
        // Note: API_BASE_URL already includes /api, so alternatives should be relative to /api
        const alternatives = [
          '/auth/register/',   // Try /api/auth/register/
          '/auth/signup/',     // Try /api/auth/signup/
          '/signup/',          // Try /api/signup/
          'auth/register',     // Try /api/auth/register (no trailing slash)
          'auth/signup',       // Try /api/auth/signup (no trailing slash)
          'signup',            // Try /api/signup (no trailing slash)
        ];
        
        // Create a temporary axios instance without interceptors for alternative attempts
        const directAxios = axios.create({
          baseURL: API_BASE_URL,
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000, // 10 second timeout for alternative endpoint attempts
        });
        
        for (const altEndpoint of alternatives) {
          try {
            // Ensure endpoint starts with / for proper URL construction
            const normalizedEndpoint = altEndpoint.startsWith('/') ? altEndpoint : `/${altEndpoint}`;
            const fullUrl = `${API_BASE_URL}${normalizedEndpoint}`;
            console.log(`🔄 Trying alternative registration endpoint: ${normalizedEndpoint} (full: ${fullUrl})`);
            const altResponse = await directAxios.post(normalizedEndpoint, userData);
            console.log(`✅ Success with ${normalizedEndpoint}:`, altResponse.data);
            return altResponse.data;
          } catch (altError) {
            const altStatus = altError.response?.status || altError.status;
            // Only log if it's not a 404 (to reduce noise)
            if (altStatus !== 404) {
              console.log(`❌ ${altEndpoint} failed with status: ${altStatus}`);
            }
          }
        }
        console.warn('⚠️ All alternative registration endpoints failed. Backend registration endpoint is missing.');
      }
      throw error;
    }
  },

  refreshToken: async (refreshToken) => {
    console.log('📡 Sending refresh token request to:', `${API_BASE_URL}/token/refresh/`);
    const response = await api.post('/token/refresh/', { refresh: refreshToken });
    console.log('📡 Refresh token API response:', response);
    return response;
  },

  getCurrentUser: async () => {
    try {
      // First, try the dedicated auth status endpoint if available
      try {
        const statusResponse = await api.get('/auth/status/');
        if (statusResponse && statusResponse.user) {
          console.log('✅ Got user from /auth/status/:', statusResponse.user);
          // Ensure we have proper user object with all fields
          const user = {
            id: statusResponse.user.id,
            username: statusResponse.user.username || statusResponse.user.email || 'User',
            email: statusResponse.user.email || '',
            first_name: statusResponse.user.first_name || '',
            last_name: statusResponse.user.last_name || '',
            name: statusResponse.user.name || statusResponse.user.first_name || statusResponse.user.username || 'User',
          };
          return { user };
        }
        if (statusResponse && statusResponse.username) {
          console.log('✅ Got username from /auth/status/:', statusResponse.username);
          return { user: { username: statusResponse.username, id: statusResponse.id || null } };
        }
      } catch (statusError) {
        // If /auth/status/ doesn't exist (404), try /user/ endpoint
        if (statusError.response?.status === 404) {
          console.log('ℹ️ /auth/status/ endpoint not available, trying /user/ endpoint');
          try {
            const userResponse = await api.get('/user/');
            if (userResponse && (userResponse.data || userResponse.user || userResponse)) {
              const userData = userResponse.data || userResponse.user || userResponse;
              const user = {
                id: userData.id,
                username: userData.username || userData.email || 'User',
                email: userData.email || '',
                first_name: userData.first_name || '',
                last_name: userData.last_name || '',
                name: userData.name || userData.first_name || userData.username || 'User',
              };
              console.log('✅ Got user from /user/:', user);
              return { user };
            }
          } catch (userError) {
            console.log('ℹ️ /user/ endpoint not available, trying fallback method');
          }
        } else if (statusError.response?.status !== 401 && statusError.status !== 401) {
          // If it's not a 404 or 401, re-throw (might be network error)
          throw statusError;
        }
      }
      
      // Fallback: Try to get transactions list to verify auth
      try {
        await api.get('/transactions/');
        return { user: { username: 'User', id: null } };
      } catch (error) {
        // If 401, token is invalid
        if (error.response?.status === 401 || error.status === 401) {
          throw error;
        }
        // For any other error (404, 500, network, etc.), just return default user
        // This allows the app to continue working even if backend has issues
        const isNetworkError = !error.response && (
          error.message?.includes('Network') || 
          error.message?.includes('connect') ||
          error.code === 'ECONNREFUSED' ||
          error.code === 'ERR_NETWORK'
        );
        if (isNetworkError) {
          console.log('⚠️ Backend unavailable. Using default user (offline mode)');
        } else {
          console.log('⚠️ Could not verify user, using default user');
        }
        return { user: { username: 'User', id: null } };
      }
    } catch (error) {
      // If 401, token is invalid - re-throw
      if (error.response?.status === 401 || error.status === 401) {
        throw error;
      }
      // For other errors, return default user
      console.log('⚠️ Auth check failed, using default user');
      return { user: { username: 'User', id: null } };
    }
  },
  
  checkAuthStatus: async () => {
    try {
      const response = await api.get('/auth/status/');
      return {
        authenticated: true,
        user: response.user || { username: response.username || 'User' },
        ...response
      };
    } catch (error) {
      if (error.response?.status === 401 || error.status === 401) {
        return { authenticated: false, user: null };
      }
      // If endpoint doesn't exist, return null to indicate we can't check
      if (error.response?.status === 404 || error.status === 404) {
        return { authenticated: null, user: null, endpointMissing: true };
      }
      throw error;
    }
  },

  logout: async (refreshToken) => {
    console.log('📡 Sending logout request to:', `${API_BASE_URL}/logout/`);
    try {
      const response = await api.post('/logout/', { refresh: refreshToken });
      console.log('📡 Logout API response:', response);
      return response;
    } catch (error) {
      // Don't throw - logout should always succeed on client side
      console.log('Logout API error (non-critical):', error);
      return { success: true, message: 'Logged out' };
    }
  },
};

// Transactions API
export const transactionsAPI = {
  getAll: async (filters = {}) => {
    try {
      const callId = Math.random().toString(36).substring(7);
      // Reduced verbose logging - only log when there's an issue
      // console.log(`📡 [transactionsAPI.getAll] [${callId}] Fetching transactions with filters:`, filters);
      
      // Normalize account filter if present (ensure it's a string for query params)
      const normalizedFilters = { ...filters };
      
      // Handle both 'account' and 'accountId' parameters (normalize to 'account')
      // Backend accepts both, but we use 'account' for consistency
      if (normalizedFilters.accountId && !normalizedFilters.account) {
        // If accountId is provided but not account, copy it to account
        normalizedFilters.account = normalizedFilters.accountId;
        delete normalizedFilters.accountId; // Remove accountId to avoid confusion
        // Reduced logging
        // console.log(`📡 [transactionsAPI.getAll] [${callId}] Converted accountId to account parameter`);
      }
      
      // Ensure account parameter is a string (backend will convert to int if needed)
      if (normalizedFilters.account && normalizedFilters.account !== 'personal') {
        normalizedFilters.account = String(normalizedFilters.account);
        // Reduced logging
        // console.log(`📡 [transactionsAPI.getAll] [${callId}] Normalized account filter:`, normalizedFilters.account);
      }
      
      // Reduced verbose logging
      // console.log(`📡 [transactionsAPI.getAll] [${callId}] Final normalized filters:`, normalizedFilters);
      
      // Check if we have auth token
      const token = await getAuthToken();
      // Reduced logging
      // console.log('📡 [transactionsAPI.getAll] Auth token present:', !!token);
      
      // VERIFICATION: Log API call with filters
      if (normalizedFilters.account) {
        console.log('🔍 [VERIFY] API call triggered with account filter:', normalizedFilters.account);
        console.log('🔍 [VERIFY] Full URL params:', normalizedFilters);
        console.log('🔍 [VERIFY] Making GET request to /transactions/ with account:', normalizedFilters.account);
      }
      
      // Note: The interceptor returns response.data directly, so we get the data object
      const response = await api.get('/transactions/', { params: normalizedFilters });
      
      // VERIFICATION: Log response count and verify accountId in transactions
      if (normalizedFilters.account) {
        const responseCount = response?.data?.length || response?.count || (Array.isArray(response) ? response.length : 0);
        console.log('🔍 [VERIFY] API returned transactions:', responseCount, 'for account:', normalizedFilters.account);
        
        // Verify accountId in returned transactions
        if (responseCount > 0) {
          const transactions = Array.isArray(response) ? response : (response?.data || []);
          if (transactions.length > 0) {
            const sampleTx = transactions[0];
            const txAccountId = sampleTx.accountId || sampleTx.account?.id || sampleTx.account_id;
            console.log('🔍 [VERIFY] Sample transaction accountId:', txAccountId, 'Expected:', normalizedFilters.account);
            if (normalizedFilters.account !== 'personal') {
              const matches = String(txAccountId) === String(normalizedFilters.account);
              console.log('🔍 [VERIFY] Transaction accountId matches filter:', matches);
              // Verify all transactions belong to the correct account
              const allMatch = transactions.every(tx => {
                const txAccId = tx.accountId || tx.account?.id || tx.account_id;
                return String(txAccId) === String(normalizedFilters.account);
              });
              console.log('🔍 [VERIFY] All transactions belong to account:', allMatch);
              console.log('🔍 [VERIFY] Total transactions for shared account:', transactions.length);
              // Log transaction creators to verify all members can see all transactions
              const creators = transactions.map(tx => ({
                id: tx.id,
                createdBy: tx.createdBy || tx.user || tx.addedBy,
                accountId: tx.accountId || tx.account?.id || tx.account_id
              }));
              console.log('🔍 [VERIFY] Transaction creators (all members should see all):', creators.slice(0, 3));
            }
          }
        }
      }
      
      // Log sample transactions to verify accountId field
      if (Array.isArray(response) && response.length > 0) {
        const sample = response.slice(0, 2);
        console.log('📡 [transactionsAPI.getAll] Sample transactions:', sample.map(tx => ({
          id: tx.id,
          accountId: tx.accountId,
          account: tx.account,
          name: tx.name || tx.category
        })));
      }
      
      console.log(`📡 [transactionsAPI.getAll] [${callId}] ========== TRANSACTIONS FETCH COMPLETE ==========`);
      
      // Handle various response formats (interceptor already extracted data)
      let transactions = [];
      
      // Reduced verbose parsing logs - only log when there's an issue
      // console.log(`🔍 [transactionsAPI.getAll] [${callId}] Parsing response...`);
      
      // CRITICAL: Simplified and robust parsing logic
      // The interceptor returns response.data, so if backend sends {success: true, data: [...]},
      // the interceptor extracts just the data part, which would be the entire object {success: true, data: [...]}
      
      // PRIORITY 1: Check if response is directly an array
      if (Array.isArray(response)) {
        transactions = [...response]; // Create a copy
        // Reduced logging
        // console.log(`✅ [transactionsAPI.getAll] [${callId}] Response is array, using directly:`, transactions.length);
      }
      // PRIORITY 2: Check for {success: true, data: [...]} format (most common)
      // The interceptor returns response.data, so if backend sends {success: true, data: [...]},
      // we get {success: true, data: [...]} here
      else if (response && typeof response === 'object' && response !== null) {
        // Check for 'data' property first (most common case) - use multiple methods
        const dataValue = response.data;
        const hasDataProperty = dataValue !== undefined && dataValue !== null;
        
        // Reduced verbose logging
        // console.log(`🔍 [transactionsAPI.getAll] [${callId}] Checking response.data...`);
        
        if (hasDataProperty) {
          // Check if it's an array (most common case)
          if (Array.isArray(dataValue)) {
            transactions = [...dataValue]; // Create a copy to ensure it's a real array
            // Reduced logging - only log when there's an issue
            // console.log(`✅ [transactionsAPI.getAll] [${callId}] Found transactions in response.data (array):`, transactions.length);
          }
          // Check if it's an array-like object (e.g., Proxy, NodeList) or has numeric length
          else if (typeof dataValue === 'object' && dataValue !== null && ('length' in dataValue || dataValue.length !== undefined)) {
            const length = dataValue.length;
            if (typeof length === 'number' && length >= 0 && length < 1000000) {
              try {
                // Try to access first element to verify it's array-like
                if (dataValue[0] !== undefined || length === 0) {
                  transactions = Array.from(dataValue);
                  // Reduced logging
                  // console.log('✅ Converted array-like response.data to array:', transactions.length);
                } else {
                  console.warn('⚠️ Array-like object has length but no accessible elements');
                }
              } catch (e) {
                console.warn('⚠️ Failed to convert array-like response.data:', e);
              }
            }
          } else {
            console.warn('⚠️ response.data exists but is not array or array-like:', typeof dataValue, dataValue);
          }
        }
        // Check for nested results array in data object (if data exists but wasn't an array)
        if (transactions.length === 0 && hasDataProperty && response.data && typeof response.data === 'object' && Array.isArray(response.data.results)) {
          transactions = response.data.results;
          // Reduced logging
          // console.log('✅ Found transactions in response.data.results:', transactions.length);
        }
        // Check for results property (Django REST Framework pagination)
        if (transactions.length === 0 && ('results' in response || response.hasOwnProperty('results')) && Array.isArray(response.results)) {
          transactions = response.results;
          // Reduced logging
          // console.log('✅ Found transactions in response.results:', transactions.length);
        }
        // Try to find array in common property names using bracket notation as fallback
        if (transactions.length === 0) {
          // Reduced logging
          // console.log('🔍 [transactionsAPI.getAll] Trying to find array in response object...');
          const possibleKeys = ['data', 'results', 'transactions', 'items', 'list'];
          for (const key of possibleKeys) {
            // Try multiple ways to access the property
            const value = response[key] || (response.hasOwnProperty && response.hasOwnProperty(key) ? response[key] : undefined);
            if (value !== undefined && Array.isArray(value)) {
              transactions = value;
              // Reduced logging
              // console.log(`✅ Found transactions in response.${key}:`, transactions.length);
              break;
            }
          }
          
          // If still not found, try nested data object
          if (transactions.length === 0 && hasDataProperty && response.data && typeof response.data === 'object') {
            // Reduced logging
            // const nestedKeys = Object.keys(response.data);
            for (const key of ['results', 'transactions', 'items', 'data']) {
              const nestedValue = response.data[key];
              if (nestedValue !== undefined && Array.isArray(nestedValue)) {
                transactions = nestedValue;
                // Reduced logging
                // console.log(`✅ Found transactions in response.data.${key}:`, transactions.length);
                break;
              }
            }
          }
        }
      }
      
      // Ensure we return an array
      if (!Array.isArray(transactions)) {
        console.warn('⚠️ [transactionsAPI.getAll] Transactions is not an array, converting:', transactions);
        console.warn('⚠️ [transactionsAPI.getAll] Transactions type:', typeof transactions);
        console.warn('⚠️ [transactionsAPI.getAll] Full response structure:', JSON.stringify(response, null, 2));
        
        // Last resort: try to convert array-like objects to arrays
        if (transactions && typeof transactions === 'object' && 'length' in transactions) {
          try {
            transactions = Array.from(transactions);
            console.log('✅ Converted array-like object to array:', transactions.length);
          } catch (e) {
            console.error('❌ Failed to convert array-like object:', e);
            transactions = [];
          }
        } else {
          transactions = [];
        }
      }
      
      // Final safety check: ensure transactions is a real array
      if (!Array.isArray(transactions)) {
        console.error('❌ [transactionsAPI.getAll] Transactions is still not an array after conversion!');
        transactions = [];
      }
      
      // Reduced verbose logging - only log when there's an issue
      if (transactions.length === 0) {
        // Only log warning if we expected transactions but got none
        // console.warn(`⚠️ [transactionsAPI.getAll] [${callId}] No transactions found in response`);
      }
      // console.log(`✅ [transactionsAPI.getAll] [${callId}] Parsed transactions:`, transactions.length, 'items');
      
      return transactions;
    } catch (error) {
      // Check for network errors (including timeouts)
      const isNetworkError = !error.response && (
        error.message?.includes('Network') || 
        error.message?.includes('connect') ||
        error.message?.includes('timeout') ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ECONNABORTED' ||
        error.code === 'ERR_NETWORK' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'TIMEOUT'
      );
      
      if (isNetworkError) {
        console.warn('⚠️ Network error fetching transactions. Backend may be unavailable.');
        console.warn('  App will continue in offline mode with empty transaction list.');
      } else {
        console.error('❌ Error fetching transactions:', error);
        console.error('❌ Error details:', {
          message: error.message,
          status: error.status || error.response?.status,
          data: error.response?.data,
        });
      }
      // Return empty array instead of throwing to prevent UI crashes
      return [];
    }
  },

  getById: async (id) => {
    return await api.get(`/transactions/${id}/`);
  },

  create: async (transactionData) => {
    try {
      console.log('📤 Sending transaction data:', transactionData);
      const response = await api.post('/transactions/', transactionData);
      console.log('✅ Transaction created successfully:', response);
      return response;
    } catch (error) {
      console.error('❌ Error creating transaction:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.status || error.response?.status,
        data: error.response?.data,
        config: error.config,
      });
      
      // Extract error message
      let errorMessage = 'Failed to save transaction';
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.non_field_errors) {
          errorMessage = Array.isArray(error.response.data.non_field_errors)
            ? error.response.data.non_field_errors.join(', ')
            : error.response.data.non_field_errors;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Create a new error with the extracted message
      const enhancedError = new Error(errorMessage);
      enhancedError.originalError = error;
      enhancedError.status = error.status || error.response?.status;
      throw enhancedError;
    }
  },

  update: async (id, transactionData) => {
    console.log('📤 Updating transaction:', id, transactionData);
    const response = await api.put(`/transactions/${id}/`, transactionData);
    console.log('✅ Transaction updated:', response);
    return response;
  },

  delete: async (id) => {
    try {
      console.log('🗑️ API: Deleting transaction:', id);
      const response = await api.delete(`/transactions/${id}/`, {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
      });
      console.log('✅ API: Delete response:', response);
      
      // Handle empty response or 204 No Content
      if (!response || response.status === 204 || (response.success === undefined && !response.data)) {
        return { success: true, message: 'Transaction deleted successfully' };
      }
      
      // If response has success property, return it
      if (response.success !== undefined) {
        return response;
      }
      
      // Default success response
      return { success: true, message: 'Transaction deleted successfully', data: response };
    } catch (error) {
      console.error('❌ API: Error deleting transaction:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        config: error.config,
      });
      
      // Check if it's a network error
      const isNetworkError = !error.response && (
        error.message?.includes('Network') ||
        error.message?.includes('connect') ||
        error.message?.includes('Cannot connect') ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ERR_NETWORK' ||
        error.code === 'ETIMEDOUT'
      );
      
      // For network errors, throw so the UI can handle it
      if (isNetworkError) {
        throw new Error('Cannot connect to server. Please check your internet connection.');
      }
      
      // For 404, transaction might already be deleted - return success
      if (error.response?.status === 404) {
        console.log('⚠️ Transaction not found (may already be deleted)');
        return { success: true, message: 'Transaction deleted successfully' };
      }
      
      // For other errors, extract message and throw
      let errorMessage = 'Failed to delete transaction';
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  },

  getSummary: async (filters = {}) => {
    console.log('📊 Fetching summary with filters:', filters);
    try {
      const response = await api.get('/transactions/summary/', { params: filters });
      console.log('📊 Summary response:', response);
      if (response.success && response.data) {
        return response.data;
      }
      return response;
    } catch (error) {
      // Calculate summary locally for any backend error (404, 500, network, etc.)
      const status = error.status || error.response?.status;
      const isBackendError = status === 404 || status === 500 || 
                             error.message?.includes('category_id') || 
                             error.message?.includes('database schema') ||
                             error.message?.includes('Network') ||
                             error.message?.includes('timeout');
      
      if (isBackendError) {
        console.warn('⚠️ Backend summary endpoint unavailable. Calculating summary locally...');
        try {
          // Get all transactions and calculate summary locally
          const allTransactions = await transactionsAPI.getAll();
          let transactionsArray = [];
          
          if (Array.isArray(allTransactions)) {
            transactionsArray = allTransactions;
          } else if (allTransactions?.results) {
            transactionsArray = allTransactions.results;
          } else if (allTransactions?.data) {
            transactionsArray = Array.isArray(allTransactions.data) 
              ? allTransactions.data 
              : allTransactions.data.results || [];
          }
          
          const totalIncome = transactionsArray
            .filter(t => {
              if (!t || !t.amount) return false;
              const type = String(t.type || '').toLowerCase().trim();
              return type === 'income' || type === 'in' || type === 'credit';
            })
            .reduce((sum, t) => {
              const amount = typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0;
              return sum + (isNaN(amount) ? 0 : amount);
            }, 0);
          
          const totalExpense = transactionsArray
            .filter(t => {
              if (!t || !t.amount) return false;
              const type = String(t.type || '').toLowerCase().trim();
              return type === 'expense' || type === 'ex' || type === 'out' || type === 'debit';
            })
            .reduce((sum, t) => {
              const amount = typeof t.amount === 'number' ? t.amount : parseFloat(t.amount) || 0;
              return sum + (isNaN(amount) ? 0 : amount);
            }, 0);
          
          const balance = totalIncome - totalExpense;
          
          const summary = {
            total_income: totalIncome,
            total_expense: totalExpense,
            balance: balance,
            transaction_count: transactionsArray.length,
            _localCalculation: true,
          };
          
          console.log('✅ Calculated summary locally:', summary, 'from', transactionsArray.length, 'transactions');
          return summary;
        } catch (calcError) {
          console.error('❌ Failed to calculate summary locally:', calcError);
          // Return empty summary instead of throwing
          return {
            total_income: 0,
            total_expense: 0,
            balance: 0,
            transaction_count: 0,
            _fallback: true,
            _error: 'Could not calculate summary due to backend issues'
          };
        }
      }
      throw error;
    }
  },

  getIncome: async () => {
    return await api.get('/transactions/income/');
  },

  getExpense: async () => {
    return await api.get('/transactions/expense/');
  },
};

// Accounts API - Extended for Shared Accounts
export const accountsAPI = {
  // Get all accounts user is member of (including personal)
  getAll: async () => {
    try {
      console.log('📡 [accountsAPI.getAll] ========== STARTING ACCOUNTS FETCH ==========');
      console.log('📡 [accountsAPI.getAll] API Base URL:', API_BASE_URL);
      console.log('📡 [accountsAPI.getAll] Full URL will be:', `${API_BASE_URL}/accounts/`);
      
      // Check if we have auth token
      const token = await getAuthToken();
      console.log('📡 [accountsAPI.getAll] Auth token present:', !!token);
      console.log('📡 [accountsAPI.getAll] Auth token preview:', token ? `${token.substring(0, 20)}...` : 'null');
      
      console.log('📡 [accountsAPI.getAll] About to call api.get("/accounts/")...');
      console.log('📡 [accountsAPI.getAll] This should trigger the interceptor...');
      
      const response = await api.get('/accounts/');
      
      console.log('✅ [accountsAPI.getAll] Network call completed!');
      console.log('📡 [accountsAPI.getAll] Response type:', typeof response);
      console.log('📡 [accountsAPI.getAll] Response:', response);
      console.log('📡 [accountsAPI.getAll] ========== ACCOUNTS FETCH COMPLETE ==========');
      
      // Handle various response formats (interceptor already extracted response.data)
      let accounts = [];
      
      // Response is already the data (from interceptor), so check directly
      if (Array.isArray(response)) {
        accounts = response;
        console.log('✅ Response is array, using directly:', accounts.length, 'accounts');
      } else if (response && response.success && Array.isArray(response.data)) {
        accounts = response.data;
        console.log('✅ Found accounts in response.data:', accounts.length, 'accounts');
      } else if (response && Array.isArray(response.data)) {
        accounts = response.data;
        console.log('✅ Found accounts in response.data (array):', accounts.length, 'accounts');
      } else if (response && Array.isArray(response.accounts)) {
        accounts = response.accounts;
        console.log('✅ Found accounts in response.accounts:', accounts.length, 'accounts');
      } else if (response && response.results && Array.isArray(response.results)) {
        accounts = response.results;
        console.log('✅ Found accounts in response.results:', accounts.length, 'accounts');
      } else {
        console.warn('⚠️ Unexpected accounts response format:', response);
        accounts = [];
      }
      
      console.log('✅ Parsed accounts:', accounts.length, 'items');
      if (accounts.length > 0) {
        console.log('📋 First account sample:', JSON.stringify(accounts[0], null, 2));
        console.log('📋 Account IDs:', accounts.map(acc => acc.id || acc.accountName));
      } else {
        console.warn('⚠️ No accounts found in response');
      }
      
      return accounts;
    } catch (error) {
      // Check if it's a network error
      const isNetworkError = !error.response && (
        error.message?.includes('Network') ||
        error.message?.includes('connect') ||
        error.message?.includes('timeout') ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ECONNABORTED' ||
        error.code === 'ERR_NETWORK' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'TIMEOUT'
      );
      
      if (isNetworkError) {
        // Only log network errors once to avoid spam
        if (!accountsAPI._networkErrorLogged) {
          console.warn('⚠️ [accountsAPI] Backend server is not running or not accessible');
          console.warn('⚠️ [accountsAPI] URL:', `${API_BASE_URL}/accounts/`);
          console.warn('⚠️ [accountsAPI] App will use cached data. Start backend server to sync.');
          accountsAPI._networkErrorLogged = true;
        }
      } else {
        // Log other errors normally
        console.error('❌ [accountsAPI.getAll] Error fetching accounts:', error.message || error);
      }
      
      throw error;
    }
  },

  // Get account by ID
  getById: async (id) => {
    try {
      const response = await api.get(`/accounts/${id}/`);
      return response;
    } catch (error) {
      console.error('Error fetching account:', error);
      throw error;
    }
  },

  // Create new account (for backward compatibility)
  create: async (name) => {
    return await api.post('/accounts/', { name });
  },

  // Create shared account with full data
  createShared: async (accountData) => {
    try {
      console.log('📤 Creating shared account:', accountData);
      const response = await api.post('/accounts/', accountData);
      console.log('✅ Shared account created:', response);
      return response;
    } catch (error) {
      console.error('❌ Error creating shared account:', error);
      throw error;
    }
  },

  // Update account
  update: async (id, accountData) => {
    try {
      const response = await api.put(`/accounts/${id}/`, accountData);
      return response;
    } catch (error) {
      console.error('Error updating account:', error);
      throw error;
    }
  },

  // Delete account (only owner)
  delete: async (id) => {
    try {
      const response = await api.delete(`/accounts/${id}/`);
      return response;
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  },

  // ===========================
  // ACCOUNT MEMBERS MANAGEMENT
  // ===========================

  // Get account members
  getMembers: async (accountId) => {
    try {
      const response = await api.get(`/accounts/${accountId}/members/`);
      return response;
    } catch (error) {
      console.error('Error fetching members:', error);
      throw error;
    }
  },

  // Invite user to account
  inviteMember: async (accountId, inviteData) => {
    try {
      console.log('📤 Inviting member:', inviteData);
      const response = await api.post(`/accounts/${accountId}/invite/`, inviteData);
      console.log('✅ Invitation sent:', response);
      return response;
    } catch (error) {
      console.error('❌ Error inviting member:', error);
      throw error;
    }
  },

  // Accept invitation
  acceptInvitation: async (inviteId) => {
    try {
      const response = await api.post(`/accounts/invitations/${inviteId}/accept/`);
      return response;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  },

  // Reject invitation
  rejectInvitation: async (inviteId) => {
    try {
      const response = await api.post(`/accounts/invitations/${inviteId}/reject/`);
      return response;
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      throw error;
    }
  },

  // Update member permissions
  updateMemberPermissions: async (accountId, memberId, permissions) => {
    try {
      const response = await api.put(`/accounts/${accountId}/members/${memberId}/permissions/`, permissions);
      return response;
    } catch (error) {
      console.error('Error updating permissions:', error);
      throw error;
    }
  },

  // Remove member from account
  removeMember: async (accountId, memberId) => {
    try {
      const response = await api.delete(`/accounts/${accountId}/members/${memberId}/`);
      return response;
    } catch (error) {
      console.error('Error removing member:', error);
      throw error;
    }
  },

  // Get pending invitations for current user
  getInvitations: async () => {
    try {
      const response = await api.get('/accounts/invitations/');
      return response;
    } catch (error) {
      console.error('Error fetching invitations:', error);
      throw error;
    }
  },

  // Transfer ownership
  transferOwnership: async (accountId, newOwnerId) => {
    try {
      const response = await api.post(`/accounts/${accountId}/transfer-ownership/`, { newOwnerId });
      return response;
    } catch (error) {
      console.error('Error transferring ownership:', error);
      throw error;
    }
  },
};

// ===========================
// NOTIFICATIONS API
// ===========================
export const notificationsAPI = {
  // Get all notifications
  getAll: async () => {
    try {
      console.log('📬 [notificationsAPI] Making API call to /notifications/');
      const response = await api.get('/notifications/');
      console.log('📬 [notificationsAPI] Raw response received:', {
        hasResponse: !!response,
        hasData: !!response?.data,
        responseType: typeof response?.data,
        isArray: Array.isArray(response?.data),
        keys: response?.data ? Object.keys(response?.data) : [],
        status: response?.status,
      });
      // Log full response structure for debugging
      if (response?.data) {
        console.log('📬 [notificationsAPI] Full response.data:', JSON.stringify(response.data).substring(0, 500));
      }
      
      // Backend returns {success: true, data: [...], count: ...}
      // Extract the data array from the response
      if (response && response.data) {
        if (response.data.success && Array.isArray(response.data.data)) {
          console.log(`✅ [notificationsAPI] Found ${response.data.data.length} notifications in response.data.data`);
          return response.data.data; // Return the array directly
        } else if (Array.isArray(response.data)) {
          console.log(`✅ [notificationsAPI] Found ${response.data.length} notifications in response.data (direct array)`);
          return response.data; // Already an array
        } else if (response.data.data && Array.isArray(response.data.data)) {
          console.log(`✅ [notificationsAPI] Found ${response.data.data.length} notifications in response.data.data (nested)`);
          return response.data.data; // Nested data
        } else {
          console.warn('⚠️ [notificationsAPI] Unexpected response structure:', {
            hasSuccess: !!response.data.success,
            hasData: !!response.data.data,
            dataType: typeof response.data.data,
            isDataArray: Array.isArray(response.data.data),
            fullResponse: JSON.stringify(response.data).substring(0, 200),
          });
        }
      }
      // Fallback: return response.data if it exists, otherwise empty array
      console.warn('⚠️ [notificationsAPI] No notifications found in response, returning empty array');
      return response?.data || [];
    } catch (error) {
      console.error('❌ [notificationsAPI] Error fetching notifications:', {
        message: error?.message,
        status: error?.response?.status,
        code: error?.code,
        response: error?.response?.data,
        url: error?.config?.url,
      });
      throw error;
    }
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    try {
      const response = await api.put(`/notifications/${notificationId}/read/`);
      return response;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  // Mark all as read
  markAllAsRead: async () => {
    try {
      const response = await api.put('/notifications/mark-all-read/');
      return response;
    } catch (error) {
      console.error('Error marking all as read:', error);
      throw error;
    }
  },

  // Delete notification
  delete: async (notificationId) => {
    try {
      const response = await api.delete(`/notifications/${notificationId}/`);
      return response;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  },
};

// Notes API
export const notesAPI = {
  getAll: async () => {
    return await api.get('/notes/');
  },

  getById: async (id) => {
    return await api.get(`/notes/${id}/`);
  },

  create: async (text) => {
    return await api.post('/notes/', { text });
  },

  update: async (id, text) => {
    return await api.put(`/notes/${id}/`, { text });
  },

  delete: async (id) => {
    return await api.delete(`/notes/${id}/`);
  },
};

// Settings API
export const settingsAPI = {
  get: async () => {
    return await api.get('/settings');
  },

  update: async (settingsData) => {
    return await api.put('/settings/', settingsData);
  },
};

// Backup API
export const backupAPI = {
  get: async () => {
    return await api.get('/backup');
  },

  restore: async (backupData) => {
    return await api.post('/backup/restore', backupData);
  },
};

export default api;
