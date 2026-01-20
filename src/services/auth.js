// Auth Service for Mobile App - Same as Web App
import { authAPI } from './api';
import { setAuthToken, removeAuthToken, getAuthToken } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get current user info with caching
export const getCurrentUser = async () => {
  try {
    // Try cache first
    const { cacheHelpers } = await import('./cacheService');
    const cachedUser = await cacheHelpers.getCachedUser();
    if (cachedUser && cachedUser.username && cachedUser.username !== 'User') {
      // Return cached user immediately, fetch fresh in background
      fetchUserInBackground();
      return { user: cachedUser };
    }

    // Fetch from API
    const userResponse = await authAPI.getCurrentUser();
    const user = userResponse.user || userResponse;
    
    // Ensure we have a proper user object
    if (user && (user.username || user.email || user.id)) {
      // Cache user info
      const { cacheHelpers } = await import('./cacheService');
      await cacheHelpers.cacheUser(user);
      return { user };
    }
    
    // Fallback
    return { user: { username: 'User' } };
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('User endpoint not available, trying cache');
      const { cacheHelpers } = await import('./cacheService');
      const cachedUser = await cacheHelpers.getCachedUser();
      if (cachedUser) {
        return { user: cachedUser };
      }
      return { user: { username: 'User' } };
    }
    console.error('Error getting current user:', error);
    // Try cache on error
    try {
      const { cacheHelpers } = await import('./cacheService');
      const cachedUser = await cacheHelpers.getCachedUser();
      if (cachedUser) {
        return { user: cachedUser };
      }
    } catch (cacheError) {
      // Ignore cache errors
    }
    throw error;
  }
};

// Background fetch for user (non-blocking)
const fetchUserInBackground = async () => {
  try {
    const userResponse = await authAPI.getCurrentUser();
    const user = userResponse.user || userResponse;
    if (user && (user.username || user.email || user.id)) {
      const { cacheHelpers } = await import('./cacheService');
      await cacheHelpers.cacheUser(user);
    }
  } catch (error) {
    // Silent fail - cache will be used
  }
};

// Refresh access token using refresh token
export const refreshToken = async () => {
  try {
    const refreshTokenValue = await AsyncStorage.getItem('refreshToken');
    if (!refreshTokenValue) {
      throw new Error('No refresh token available');
    }

    const response = await authAPI.refreshToken(refreshTokenValue);
    
    if (response.access) {
      await setAuthToken(response.access);
      if (response.refresh) {
        await AsyncStorage.setItem('refreshToken', response.refresh);
      }
      return response.access;
    }
    
    throw new Error('Invalid refresh response');
  } catch (error) {
    console.error('Token refresh failed:', error);
    logout();
    throw error;
  }
};

