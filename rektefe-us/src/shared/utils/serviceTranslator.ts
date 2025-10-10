/**
 * Hizmet isimlerini Türkçe'ye çeviren utility fonksiyonları
 */

// Hizmet isimlerini Türkçe'ye çeviren mapping
export const serviceNameMapping: { [key: string]: string } = {
  // Bakım hizmetleri - kod değerleri
  'agir-bakim': 'Ağır Bakım',
  'genel-bakim': 'Genel Bakım',
  'alt-takim': 'Alt Takım',
  'ust-takim': 'Üst Takım',
  'kaporta-boya': 'Kaporta & Boya',
  'elektrik-elektronik': 'Elektrik-Elektronik',
  'yedek-parca': 'Yedek Parça',
  'lastik': 'Lastik Servisi',
  'egzoz-emisyon': 'Egzoz & Emisyon',
  'arac-yikama': 'Araç Yıkama',
  'cekici': 'Çekici',
  
  // Legacy değerler (geriye dönük uyumluluk)
  'agir': 'Ağır Bakım',
  'genel': 'Genel Bakım',
  'motor': 'Motor Bakımı',
  'motor-bakimi': 'Motor Bakımı',
  'periyodik': 'Periyodik Bakım',
  'periyodik-bakim': 'Periyodik Bakım',
  
  // Onarım hizmetleri
  'alt-takim': 'Alt Takım',
  'alt-takım': 'Alt Takım',
  'ust-takim': 'Üst Takım',
  'ust-takım': 'Üst Takım',
  'üst-takim': 'Üst Takım',
  'üst-takım': 'Üst Takım',
  'kaporta': 'Kaporta/Boya',
  'kaporta-boya': 'Kaporta & Boya',
  'elektrik': 'Elektrik',
  'yedek-parca': 'Yedek Parça',
  'lastik': 'Lastik Servisi',
  'egzoz': 'Egzoz',
  'arac-yikama': 'Araç Yıkama',
  'fren': 'Fren Sistemi',
  'fren-sistemi': 'Fren Sistemi',
  'suspansiyon': 'Süspansiyon',
  'klima': 'Klima Servisi',
  'klima-servisi': 'Klima Servisi',
  'yikama': 'Yıkama Detay',
  'yikama-detay': 'Yıkama Detay',
  'detay': 'Yıkama Detay',
  
  // Diğer hizmetler
  'diagnostic': 'Arıza Tespiti',
  'ariza-tespiti': 'Arıza Tespiti',
  'oil-change': 'Yağ Değişimi',
  'yag-degisimi': 'Yağ Değişimi',
  'filter-change': 'Filtre Değişimi',
  'filtre-degisimi': 'Filtre Değişimi',
  'brake-service': 'Fren Servisi',
  'fren-servisi': 'Fren Servisi',
  'tire-service': 'Lastik Servisi',
  'lastik-servisi': 'Lastik Servisi',
  'battery-service': 'Aku Servisi',
  'aku-servisi': 'Aku Servisi',
  'ac-service': 'Klima Servisi',
  'exhaust-service': 'Egzoz Servisi',
  'egzoz-servisi': 'Egzoz Servisi',
  'body-repair': 'Kaporta Onarımı',
  'kaporta-onarimi': 'Kaporta Onarımı',
  'paint-service': 'Boya Servisi',
  'boya-servisi': 'Boya Servisi',
  'wash-service': 'Yıkama Servisi',
  'yikama-servisi': 'Yıkama Servisi',
  'inspection': 'Muayene',
  'muayene': 'Muayene',
  'towing': 'Çekici',
  'cekici': 'Çekici',
  'emergency': 'Acil Servis',
  'acil-servis': 'Acil Servis',
  
  // Yıkama hizmetleri
  'basic': 'Temel',
  'temel': 'Temel',
  'premium': 'Premium',
  'deluxe': 'Deluxe',
  'detailing': 'Detay Temizlik',
  'interior': 'İç Temizlik',
  'exterior': 'Dış Temizlik',
  'detayli': 'Detaylı',
  'detaylı': 'Detaylı',
  'seramik': 'Seramik',
  'koltuk': 'Koltuk',
  
  // Yıkama seviyeleri
  'light': 'Hafif',
  'medium': 'Orta',
  'heavy': 'Ağır',
  'extreme': 'Aşırı Kirli',
  
  // Durumlar
  'pending': 'Bekliyor',
  'accepted': 'Kabul Edildi',
  'in_progress': 'Devam Ediyor',
  'completed': 'Tamamlandı',
  'cancelled': 'İptal Edildi',
  
  // Aciliyet seviyeleri
  'low': 'Normal',
  'high': 'Çok Acil',
  
  // Çekici türleri
  'flatbed': 'Düz Platform',
  'wheel_lift': 'Tekerlek Kaldırma',
  'integrated': 'Entegre',
  
  // Lastik durumları
  'new': 'Yeni',
  'used': 'İkinci El',
  'damaged': 'Hasarlı',
  'worn': 'Aşınmış',
  
  // Parça durumları
  'needed': 'Gerekli',
  'ordered': 'Sipariş Edildi',
  'received': 'Teslim Alındı',
  'installed': 'Takıldı',
  
  // Lastik hizmet türleri
  'tire_change': 'Lastik Değişimi',
  'tire_repair': 'Lastik Tamiri',
  'tire_balance': 'Lastik Balansı',
  'tire_alignment': 'Rot Balansı',
  'tire_inspection': 'Lastik Kontrolü',
  'tire_purchase': 'Lastik Satışı',
  
  // Motor türleri
  'gasoline': 'Benzinli',
  'diesel': 'Dizel',
  'hybrid': 'Hibrit',
  'electric': 'Elektrikli',
  'lpg': 'LPG',
  'cng': 'CNG',
  'petrol': 'Benzinli',
  'benzin': 'Benzinli',
  'dizel': 'Dizel',
  'hibrit': 'Hibrit',
  'elektrikli': 'Elektrikli',
  
  // Vites türleri
  'manual': 'Manuel',
  'automatic': 'Otomatik',
  'semi-automatic': 'Yarı Otomatik',
  'cvt': 'CVT',
  'manuel': 'Manuel',
  'otomatik': 'Otomatik',
  'yarı-otomatik': 'Yarı Otomatik',
  
  // Bakım terimleri
  'maintenance': 'Bakım',
  'repair': 'Onarım',
  'service': 'Servis',
  
  // Teknik terimler
  'engine': 'Motor',
  'transmission': 'Şanzıman',
  'brake': 'Fren',
  'suspension': 'Süspansiyon',
  'electrical': 'Elektrik',
  'bodywork': 'Kaporta',
  'oil_change': 'Yağ Değişimi',
  'inspection': 'Muayene',
  'ac': 'Klima',
  'exhaust': 'Egzoz',
  'fuel_system': 'Yakıt Sistemi',
  'cooling_system': 'Soğutma Sistemi',
  'ignition': 'Ateşleme',
  'engine_repair': 'Motor Rektefiyesi',
  'transmission_repair': 'Şanzıman Rektefiyesi'
};

