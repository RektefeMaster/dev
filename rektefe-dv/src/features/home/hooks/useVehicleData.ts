import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/shared/services/api';
import { withErrorHandling } from '@/shared/utils/errorHandler';

export const useVehicleData = () => {
  const { token } = useAuth();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [favoriteCar, setFavoriteCar] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const isFetchingRef = useRef(false); // Prevent duplicate calls

  const fetchVehicles = useCallback(async () => {
    if (!token || isFetchingRef.current) return;

    isFetchingRef.current = true;
    setLoading(true);
    
    try {
      const { data, error } = await withErrorHandling(
        () => apiService.getVehicles(),
        { showErrorAlert: false }
      );

      if (data && data.success && data.data) {
        const vehicleList = Array.isArray(data.data) ? data.data : (data.data.vehicles || []);
        setVehicles(vehicleList);
        
        // Favori aracı bul
        const favoriteVehicle = vehicleList.find((v: any) => v.isFavorite);
        if (favoriteVehicle) {
          setFavoriteCar({
            brand: favoriteVehicle.brand,
            model: favoriteVehicle.modelName || favoriteVehicle.model,
            plateNumber: favoriteVehicle.plateNumber,
            year: favoriteVehicle.year,
          });
        } else if (vehicleList.length > 0) {
          // Favori yoksa ilk aracı kullan
          const firstVehicle = vehicleList[0];
          setFavoriteCar({
            brand: firstVehicle.brand,
            model: firstVehicle.modelName || firstVehicle.model,
            plateNumber: firstVehicle.plateNumber,
            year: firstVehicle.year,
          });
        }
      }
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchVehicles();
    }
  }, [token, fetchVehicles]); // fetchVehicles useCallback ile optimize edildi

  return {
    vehicles,
    favoriteCar,
    loading,
    fetchVehicles,
  };
};
