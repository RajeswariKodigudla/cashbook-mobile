// API Configuration for Mobile App
// Backend deployed to PythonAnywhere: https://rajeswari.pythonanywhere.com

import AsyncStorage from '@react-native-async-storage/async-storage';

// API Base URL - Always use production for mobile app
// For local testing, you can temporarily change this to your computer's IP
// Example: 'http://192.168.1.100:8000/api' (find IP with: ipconfig on Windows)
export const API_BASE_URL = 'https://rajeswari.pythonanywhere.com/api';

console.log('🌐 API Base URL:', API_BASE_URL);
console.log('📱 Mobile App - Using production backend');

// Token management using AsyncStorage (replaces localStorage)
export const getAuthToken = async () => {
  try {
    return await AsyncStorage.getItem('authToken');
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

export const setAuthToken = async (token) => {
  try {
    await AsyncStorage.setItem('authToken', token);
  } catch (error) {
    console.error('Error setting auth token:', error);
  }
};

export const removeAuthToken = async () => {
  try {
    await AsyncStorage.removeItem('authToken');
  } catch (error) {
    console.error('Error removing auth token:', error);
  }
};

export const getAuthHeaders = async () => {
  const token = await getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

