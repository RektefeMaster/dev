import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/shared/services/api';
import { withErrorHandling } from '@/shared/utils/errorHandler';
import { sortMechanicsByDistance, getFallbackUserLocation } from '@/shared/utils/distanceCalculator';

export const useMechanicsData = (userLocation: any) => {
  const { token } = useAuth();
  const [nearestMechanic, setNearestMechanic] = useState<any>(null);
  const [mechanics, setMechanics] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNearestMechanic = async () => {
    if (!token) return;

    setLoading(true);
    const { data, error } = await withErrorHandling(
      () => apiService.getMechanics(),
      { showErrorAlert: false }
    );

    if (data && data.success && data.data && data.data.length > 0) {
      const mechanicsList = data.data;
      
      // Her mekanik için detaylı bilgileri getir
      const mechanicsWithDetails = await Promise.all(
        mechanicsList.map(async (mech: any) => {
          try {
            const detailsResponse = await apiService.getMechanicById(mech._id);
            if (detailsResponse.success) {
              return {
                ...mech,
                ...detailsResponse.data,
                location: mech.location || detailsResponse.data.location,
              };
            }
            return mech;
          } catch (error) {
            return mech;
          }
        })
      );

      // Konuma göre sırala
      const currentLocation = userLocation || getFallbackUserLocation();
      const sortedMechanics = sortMechanicsByDistance(mechanicsWithDetails, currentLocation);
      
      setMechanics(sortedMechanics);
      
      // En yakın ustayı seç
      const nearest = sortedMechanics.find(m => m.distance && m.distance !== Infinity);
      if (nearest) {
        setNearestMechanic(nearest);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNearestMechanic();
  }, [token, userLocation]);

  return {
    nearestMechanic,
    mechanics,
    loading,
    fetchNearestMechanic,
  };
};
