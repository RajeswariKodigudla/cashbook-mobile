// Auth Service for Mobile App - Same as Web App
import { authAPI } from './api';
import { setAuthToken, removeAuthToken, getAuthToken } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Get current user info
export const getCurrentUser = async () => {
  try {
    const userResponse = await authAPI.getCurrentUser();
    return { user: userResponse.user || { username: 'User' } };
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('User endpoint not available, using default user');
      return { user: { username: 'User' } };
    }
    console.error('Error getting current user:', error);
    throw error;
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
    
    if (response.access) {
      await setAuthToken(response.access);
      if (response.refresh) {
        await AsyncStorage.setItem('refreshToken', response.refresh);
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
        token: response.access,
        refreshToken: response.refresh 
      };
    }
    
    console.error('❌ No access token in response:', response);
    return { success: false, message: 'Invalid response from server. No access token received.' };
  } catch (error) {
    console.error('❌ Login error:', error);
    
    let errorMessage = 'Login failed';
    if (error.message) {
      errorMessage = error.message;
    } else if (error.response?.data) {
      if (error.response.data.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response.data.message) {
        errorMessage = error.response.data.message;
      }
    }
    
    return { success: false, message: errorMessage };
  }
};

export const register = async (username, email, password, password_confirm, first_name = '', last_name = '') => {
  try {
    const response = await authAPI.register({
      username,
      email,
      password,
      password_confirm: password_confirm || password,
      first_name,
      last_name,
    });
    
    if (response.message && response.username) {
      return { 
        success: true, 
        message: response.message, 
        username: response.username 
      };
    }
    return { success: false, message: 'Invalid response from server' };
  } catch (error) {
    let errorMessage = 'Registration failed';
    if (error.message) {
      errorMessage = error.message;
    } else if (error.response?.data) {
      if (error.response.data.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response.data.message) {
        errorMessage = error.response.data.message;
      }
    }
    return { success: false, message: errorMessage };
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


