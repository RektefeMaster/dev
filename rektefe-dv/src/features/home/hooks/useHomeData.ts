import { useUserData } from './useUserData';
import { useVehicleData } from './useVehicleData';
import { useMechanicsData } from './useMechanicsData';
import { useLocationData } from './useLocationData';

export const useHomeData = () => {
  // Separate hooks for different data types
  const { userProfile, loading: userLoading, fetchUserProfile } = useUserData();
  const { vehicles, favoriteCar, loading: vehicleLoading, fetchVehicles } = useVehicleData();
  const { userLocation, locationAddress, loading: locationLoading, fetchUserLocation } = useLocationData();
  const { nearestMechanic, mechanics, loading: mechanicsLoading, fetchNearestMechanic } = useMechanicsData(userLocation);

  // Combined loading state
  const loading = userLoading || vehicleLoading || locationLoading || mechanicsLoading;

  // Refresh all data
  const refreshAllData = async () => {
    await Promise.all([
      fetchUserProfile(),
      fetchVehicles(),
      fetchUserLocation(),
      fetchNearestMechanic(),
    ]);
  };

  return {
    // User data
    userProfile,
    userName: userProfile?.name || '',
    userId: userProfile?._id || '',
    
    // Vehicle data
    vehicles,
    favoriteCar,
    maintenanceRecord: null as any, // TODO: Implement maintenance record
    insuranceInfo: null as any, // TODO: Implement insurance info
    vehicleStatus: null as any, // TODO: Implement vehicle status
    tireStatus: null as any, // TODO: Implement tire status
    
    // Location data
    userLocation,
    locationAddress,
    
    // Mechanics data
    nearestMechanic,
    mechanics,
    serviceProviders: mechanics, // Use mechanics as service providers
    
    // Campaigns and ads
    campaigns: [] as any[], // TODO: Implement campaigns
    ads: [] as any[], // TODO: Implement ads
    
    // Loading states
    loading,
    userLoading,
    vehicleLoading,
    locationLoading,
    mechanicsLoading,
    error: null as any, // TODO: Implement error handling
    
    // Actions
    refreshAllData,
    refreshData: refreshAllData, // Alias for refreshData
    fetchUserProfile,
    fetchVehicles,
    fetchUserLocation,
    fetchNearestMechanic,
  };
};
