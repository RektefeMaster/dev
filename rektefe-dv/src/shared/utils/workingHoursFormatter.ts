/**
 * WorkingHours verisini düzgün formatlamak için utility fonksiyonları
 */

export interface WorkingHours {
  monday: { isOpen: boolean; start: string; end: string };
  tuesday: { isOpen: boolean; start: string; end: string };
  wednesday: { isOpen: boolean; start: string; end: string };
  thursday: { isOpen: boolean; start: string; end: string };
  friday: { isOpen: boolean; start: string; end: string };
  saturday: { isOpen: boolean; start: string; end: string };
  sunday: { isOpen: boolean; start: string; end: string };
}

/**
 * WorkingHours JSON string'ini parse eder ve formatlar
 */
export const formatWorkingHours = (workingHoursString: string): string => {
  if (!workingHoursString) return '';

  try {
    const workingHours: WorkingHours = JSON.parse(workingHoursString);
    
    // Bugünün gününü bul
    const today = new Date().toLocaleDateString('tr-TR', { weekday: 'long' }).toLowerCase();
    const todayKey = today as keyof WorkingHours;
    
    // Bugünün çalışma saatlerini al
    const todayHours = workingHours[todayKey];
    
    if (todayHours && todayHours.isOpen) {
      return `Bugün: ${todayHours.start} - ${todayHours.end}`;
    } else {
      // İlk açık günü bul
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
      
      for (let i = 0; i < days.length; i++) {
        const day = days[i] as keyof WorkingHours;
        const hours = workingHours[day];
        
        if (hours && hours.isOpen) {
          return `${dayNames[i]}: ${hours.start} - ${hours.end}`;
        }
      }
      
      return 'Kapalı';
    }
  } catch (error) {
    // JSON parse hatası durumunda orijinal string'i döndür
    return workingHoursString;
  }
};

/**
 * WorkingHours'ı kısa formatta döndürür
 */
export const formatWorkingHoursShort = (workingHoursString: string): string => {
  if (!workingHoursString) return '';

  try {
    const workingHours: WorkingHours = JSON.parse(workingHoursString);
    
    // Açık günleri say
    const openDays = Object.values(workingHours).filter(day => day.isOpen).length;
    
    if (openDays === 7) {
      return '7/7 Açık';
    } else if (openDays === 6) {
      return '6/7 Açık';
    } else if (openDays === 5) {
      return 'Hafta İçi';
    } else {
      return `${openDays} gün açık`;
    }
  } catch (error) {
    return 'Çalışma saatleri';
  }
};

/**
 * WorkingHours'ı detaylı formatta döndürür
 */
export const formatWorkingHoursDetailed = (workingHoursString: string): string[] => {
  if (!workingHoursString) return [];

  try {
    const workingHours: WorkingHours = JSON.parse(workingHoursString);
    const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    return days.map((day, index) => {
      const hours = workingHours[day as keyof WorkingHours];
      const dayName = dayNames[index];
      
      if (hours && hours.isOpen) {
        return `${dayName}: ${hours.start} - ${hours.end}`;
      } else {
        return `${dayName}: Kapalı`;
      }
    });
  } catch (error) {
    return [];
  }
};
