// Mesafe hesaplama fonksiyonları

export interface Coordinate {
  latitude: number;
  longitude: number;
}

// Haversine formülü ile iki nokta arasındaki mesafeyi hesapla (km cinsinden)
export const calculateDistance = (
  coord1: Coordinate,
  coord2: Coordinate
): number => {
  const R = 6371; // Dünya'nın yarıçapı (km)
  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.latitude)) *
    Math.cos(toRadians(coord2.latitude)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
};

// Dereceyi radyana çevir
const toRadians = (degrees: number): number => {
  return degrees * (Math.PI / 180);
};

// Mesafeyi formatla (örn: 3.6 km, 850 m)
export const formatDistance = (distance: number): string => {
  if (distance < 1) {
    return `${Math.round(distance * 1000)} m`;
  } else {
    return `${distance.toFixed(1)} km`;
  }
};

import LocationService from '../services/locationService';

// Farklı formatlardaki koordinatları normalize et
export const normalizeCoordinate = (input: any): Coordinate | null => {
  if (!input) return null;

  // { latitude, longitude }
  if (
    typeof input === 'object' &&
    typeof input.latitude === 'number' &&
    typeof input.longitude === 'number'
  ) {
    return { latitude: input.latitude, longitude: input.longitude };
  }

  // { lat, lng }
  if (
    typeof input === 'object' &&
    typeof input.lat === 'number' &&
    typeof input.lng === 'number'
  ) {
    return { latitude: input.lat, longitude: input.lng };
  }

  // [lng, lat] (GeoJSON standardı)
  if (Array.isArray(input) && input.length === 2) {
    const [a, b] = input;
    if (typeof a === 'number' && typeof b === 'number') {
      return { latitude: b, longitude: a };
    }
  }

  return null;
};

// Kullanıcı konumu için fallback konum - sadece gerçek konum alınamadığında
export const getFallbackUserLocation = (): Coordinate => {
  return {
    latitude: 38.3575344, // Malatya Battalgazi - fallback
    longitude: 38.3498034
  };
};

// Gerçek kullanıcı konumunu al
export const getRealUserLocation = async (): Promise<Coordinate | null> => {
  try {
    const locationService = LocationService.getInstance();
    const userLocation = await locationService.getCurrentLocation();
    
    if (userLocation) {
      return {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude
      };
    }
    
    // Gerçek konum alınamazsa fallback konum döndür
    return getFallbackUserLocation();
  } catch (error) {
    console.error('❌ Kullanıcı konumu alınamadı:', error);
    return getFallbackUserLocation();
  }
};

// Ustaları mesafeye göre sırala
export const sortMechanicsByDistance = (
  mechanics: any[],
  userLocation: Coordinate
): any[] => {
  // Güvenli null checking
  if (!mechanics || !Array.isArray(mechanics)) {
    return [];
  }
  
  
  const mechanicsWithDistance = mechanics
    .map(mechanic => {
      // Önce location.coordinates, sonra address.coordinates kontrol et ve normalize et
      const raw = mechanic.location?.coordinates || mechanic.address?.coordinates;
      const coordinates = normalizeCoordinate(raw);

      console.log(`🔍 Processing mechanic ${mechanic.name}:`, {
        rawCoordinates: raw,
        normalizedCoordinates: coordinates,
        location: mechanic.location,
        address: mechanic.address
      });

      // Koordinatları geçerli mi kontrol et (0,0 koordinatlarını filtrele)
      const isValid = coordinates &&
        coordinates.latitude !== 0 && coordinates.longitude !== 0 &&
        coordinates.latitude >= -90 && coordinates.latitude <= 90 &&
        coordinates.longitude >= -180 && coordinates.longitude <= 180;

      if (isValid) {
        const distance = calculateDistance(userLocation, coordinates as Coordinate);
        console.log(`🔍 Distance calculation for ${mechanic.name}:`, {
          userLocation,
          mechanicCoordinates: coordinates,
          distance: distance.toFixed(2) + ' km',
          formattedDistance: formatDistance(distance)
        });
        return {
          ...mechanic,
          distance: distance,
          formattedDistance: formatDistance(distance)
        };
      } else {
        console.log(`⚠️ Invalid coordinates for ${mechanic.name}:`, coordinates);
      }
      
      return {
        ...mechanic,
        distance: Infinity,
        formattedDistance: 'Konum bilgisi yok'
      };
    });

  // Mesafeye göre sırala (en yakın önce)
  const sortedMechanics = mechanicsWithDistance.sort((a, b) => a.distance - b.distance);
  
  
  return sortedMechanics;
};

// En yakın ustayı bul
export const getNearestMechanic = (
  mechanics: any[],
  userLocation: Coordinate
): any | null => {
  const sortedMechanics = sortMechanicsByDistance(mechanics, userLocation);
  return sortedMechanics.length > 0 ? sortedMechanics[0] : null;
};

// Harita uygulamasında konum açma fonksiyonu
export const openLocationInMaps = (coordinate: Coordinate | any, title?: string) => {
  const normalized = normalizeCoordinate(coordinate) || coordinate;
  const { latitude, longitude } = normalized as Coordinate;
  const label = title ? encodeURIComponent(title) : 'Konum';
  
  // iOS için Apple Maps
  const appleMapsUrl = `http://maps.apple.com/?q=${label}&ll=${latitude},${longitude}`;
  
  // Android için Google Maps
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  
  return {
    appleMapsUrl,
    googleMapsUrl,
    coordinate,
    label
  };
};
