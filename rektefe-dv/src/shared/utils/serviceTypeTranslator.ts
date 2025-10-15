/**
 * ServiceType Türkçe Çeviri Utility
 * ServiceType enum değerlerini Türkçe isimlerine çevirir
 */

export const SERVICE_TYPE_TURKISH: Record<string, string> = {
  'genel-bakim': 'Genel Bakım',
  'agir-bakim': 'Ağır Bakım',
  'alt-takim': 'Alt Takım',
  'ust-takim': 'Üst Takım',
  'kaporta-boya': 'Kaporta & Boya',
  'elektrik-elektronik': 'Elektrik & Elektronik',
  'yedek-parca': 'Yedek Parça',
  'lastik': 'Lastik Servisi',
  'egzoz-emisyon': 'Egzoz & Emisyon',
  'arac-yikama': 'Araç Yıkama',
  'cekici': 'Çekici Hizmeti',
  
  // İngilizce alternatifler
  'general_maintenance': 'Genel Bakım',
  'heavy_maintenance': 'Ağır Bakım',
  'alignment': 'Alt Takım',
  'suspension': 'Üst Takım',
  'body_paint': 'Kaporta & Boya',
  'electrical': 'Elektrik & Elektronik',
  'parts': 'Yedek Parça',
  'tire_service': 'Lastik Servisi',
  'exhaust': 'Egzoz & Emisyon',
  'car_wash': 'Araç Yıkama',
  'towing': 'Çekici Hizmeti',
  
  // Kısa isimler
  'maintenance': 'Genel Bakım',
  'repair': 'Tamir',
  'wash': 'Yıkama',
  'tire': 'Lastik',
  'bodywork': 'Kaporta & Boya'
};

/**
 * ServiceType'ı Türkçeye çevirir
 */
export function translateServiceType(serviceType: string): string {
  if (!serviceType) return 'Hizmet';
  
  // Direkt eşleşme
  const direct = SERVICE_TYPE_TURKISH[serviceType.toLowerCase()];
  if (direct) return direct;
  
  // Tire işareti varsa temizle ve tekrar dene
  const cleaned = serviceType.replace(/-/g, '_').toLowerCase();
  const cleaned2 = SERVICE_TYPE_TURKISH[cleaned];
  if (cleaned2) return cleaned2;
  
  // Fallback: güzelleştir
  return serviceType
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Kategori kodunu Türkçeye çevirir
 */
export function translateCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    'repair': 'Tamir ve Bakım',
    'towing': 'Çekici Hizmeti',
    'wash': 'Araç Yıkama',
    'tire': 'Lastik Servisi',
    'bodywork': 'Kaporta & Boya'
  };
  
  return categoryMap[category.toLowerCase()] || category;
}