/**
 * Hizmet ismini Türkçe'ye çeviren fonksiyon
 * @param serviceName - Çevrilecek hizmet ismi
 * @returns Çevrilmiş Türkçe hizmet ismi
 */
export const translateServiceName = (serviceName: string): string => {
  if (!serviceName) return serviceName;
  
  // Önce tam eşleşme ara
  if (serviceNameMapping[serviceName]) {
    return serviceNameMapping[serviceName];
  }
  
  // Küçük harfe çevir ve tire ile değiştir
  const normalizedName = serviceName.toLowerCase().replace(/\s+/g, '-');
  
  // Normalize edilmiş isimle eşleşme ara
  if (serviceNameMapping[normalizedName]) {
    return serviceNameMapping[normalizedName];
  }
  
  // Kısmi eşleşme ara
  for (const [key, value] of Object.entries(serviceNameMapping)) {
    if (normalizedName.includes(key) || key.includes(normalizedName)) {
      return value;
    }
  }
  
  // Eşleşme bulunamazsa orijinal ismi döndür
  return serviceName;
};

/**
 * Birden fazla hizmet ismini çeviren fonksiyon
 * @param serviceNames - Çevrilecek hizmet isimleri array'i
 * @returns Çevrilmiş Türkçe hizmet isimleri array'i
 */
export const translateServiceNames = (serviceNames: string[]): string[] => {
  return serviceNames.map(translateServiceName);
};

/**
 * Hizmet objelerini çeviren fonksiyon
 * @param services - Hizmet objeleri array'i
 * @returns Çevrilmiş hizmet objeleri
 */
export const translateServices = (services: Array<{ title?: string; name?: string; serviceType?: string; [key: string]: any }>) => {
  return services.map(service => ({
    ...service,
    title: service.title ? translateServiceName(service.title) : service.title,
    name: service.name ? translateServiceName(service.name) : service.name,
    serviceType: service.serviceType ? translateServiceName(service.serviceType) : service.serviceType,
  }));
};
