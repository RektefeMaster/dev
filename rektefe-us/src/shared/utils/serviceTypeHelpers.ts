/**
 * Hizmet türlerine göre özelleştirme yardımcı fonksiyonları
 * PLAN.md'de belirtildiği gibi her hizmet türü için farklı terminoloji kullanılır
 */

export type ServiceCategory = 'repair' | 'wash' | 'tire' | 'towing' | 'bodywork';

/**
 * Ustanın serviceCategories dizisinden ana hizmet kategorisini belirler
 */
export const getServiceCategory = (serviceCategories?: string[]): ServiceCategory | null => {
  if (!serviceCategories || serviceCategories.length === 0) {
    return null;
  }

  // Çekici hizmeti öncelikli (acil durum)
  if (serviceCategories.some(s => ['towing', 'cekici', 'Çekici'].includes(s))) {
    return 'towing';
  }

  // Tamir & Bakım
  if (serviceCategories.some(s => ['repair', 'tamir-bakim', 'Genel Bakım'].includes(s))) {
    return 'repair';
  }

  // Oto Yıkama
  if (serviceCategories.some(s => ['wash', 'arac-yikama', 'Yıkama Hizmeti'].includes(s))) {
    return 'wash';
  }

  // Lastik
  if (serviceCategories.some(s => ['tire', 'lastik', 'Lastik & Parça'].includes(s))) {
    return 'tire';
  }

  // Kaporta & Boya
  if (serviceCategories.some(s => ['bodywork', 'kaporta', 'boya', 'Kaporta & Boya'].includes(s))) {
    return 'bodywork';
  }

  return null;
};

/**
 * Hizmet kategorisine göre bildirim türü metinlerini döndürür
 */
export const getNotificationTypeText = (
  category: ServiceCategory | null,
  notificationType: 'appointment' | 'fault_report' | 'message' | 'general'
): string => {
  if (!category) return 'Bildirim';

  switch (category) {
    case 'towing':
      if (notificationType === 'appointment') return 'Çekici Çağrısı';
      if (notificationType === 'fault_report') return 'Acil Yardım Talebi';
      if (notificationType === 'message') return 'Çekici Mesajı';
      return 'Çekici Bildirimi';

    case 'repair':
      if (notificationType === 'appointment') return 'Tamir Randevusu';
      if (notificationType === 'fault_report') return 'Arıza Bildirimi';
      if (notificationType === 'message') return 'Tamir Mesajı';
      return 'Tamir Bildirimi';

    case 'wash':
      if (notificationType === 'appointment') return 'Yıkama Randevusu';
      if (notificationType === 'fault_report') return 'Yıkama Talebi'; // Yıkama için arıza bildirimi mantıksız
      if (notificationType === 'message') return 'Yıkama Mesajı';
      return 'Yıkama Bildirimi';

    case 'tire':
      if (notificationType === 'appointment') return 'Lastik Randevusu';
      if (notificationType === 'fault_report') return 'Lastik Talebi';
      if (notificationType === 'message') return 'Lastik Mesajı';
      return 'Lastik İşi';

    case 'bodywork':
      if (notificationType === 'appointment') return 'Kaporta Randevusu';
      if (notificationType === 'fault_report') return 'Hasar Bildirimi';
      if (notificationType === 'message') return 'Kaporta Mesajı';
      return 'Kaporta İşi';

    default:
      return 'Bildirim';
  }
};

/**
 * Hizmet kategorisine göre randevu/iş metinlerini döndürür
 */
export const getJobTypeText = (category: ServiceCategory | null): {
  singular: string;
  plural: string;
  action: string;
} => {
  switch (category) {
    case 'towing':
      return {
        singular: 'Çekici İşi',
        plural: 'Çekici İşleri',
        action: 'Çekici Çağrısını Kabul Et',
      };
    case 'repair':
      return {
        singular: 'Tamir İşi',
        plural: 'Tamir İşleri',
        action: 'Tamiri Başlat',
      };
    case 'wash':
      return {
        singular: 'Yıkama İşi',
        plural: 'Yıkama İşleri',
        action: 'Yıkamayı Başlat',
      };
    case 'tire':
      return {
        singular: 'Lastik İşi',
        plural: 'Lastik İşleri',
        action: 'Lastik İşini Başlat',
      };
    case 'bodywork':
      return {
        singular: 'Kaporta İşi',
        plural: 'Kaporta İşleri',
        action: 'Kaporta İşini Başlat',
      };
    default:
      return {
        singular: 'İş',
        plural: 'İşler',
        action: 'İşi Başlat',
      };
  }
};

/**
 * Hizmet kategorisine göre arıza bildirimi özelliğinin olup olmadığını kontrol eder
 */
export const hasFaultReportFeature = (serviceCategories?: string[]): boolean => {
  if (!serviceCategories || serviceCategories.length === 0) {
    return false;
  }

  // Sadece repair/tamir-bakim ve towing/çekici hizmetlerinde arıza bildirimi mantıklıdır
  return serviceCategories.some(s => 
    ['repair', 'tamir-bakim', 'Genel Bakım', 'towing', 'cekici', 'Çekici', 'bodywork', 'kaporta'].includes(s)
  );
};

/**
 * Hizmet kategorisine göre ekran başlıklarını özelleştirir
 */
export const getScreenTitle = (
  category: ServiceCategory | null,
  screenType: 'appointments' | 'messages' | 'notifications' | 'home'
): string => {
  if (!category) {
    if (screenType === 'appointments') return 'Randevular';
    if (screenType === 'messages') return 'Mesajlar';
    if (screenType === 'notifications') return 'Bildirimler';
    return 'Ana Sayfa';
  }

  switch (screenType) {
    case 'appointments':
      return getJobTypeText(category).plural;
    case 'messages':
      return 'Müşteri Mesajları';
    case 'notifications':
      return 'Bildirimler';
    case 'home':
      return 'Ana Sayfa';
    default:
      return '';
  }
};

/**
 * Hizmet kategorisine göre durum metinlerini döndürür
 */
export const getStatusText = (
  category: ServiceCategory | null,
  status: string
): string => {
  const defaultStatusTexts: Record<string, string> = {
    pending: 'Bekliyor',
    confirmed: 'Onaylandı',
    'in-progress': 'Devam Ediyor',
    completed: 'Tamamlandı',
    cancelled: 'İptal Edildi',
  };

  if (!category) {
    return defaultStatusTexts[status] || status;
  }

  // Hizmet türüne özel durum metinleri
  if (category === 'wash') {
    const washStatusTexts: Record<string, string> = {
      pending: 'Sırada',
      confirmed: 'Onaylandı',
      'in-progress': 'Yıkanıyor',
      completed: 'Teslime Hazır',
      cancelled: 'İptal Edildi',
    };
    return washStatusTexts[status] || status;
  }

  if (category === 'towing') {
    const towingStatusTexts: Record<string, string> = {
      pending: 'Bekleniyor',
      confirmed: 'Yola Çıktı',
      'in-progress': 'Aracın Yanında',
      completed: 'Teslim Edildi',
      cancelled: 'İptal Edildi',
    };
    return towingStatusTexts[status] || status;
  }

  if (category === 'tire') {
    const tireStatusTexts: Record<string, string> = {
      pending: 'Bekliyor',
      confirmed: 'Onaylandı',
      'in-progress': 'Montaj Yapılıyor',
      completed: 'Tamamlandı',
      cancelled: 'İptal Edildi',
    };
    return tireStatusTexts[status] || status;
  }

  return defaultStatusTexts[status] || status;
};

