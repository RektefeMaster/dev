import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { Colors } from '../../constants/Colors';
import { createTheme } from '../theme';

export type ThemeMode = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  isDark: boolean;
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
  setThemeMode: (mode: ThemeMode) => void;
  themeColors: any;
  palette: any;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemColorScheme = useSystemColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      // Önce theme mode'u kontrol et
      const savedMode = await AsyncStorage.getItem('theme_mode');
      if (savedMode && (savedMode === 'light' || savedMode === 'dark' || savedMode === 'auto')) {
        setThemeModeState(savedMode as ThemeMode);
      }

      // Eski tema tercihlerini kontrol et (backward compatibility)
      const savedTheme = await AsyncStorage.getItem('app_theme');
      if (savedTheme !== null && !savedMode) {
        // Eğer theme_mode yoksa eski tercihi kullan
        setThemeModeState(savedTheme === 'dark' ? 'dark' : 'light');
        setIsDark(savedTheme === 'dark');
      }
    } catch (error) {
      // Hata durumunda sistem temasını kullan
      if (systemColorScheme) {
        setIsDark(systemColorScheme === 'dark');
      }
      }
  };

  // Theme mode'a göre isDark'ı güncelle
  useEffect(() => {
    if (themeMode === 'auto') {
      if (systemColorScheme) {
        setIsDark(systemColorScheme === 'dark');
      }
    } else {
      setIsDark(themeMode === 'dark');
    }
  }, [themeMode, systemColorScheme]);

  // Auto mode'da sistem tema değişikliklerini dinle
  useEffect(() => {
    if (themeMode === 'auto' && systemColorScheme) {
      setIsDark(systemColorScheme === 'dark');
    }
  }, [systemColorScheme, themeMode]);

  const toggleTheme = async () => {
    const currentMode = themeMode === 'auto' ? (isDark ? 'dark' : 'light') : themeMode;
    const newMode = currentMode === 'dark' ? 'light' : 'dark';
    
    setThemeModeState(newMode);
    setIsDark(newMode === 'dark');
    try {
      await AsyncStorage.setItem('theme_mode', newMode);
      await AsyncStorage.setItem('app_theme', newMode === 'dark' ? 'dark' : 'light');
    } catch (error) {
      // Hata durumunda sessizce devam et
    }
  };

  const setTheme = async (darkMode: boolean) => {
    const newMode = darkMode ? 'dark' : 'light';
    setThemeModeState(newMode);
    setIsDark(darkMode);
    try {
      await AsyncStorage.setItem('theme_mode', newMode);
      await AsyncStorage.setItem('app_theme', darkMode ? 'dark' : 'light');
    } catch (error) {
      // Hata durumunda sessizce devam et
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    
    if (mode === 'auto') {
      if (systemColorScheme) {
        setIsDark(systemColorScheme === 'dark');
      }
    } else {
      setIsDark(mode === 'dark');
      try {
        await AsyncStorage.setItem('theme_mode', mode);
        await AsyncStorage.setItem('app_theme', mode === 'dark' ? 'dark' : 'light');
      } catch (error) {
        // Hata durumunda sessizce devam et
      }
      }
  };

  const theme = createTheme(isDark);
  const themeColors = theme.colors;
  const palette = Colors;

  return (
    <ThemeContext.Provider value={{
      isDark,
      themeMode,
      toggleTheme,
      setTheme,
      setThemeMode,
      themeColors,
      palette,
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
