import axios from 'axios';
import { getStorageItem, removeStorageItem } from '../utils/storage';
import { Platform } from 'react-native';

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (Platform.OS === 'web') {
    return 'http://localhost:5000/api';
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }

  return 'http://localhost:5000/api';
};

export const API_URL = getBaseUrl();

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, // Increased timeout for mobile networks
});

let onUnauthorized: () => void = () => {};

export const setUnauthorizedCallback = (callback: () => void) => {
  onUnauthorized = callback;
};

api.interceptors.request.use(async (config) => {
  const token = await getStorageItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Log request for debugging
  console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest.url.includes('/auth/login')) {
      await removeStorageItem('token');
      onUnauthorized();
      return Promise.reject(error);
    }

    // Retry Logic for Network Errors or 5xx Server Errors
    if (!error.response || (error.response.status >= 500 && error.response.status < 600)) {
      if (!originalRequest._retryCount) {
        originalRequest._retryCount = 0;
      }

      const MAX_RETRIES = 3;
      if (originalRequest._retryCount < MAX_RETRIES) {
        originalRequest._retryCount += 1;
        const delay = 1000 * Math.pow(2, originalRequest._retryCount - 1); // Exponential backoff: 1s, 2s, 4s

        console.log(`[API Retry] Attempt ${originalRequest._retryCount} for ${originalRequest.url} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);
