/**
 * Electrical service için utility fonksiyonları
 */

// Electrical System Type mapping
export const electricalSystemTypeMapping: { [key: string]: string } = {
  'klima': 'Klima',
  'far': 'Far/Lamba',
  'alternator': 'Alternatör',
  'batarya': 'Batarya/Aku',
  'elektrik-araci': 'Elektrikli Aygıtlar',
  'sinyal': 'Sinyal/Göstergeler',
  'diger': 'Diğer'
};

// Electrical Problem Type mapping
export const electricalProblemTypeMapping: { [key: string]: string } = {
  'calismiyor': 'Çalışmıyor',
  'arizali-bos': 'Arızalı/Boş',
  'ariza-gostergesi': 'Arıza Göstergesi',
  'ses-yapiyor': 'Ses Yapıyor',
  'isinma-sorunu': 'Isınma Sorunu',
  'kisa-devre': 'Kısa Devre',
  'tetik-atmiyor': 'Tetik Atmıyor',
  'diger': 'Diğer'
};

// Electrical Urgency Level mapping
export const electricalUrgencyLevelMapping: { [key: string]: string } = {
  'normal': 'Normal',
  'acil': 'Acil'
};

/**
 * Electrical system type'ı Türkçe'ye çevirir
 */
export const translateElectricalSystemType = (type: string): string => {
  if (!type) return type;
  return electricalSystemTypeMapping[type] || type;
};

/**
 * Electrical problem type'ı Türkçe'ye çevirir
 */
export const translateElectricalProblemType = (type: string): string => {
  if (!type) return type;
  return electricalProblemTypeMapping[type] || type;
};

/**
 * Electrical urgency level'ı Türkçe'ye çevirir
 */
export const translateElectricalUrgencyLevel = (level: string): string => {
  if (!level) return level;
  return electricalUrgencyLevelMapping[level] || level;
};

/**
 * Urgency level için renk döndürür
 */
export const getUrgencyLevelColor = (level: string): string => {
  switch (level) {
    case 'acil':
      return '#EF4444'; // Kırmızı
    case 'normal':
    default:
      return '#10B981'; // Yeşil
  }
};

/**
 * Urgency level için icon döndürür
 */
export const getUrgencyLevelIcon = (level: string): string => {
  switch (level) {
    case 'acil':
      return 'alert-circle';
    case 'normal':
    default:
      return 'checkmark-circle';
  }
};

/**
 * Urgency level için badge style döndürür
 */
export const getUrgencyLevelBadgeStyle = (level: string): { backgroundColor: string; color: string } => {
  switch (level) {
    case 'acil':
      return {
        backgroundColor: '#FEE2E2',
        color: '#DC2626'
      };
    case 'normal':
    default:
      return {
        backgroundColor: '#D1FAE5',
        color: '#059669'
      };
  }
};

/**
 * Tekrarlayan arıza için badge style döndürür
 */
export const getRecurringBadgeStyle = (): { backgroundColor: string; color: string } => {
  return {
    backgroundColor: '#FEF3C7',
    color: '#D97706'
  };
};

/**
 * Electrical system type için icon döndürür
 */
export const getElectricalSystemIcon = (type: string): string => {
  const iconMap: { [key: string]: string } = {
    'klima': 'snowflake',
    'far': 'bulb',
    'alternator': 'cog',
    'batarya': 'battery-full',
    'elektrik-araci': 'flash',
    'sinyal': 'speedometer',
    'diger': 'settings'
  };
  return iconMap[type] || 'flash';
};

