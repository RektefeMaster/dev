/**
 * Rektefe-US uygulaması için iOS tarzı minimal renk paleti
 * Dark tema: 31 ile biten renkler
 * Light tema: 29 ile biten renkler
 * Ortak: 28 ile biten renkler
 */

export const Colors = {
  // Ana renkler (28 ile biten ortak renkler)
  primary: '#007AFF',      // iOS mavi - güven ve profesyonellik
  secondary: '#5856D6',    // iOS mor - modern ve şık
  success: '#34C759',      // iOS yeşil - başarı ve onay
  warning: '#FF9500',      // iOS turuncu - uyarı ve dikkat
  error: '#FF3B30',        // iOS kırmızı - hata ve uyarı
  info: '#5AC8FA',         // iOS açık mavi - bilgi ve iletişim
  
  // Metin renkleri
  text: {
    primary: '#000000',    // Ana metin - siyah, yüksek kontrast
    secondary: '#3C3C43',  // İkincil metin - koyu gri, orta kontrast
    tertiary: '#8E8E93',   // Üçüncül metin - orta gri, düşük kontrast
    inverse: '#FFFFFF',    // Ters metin - beyaz arka plan üzerinde
  },
  
  // Arka plan renkleri - iOS tarzı minimal
  background: {
    primary: '#FFFFFF',    // Ana arka plan - beyaz, temizlik
    secondary: '#F2F2F7', // İkincil arka plan - hafif gri
    tertiary: '#E5E5EA',  // Üçüncül arka plan - orta gri
  },
  
  // Kenarlık renkleri
  border: {
    light: '#E5E5EA',      // Açık kenarlık - hafif ayrım
    medium: '#C7C7CC',    // Orta kenarlık - belirgin ayrım
    dark: '#8E8E93',      // Koyu kenarlık - güçlü ayrım
  },
  
  // Light tema (29 ile biten renkler - rektefe-us için)
  light: {
    text: '#000000',       // Ana metin - siyah, yüksek okunabilirlik
    background: '#FFFFFF', // Ana arka plan - beyaz, temizlik
    tint: '#007AFF',       // Vurgu rengi - iOS mavi
    icon: '#3C3C43',       // İkon rengi - koyu gri
    tabIconDefault: '#8E8E93', // Varsayılan tab ikonu - orta gri
    tabIconSelected: '#007AFF', // Seçili tab ikonu - iOS mavi
    card: '#F2F2F7',      // Kart arka planı - hafif gri
    cardBorder: '#E5E5EA', // Kart kenarlığı - açık gri
    shadow: '#8E8E93',     // Gölge rengi - orta gri
    surface: '#F2F2F7',    // Yüzey rengi - hafif gri
    divider: '#C7C7CC',    // Ayırıcı çizgi - orta gri
  },
  
  // Dark tema (31 ile biten renkler - her iki app için)
  dark: {
    text: '#FFFFFF',       // Ana metin - beyaz, yüksek kontrast
    background: '#000000', // Ana arka plan - siyah
    tint: '#0A84FF',       // Vurgu rengi - koyu iOS mavi
    icon: '#FFFFFF',       // İkon rengi - beyaz
    tabIconDefault: '#8E8E93', // Varsayılan tab ikonu - orta gri
    tabIconSelected: '#0A84FF', // Seçili tab ikonu - koyu iOS mavi
    card: '#1C1C1E',       // Kart arka planı - koyu gri
    cardBorder: '#38383A', // Kart kenarlığı - orta gri
    shadow: '#000000',     // Gölge rengi - siyah
    surface: '#1C1C1E',    // Yüzey rengi - koyu gri
    divider: '#38383A',    // Ayırıcı çizgi - orta gri
    accent: '#FF9F0A',     // Vurgu rengi - iOS turuncu
  },
  
  // Özel renkler
  special: {
    primaryGradient: ['#007AFF', '#0A84FF'], // iOS mavi gradyan
    secondaryGradient: ['#5856D6', '#7B61FF'], // iOS mor gradyan
    overlay: 'rgba(0, 0, 0, 0.4)', // Siyah overlay
    glass: 'rgba(255, 255, 255, 0.1)', // Cam efekti
    warm: '#FF9F0A',       // iOS turuncu
    deepBlue: '#0A84FF',   // Koyu iOS mavi
    softBlue: '#F2F2F7',   // Yumuşak gri
  }
};
