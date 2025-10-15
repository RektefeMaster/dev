/**
 * ServiceType Türkçe Çeviri Utility
 * ServiceType enum değerlerini Türkçe isimlerine çevirir
 */

import { ServiceType } from '../../../shared/types/enums';

export const SERVICE_TYPE_TURKISH: Record<ServiceType, string> = {
  [ServiceType.GENERAL_MAINTENANCE]: 'Genel Bakım',
  [ServiceType.HEAVY_MAINTENANCE]: 'Ağır Bakım',
  [ServiceType.ALIGNMENT]: 'Alt Takım',
  [ServiceType.SUSPENSION]: 'Üst Takım',
  [ServiceType.BODY_PAINT]: 'Kaporta & Boya',
  [ServiceType.ELECTRICAL]: 'Elektrik & Elektronik',
  [ServiceType.PARTS]: 'Yedek Parça',
  [ServiceType.TIRE_SERVICE]: 'Lastik Servisi',
  [ServiceType.EXHAUST]: 'Egzoz & Emisyon',
  [ServiceType.CAR_WASH]: 'Araç Yıkama',
  [ServiceType.TOWING]: 'Çekici Hizmeti'
};

// Backend'de kullanılan service type kodları ve Türkçe karşılıkları
export const SERVICE_TYPE_CODE_MAP: Record<string, string> = {
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
  'cekici': 'Çekici Hizmeti'
};

/**
 * ServiceType'ı Türkçeye çevirir
 * Hem enum değerlerini hem de backend kodlarını destekler
 */
export function translateServiceType(serviceType: string): string {
  // Önce backend kodlarını kontrol et
  if (SERVICE_TYPE_CODE_MAP[serviceType]) {
    return SERVICE_TYPE_CODE_MAP[serviceType];
  }
  
  // Sonra enum değerlerini kontrol et
  const type = serviceType as ServiceType;
  return SERVICE_TYPE_TURKISH[type] || serviceType;
}

/**
 * ServiceType kod değerinden Türkçe isim döndürür
 * Örnek: 'genel-bakim' -> 'Genel Bakım'
 */
export function getServiceTypeDisplayName(serviceTypeCode: string): string {
  // Enum değerlerini kontrol et
  const enumValues = Object.values(ServiceType);
  const matchingEnum = enumValues.find(val => val === serviceTypeCode);
  
  if (matchingEnum) {
    return SERVICE_TYPE_TURKISH[matchingEnum];
  }
  
  // Fallback: kod değerini güzelleştir
  return serviceTypeCode
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

