import { useState, useMemo, useCallback, useEffect } from 'react';
import { useUserData } from './useUserData';
import { useVehicleData } from './useVehicleData';
import { useMechanicsData } from './useMechanicsData';
import { useLocationData } from './useLocationData';
import { HomeService, HomeOverviewResponse } from '@/shared/services/modules/homeService';
import { withErrorHandling } from '@/shared/utils/errorHandler';
import { useAuth } from '@/context/AuthContext';

type HomeOverview = HomeOverviewResponse extends { data: infer T } ? T : null;

type HomeOverviewData =
  HomeOverview extends Record<string, any>
    ? HomeOverview
    : {
        maintenanceRecords?: any[];
        insurancePolicy?: any;
        vehicleStatus?: any;
        tireStatus?: any;
        campaigns?: any[];
        ads?: any[];
        odometerEstimate?: any;
      };

export const useHomeData = () => {
  const { userId, token } = useAuth();
  const { userProfile, loading: userLoading, fetchUserProfile } = useUserData();
  const { vehicles, favoriteCar, loading: vehicleLoading, fetchVehicles } = useVehicleData();
  const { userLocation, locationAddress, loading: locationLoading, fetchUserLocation } = useLocationData();
  const { nearestMechanic, mechanics, loading: mechanicsLoading, fetchNearestMechanic } = useMechanicsData(userLocation);

  const [overview, setOverview] = useState<HomeOverviewData | null>(null);
  const [homeLoading, setHomeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHomeOverview = useCallback(async () => {
    if (!token) {
      return;
    }

    setHomeLoading(true);
    setError(null);

    const { data, error } = await withErrorHandling(
      () => HomeService.getOverview(),
      {
        showErrorAlert: false,
        onError: err => setError(err?.message ?? 'Ana sayfa verileri yüklenemedi.'),
      }
    );

    if (data?.success && data.data) {
      setOverview(data.data as HomeOverviewData);
    } else {
      setOverview(null);
      if (!error) {
        setError('Ana sayfa verileri yüklenemedi.');
      }
    }

    setHomeLoading(false);
  }, [token]);

  const refreshAllData = useCallback(async () => {
    await Promise.all([
      fetchUserProfile(),
      fetchVehicles(),
      fetchUserLocation(),
      fetchNearestMechanic(),
      fetchHomeOverview(),
    ]);
  }, [fetchUserProfile, fetchVehicles, fetchUserLocation, fetchNearestMechanic, fetchHomeOverview]);

  useEffect(() => {
    if (token) {
      fetchHomeOverview();
    }
  }, [token, fetchHomeOverview]);

  const loading = useMemo(
    () => userLoading || vehicleLoading || locationLoading || mechanicsLoading || homeLoading,
    [userLoading, vehicleLoading, locationLoading, mechanicsLoading, homeLoading]
  );

  return {
    userProfile,
    userName: userProfile?.name || '',
    userId: userProfile?._id || userId || '',
    vehicles,
    favoriteCar,
    maintenanceRecords: overview?.maintenanceRecords ?? [],
    maintenanceRecord: overview?.maintenanceRecords?.[0] ?? null,
    insuranceInfo: overview?.insurancePolicy ?? null,
    tireStatus: overview?.tireStatus ?? null,
    campaigns: overview?.campaigns ?? [],
    ads: overview?.ads ?? [],
    odometerEstimate: overview?.odometerEstimate ?? null,
    userLocation,
    locationAddress,
    nearestMechanic,
    mechanics,
    serviceProviders: mechanics,
    loading,
    userLoading,
    vehicleLoading,
    locationLoading,
    mechanicsLoading,
    overviewLoading: homeLoading,
    error,
    refreshAllData,
    refreshData: refreshAllData,
    fetchUserProfile,
    fetchVehicles,
    fetchUserLocation,
    fetchNearestMechanic,
    fetchHomeOverview,
  };
};