export const login = async (username, password) => {
  try {
    console.log('Attempting login for username:', username);
    const response = await authAPI.login(username, password);
    console.log('Login API response:', response);
    
    // Handle different response structures
    let accessToken = null;
    let refreshTokenValue = null;
    
    if (response && typeof response === 'object') {
      accessToken = response.access || response.access_token || response.token;
      refreshTokenValue = response.refresh || response.refresh_token;
    }
    
    if (accessToken) {
      await setAuthToken(accessToken);
      if (refreshTokenValue) {
        await AsyncStorage.setItem('refreshToken', refreshTokenValue);
      }
      
      let user = { username };
      
      try {
        const userResponse = await authAPI.getCurrentUser();
        if (userResponse && userResponse.user) {
          user = userResponse.user;
        }
      } catch (err) {
        console.log('getCurrentUser failed (this is OK):', err);
      }
      
      console.log('✅ Login successful');
      return { 
        success: true, 
        user: user, 
        token: accessToken,
        refreshToken: refreshTokenValue 
      };
    }
    
    console.error('❌ No access token in response:', response);
    return { success: false, message: 'Invalid response from server. No access token received.' };
  } catch (error) {
    console.error('❌ Login error:', error.message || error);
    console.error('❌ Error details:');
    console.error('  Message:', error.message);
    console.error('  Status:', error.status || error.response?.status);
    console.error('  Code:', error.code);
    if (error.response?.data) {
      if (typeof error.response.data === 'string') {
        console.error('  Response:', error.response.data.substring(0, 200));
      } else {
        console.error('  Response:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    let errorMessage = 'Login failed. Please check your credentials and try again.';
    
    // Check error message first (from interceptor or direct error)
    if (error.message) {
      errorMessage = error.message;
    } 
    // Check axios response data
    else if (error.response?.data) {
      if (error.response.data.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.response.data.non_field_errors) {
        // Handle Django REST framework non-field errors
        const errors = error.response.data.non_field_errors;
        errorMessage = Array.isArray(errors) ? errors[0] : String(errors);
      }
    }
    // Handle network errors
    else if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network') || error.message?.includes('connect')) {
      errorMessage = 'Cannot connect to server. Please check your internet connection.';
    }
    // Handle timeout errors
    else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      errorMessage = 'Request timed out. Please try again.';
    }
    
    return { success: false, message: errorMessage };
  }
};

export const register = async (username, email, password, password_confirm, first_name = '', last_name = '') => {
  try {
    console.log('📝 Attempting registration for username:', username);
    const response = await authAPI.register({
      username,
      email,
      password,
      password_confirm: password_confirm || password,
      first_name,
      last_name,
    });
    
    console.log('📝 Registration API response:', response);
    
    // Backend returns: { success: true, message: '...', data: { username, email, ... } }
    if (response.success === true || (response.message && (response.data?.username || response.username))) {
      return { 
        success: true, 
        message: response.message || 'User created successfully',
        username: response.data?.username || response.username || username,
        data: response.data || response
      };
    }
    
    console.error('❌ Invalid registration response:', response);
    return { 
      success: false, 
      message: response.message || 'Invalid response from server',
      errors: response.errors || {}
    };
  } catch (error) {
    console.error('❌ Registration error:', error);
    console.error('  Message:', error.message);
    console.error('  Status:', error.status || error.response?.status);
    console.error('  Code:', error.code);
    if (error.response?.data) {
      if (typeof error.response.data === 'string') {
        console.error('  Response:', error.response.data.substring(0, 200));
      } else {
        console.error('  Response:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    let errorMessage = 'Registration failed. Please try again.';
    let errors = {};
    
    // Check error message first (from interceptor or direct error)
    if (error.message) {
      errorMessage = error.message;
    } 
    // Check axios response data
    else if (error.response?.data) {
      // Handle validation errors with field-specific messages
      if (error.response.data.errors) {
        errors = error.response.data.errors;
        // Extract first error message for alert
        const firstErrorKey = Object.keys(errors)[0];
        if (firstErrorKey) {
          const firstError = errors[firstErrorKey];
          errorMessage = Array.isArray(firstError) ? firstError[0] : String(firstError);
        }
      } else if (error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.response.data.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response.data.non_field_errors) {
        // Handle Django REST framework non-field errors
        const nonFieldErrors = error.response.data.non_field_errors;
        errorMessage = Array.isArray(nonFieldErrors) ? nonFieldErrors[0] : String(nonFieldErrors);
      }
    }
    // Handle network errors
    else if (error.code === 'NETWORK_ERROR' || error.message?.includes('Network') || error.message?.includes('connect')) {
      errorMessage = 'Cannot connect to server. Please check your internet connection.';
    }
    // Handle timeout errors
    else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      errorMessage = 'Request timed out. Please try again.';
    }
    
    return { 
      success: false, 
      message: errorMessage,
      errors: errors
    };
  }
};

export const logout = async () => {
  try {
    // Try to blacklist the refresh token on the server
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        await authAPI.logout(refreshToken);
      } catch (error) {
        // Log but don't fail - client-side cleanup will still happen
        console.log('Server logout failed (non-critical):', error);
      }
    }
  } catch (error) {
    console.log('Logout error (non-critical):', error);
  } finally {
    // Always perform client-side cleanup
    await removeAuthToken();
    await AsyncStorage.removeItem('refreshToken');
    await AsyncStorage.removeItem('current_account');
  }
};

export const isAuthenticated = async () => {
  const token = await getAuthToken();
  return !!token;
};


