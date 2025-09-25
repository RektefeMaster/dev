import { useState, useEffect } from 'react';
import { getRealUserLocation, getFallbackUserLocation } from '@/shared/utils/distanceCalculator';

export const useLocationData = () => {
  const [userLocation, setUserLocation] = useState(getFallbackUserLocation());
  const [locationAddress, setLocationAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchUserLocation = async () => {
    setLoading(true);
    try {
      const location = await getRealUserLocation();
      if (location) {
        setUserLocation(location);
        await reverseGeocode(location);
      }
    } catch (error) {
      console.log('Konum alınamadı, varsayılan konum kullanılıyor');
    } finally {
      setLoading(false);
    }
  };

  const reverseGeocode = async (coordinates: any) => {
    try {
      const geocodingResponse = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coordinates.latitude}&lon=${coordinates.longitude}&addressdetails=1&accept-language=tr&zoom=18&extratags=1`
      );

      if (geocodingResponse.ok) {
        const geocodingData = await geocodingResponse.json();
        
        if (geocodingData && geocodingData.address) {
          const address = geocodingData.address;
          let formattedAddress = '';
          
          if (address.neighbourhood || address.suburb) {
            formattedAddress += (address.neighbourhood || address.suburb) + ', ';
          }
          if (address.district || address.city_district) {
            formattedAddress += (address.district || address.city_district) + ', ';
          }
          if (address.city || address.town || address.municipality) {
            formattedAddress += (address.city || address.town || address.municipality);
          }
          
          setLocationAddress(formattedAddress || geocodingData.display_name);
        } else {
          setLocationAddress(`${coordinates.latitude}, ${coordinates.longitude}`);
        }
      }
    } catch (error) {
      console.log('Adres bilgisi alınamadı:', error);
      setLocationAddress(`${coordinates.latitude}, ${coordinates.longitude}`);
    }
  };

  useEffect(() => {
    fetchUserLocation();
  }, []);

  return {
    userLocation,
    locationAddress,
    loading,
    fetchUserLocation,
  };
};
