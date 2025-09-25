import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '@/theme/theme';

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

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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
      console.error('Theme preference load error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = () => {
    setIsDark(prev => {
      const newTheme = !prev;
      AsyncStorage.setItem('theme_preference', newTheme ? 'dark' : 'light').catch(error => {
        console.error('Theme toggle save error:', error);
      });
      return newTheme;
    });
  };

  const setTheme = (darkMode: boolean) => {
    setIsDark(darkMode);
    AsyncStorage.setItem('theme_preference', darkMode ? 'dark' : 'light').catch(error => {
      console.error('Theme set save error:', error);
    });
  };

  const contextValue: ThemeContextType = {
    isDark,
    toggleTheme,
    setTheme,
    colors,
    theme: {
      colors,
      isDark,
    }
  };

  if (isLoading) {
    return (
      <ThemeContext.Provider value={contextValue}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={contextValue}>
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