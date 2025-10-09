import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { Colors } from '@/constants/Colors';
import { createTheme } from '@/theme/theme';

const STORAGE_KEYS = ['theme_preference', 'app_theme'] as const;

type ThemeShape = ReturnType<typeof createTheme>;
type ThemeColors = ThemeShape['colors'];

export type ThemeContextType = {
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
  theme: ThemeShape;
  themeColors: ThemeColors;
  colors: ThemeColors;
  palette: typeof Colors;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemColorScheme = useSystemColorScheme();
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');
  const [hasStoredPreference, setHasStoredPreference] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadThemePreference = async () => {
      try {
        for (const key of STORAGE_KEYS) {
          const savedTheme = await AsyncStorage.getItem(key);
          if (savedTheme === 'dark' || savedTheme === 'light') {
            if (isMounted) {
              setIsDark(savedTheme === 'dark');
              setHasStoredPreference(true);
            }
            return;
          }
        }

        if (systemColorScheme && isMounted) {
          setIsDark(systemColorScheme === 'dark');
        }
      } catch (error) {
        if (systemColorScheme && isMounted) {
          setIsDark(systemColorScheme === 'dark');
        }
      }
    };

    loadThemePreference();

    return () => {
      isMounted = false;
    };
  }, [systemColorScheme]);

  useEffect(() => {
    if (!hasStoredPreference && systemColorScheme) {
      setIsDark(systemColorScheme === 'dark');
    }
  }, [systemColorScheme, hasStoredPreference]);

  const persistThemePreference = useCallback((darkMode: boolean) => {
    const value = darkMode ? 'dark' : 'light';

    for (const key of STORAGE_KEYS) {
      AsyncStorage.setItem(key, value).catch((): void => {});
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setHasStoredPreference(true);
    setIsDark(prev => {
      const next = !prev;
      persistThemePreference(next);
      return next;
    });
  }, [persistThemePreference]);

  const setTheme = useCallback(
    (darkMode: boolean) => {
      setHasStoredPreference(true);
      setIsDark(darkMode);
      persistThemePreference(darkMode);
    },
    [persistThemePreference]
  );

  const theme = useMemo(() => createTheme(isDark), [isDark]);
  const themeColors = theme.colors;

  const contextValue = useMemo(
    () => ({
      isDark,
      toggleTheme,
      setTheme,
      theme,
      themeColors,
      colors: themeColors,
      palette: Colors,
    }),
    [isDark, toggleTheme, setTheme, theme, themeColors]
  );

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
