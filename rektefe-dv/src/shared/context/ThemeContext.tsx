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

export type ThemeMode = 'light' | 'dark' | 'auto';

export type ThemeContextType = {
  isDark: boolean;
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
  setThemeMode: (mode: ThemeMode) => void;
  theme: ThemeShape;
  themeColors: ThemeColors;
  colors: ThemeColors;
  palette: typeof Colors;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const systemColorScheme = useSystemColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');
  const [isDark, setIsDark] = useState(systemColorScheme === 'dark');
  const [hasStoredPreference, setHasStoredPreference] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadThemePreference = async () => {
      try {
        // Önce theme mode'u kontrol et
        const savedMode = await AsyncStorage.getItem('theme_mode');
        if (savedMode && (savedMode === 'light' || savedMode === 'dark' || savedMode === 'auto')) {
          if (isMounted) {
            setThemeModeState(savedMode as ThemeMode);
            setHasStoredPreference(true);
          }
        }

        // Eski tema tercihlerini kontrol et (backward compatibility)
        for (const key of STORAGE_KEYS) {
          const savedTheme = await AsyncStorage.getItem(key);
          if (savedTheme === 'dark' || savedTheme === 'light') {
            if (isMounted && !savedMode) {
              // Eğer theme_mode yoksa eski tercihi kullan
              setThemeModeState(savedTheme === 'dark' ? 'dark' : 'light');
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

  const persistThemePreference = useCallback((mode: ThemeMode, darkMode?: boolean) => {
    AsyncStorage.setItem('theme_mode', mode).catch((): void => {});

    // Backward compatibility için eski key'leri de güncelle
    if (darkMode !== undefined) {
    const value = darkMode ? 'dark' : 'light';
    for (const key of STORAGE_KEYS) {
      AsyncStorage.setItem(key, value).catch((): void => {});
      }
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setHasStoredPreference(true);
    const currentMode = themeMode === 'auto' ? (isDark ? 'dark' : 'light') : themeMode;
    const newMode = currentMode === 'dark' ? 'light' : 'dark';
    
    setThemeModeState(newMode);
    setIsDark(newMode === 'dark');
    persistThemePreference(newMode, newMode === 'dark');
  }, [themeMode, isDark, persistThemePreference]);

  const setTheme = useCallback(
    (darkMode: boolean) => {
      setHasStoredPreference(true);
      const newMode = darkMode ? 'dark' : 'light';
      setThemeModeState(newMode);
      setIsDark(darkMode);
      persistThemePreference(newMode, darkMode);
    },
    [persistThemePreference]
  );

  const setThemeMode = useCallback(
    (mode: ThemeMode) => {
      setHasStoredPreference(true);
      setThemeModeState(mode);
      
      if (mode === 'auto') {
        if (systemColorScheme) {
          setIsDark(systemColorScheme === 'dark');
        }
      } else {
        setIsDark(mode === 'dark');
        persistThemePreference(mode, mode === 'dark');
      }
    },
    [systemColorScheme, persistThemePreference]
  );

  const theme = useMemo(() => createTheme(isDark), [isDark]);
  const themeColors = theme.colors;

  const contextValue = useMemo(
    () => ({
      isDark,
      themeMode,
      toggleTheme,
      setTheme,
      setThemeMode,
      theme,
      themeColors,
      colors: themeColors,
      palette: Colors,
    }),
    [isDark, themeMode, toggleTheme, setTheme, setThemeMode, theme, themeColors]
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
