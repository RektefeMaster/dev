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
  
  // Info renkleri (bilgi kutuları için)
  info: {
    light: '#E3F2FD',   // Açık mavi - bilgi kutusu arka planı
    main: '#2196F3',    // Orta mavi - bilgi kutusu kenarlığı
    dark: '#1976D2',    // Koyu mavi - bilgi kutusu metni
  },
  
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
  // WCAG 2.1 kontrast standartlarına uygun, göz yorgunluğunu azaltan renkler
  dark: {
    text: {
      primary: '#E0E0E0',    // Ana metin - açık gri (saf beyaz yerine), göz yorgunluğunu azaltır
      secondary: '#B0B0B0',  // İkincil metin - orta-açık gri
      tertiary: '#888888',   // Üçüncül metin - orta gri
      quaternary: '#666666', // Dördüncül metin - koyu gri
      inverse: '#11181C',    // Ters metin - koyu arka plan üzerinde
    },
    background: {
      primary: '#121212',    // Ana arka plan - koyu gri (saf siyah yerine), WCAG uyumlu
      secondary: '#1E1E1E',  // İkincil arka plan - biraz daha açık koyu gri
      tertiary: '#2C2C2C',   // Üçüncül arka plan - orta koyu gri
      card: '#1E1E1E',       // Kart arka planı - koyu gri
      surface: '#2C2C2C',    // Yüzey rengi - orta koyu gri
    },
    border: {
      light: '#2C2C2C',      // Açık kenarlık - orta koyu gri
      medium: '#3A3A3A',     // Orta kenarlık - orta gri
      dark: '#888888',       // Koyu kenarlık - açık gri
    },
    tint: '#4B6382',         // Vurgu rengi - orta mavi (doygunluk azaltılmış)
    icon: '#B0B0B0',         // İkon rengi - açık gri
    tabIconDefault: '#888888', // Varsayılan tab ikonu - orta gri
    tabIconSelected: '#4B6382', // Seçili tab ikonu - orta mavi
    cardBorder: '#2C2C2C',   // Kart kenarlığı - orta koyu gri
    shadow: '#000000',       // Gölge rengi - siyah (gölge için)
    divider: '#2C2C2C',      // Ayırıcı çizgi - orta koyu gri
    accent: '#734A0E',       // Vurgu rengi - altın kahverengi (doygunluk azaltılmış)
  },
  
  // Özel renkler
  special: {
    primaryGradient: ['#4B6382', '#266691'], // Mavi gradyan
    secondaryGradient: ['#A68868', '#734A0E'], // Kahverengi gradyan
    overlay: 'rgba(7, 23, 57, 0.8)', // Çok koyu lacivert overlay
    glass: 'rgba(164, 181, 196, 0.1)', // Cam efekti
  }
};
