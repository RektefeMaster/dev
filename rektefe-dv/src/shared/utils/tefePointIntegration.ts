import { tefePointService } from '@/features/wallet/services/tefePointService';

/**
 * Randevu tamamlandığında TefePuan kazanımını tetikler
 */
export const triggerTefePointEarning = async (
  appointmentId: string,
  serviceCategory: string,
  amount: number,
  description?: string
): Promise<{
  success: boolean;
  earnedPoints?: number;
  error?: string;
}> => {
  try {
    // TefePuan hesapla
    const earnedPoints = tefePointService.calculateTefePoints(amount, serviceCategory);
    
    if (earnedPoints <= 0) {
      return { success: true, earnedPoints: 0 };
    }

    // TefePuan kazanımı backend'de otomatik yapılıyor
    // Bu fonksiyon sadece bildirim için kullanılır
    return {
      success: true,
      earnedPoints
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'TefePuan kazanımında hata oluştu'
    };
  }
};

/**
 * Hizmet kategorisini randevu türünden belirler
 */
export const getServiceCategoryFromAppointmentType = (appointmentType: string): string => {
  const categoryMap: Record<string, string> = {
    'towing': 'towing',
    'tire_service': 'tire_service',
    'wash_service': 'wash_service',
    'maintenance': 'maintenance',
    'engine_repair': 'engine_repair',
    'transmission_repair': 'transmission_repair',
    'electrical_repair': 'electrical_repair',
    'body_repair': 'body_repair',
    'brake_repair': 'maintenance',
    'oil_change': 'maintenance',
    'battery_service': 'electrical_repair',
    'air_conditioning': 'electrical_repair',
    'exhaust_repair': 'engine_repair',
    'suspension_repair': 'maintenance',
    'steering_repair': 'maintenance',
    'fuel_system': 'engine_repair',
    'cooling_system': 'engine_repair',
    'ignition_system': 'electrical_repair',
    'clutch_repair': 'transmission_repair',
    'differential_repair': 'transmission_repair'
  };

  return categoryMap[appointmentType] || 'maintenance'; // Varsayılan olarak genel bakım
};

/**
 * TefePuan kazanım bildirimi göster
 */
export const showTefePointEarnedNotification = (
  earnedPoints: number,
  serviceDescription: string
): void => {
  // Bu fonksiyon notification service ile entegre edilebilir
  console.log(`TefePuan kazanım bildirimi: +${earnedPoints} puan - ${serviceDescription}`);
  
  // Gerçek uygulamada burada push notification veya in-app notification gösterilebilir
  // Örnek: showNotification({
  //   title: 'TefePuan Kazandınız!',
  //   message: `${serviceDescription} hizmeti için +${earnedPoints} TefePuan kazandınız`,
  //   type: 'success'
  // });
};

/**
 * TefePuan kullanım bildirimi göster
 */
export const showTefePointUsedNotification = (
  usedPoints: number,
  remainingPoints: number,
  serviceDescription: string
): void => {
  console.log(`TefePuan kullanım bildirimi: -${usedPoints} puan kullanıldı - Kalan: ${remainingPoints}`);
  
  // Gerçek uygulamada burada push notification veya in-app notification gösterilebilir
};

/**
 * TefePuan geçerlilik kontrolü
 */
export const checkTefePointExpiry = async (): Promise<void> => {
  try {
    // TefePuan bakiyesini güncelle (süresi dolan puanları kontrol eder)
    await tefePointService.getBalance();
  } catch (error) {
    console.error('TefePuan geçerlilik kontrolünde hata:', error);
  }
};

/**
 * TefePuan istatistiklerini al ve logla
 */
export const logTefePointStats = async (period: 'week' | 'month' | 'year' = 'month'): Promise<void> => {
  try {
    // TefePuan geçmişini alarak istatistikleri hesapla
    const history = await tefePointService.getHistory({ limit: 10000 });
    console.log(`TefePuan geçmişi (${period}):`, history);
  } catch (error) {
    console.error('TefePuan istatistiklerinde hata:', error);
  }
};

/**
 * TefePuan kazanım oranlarını göster - Optimize edilmiş %1 sabit oran
 */
export const getTefePointRates = (): Array<{
  category: string;
  description: string;
  rate: string;
  multiplier: number;
}> => {
  const categories = [
    { category: 'towing', description: 'Çekici Hizmeti', multiplier: 0.01 },
    { category: 'tire', description: 'Lastik Hizmeti', multiplier: 0.01 },
    { category: 'wash', description: 'Araç Yıkama', multiplier: 0.01 },
    { category: 'repair', description: 'Tamir ve Bakım', multiplier: 0.01 },
    { category: 'bodywork', description: 'Kaporta & Boya', multiplier: 0.01 }
  ];

  return categories.map(cat => ({
    ...cat,
    rate: `%${(cat.multiplier * 100).toFixed(0)}`
  }));
};

/**
 * TefePuan değer hesaplama (1 TefePuan = kaç TL)
 */
export const calculateTefePointValue = (points: number): number => {
  // 1 TefePuan = 0.1 TL (örnek değer)
  return points * 0.1;
};

/**
 * TefePuan ile indirim hesaplama
 */
export const calculateDiscountWithTefePoints = (
  originalAmount: number,
  availablePoints: number,
  maxDiscountPercentage: number = 50 // Maksimum %50 indirim
): {
  discountAmount: number;
  pointsToUse: number;
  finalAmount: number;
} => {
  const maxDiscountAmount = originalAmount * (maxDiscountPercentage / 100);
  const maxPointsToUse = Math.floor(maxDiscountAmount / 0.1); // 1 TefePuan = 0.1 TL
  
  const pointsToUse = Math.min(availablePoints, maxPointsToUse);
  const discountAmount = pointsToUse * 0.1;
  const finalAmount = Math.max(0, originalAmount - discountAmount);

  return {
    discountAmount,
    pointsToUse,
    finalAmount
  };
};
