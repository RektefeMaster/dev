import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/theme';

type ThemeContextType = {
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
  colors: typeof colors;
  theme: {
    colors: typeof colors;
    isDark: boolean;
  };
};

const ThemeContext = createContext<ThemeContextType>({
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
  colors: colors,
  theme: {
    colors,
    isDark: false,
  }
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme_preference');
      if (savedTheme !== null) {
        setIsDark(savedTheme === 'dark');
      } else {
        setIsDark(false);
      }
    } catch (error) {
      console.error('Tema tercihi yüklenirken hata:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDark;
      setIsDark(newTheme);
      await AsyncStorage.setItem('theme_preference', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Tema tercihi kaydedilirken hata:', error);
    }
  };

  const setTheme = async (darkMode: boolean) => {
    try {
      setIsDark(darkMode);
      await AsyncStorage.setItem('theme_preference', darkMode ? 'dark' : 'light');
    } catch (error) {
      console.error('Tema tercihi kaydedilirken hata:', error);
    }
  };

  if (isLoading) {
    return (
      <ThemeContext.Provider value={{ 
        isDark: false, 
        toggleTheme: () => {}, 
        setTheme: () => {}, 
        colors,
        theme: {
          colors,
          isDark: false,
        }
      }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ 
      isDark, 
      toggleTheme, 
      setTheme, 
      colors,
      theme: {
        colors,
        isDark,
      }
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext); 