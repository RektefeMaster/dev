import { Dimensions } from 'react-native';
import { Colors } from '../constants/Colors';

const { width, height } = Dimensions.get('window');

// iOS tarzı minimal renk paleti - araç tamir ustaları için optimize edilmiş
export const colors = {
  // Ana renkler - iOS tarzı minimal ve profesyonel
  primary: {
    main: Colors.primary, // iOS mavi
    light: '#5AC8FA',
    dark: '#0A84FF',
    ultraLight: '#F2F2F7',
  },
  secondary: {
    main: Colors.secondary, // iOS mor
    light: '#7B61FF',
    dark: '#5856D6',
    ultraLight: '#F2F2F7',
  },
  accent: {
    main: '#FF9F0A', // iOS turuncu
    light: '#FFB340',
    dark: '#FF9500',
    ultraLight: '#FFF5E6',
  },
  
  // Durum renkleri - sakin
  success: {
    main: '#34C759',
    light: '#D1FAE5',
    dark: '#047857',
    background: '#F0FDF4',
  },
  warning: {
    main: '#FF9500',
    light: '#FEF3C7',
    dark: '#B45309',
    background: '#FFFBEB',
  },
  error: {
    main: '#FF3B30',
    light: '#FEE2E2',
    dark: '#B91C1C',
    background: '#FEF2F2',
  },
  info: {
    main: '#4B6382',
    light: '#A4B5C4',
    dark: '#071739',
    background: '#CDD5DB',
  },
  
  // Metin renkleri - yüksek kontrast ama sakin (string olarak tutulur)
  text: {
    primary: Colors.text.primary,
    secondary: Colors.text.secondary,
    tertiary: Colors.text.tertiary,
    quaternary: Colors.background.secondary,
    inverse: Colors.text.inverse,
    success: Colors.success,
    warning: Colors.warning,
    error: Colors.error,
  },
  
  // Arka plan renkleri - sakin ve gözde yormaz
  background: {
    primary: Colors.background.primary, // Ana arka plan - çok açık mavi-gri, gözü yormaz
    secondary: Colors.background.secondary, // Kart arka planları
    tertiary: Colors.background.tertiary, // Alt kartlar
    quaternary: Colors.primary, // Vurgu alanları
    card: Colors.background.secondary,
    modal: '#FFFFFF',
    overlay: Colors.special.overlay,
  },
  
  // Kenarlık renkleri - sakin
  border: {
    primary: Colors.border.medium,
    secondary: Colors.border.light,
    tertiary: Colors.border.dark,
    accent: Colors.primary,
    success: Colors.success,
    warning: Colors.warning,
    error: Colors.error,
  },
  
  // Nötr renkler - sakin
  neutral: {
    50: '#FFFFFF',
    100: Colors.background.secondary,
    200: Colors.background.tertiary,
    300: Colors.primary,
    400: Colors.text.primary,
    500: Colors.primary,
    600: Colors.text.primary,
    700: '#0E2235',
    800: Colors.text.primary,
    900: '#03080C',
    950: '#000000',
  },
  
  // Gradient renkleri - sakin
  gradients: {
    primary: Colors.special.primaryGradient,
    secondary: Colors.special.secondaryGradient,
    success: ['#34C759', '#28A745'],
    subtle: [Colors.background.secondary, Colors.background.tertiary],
    card: ['#FFFFFF', Colors.background.secondary],
  },
  
  // Gölge renkleri - sakin
  shadow: {
    primary: 'rgba(75, 99, 130, 0.1)',
    secondary: 'rgba(166, 136, 104, 0.1)',
    success: 'rgba(52, 199, 89, 0.1)',
    error: 'rgba(255, 59, 48, 0.1)',
    dark: 'rgba(7, 23, 57, 0.08)',
  },
};

// iOS tarzında boşluk sistemi
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  
  // Özel boşluklar
  screenPadding: 20,
  cardPadding: 16,
  buttonPadding: 12,
  iconSpacing: 8,
};

// iOS tarzında border radius
export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  round: 50,
  
  // Özel radius değerleri
  card: 16,
  button: 12,
  input: 12,
  modal: 20,
  avatar: 25,
};

// iOS tarzında tipografi
export const typography = {
  // Font boyutları
  fontSizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 22,
    xxxl: 28,
    h1: 34,
    h2: 28,
    h3: 22,
    h4: 20,
  },
  
  // Font ağırlıkları
  fontWeights: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    heavy: '800',
  },
  
  // Başlıklar
  h1: {
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 41,
    letterSpacing: 0.37,
  },
  h2: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    letterSpacing: 0.36,
  },
  h3: {
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 28,
    letterSpacing: 0.35,
  },
  h4: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 25,
    letterSpacing: 0.38,
  },
  
  // Gövde metinleri
  body1: {
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 22,
    letterSpacing: -0.41,
  },
  body2: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 20,
    letterSpacing: -0.24,
  },
  body3: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    letterSpacing: -0.08,
  },
  
  // Buton metinleri
  button: {
    large: {
      fontSize: 17,
      fontWeight: '600',
      lineHeight: 22,
      letterSpacing: -0.41,
    },
    medium: {
      fontSize: 15,
      fontWeight: '600',
      lineHeight: 20,
      letterSpacing: -0.24,
    },
    small: {
      fontSize: 13,
      fontWeight: '600',
      lineHeight: 18,
      letterSpacing: -0.08,
    },
  },
  
  // Caption metinleri
  caption: {
    large: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 16,
      letterSpacing: 0,
    },
    small: {
      fontSize: 11,
      fontWeight: '400',
      lineHeight: 13,
      letterSpacing: 0.07,
    },
  },
  
  // Özel metin stilleri
  label: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
    letterSpacing: -0.24,
  },
  footnote: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    letterSpacing: -0.08,
  },
};

// Layout ayarları
export const layout = {
  containerPadding: {
    sm: 16,
    md: 20,
    lg: 24,
    full: 0,
  },
  maxContentWidth: 1200,
  screenPadding: 20,
  cardSpacing: 16,
};

// iOS tarzında gölgeler - minimal
export const shadows = {
  // Hafif gölgeler
  small: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  large: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  
  // Özel gölgeler
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  button: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  modal: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  
  // Renkli gölgeler - sakin
  primary: {
    shadowColor: colors.shadow.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  success: {
    shadowColor: colors.shadow.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
};

// Ekran boyutları
export const dimensions = {
  width,
  height,
  screenPadding: 20,
  cardSpacing: 16,
  buttonHeight: 48,
  inputHeight: 48,
  headerHeight: 88,
  tabBarHeight: 83,
};

// Animasyon değerleri
export const animations = {
  duration: {
    fast: 200,
    normal: 300,
    slow: 500,
  },
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

// Z-index değerleri
export const zIndex = {
  base: 1,
  card: 10,
  button: 20,
  modal: 100,
  overlay: 200,
  tooltip: 300,
  toast: 400,
};

const theme = {
  colors,
  spacing,
  borderRadius,
  typography,
  layout,
  shadows,
  dimensions,
  animations,
  zIndex,
};

// Named exports
export const { colors: themeColors, spacing: themeSpacing, borderRadius: themeBorderRadius, typography: themeTypography, shadows: themeShadows, dimensions: themeDimensions } = theme;

export default theme; 
