import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../theme/theme';

type Theme = {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    background: string;
    surface: string;
    card: string;
    text: string;
    textSecondary: string;
    textTertiary: string;
    border: string;
    divider: string;
    overlay: string;
    shadow: string;
    tabBar: string;
    tabBarActive: string;
    tabBarInactive: string;
    statusBar: string;
    statusBarText: 'light-content' | 'dark-content';
  };
  isDark: boolean;
};

const lightTheme: Theme = {
  colors: {
    primary: theme.colors.primary.main,
    secondary: theme.colors.secondary.main,
    success: theme.colors.success.main,
    warning: theme.colors.warning.main,
    error: theme.colors.error.main,
    info: theme.colors.primary.light,
    background: theme.colors.background.default.light,
    surface: theme.colors.background.surface.light,
    card: theme.colors.background.card.light,
    text: theme.colors.text.primary.light,
    textSecondary: theme.colors.text.secondary.light,
    textTertiary: theme.colors.text.tertiary.light,
    border: theme.colors.border.light,
    divider: theme.colors.divider.light,
    overlay: theme.colors.background.overlay.light,
    shadow: theme.colors.neutral[900],
    tabBar: theme.colors.background.paper.light,
    tabBarActive: theme.colors.primary.main,
    tabBarInactive: theme.colors.text.tertiary.light,
    statusBar: theme.colors.background.default.light,
    statusBarText: 'dark-content',
  },
  isDark: false,
};

const darkTheme: Theme = {
  colors: {
    primary: theme.colors.primary.main,
    secondary: theme.colors.secondary.main,
    success: theme.colors.success.main,
    warning: theme.colors.warning.main,
    error: theme.colors.error.main,
    info: theme.colors.primary.light,
    background: theme.colors.background.default.dark,
    surface: theme.colors.background.surface.dark,
    card: theme.colors.background.card.dark,
    text: theme.colors.text.primary.dark,
    textSecondary: theme.colors.text.secondary.dark,
    textTertiary: theme.colors.text.tertiary.dark,
    border: theme.colors.border.dark,
    divider: theme.colors.divider.dark,
    overlay: theme.colors.background.overlay.dark,
    shadow: theme.colors.neutral[900],
    tabBar: theme.colors.background.paper.dark,
    tabBarActive: theme.colors.primary.main,
    tabBarInactive: theme.colors.text.tertiary.dark,
    statusBar: theme.colors.background.default.dark,
    statusBarText: 'light-content',
  },
  isDark: true,
};

type ThemeContextType = {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: lightTheme,
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
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
        // Sistem temasını otomatik algıla
        const systemTheme = await AsyncStorage.getItem('system_theme');
        if (systemTheme === 'auto') {
          // Burada sistem temasını algılayabilirsiniz
          // Şimdilik light tema olarak başlatıyoruz
          setIsDark(false);
        }
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

  const theme = isDark ? darkTheme : lightTheme;

  if (isLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext); 