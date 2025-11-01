import { Dimensions } from 'react-native';
import { Colors } from '@/constants/Colors';

const { width, height } = Dimensions.get('window');

// Rektefe-DV için optimize edilmiş tema sistemi
// Light tema: 29 ile biten renkler, Dark tema: 31 ile biten renkler

export const createTheme = (isDark: boolean = false) => {
  const themeColors = isDark ? Colors.dark : Colors.light;
  
  return {
    colors: {
      // Ana renkler (28 ile biten ortak renkler)
      primary: {
        main: Colors.primary,
        light: '#5AC8FA',
        dark: isDark ? '#0A84FF' : '#0056CC',
        ultraLight: isDark ? '#1C1C1E' : '#F2F2F7',
      },
      secondary: {
        main: Colors.secondary,
        light: '#7B61FF',
        dark: isDark ? '#5856D6' : '#4A4A9A',
        ultraLight: isDark ? '#1C1C1E' : '#F2F2F7',
      },
      accent: {
        main: '#FF9F0A',
        light: '#FFB340',
        dark: isDark ? '#FF9500' : '#E6850E',
        ultraLight: isDark ? '#1C1C1E' : '#FFF5E6',
      },
      
      // Durum renkleri
      success: {
        main: Colors.success,
        light: isDark ? '#1A4D2E' : '#D1FAE5',
        dark: isDark ? '#0F2E1C' : '#047857',
        ultraLight: isDark ? '#1C1C1E' : '#F0FDF4',
        background: isDark ? '#0F2E1C' : '#F0FDF4',
      },
      warning: {
        main: Colors.warning,
        light: isDark ? '#4A2E00' : '#FEF3C7',
        dark: isDark ? '#2A1A00' : '#B45309',
        ultraLight: isDark ? '#1C1C1E' : '#FFFBEB',
        background: isDark ? '#2A1A00' : '#FFFBEB',
      },
      error: {
        main: Colors.error,
        light: isDark ? '#4A1A1A' : '#FEE2E2',
        dark: isDark ? '#2A0F0F' : '#B91C1C',
        ultraLight: isDark ? '#1C1C1E' : '#FEF2F2',
        background: isDark ? '#2A0F0F' : '#FEF2F2',
      },
      info: {
        main: Colors.info,
        light: isDark ? '#1A3A4A' : '#DBEAFE',
        dark: isDark ? '#0F222A' : '#1E40AF',
        ultraLight: isDark ? '#1C1C1E' : '#EFF6FF',
        background: isDark ? '#0F222A' : '#EFF6FF',
      },
      
      // Metin renkleri
      text: {
        primary: themeColors.text.primary,
        secondary: themeColors.text.secondary,
        tertiary: themeColors.text.tertiary,
        quaternary: isDark ? themeColors.text.secondary : '#CDD5DB',
        inverse: themeColors.text.inverse,
        placeholder: isDark ? themeColors.text.tertiary : '#9CA3AF',
        success: Colors.success,
        warning: Colors.warning,
        error: Colors.error,
      },
      
      // Arka plan renkleri
      background: {
        primary: themeColors.background.primary,
        secondary: themeColors.background.secondary,
        tertiary: themeColors.background.tertiary,
        quaternary: isDark ? themeColors.background.surface : '#E2E8F0',
        card: themeColors.background.card,
        modal: themeColors.background.primary,
        overlay: isDark ? 'rgba(3, 8, 12, 0.8)' : 'rgba(0, 0, 0, 0.4)',
      },
      
      // Kenarlık renkleri
      border: {
        primary: themeColors.border.light,
        secondary: themeColors.border.medium,
        tertiary: themeColors.border.dark,
        accent: Colors.primary,
        success: Colors.success,
        warning: Colors.warning,
        error: Colors.error,
      },
      
      // Nötr renkler
      neutral: {
        50: isDark ? themeColors.background.tertiary : '#F8FAFC',
        100: isDark ? themeColors.background.secondary : '#F1F5F9',
        200: isDark ? themeColors.border.light : '#E2E8F0',
        300: isDark ? themeColors.border.medium : '#CBD5E1',
        400: isDark ? themeColors.text.tertiary : '#94A3B8',
        500: isDark ? themeColors.text.secondary : '#64748B',
        600: isDark ? themeColors.text.primary : '#475569',
        700: isDark ? themeColors.background.secondary : '#334155',
        800: isDark ? themeColors.background.primary : '#1E293B',
        900: isDark ? themeColors.shadow : '#0F172A',
        950: isDark ? '#03080C' : '#020617',
      },
      
      // Gradient renkleri
      gradients: {
        primary: isDark ? ['#266691', '#184567'] : ['#4B6382', '#3A4F6B'],
        secondary: isDark ? ['#A68868', '#734A0E'] : ['#A68868', '#8B6B4F'],
        success: ['#34C759', '#28A745'],
        subtle: isDark ? ['#184567', '#0E2235'] : ['#F8FAFC', '#F1F5F9'],
        card: isDark ? ['#184567', '#0E2235'] : ['#FFFFFF', '#F8FAFC'],
        warm: isDark ? ['#734A0E', '#A68868'] : ['#795238', '#AEA7A3'],
      },
      
      // Gölge renkleri
      shadow: {
        primary: isDark ? 'rgba(38, 102, 145, 0.2)' : 'rgba(75, 99, 130, 0.1)',
        secondary: isDark ? 'rgba(166, 136, 104, 0.2)' : 'rgba(166, 136, 104, 0.1)',
        success: 'rgba(52, 199, 89, 0.1)',
        error: 'rgba(255, 59, 48, 0.1)',
        dark: isDark ? 'rgba(3, 8, 12, 0.4)' : 'rgba(0, 0, 0, 0.08)',
      },
      
      // UI elementleri
      tint: themeColors.tint,
      icon: themeColors.icon,
      tabIconDefault: themeColors.tabIconDefault,
      tabIconSelected: themeColors.tabIconSelected,
      divider: themeColors.divider,
      
      // DV özel renkleri
      warm: isDark ? '#FF9F0A' : '#FF9500',
      warmLight: isDark ? '#FFB340' : '#FFB340',
    },

    // iOS tarzında boşluk sistemi
    spacing: {
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
    },

    // iOS tarzında border radius
    borderRadius: {
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
    },

    // iOS tarzında tipografi
    typography: {
      // Font boyutları
      fontSize: {
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
        light: '300' as const,
        normal: '400' as const,
        medium: '500' as const,
        semibold: '600' as const,
        bold: '700' as const,
        heavy: '800' as const,
      },
      
      // Başlıklar
      h1: {
        fontSize: 34,
        fontWeight: '700' as const,
        lineHeight: 41,
        letterSpacing: 0.37,
      },
      h2: {
        fontSize: 28,
        fontWeight: '700' as const,
        lineHeight: 34,
        letterSpacing: 0.36,
      },
      h3: {
        fontSize: 22,
        fontWeight: '600' as const,
        lineHeight: 28,
        letterSpacing: 0.35,
      },
      h4: {
        fontSize: 20,
        fontWeight: '600' as const,
        lineHeight: 25,
        letterSpacing: 0.38,
      },
      
      // Gövde metinleri
      body1: {
        fontSize: 17,
        fontWeight: '400' as const,
        lineHeight: 22,
        letterSpacing: -0.41,
      },
      body2: {
        fontSize: 15,
        fontWeight: '400' as const,
        lineHeight: 20,
        letterSpacing: -0.24,
      },
      body3: {
        fontSize: 13,
        fontWeight: '400' as const,
        lineHeight: 18,
        letterSpacing: -0.08,
      },
      
      // Buton metinleri
      button: {
        large: {
          fontSize: 17,
          fontWeight: '600' as const,
          lineHeight: 22,
          letterSpacing: -0.41,
        },
        medium: {
          fontSize: 15,
          fontWeight: '600' as const,
          lineHeight: 20,
          letterSpacing: -0.24,
        },
        small: {
          fontSize: 13,
          fontWeight: '600' as const,
          lineHeight: 18,
          letterSpacing: -0.08,
        },
      },
      
      // Caption metinleri
      caption: {
        large: {
          fontSize: 12,
          fontWeight: '400' as const,
          lineHeight: 16,
          letterSpacing: 0,
        },
        small: {
          fontSize: 11,
          fontWeight: '400' as const,
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
        fontWeight: '400' as const,
        lineHeight: 18,
        letterSpacing: -0.08,
      },
    },

    // Layout ayarları
    layout: {
      containerPadding: {
        sm: 16,
        md: 20,
        lg: 24,
        full: 0,
      },
      maxContentWidth: 1200,
      screenPadding: 20,
      cardSpacing: 16,
    },

    // Gölgeler
    shadows: {
      // Hafif gölgeler
      small: {
        shadowColor: isDark ? themeColors.shadow : '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.2 : 0.05,
        shadowRadius: 2,
        elevation: 1,
      },
      medium: {
        shadowColor: isDark ? themeColors.shadow : '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.3 : 0.08,
        shadowRadius: 4,
        elevation: 2,
      },
      large: {
        shadowColor: isDark ? themeColors.shadow : '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.4 : 0.12,
        shadowRadius: 8,
        elevation: 4,
      },
      
      // Özel gölgeler
      card: {
        shadowColor: isDark ? themeColors.shadow : '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.25 : 0.05,
        shadowRadius: 4,
        elevation: 2,
      },
      button: {
        shadowColor: isDark ? themeColors.shadow : '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.3 : 0.08,
        shadowRadius: 2,
        elevation: 1,
      },
      modal: {
        shadowColor: isDark ? themeColors.shadow : '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDark ? 0.5 : 0.15,
        shadowRadius: 16,
        elevation: 8,
      },
      
      // Renkli gölgeler
      primary: {
        shadowColor: isDark ? '#266691' : Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.3 : 0.15,
        shadowRadius: 4,
        elevation: 2,
      },
      success: {
        shadowColor: Colors.success,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
      },
    },

    // Ekran boyutları
    dimensions: {
      width,
      height,
      screenPadding: 20,
      cardSpacing: 16,
      buttonHeight: 48,
      inputHeight: 48,
      headerHeight: 88,
      tabBarHeight: 83,
    },

    // Animasyon değerleri
    animations: {
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
    },

    // Z-index değerleri
    zIndex: {
      base: 1,
      card: 10,
      button: 20,
      modal: 100,
      overlay: 200,
      tooltip: 300,
      toast: 400,
    },
  };
};

// Varsayılan light tema
const theme = createTheme(false);

// Named exports
export const colors = theme.colors;
export const typography = theme.typography;
export const spacing = theme.spacing;
export const borderRadius = theme.borderRadius;
export const shadows = theme.shadows;
export const dimensions = theme.dimensions;

export default theme;