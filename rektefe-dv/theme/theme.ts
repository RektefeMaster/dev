import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const theme = {
  colors: {
    // Modern, göz yormayan renk paleti
    primary: {
      main: '#0A84FF', // iOS Blue - daha yumuşak
      light: '#5AC8FA', // Açık mavi
      dark: '#0051D5', // Koyu mavi
      contrast: '#FFFFFF',
      surface: 'rgba(10, 132, 255, 0.1)', // Yarı şeffaf yüzey
    },
    secondary: {
      main: '#5AC8FA', // Açık mavi
      light: '#8ED9FB', // Çok açık mavi
      dark: '#2B9CDB', // Koyu mavi
      contrast: '#FFFFFF',
      surface: 'rgba(90, 200, 250, 0.1)',
    },
    success: {
      main: '#30D158', // iOS Green - daha yumuşak
      light: '#6CDB8A', // Açık yeşil
      dark: '#1E8A3D', // Koyu yeşil
      contrast: '#FFFFFF',
      surface: 'rgba(48, 209, 88, 0.1)',
    },
    warning: {
      main: '#FF9F0A', // iOS Orange - daha yumuşak
      light: '#FFB340', // Açık turuncu
      dark: '#CC7A00', // Koyu turuncu
      contrast: '#FFFFFF',
      surface: 'rgba(255, 159, 10, 0.1)',
    },
    error: {
      main: '#FF453A', // iOS Red - daha yumuşak
      light: '#FF6B63', // Açık kırmızı
      dark: '#CC2F26', // Koyu kırmızı
      contrast: '#FFFFFF',
      surface: 'rgba(255, 69, 58, 0.1)',
    },
    neutral: {
      50: '#F8F9FA',
      100: '#F1F3F4',
      200: '#E8EAED',
      300: '#DADCE0',
      400: '#BDC1C6',
      500: '#9AA0A6',
      600: '#80868B',
      700: '#5F6368',
      800: '#3C4043',
      900: '#202124',
    },
    text: {
      primary: {
        light: '#202124',
        dark: '#FFFFFF',
      },
      secondary: {
        light: '#5F6368',
        dark: '#B0B3C6',
      },
      disabled: {
        light: '#9AA0A6',
        dark: '#5F6368',
      },
      inverse: {
        light: '#FFFFFF',
        dark: '#202124',
      },
    },
    background: {
      default: {
        light: '#FFFFFF',
        dark: '#000000',
      },
      paper: {
        light: '#F8F9FA',
        dark: '#1A1A1A',
      },
      elevated: {
        light: '#FFFFFF',
        dark: '#2C2C2C',
      },
      surface: {
        light: '#F1F3F4',
        dark: '#1C1C1E',
      },
      overlay: {
        light: 'rgba(0, 0, 0, 0.5)',
        dark: 'rgba(0, 0, 0, 0.7)',
      },
    },
    border: {
      light: '#E8EAED',
      dark: '#3C4043',
      focus: {
        light: '#0A84FF',
        dark: '#5AC8FA',
      },
    },
    divider: {
      light: 'rgba(0, 0, 0, 0.08)',
      dark: 'rgba(255, 255, 255, 0.12)',
    },
  },
  spacing: {
    // 8px grid system - daha tutarlı spacing
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
    // Component-specific spacing
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
    // Modern font scale
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
    // Modern, yumuşak gölgeler
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
    // Özel gölgeler
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
    // Modern border radius sistemi
    none: 0,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    round: 9999,
    // Component-specific
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
    // Modern breakpoints
    breakpoints: {
      sm: 375,
      md: 768,
      lg: 1024,
      xl: 1200,
    },
    // Container padding
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
      // Modern easing functions
      smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      elastic: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    },
    // Micro-interactions
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
  // Accessibility
  accessibility: {
    minTouchTarget: 44,
    minTextSize: 16,
    contrastRatio: 4.5,
    focusRing: {
      width: 2,
      color: '#0A84FF',
    },
  },
  // Component-specific themes
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
      return theme.colors.primary.main; // fallback
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