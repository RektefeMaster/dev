import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/shared/services/api';
import { withErrorHandling } from '@/shared/utils/errorHandler';
import { sortMechanicsByDistance, getFallbackUserLocation, getRealUserLocation } from '@/shared/utils/distanceCalculator';
import { MechanicSearchResult } from '@/shared/types/common';

export const useMechanicSearch = () => {
  const { userId } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState<string>('');
  const [mechanics, setMechanics] = useState<MechanicSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'rating' | 'experience' | 'jobs' | 'distance'>('rating');
  const [userLocation, setUserLocation] = useState(getFallbackUserLocation());
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [locationLoaded, setLocationLoaded] = useState(false);

  // Çalışma saatlerini parse eden yardımcı fonksiyon
  const parseWorkingHours = useCallback((workingHoursString: string | undefined | null) => {
    if (!workingHoursString) return [];
    try {
      // Eğer zaten obje ise direkt kullan
      if (typeof workingHoursString === 'object' && workingHoursString !== null) {
        const workingHours = workingHoursString as any;
        if (!Array.isArray(workingHours)) return [];
        return workingHours.map((day: any) => ({
          day: day.day,
          isWorking: day.isWorking,
          startTime: day.startTime,
          endTime: day.endTime,
          isBreak: day.isBreak,
          breakStartTime: day.breakStartTime,
          breakEndTime: day.breakEndTime
        }));
      }
      
      // String ise parse et
      let workingHours;
      try {
        workingHours = JSON.parse(workingHoursString);
      } catch {
        return [];
      }
      
      if (!Array.isArray(workingHours)) return [];
      
      return workingHours.map((day: any) => ({
        day: day.day,
        isWorking: day.isWorking,
        startTime: day.startTime,
        endTime: day.endTime,
        isBreak: day.isBreak,
        breakStartTime: day.breakStartTime,
        breakEndTime: day.breakEndTime
      }));
    } catch (error) {
      console.error('Çalışma saatleri parse edilemedi:', error);
      return [];
    }
  }, []);

  const fetchMechanics = useCallback(async () => {
    const { data, error } = await withErrorHandling(
      () => apiService.getMechanics(),
      { showErrorAlert: false }
    );

    if (data && data.success) {
      // Çekici ustalarını özel olarak kontrol et
      const towingMechanics = data.data.filter((mech: any) => 
        mech.serviceCategories?.some((cat: string) => 
          cat.toLowerCase().includes('çekici') || 
          cat.toLowerCase().includes('towing')
        )
      );

      // Her mekanik için detaylı bilgileri getir
      const mechanicsWithDetails = await Promise.all(
        data.data.map(async (mech: any) => {
          try {
            // Detaylı bilgileri getir
            const detailsResponse = await apiService.getMechanicById(mech._id);
            if (detailsResponse.success) {
              return detailsResponse.data;
            }
            return mech; // Detay getirilemezse temel bilgileri kullan
          } catch (error) {
            return mech; // Hata durumunda temel bilgileri kullan
          }
        })
      );

      // Konuma göre sırala
      const sortedMechanics = sortMechanicsByDistance(mechanicsWithDetails, userLocation);
      setMechanics(sortedMechanics);
    }
  }, [userLocation]);

  const loadUserLocation = useCallback(async () => {
    setIsLocationLoading(true);
    try {
      const location = await getRealUserLocation();
      if (location) {
        setUserLocation(location);
        setLocationLoaded(true);
      }
    } catch (error) {
      console.log('Konum alınamadı, varsayılan konum kullanılıyor');
    } finally {
      setIsLocationLoading(false);
    }
  }, []);

  const filterMechanics = useCallback((mechanicsToFilter: MechanicSearchResult[]) => {
    let filtered = [...mechanicsToFilter];

    // Arama sorgusu filtresi
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(mechanic =>
        mechanic.name.toLowerCase().includes(query) ||
        mechanic.surname.toLowerCase().includes(query) ||
        mechanic.city.toLowerCase().includes(query) ||
        mechanic.serviceCategories?.some((cat: string) => 
          cat.toLowerCase().includes(query)
        ) ||
        mechanic.bio?.toLowerCase().includes(query) ||
        mechanic.shopName?.toLowerCase().includes(query)
      );
    }

    // Hizmet türü filtresi
    if (selectedService) {
      filtered = filtered.filter(mechanic =>
        mechanic.serviceCategories?.some((cat: string) =>
          cat.toLowerCase().includes(selectedService.toLowerCase())
        )
      );
    }

    // Diğer filtreler
    if (selectedFilters.length > 0) {
      filtered = filtered.filter(mechanic => {
        return selectedFilters.every(filter => {
          switch (filter) {
            case 'available':
              return mechanic.isAvailable;
            case 'high_rating':
              return mechanic.rating >= 4.0;
            case 'experienced':
              return mechanic.experience >= 5;
            default:
              return true;
          }
        });
      });
    }

    return filtered;
  }, [searchQuery, selectedService, selectedFilters]);

  const sortMechanics = useCallback((mechanicsToSort: MechanicSearchResult[]) => {
    if (sortBy === 'distance' && userLocation) {
      return sortMechanicsByDistance(mechanicsToSort, userLocation);
    }
    
    return [...mechanicsToSort].sort((a, b) => {
      switch (sortBy) {
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'experience':
          return (b.experience || 0) - (a.experience || 0);
        case 'jobs':
          return (b.totalJobs || 0) - (a.totalJobs || 0);
        default:
          return 0;
      }
    });
  }, [sortBy, userLocation]);

  // İlk yükleme
  useEffect(() => {
    loadUserLocation();
  }, [loadUserLocation]);

  useEffect(() => {
    if (locationLoaded) {
      fetchMechanics();
    }
  }, [locationLoaded, fetchMechanics]);

  return {
    // State
    searchQuery,
    selectedService,
    mechanics,
    loading,
    selectedFilters,
    sortBy,
    userLocation,
    isLocationLoading,
    locationLoaded,
    
    // Actions
    setSearchQuery,
    setSelectedService,
    setLoading,
    setSelectedFilters,
    setSortBy,
    fetchMechanics,
    loadUserLocation,
    filterMechanics,
    sortMechanics,
    parseWorkingHours,
  };
};
