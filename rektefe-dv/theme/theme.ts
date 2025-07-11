import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const theme = {
  colors: {
    primary: {
      main: '#007AFF',
      light: '#4DA3FF',
      dark: '#0055B3',
      contrast: '#FFFFFF',
    },
    secondary: {
      main: '#5AC8FA',
      light: '#8ED9FB',
      dark: '#2B9CDB',
      contrast: '#FFFFFF',
    },
    success: {
      main: '#34C759',
      light: '#6CDB8A',
      dark: '#2A9D47',
      contrast: '#FFFFFF',
    },
    warning: {
      main: '#FF9500',
      light: '#FFB340',
      dark: '#CC7700',
      contrast: '#FFFFFF',
    },
    error: {
      main: '#FF3B30',
      light: '#FF6B63',
      dark: '#CC2F26',
      contrast: '#FFFFFF',
    },
    text: {
      primary: {
        light: '#000000',
        dark: '#FFFFFF',
      },
      secondary: {
        light: '#666666',
        dark: '#B0B3C6',
      },
      disabled: {
        light: '#999999',
        dark: '#666666',
      },
    },
    background: {
      default: {
        light: '#FFFFFF',
        dark: '#000000',
      },
      paper: {
        light: '#F5F7FA',
        dark: '#1A1A1A',
      },
      elevated: {
        light: '#FFFFFF',
        dark: '#2C2C2C',
      },
    },
    border: {
      light: '#E1E4E8',
      dark: '#333333',
    },
    divider: {
      light: 'rgba(0, 0, 0, 0.12)',
      dark: 'rgba(255, 255, 255, 0.12)',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
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
    },
    fontWeights: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },
    lineHeights: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
    letterSpacing: {
      tight: -0.5,
      normal: 0,
      wide: 0.5,
    },
  },
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 8,
    },
  },
  borderRadius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    round: 9999,
  },
  layout: {
    screenWidth: 375,
    maxContentWidth: 1200,
    headerHeight: 56,
    tabBarHeight: 56,
  },
  animation: {
    duration: {
      fast: 200,
      normal: 300,
      slow: 500,
    },
    easing: {
      easeInOut: 'ease-in-out',
      easeOut: 'ease-out',
      easeIn: 'ease-in',
    },
  },
  zIndex: {
    base: 0,
    drawer: 100,
    modal: 200,
    tooltip: 300,
  },
} as const; 