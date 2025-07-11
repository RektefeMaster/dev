export const API_URL = 'http://192.168.1.59:3000/api';
export const SOCKET_URL = 'http://192.168.1.59:3000';

// Servis kategorileri (rektefe-dv ile aynı)
export const SERVICE_CATEGORIES = [
  { id: 'agir', name: 'Ağır Bakım', icon: 'wrench', color: '#007AFF' },
  { id: 'genel', name: 'Genel Bakım', icon: 'tools', color: '#34C759' },
  { id: 'alt', name: 'Alt Takım', icon: 'cog', color: '#FF9500' },
  { id: 'ust', name: 'Üst Takım', icon: 'nut', color: '#AF52DE' },
  { id: 'kaporta', name: 'Kaporta/Boya', icon: 'spray', color: '#FF375F' },
  { id: 'elektrik', name: 'Elektrik-Elektronik', icon: 'lightning-bolt', color: '#FFD60A' },
  { id: 'yedek', name: 'Yedek Parça', icon: 'car-wash', color: '#00B8D9' },
  { id: 'lastik', name: 'Lastik', icon: 'tire', color: '#5856D6' },
  { id: 'egzoz', name: 'Egzoz & Emisyon', icon: 'smoke', color: '#5AC8FA' },
  { id: 'ekspertiz', name: 'Ekspertiz', icon: 'magnify', color: '#FF9F0A' },
  { id: 'sigorta', name: 'Sigorta/Kasko', icon: 'shield-check', color: '#32D74B' },
  { id: 'yikama', name: 'Araç Yıkama', icon: 'car-wash', color: '#64D2FF' },
];

// Uygulama renkleri
export const COLORS = {
  primary: '#0066cc',
  secondary: '#34C759',
  accent: '#FF9500',
  background: '#f8f9fa',
  surface: '#ffffff',
  text: '#1a1a1a',
  textSecondary: '#666666',
  border: '#e0e0e0',
  error: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',
  info: '#007AFF',
};

// Uygulama boyutları
export const SIZES = {
  base: 8,
  small: 12,
  font: 14,
  medium: 16,
  large: 18,
  extraLarge: 24,
  padding: 16,
  radius: 12,
}; 