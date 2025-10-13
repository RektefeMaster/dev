/**
 * REKTEFE - SERVICE CATEGORY HELPER
 * 
 * ServiceCategory ile ilgili tüm yardımcı fonksiyonlar
 * Bu dosya, backend'deki tüm service category işlemlerini merkezi bir yerden yönetir
 */

import { 
  ServiceCategory, 
  SERVICE_TYPE_TO_CATEGORY,
  FAULT_CATEGORY_TO_SERVICE_CATEGORY,
  SERVICE_CATEGORY_TURKISH_NAMES,
  normalizeToServiceCategory,
  normalizeServiceCategories,
  ServiceType,
  getServiceTypeFromCategory
} from '../../../shared/types/enums';

/**
 * Mechanic'in serviceCategories array'ini normalize eder
 * Türkçe/İngilizce karışık kategorileri standart ServiceCategory enum'larına çevirir
 * 
 * @param categories - Normalize edilecek kategori array'i
 * @returns Normalize edilmiş ServiceCategory array'i
 */
export function normalizeMechanicCategories(categories: string[]): ServiceCategory[] {
  if (!categories || categories.length === 0) {
    return [ServiceCategory.REPAIR]; // Default olarak repair
  }
  
  const normalized = normalizeServiceCategories(categories);
  return normalized.length > 0 ? normalized : [ServiceCategory.REPAIR];
}

/**
 * Fault report kategorisini ServiceCategory'ye çevirir
 * 
 * @param faultCategory - Arıza bildirimi kategorisi (Türkçe)
 * @returns ServiceCategory enum değeri
 */
export function getFaultReportServiceCategory(faultCategory: string): ServiceCategory {
  return FAULT_CATEGORY_TO_SERVICE_CATEGORY[faultCategory] || ServiceCategory.REPAIR;
}

/**
 * ServiceType'dan ServiceCategory'yi döndürür
 * 
 * @param serviceType - ServiceType enum değeri
 * @returns ServiceCategory enum değeri
 */
export function getServiceCategoryFromServiceType(serviceType: ServiceType): ServiceCategory {
  return SERVICE_TYPE_TO_CATEGORY[serviceType] || ServiceCategory.REPAIR;
}

/**
 * ServiceCategory'den ServiceType'a çevirir
 * 
 * @param category - ServiceCategory enum değeri
 * @returns ServiceType enum değeri
 */
export function getServiceTypeFromServiceCategory(category: ServiceCategory): ServiceType {
  return getServiceTypeFromCategory(category);
}

/**
 * Mechanic'in belirli bir ServiceCategory'ye sahip olup olmadığını kontrol eder
 * 
 * @param mechanicCategories - Mechanic'in serviceCategories array'i
 * @param targetCategory - Kontrol edilecek ServiceCategory
 * @returns Boolean
 */
export function mechanicHasCategory(mechanicCategories: string[], targetCategory: ServiceCategory): boolean {
  const normalized = normalizeMechanicCategories(mechanicCategories);
  return normalized.includes(targetCategory);
}

/**
 * Mechanic query için ServiceCategory filter oluşturur
 * MongoDB $in veya $or query'si için kullanılır
 * 
 * @param category - ServiceCategory enum değeri
 * @returns MongoDB query için kategori isimleri array'i
 */
export function getCategoryQueryValues(category: ServiceCategory): string[] {
  // Ana enum değeri + Türkçe alternatifleri
  const turkishNames = SERVICE_CATEGORY_TURKISH_NAMES[category] || [];
  return [category, ...turkishNames];
}

/**
 * Birden fazla ServiceCategory için query değerleri oluşturur
 * 
 * @param categories - ServiceCategory array'i
 * @returns Tüm kategorilerin query değerleri
 */
export function getMultipleCategoryQueryValues(categories: ServiceCategory[]): string[] {
  const allValues: string[] = [];
  categories.forEach(cat => {
    allValues.push(...getCategoryQueryValues(cat));
  });
  return [...new Set(allValues)]; // Tekrarları kaldır
}

/**
 * Mechanic filtreleme için optimize edilmiş query oluşturur
 * 
 * @param targetCategory - Aranacak ServiceCategory
 * @returns MongoDB query objesi
 */
export function buildCategoryFilterQuery(targetCategory: ServiceCategory) {
  const queryValues = getCategoryQueryValues(targetCategory);
  
  return {
    serviceCategories: { $in: queryValues }
  };
}

/**
 * Legacy Türkçe kategori isimlerini yeni enum değerlerine migration yapar
 * Database migration için kullanılır
 * 
 * @param oldCategories - Eski Türkçe kategori isimleri
 * @returns Yeni ServiceCategory enum değerleri
 */
export function migrateLegacyCategories(oldCategories: string[]): ServiceCategory[] {
  return normalizeMechanicCategories(oldCategories);
}

// Re-export shared functions for convenience
export {
  normalizeToServiceCategory,
  normalizeServiceCategories,
  ServiceCategory,
  ServiceType
};

export default {
  normalizeMechanicCategories,
  getFaultReportServiceCategory,
  getServiceCategoryFromServiceType,
  getServiceTypeFromServiceCategory,
  mechanicHasCategory,
  getCategoryQueryValues,
  getMultipleCategoryQueryValues,
  buildCategoryFilterQuery,
  migrateLegacyCategories,
  normalizeToServiceCategory,
  normalizeServiceCategories
};

