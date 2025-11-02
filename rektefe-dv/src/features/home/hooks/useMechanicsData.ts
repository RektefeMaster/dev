import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/shared/services/api';
import { withErrorHandling } from '@/shared/utils/errorHandler';
import { sortMechanicsByDistance, getFallbackUserLocation } from '@/shared/utils/distanceCalculator';

export const useMechanicsData = (userLocation: any) => {
  const { token } = useAuth();
  const [nearestMechanic, setNearestMechanic] = useState<any>(null);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const isFetchingRef = useRef(false); // Prevent duplicate calls

  const fetchNearestMechanic = useCallback(async () => {
    if (!token || isFetchingRef.current) return;

    isFetchingRef.current = true;
    setLoading(true);
    
    try {
      const { data, error } = await withErrorHandling(
        () => apiService.getMechanics(),
        { showErrorAlert: false }
      );

      if (data && data.success && data.data && data.data.length > 0) {
        const mechanicsList = data.data;
        
        // ✅ OPTIMIZATION: Her mekanik için ayrı getMechanicById çağrısı YAPILMIYOR
        // getMechanics zaten yeterli bilgi veriyor, detay için sadece ihtiyaç olduğunda çağır
        // Sadece liste verilerini kullan, detay sayfasında getMechanicById çağırılacak

        // Konuma göre sırala (mevcut verilerle)
        const currentLocation = userLocation || getFallbackUserLocation();
        const sortedMechanics = sortMechanicsByDistance(mechanicsList, currentLocation);
        
        setMechanics(sortedMechanics);
        
        // En yakın ustayı seç
        const nearest = sortedMechanics.find(m => m.distance && m.distance !== Infinity);
        if (nearest) {
          setNearestMechanic(nearest);
        }
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [token, userLocation]); // userLocation dependency olarak kalmalı ama sadece token değiştiğinde çağrılacak

  useEffect(() => {
    // Sadece token varsa çağır - userLocation değişimlerinde gereksiz çağrı yapma
    if (token) {
      fetchNearestMechanic();
    }
  }, [token, fetchNearestMechanic]); // fetchNearestMechanic useCallback ile optimize edildi

  return {
    nearestMechanic,
    mechanics,
    loading,
    fetchNearestMechanic,
  };
};
