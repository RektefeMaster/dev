import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiService } from '@/shared/services/api';
import { withErrorHandling } from '@/shared/utils/errorHandler';

export const useVehicleData = () => {
  const { token } = useAuth();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [favoriteCar, setFavoriteCar] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchVehicles = async () => {
    if (!token) return;

    setLoading(true);
    const { data, error } = await withErrorHandling(
      () => apiService.getVehicles(),
      { showErrorAlert: false }
    );

    if (data && data.success && data.data) {
      const vehicleList = data.data;
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
    setLoading(false);
  };

  useEffect(() => {
    fetchVehicles();
  }, [token]);

  return {
    vehicles,
    favoriteCar,
    loading,
    fetchVehicles,
  };
};
