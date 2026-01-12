import { Platform } from 'react-native';

export async function setStorageItem(key: string, value: string) {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('Local storage is not available:', e);
    }
  } else {
    const SecureStore = require('expo-secure-store');
    await SecureStore.setItemAsync(key, value);
  }
}

export async function getStorageItem(key: string) {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error('Local storage is not available:', e);
      return null;
    }
  } else {
    const SecureStore = require('expo-secure-store');
    return await SecureStore.getItemAsync(key);
  }
}

export async function removeStorageItem(key: string) {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('Local storage is not available:', e);
    }
  } else {
    const SecureStore = require('expo-secure-store');
    await SecureStore.deleteItemAsync(key);
  }
}
