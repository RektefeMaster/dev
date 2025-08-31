/**
 * Rektefe-US uygulaması için optimize edilmiş renk paleti
 * Dark tema: 31 ile biten renkler
 * Light tema: 29 ile biten renkler
 * Ortak: 28 ile biten renkler
 */

// Ana renkler (28 ile biten ortak renkler)
const primary = '#4B6382';      // Orta mavi - güven ve profesyonellik
const secondary = '#A68868';    // Orta kahverengi - sıcaklık ve yakınlık
const accent = '#848A92';       // Orta gri - vurgu ve ayrım
const warm = '#D3DBE0';         // Sıcak gri - yumuşak vurgu
const neutral = '#636970';      // Nötr gri - denge
const success = '#34C759';      // Yeşil - başarı ve onay
const warning = '#FF9500';      // Turuncu - uyarı ve dikkat
const error = '#FF3B30';        // Kırmızı - hata ve uyarı
const info = '#A4B5C4';         // Açık mavi-gri - bilgi ve iletişim

export const Colors = {
  // Ana renkler
  primary,
  secondary,
  accent,
  warm,
  neutral,
  success,
  warning,
  error,
  info,
  
  // Metin renkleri
  text: {
    primary: '#11181C',    // Ana metin - yüksek kontrast
    secondary: '#687076',  // İkincil metin - orta kontrast
    tertiary: '#9BA1A6',  // Üçüncül metin - düşük kontrast
    quaternary: '#C7C7CC', // Dördüncül metin - çok düşük kontrast
    inverse: '#FFFFFF',    // Ters metin - beyaz arka plan üzerinde
  },
  
  // Arka plan renkleri
  background: {
    primary: '#FFFFFF',    // Ana arka plan - temizlik
    secondary: '#F2F2F7', // İkincil arka plan - hafif ayrım
    tertiary: '#E5E5EA',  // Üçüncül arka plan - daha belirgin ayrım
    card: '#F8F9FA',      // Kart arka planı - çok açık gri
  },
  
  // Kenarlık renkleri
  border: {
    light: '#E5E5EA',      // Açık kenarlık - hafif ayrım
    medium: '#C7C7CC',    // Orta kenarlık - belirgin ayrım
    dark: '#8E8E93',      // Koyu kenarlık - güçlü ayrım
  },
  
  // Light tema (29 ile biten renkler - rektefe-us için)
  light: {
    text: {
      primary: '#25282A',    // Ana metin - çok koyu gri, yüksek okunabilirlik
      secondary: '#687076',  // İkincil metin - orta kontrast
      tertiary: '#9BA1A6',   // Üçüncül metin - düşük kontrast
      quaternary: '#C7C7CC', // Dördüncül metin - çok düşük kontrast
      inverse: '#FFFFFF',    // Ters metin - beyaz arka plan üzerinde
    },
    background: {
      primary: '#FFFFFF',    // Ana arka plan - beyaz, temizlik
      secondary: '#F2F2F7',  // İkincil arka plan - hafif ayrım
      tertiary: '#E5E5EA',   // Üçüncül arka plan - daha belirgin ayrım
      card: '#F8F9FA',       // Kart arka planı - çok açık gri
      surface: '#F2F2F7',    // Yüzey rengi - hafif gri
    },
    border: {
      light: '#E5E5EA',      // Açık kenarlık - hafif ayrım
      medium: '#C7C7CC',     // Orta kenarlık - belirgin ayrım
      dark: '#8E8E93',       // Koyu kenarlık - güçlü ayrım
    },
    tint: '#4B6382',         // Vurgu rengi - orta mavi
    icon: '#636970',         // İkon rengi - koyu gri
    tabIconDefault: '#848A92', // Varsayılan tab ikonu - orta gri
    tabIconSelected: '#4B6382', // Seçili tab ikonu - orta mavi
    cardBorder: '#E9ECEF',   // Kart kenarlığı - açık gri
    shadow: '#AFB5BB',       // Gölge rengi - açık gri
    divider: '#D3DBE0',      // Ayırıcı çizgi - çok açık gri
  },
  
  // Dark tema (31 ile biten renkler - her iki app için)
  dark: {
    text: {
      primary: '#FFFFFF',    // Ana metin - beyaz, yüksek kontrast
      secondary: '#A4B5C4',  // İkincil metin - açık mavi-gri
      tertiary: '#848A92',   // Üçüncül metin - orta gri
      quaternary: '#636970', // Dördüncül metin - koyu gri
      inverse: '#11181C',    // Ters metin - koyu arka plan üzerinde
    },
    background: {
      primary: '#0E2235',    // Ana arka plan - çok koyu mavi
      secondary: '#184567',  // İkincil arka plan - koyu mavi
      tertiary: '#24252B',   // Üçüncül arka plan - koyu gri
      card: '#184567',       // Kart arka planı - koyu mavi
      surface: '#24252B',    // Yüzey rengi - koyu gri
    },
    border: {
      light: '#184567',      // Açık kenarlık - koyu mavi
      medium: '#266691',     // Orta kenarlık - orta mavi
      dark: '#A4B5C4',       // Koyu kenarlık - açık mavi-gri
    },
    tint: '#266691',         // Vurgu rengi - orta mavi
    icon: '#A4B5C4',         // İkon rengi - açık mavi-gri
    tabIconDefault: '#848A92', // Varsayılan tab ikonu - orta gri
    tabIconSelected: '#266691', // Seçili tab ikonu - orta mavi
    cardBorder: '#0E2235',   // Kart kenarlığı - çok koyu mavi
    shadow: '#03080C',       // Gölge rengi - neredeyse siyah
    divider: '#184567',      // Ayırıcı çizgi - koyu mavi
    accent: '#734A0E',       // Vurgu rengi - altın kahverengi
  },
  
  // Özel renkler
  special: {
    primaryGradient: ['#4B6382', '#266691'], // Mavi gradyan
    secondaryGradient: ['#A68868', '#734A0E'], // Kahverengi gradyan
    overlay: 'rgba(7, 23, 57, 0.8)', // Çok koyu lacivert overlay
    glass: 'rgba(164, 181, 196, 0.1)', // Cam efekti
  }
};
