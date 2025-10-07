// Lastik Oteli API servisleri
export const tireHotelApi = {
  // Lastik seti depoya yerleştir
  storeTireSet: async (data: {
    customerId: string;
    vehicleId: string;
    tireSet: {
      season: 'summer' | 'winter';
      brand: string;
      model: string;
      size: string;
      condition: 'new' | 'used' | 'good' | 'fair' | 'poor';
      treadDepth: number[];
      productionYear?: number;
      notes?: string;
    };
    storageFee: number;
    photos?: string[];
  }) => {
    try {
      const response = await fetch('/api/tire-storage/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify(data)
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Lastik seti yerleştirilirken hata oluştu',
        error: error.message
      };
    }
  },

  // Barkod ile lastik seti bul
  findTireSetByBarcode: async (barcode: string) => {
    try {
      const response = await fetch(`/api/tire-storage/find/${barcode}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`
        }
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Lastik seti bulunurken hata oluştu',
        error: error.message
      };
    }
  },

  // Lastik seti teslim et
  retrieveTireSet: async (tireStorageId: string) => {
    try {
      const response = await fetch(`/api/tire-storage/retrieve/${tireStorageId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`
        }
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Lastik seti teslim edilirken hata oluştu',
        error: error.message
      };
    }
  },

  // Depo durumunu getir
  getTireDepotStatus: async () => {
    try {
      const response = await fetch('/api/tire-storage/depot-status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await getAuthToken()}`
        }
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Depo durumu getirilirken hata oluştu',
        error: error.message
      };
    }
  },

  // Sezonluk hatırlatma gönder
  sendSeasonalReminders: async (season: 'summer' | 'winter') => {
    try {
      const response = await fetch('/api/tire-storage/send-seasonal-reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify({ season })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Hatırlatma gönderilirken hata oluştu',
        error: error.message
      };
    }
  },

  // Depo düzeni oluştur/güncelle
  setupDepot: async (corridors: Array<{
    name: string;
    racks: number;
    slotsPerRack: number;
  }>) => {
    try {
      const response = await fetch('/api/tire-storage/setup-depot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify({ corridors })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Depo düzeni oluşturulurken hata oluştu',
        error: error.message
      };
    }
  },

  // Hatırlatma ayarlarını oluştur/güncelle
  setupReminders: async (settings: {
    summerReminder: {
      enabled: boolean;
      startDate: string;
      endDate: string;
      message: string;
    };
    winterReminder: {
      enabled: boolean;
      startDate: string;
      endDate: string;
      message: string;
    };
  }) => {
    try {
      const response = await fetch('/api/tire-storage/setup-reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getAuthToken()}`
        },
        body: JSON.stringify(settings)
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Hatırlatma ayarları oluşturulurken hata oluştu',
        error: error.message
      };
    }
  }
};

// Auth token helper
const getAuthToken = async () => {
  // Bu fonksiyon mevcut auth sisteminden token alacak
  // Şimdilik mock token döndürüyoruz
  return 'mock_token';
};
