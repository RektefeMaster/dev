import { Dimensions } from 'react-native';
import { Colors } from '@/constants/Colors';

const { width, height } = Dimensions.get('window');

// Rektefe-DV için optimize edilmiş tema sistemi
// Light tema: 29 ile biten renkler, Dark tema: 31 ile biten renkler

// Spacing ve borderRadius değerlerini dosyanın başında tanımla (modül yükleme sırasından bağımsız)
const SPACING_VALUES = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
  screenPadding: 20,
  cardPadding: 16,
  buttonPadding: 12,
  iconSpacing: 8,
};

const BORDER_RADIUS_VALUES = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  round: 50,
  card: 16,
  button: 12,
  input: 12,
  modal: 20,
  avatar: 25,
  full: 9999,
};

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
      // Dark temada doygunluk azaltılmış, göz yorgunluğunu önleyen tonlar
      success: {
        main: Colors.success,
        light: isDark ? '#2A4D3E' : '#D1FAE5', // Dark: daha yumuşak yeşil
        dark: isDark ? '#1A3D2E' : '#047857',
        ultraLight: isDark ? '#1E2E24' : '#F0FDF4', // Dark: çok hafif yeşilimsi gri
        background: isDark ? '#1E2E24' : '#F0FDF4',
      },
      warning: {
        main: Colors.warning,
        light: isDark ? '#4A3E2A' : '#FEF3C7', // Dark: daha yumuşak turuncu
        dark: isDark ? '#3A2E1A' : '#B45309',
        ultraLight: isDark ? '#2E2A1E' : '#FFFBEB', // Dark: çok hafif turuncumsu gri
        background: isDark ? '#2E2A1E' : '#FFFBEB',
      },
      error: {
        main: Colors.error,
        light: isDark ? '#4A2E2E' : '#FEE2E2', // Dark: daha yumuşak kırmızı
        dark: isDark ? '#3A1E1E' : '#B91C1C',
        ultraLight: isDark ? '#2E1E1E' : '#FEF2F2', // Dark: çok hafif kırmızımsı gri
        background: isDark ? '#2E1E1E' : '#FEF2F2',
      },
      info: {
        main: Colors.info,
        light: isDark ? '#2A3A4A' : '#DBEAFE', // Dark: daha yumuşak mavi
        dark: isDark ? '#1A2A3A' : '#1E40AF',
        ultraLight: isDark ? '#1E2A2E' : '#EFF6FF', // Dark: çok hafif mavimsi gri
        background: isDark ? '#1E2A2E' : '#EFF6FF',
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
        overlay: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.4)',
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
        900: isDark ? '#000000' : '#0F172A',
        950: isDark ? '#000000' : '#020617',
      },
      
      // Gradient renkleri
      gradients: {
        primary: isDark ? ['#1E1E1E', '#121212'] : ['#4B6382', '#3A4F6B'],
        secondary: isDark ? ['#2C2C2C', '#1E1E1E'] : ['#A68868', '#8B6B4F'],
        success: ['#34C759', '#28A745'],
        subtle: isDark ? ['#1E1E1E', '#121212'] : ['#F8FAFC', '#F1F5F9'],
        card: isDark ? ['#1E1E1E', '#121212'] : ['#FFFFFF', '#F8FAFC'],
        warm: isDark ? ['#2C2C2C', '#1E1E1E'] : ['#795238', '#AEA7A3'],
      },
      
      // Gölge renkleri
      shadow: {
        primary: isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(75, 99, 130, 0.1)',
        secondary: isDark ? 'rgba(0, 0, 0, 0.25)' : 'rgba(166, 136, 104, 0.1)',
        success: 'rgba(52, 199, 89, 0.1)',
        error: 'rgba(255, 59, 48, 0.1)',
        dark: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.08)',
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
      
      // Hizmet türüne göre renk kodları
      service: {
        repair: {
          main: '#3B82F6', // Mavi - Tamir & Bakım
          light: isDark ? '#1E3A8A' : '#DBEAFE',
          dark: isDark ? '#1E40AF' : '#1E40AF',
        },
        towing: {
          main: '#EF4444', // Kırmızı - Çekici
          light: isDark ? '#7F1D1D' : '#FEE2E2',
          dark: isDark ? '#991B1B' : '#DC2626',
        },
        wash: {
          main: '#10B981', // Yeşil - Yıkama
          light: isDark ? '#064E3B' : '#D1FAE5',
          dark: isDark ? '#047857' : '#059669',
        },
        tire: {
          main: '#F59E0B', // Turuncu - Lastik
          light: isDark ? '#78350F' : '#FEF3C7',
          dark: isDark ? '#92400E' : '#D97706',
        },
        bodywork: {
          main: '#8B5CF6', // Mor - Kaporta
          light: isDark ? '#4C1D95' : '#EDE9FE',
          dark: isDark ? '#5B21B6' : '#7C3AED',
        },
        electrical: {
          main: '#F97316', // Turuncu - Elektrik
          light: isDark ? '#7C2D12' : '#FFEDD5',
          dark: isDark ? '#9A3412' : '#EA580C',
        },
      },
    },

    // iOS tarzında boşluk sistemi
    spacing: { ...SPACING_VALUES },

    // iOS tarzında border radius
    borderRadius: { ...BORDER_RADIUS_VALUES },

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
      h5: {
        fontSize: 18,
        fontWeight: '600' as const,
        lineHeight: 23,
        letterSpacing: 0.35,
      },
      
      // Gövde metinleri
      body: {
        fontSize: 15,
        fontWeight: '400' as const,
        lineHeight: 20,
        letterSpacing: -0.24,
      },
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
    // Dark temada daha belirgin shadow'lar, depth hissi için
    shadows: {
      // Hafif gölgeler
      sm: {
        shadowColor: isDark ? '#000000' : '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.3 : 0.05, // Dark: daha belirgin
        shadowRadius: isDark ? 3 : 2,
        elevation: isDark ? 2 : 1,
      },
      small: {
        shadowColor: isDark ? '#000000' : '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: isDark ? 0.3 : 0.05, // Dark: daha belirgin
        shadowRadius: isDark ? 3 : 2,
        elevation: isDark ? 2 : 1,
      },
      medium: {
        shadowColor: isDark ? '#000000' : '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.4 : 0.08, // Dark: daha belirgin
        shadowRadius: isDark ? 6 : 4,
        elevation: isDark ? 4 : 2,
      },
      large: {
        shadowColor: isDark ? '#000000' : '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: isDark ? 0.5 : 0.12, // Dark: daha belirgin
        shadowRadius: isDark ? 12 : 8,
        elevation: isDark ? 8 : 4,
      },
      
      // Özel gölgeler
      card: {
        shadowColor: isDark ? '#000000' : '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.35 : 0.06, // Dark: daha belirgin, depth hissi
        shadowRadius: isDark ? 6 : 4,
        elevation: isDark ? 4 : 2,
      },
      button: {
        shadowColor: isDark ? '#000000' : '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.4 : 0.1, // Dark: daha belirgin
        shadowRadius: isDark ? 4 : 2,
        elevation: isDark ? 3 : 1,
      },
      modal: {
        shadowColor: isDark ? '#000000' : '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: isDark ? 0.6 : 0.15, // Dark: daha belirgin
        shadowRadius: isDark ? 20 : 16,
        elevation: isDark ? 12 : 8,
      },
      
      // Renkli gölgeler (subtle glow efektleri için)
      primary: {
        shadowColor: isDark ? '#4B6382' : Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.4 : 0.15, // Dark: daha belirgin glow
        shadowRadius: isDark ? 6 : 4,
        elevation: isDark ? 4 : 2,
      },
      success: {
        shadowColor: Colors.success,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.3 : 0.15,
        shadowRadius: isDark ? 6 : 4,
        elevation: isDark ? 4 : 2,
      },
      // Subtle glow için extra shadow
      glow: {
        shadowColor: isDark ? '#4B6382' : Colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: isDark ? 0.5 : 0.2,
        shadowRadius: isDark ? 8 : 6,
        elevation: 0,
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

// Spacing ve borderRadius'u defaultTheme oluşturulmadan ÖNCE export et (modül yükleme sırasından bağımsız)
// Spread operator kullanarak yeni obje oluştur (referans sorunlarını önlemek için)
export const spacing = { ...SPACING_VALUES };
export const borderRadius = { ...BORDER_RADIUS_VALUES };

// Varsayılan light tema
const defaultTheme = createTheme(false);

// Named exports - defaultTheme'den al
export const colors = defaultTheme.colors;
export const typography = defaultTheme.typography;
export const shadows = defaultTheme.shadows;
export const dimensions = defaultTheme.dimensions;

// Default export
export default defaultTheme;