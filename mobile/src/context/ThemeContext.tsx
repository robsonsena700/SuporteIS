import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { theme, ThemeType, ThemeMode } from '../constants/theme';
import { getStorageItem, setStorageItem } from '../utils/storage';

interface ThemeContextData {
  theme: typeof theme.dark;
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextData>({} as ThemeContextData);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('light');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    const savedMode = await getStorageItem('@theme_mode');
    if (savedMode === 'dark' || savedMode === 'light') {
      setModeState(savedMode);
    } else if (systemScheme === 'dark') {
      setModeState('dark');
    }
  };

  const setMode = async (newMode: ThemeMode) => {
    setModeState(newMode);
    await setStorageItem('@theme_mode', newMode);
  };

  const currentThemeType: ThemeType = mode;

  const currentTheme = theme[currentThemeType];

  return (
    <ThemeContext.Provider 
      value={{ 
        theme: currentTheme, 
        mode, 
        isDark: currentThemeType === 'dark',
        setMode 
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
