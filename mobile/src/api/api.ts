import axios from 'axios';
import { getStorageItem, removeStorageItem } from '../utils/storage';

import { Platform } from 'react-native';

// Replace with your machine's IP address
// Use 10.0.2.2 for Android Emulator if localhost
// Use your LAN IP (e.g., 192.168.1.X) for physical devices
// Updated to current detected IP

const getBaseUrl = () => {
    if (Platform.OS === 'web') {
        return 'http://localhost:5000/api';
    }
    return 'http://192.168.1.5:5000/api';
};

const DEV_API_URL = getBaseUrl(); 

export const api = axios.create({
  baseURL: DEV_API_URL,
});

api.interceptors.request.use(async (config) => {
  const token = await getStorageItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config.url.includes('/auth/login')) {
      await removeStorageItem('token');
      // Navigation to login should be handled by AuthContext state change
    }
    return Promise.reject(error);
  }
);
