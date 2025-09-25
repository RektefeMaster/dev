/**
 * Uzmanlık alanlarını Türkçe'ye çeviren utility fonksiyonları
 */

export const specialtyTranslations: { [key: string]: string } = {
  'repair': 'Tamir & Bakım',
  'maintenance': 'Genel Bakım',
  'engine': 'Motor',
  'transmission': 'Şanzıman',
  'brake': 'Fren',
  'suspension': 'Süspansiyon',
  'electrical': 'Elektrik',
  'bodywork': 'Kaporta',
  'tire': 'Lastik',
  'oil_change': 'Yağ Değişimi',
  'inspection': 'Muayene',
  'diagnostic': 'Diagnostik',
  'ac': 'Klima',
  'exhaust': 'Egzoz',
  'fuel_system': 'Yakıt Sistemi',
  'cooling_system': 'Soğutma Sistemi',
  'ignition': 'Ateşleme',
  'steering': 'Direksiyon',
  'clutch': 'Debriyaj',
  'differential': 'Diferansiyel'
};

export const translateSpecialty = (specialty: string): string => {
  return specialtyTranslations[specialty.toLowerCase()] || specialty;
};
