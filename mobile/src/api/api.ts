import axios from 'axios';
import { getStorageItem, removeStorageItem } from '../utils/storage';
import { Platform } from 'react-native';

const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:5000/api';
  }
  return 'http://192.168.50.147:5000/api';
};

const DEV_API_URL = getBaseUrl();

export const api = axios.create({
  baseURL: DEV_API_URL,
  timeout: 10000,
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
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config.url.includes('/auth/login')) {
      await removeStorageItem('token');
      // Notify AuthContext to update state
      onUnauthorized();
    }
    return Promise.reject(error);
  }
);
