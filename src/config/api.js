// API Configuration for Mobile App
// Backend deployed to Render: https://cashbook-backend-2.onrender.com

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// 🔧 MOBILE DEVICE FIX
// For web/Expo web: use 127.0.0.1 (works fine)
// For mobile devices (Android/iOS): use computer's local IP address
// Mobile devices can't access 127.0.0.1 - it refers to the device itself

// ⚠️ IMPORTANT: Update this to your computer's local IP address
// Find it with: ipconfig (Windows) or ifconfig (Mac/Linux)
// Look for IPv4 Address under your WiFi/Ethernet adapter (e.g., 192.168.1.100)
// Make sure your phone and computer are on the same WiFi network
const LOCAL_IP = '192.168.29.89'; // ⬅️ Your computer's IP address

const getLocalAPI = () => {
  // For web platform, use localhost
  if (Platform.OS === 'web') {
    return 'http://127.0.0.1:8000/api';
  }
  
  // For mobile devices, use local IP address
  return `http://${LOCAL_IP}:8000/api`;
};

const PROD_API = 'https://cashbook-backend-2.onrender.com/api';

export const API_BASE_URL = __DEV__ ? getLocalAPI() : PROD_API;

console.log('🌐 API Base URL:', API_BASE_URL);
console.log('📱 Platform:', Platform.OS);
console.log('📱 Mobile App - Using backend:', __DEV__ ? 'LOCAL' : 'PRODUCTION');
if (__DEV__ && Platform.OS !== 'web') {
  console.log('📱 Local IP:', LOCAL_IP, '- Make sure this matches your computer\'s IP!');
}

// ---------------- TOKEN MANAGEMENT ----------------

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
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};
