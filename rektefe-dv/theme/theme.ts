import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const theme = {
  colors: {
    // Modern, göz yormayan renk paleti
    primary: {
      main: '#6366F1', // Modern Indigo
      light: '#A5B4FC',
      dark: '#4338CA',
      contrast: '#FFFFFF',
      surface: 'rgba(99, 102, 241, 0.08)',
      gradient: ['#6366F1', '#8B5CF6'],
    },
    secondary: {
      main: '#10B981', // Emerald Green
      light: '#6EE7B7',
      dark: '#059669',
      contrast: '#FFFFFF',
      surface: 'rgba(16, 185, 129, 0.08)',
      gradient: ['#10B981', '#34D399'],
    },
    accent: {
      main: '#F59E0B', // Amber
      light: '#FCD34D',
      dark: '#D97706',
      contrast: '#FFFFFF',
      surface: 'rgba(245, 158, 11, 0.08)',
    },
    success: {
      main: '#10B981',
      light: '#6EE7B7',
      dark: '#059669',
      contrast: '#FFFFFF',
      surface: 'rgba(16, 185, 129, 0.08)',
    },
    warning: {
      main: '#F59E0B',
      light: '#FCD34D',
      dark: '#D97706',
      contrast: '#FFFFFF',
      surface: 'rgba(245, 158, 11, 0.08)',
    },
    error: {
      main: '#EF4444',
      light: '#FCA5A5',
      dark: '#DC2626',
      contrast: '#FFFFFF',
      surface: 'rgba(239, 68, 68, 0.08)',
    },
    neutral: {
      50: '#FAFAFA',
      100: '#F5F5F5',
      200: '#E5E5E5',
      300: '#D4D4D4',
      400: '#A3A3A3',
      500: '#737373',
      600: '#525252',
      700: '#404040',
      800: '#262626',
      900: '#171717',
    },
    text: {
      primary: {
        light: '#171717',
        dark: '#FFFFFF',
      },
      secondary: {
        light: '#525252',
        dark: '#A3A3A3',
      },
      tertiary: {
        light: '#737373',
        dark: '#737373',
      },
      disabled: {
        light: '#A3A3A3',
        dark: '#525252',
      },
      inverse: {
        light: '#FFFFFF',
        dark: '#171717',
      },
      link: {
        light: '#6366F1',
        dark: '#A5B4FC',
      },
    },
    background: {
      default: {
        light: '#FAFAFA',
        dark: '#0A0A0A',
      },
      paper: {
        light: '#FFFFFF',
        dark: '#171717',
      },
      elevated: {
        light: '#FFFFFF',
        dark: '#262626',
      },
      surface: {
        light: '#F5F5F5',
        dark: '#1F1F1F',
      },
      card: {
        light: '#FFFFFF',
        dark: '#1A1A1A',
      },
      overlay: {
        light: 'rgba(0, 0, 0, 0.4)',
        dark: 'rgba(0, 0, 0, 0.6)',
      },
      gradient: {
        primary: ['#6366F1', '#8B5CF6'],
        secondary: ['#10B981', '#34D399'],
        accent: ['#F59E0B', '#FCD34D'],
      },
    },
    border: {
      light: '#E5E5E5',
      dark: '#404040',
      focus: {
        light: '#6366F1',
        dark: '#A5B4FC',
      },
      subtle: {
        light: '#F0F0F0',
        dark: '#2A2A2A',
      },
      strong: {
        light: '#D4D4D4',
        dark: '#525252',
      },
    },
    divider: {
      light: 'rgba(0, 0, 0, 0.06)',
      dark: 'rgba(255, 255, 255, 0.08)',
      subtle: {
        light: 'rgba(0, 0, 0, 0.04)',
        dark: 'rgba(255, 255, 255, 0.06)',
      },
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
    screen: 20,
    card: 16,
    button: 12,
    input: 16,
    section: 32,
  },
  typography: {
    fontSizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 24,
      xxxl: 32,
      display: 40,
      hero: 48,
    },
    fontWeights: {
      thin: '100' as const,
      light: '300' as const,
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
      heavy: '800' as const,
      black: '900' as const,
    },
    lineHeights: {
      tight: 1.2,
      normal: 1.4,
      relaxed: 1.6,
      loose: 1.8,
    },
    letterSpacing: {
      tight: -0.5,
      normal: 0,
      wide: 0.5,
      wider: 1,
    },
    scale: {
      xs: { fontSize: 12, lineHeight: 16 },
      sm: { fontSize: 14, lineHeight: 20 },
      md: { fontSize: 16, lineHeight: 24 },
      lg: { fontSize: 18, lineHeight: 26 },
      xl: { fontSize: 20, lineHeight: 28 },
      xxl: { fontSize: 24, lineHeight: 32 },
      xxxl: { fontSize: 32, lineHeight: 40 },
    },
  },
  shadows: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    xs: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    sm: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    md: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
    lg: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 16,
      elevation: 8,
    },
    xl: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.2,
      shadowRadius: 24,
      elevation: 12,
    },
    glow: {
      shadowColor: '#0A84FF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    inner: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 0,
    },
  },
  borderRadius: {
    none: 0,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    round: 9999,
    button: 12,
    card: 16,
    input: 12,
    modal: 20,
    avatar: 9999,
  },
  layout: {
    screenWidth: width,
    screenHeight: height,
    maxContentWidth: 1200,
    headerHeight: 56,
    tabBarHeight: 56,
    breakpoints: {
      sm: 375,
      md: 768,
      lg: 1024,
      xl: 1200,
    },
    containerPadding: {
      sm: 16,
      md: 24,
      lg: 32,
    },
  },
  animation: {
    duration: {
      instant: 100,
      fast: 200,
      normal: 300,
      slow: 500,
      slower: 700,
    },
    easing: {
      easeInOut: 'ease-in-out',
      easeOut: 'ease-out',
      easeIn: 'ease-in',
      smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    },
    micro: {
      press: 100,
      hover: 200,
      focus: 150,
      transition: 200,
    },
  },
  zIndex: {
    base: 0,
    card: 10,
    dropdown: 100,
    sticky: 200,
    drawer: 300,
    modal: 400,
    tooltip: 500,
    toast: 600,
    overlay: 700,
  },
  accessibility: {
    minTouchTarget: 44,
    minTextSize: 16,
    contrastRatio: 4.5,
    focusRing: {
      width: 2,
      color: '#0A84FF',
    },
  },
  components: {
    button: {
      height: {
        sm: 36,
        md: 44,
        lg: 52,
      },
      padding: {
        sm: { horizontal: 16, vertical: 8 },
        md: { horizontal: 20, vertical: 12 },
        lg: { horizontal: 24, vertical: 16 },
      },
    },
    card: {
      padding: 16,
      margin: 8,
      elevation: 2,
    },
    input: {
      height: 48,
      padding: 16,
      fontSize: 16,
    },
  },
} as const;

// Utility functions
export const getColor = (colorPath: string, isDark: boolean = false) => {
  const path = colorPath.split('.');
  let current: any = theme.colors;
  
  for (const key of path) {
    if (current[key]) {
      current = current[key];
    } else {
      return theme.colors.primary.main;
    }
  }
  
  if (typeof current === 'object' && current.light && current.dark) {
    return isDark ? current.dark : current.light;
  }
  
  return current;
};

export const getSpacing = (size: keyof typeof theme.spacing) => {
  return theme.spacing[size];
};

export const getShadow = (size: keyof typeof theme.shadows) => {
  return theme.shadows[size];
};

export const getBorderRadius = (size: keyof typeof theme.borderRadius) => {
  return theme.borderRadius[size];
};

export default theme; 