export const theme = {
  colors: {
    primary: {
      main: '#007AFF',
      light: '#4DA3FF',
      dark: '#0055B3',
      contrast: '#FFFFFF',
    },
    secondary: {
      main: '#5856D6',
      light: '#7A79E0',
      dark: '#3D3C96',
      contrast: '#FFFFFF',
    },
    success: {
      main: '#34C759',
      light: '#5CD679',
      dark: '#248A3D',
      contrast: '#FFFFFF',
    },
    warning: {
      main: '#FFD700',
      light: '#FFE44D',
      dark: '#B39B00',
      contrast: '#000000',
    },
    error: {
      main: '#FF3B30',
      light: '#FF6961',
      dark: '#B32920',
      contrast: '#FFFFFF',
    },
    text: {
      primary: {
        light: '#222222',
        dark: '#FFFFFF',
      },
      secondary: {
        light: '#888888',
        dark: '#CCCCCC',
      },
    },
    background: {
      default: {
        light: '#FFFFFF',
        dark: '#1C1C1E',
      },
      paper: {
        light: '#F5F7FA',
        dark: '#2C2C2E',
      },
    },
    border: {
      light: '#E5E5EA',
      dark: '#38383A',
    },
    divider: {
      light: '#E5E5EA',
      dark: '#38383A',
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
      loose: 1.8,
    },
  },
  shadows: {
    small: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 4,
    },
    large: {
      shadowColor: '#000000',
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