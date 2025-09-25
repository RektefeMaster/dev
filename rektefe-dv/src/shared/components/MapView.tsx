import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Text, Dimensions, TouchableOpacity, ScrollView, Linking, Platform } from 'react-native';
import { useThemeColor } from '@/shared/hooks/useThemeColor';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { normalizeCoordinate } from '@/shared/utils/distanceCalculator';

interface MapViewProps {
  markers?: Array<{
    id: string;
    coordinate: {
      latitude: number;
      longitude: number;
    };
    title: string;
    description?: string;
  }>;
  onMarkerPress?: (marker: any) => void;
  onRegionChange?: (region: any) => void;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  style?: any;
  showUserLocation?: boolean;
  followUserLocation?: boolean;
  showMarkersList?: boolean;
}

const CustomMapView: React.FC<MapViewProps> = ({
  markers = [],
  onMarkerPress,
  onRegionChange,
  initialRegion,
  style,
  showUserLocation = true,
  followUserLocation = false,
  showMarkersList = true,
}) => {
  const [region, setRegion] = useState(initialRegion || {
    latitude: 41.0082, // İstanbul koordinatları
    longitude: 28.9784,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);

  const backgroundColor = useThemeColor({}, 'light');
  const textColor = useThemeColor({}, 'dark');

  // Harita türü - OpenStreetMap kullan
  const USE_OPENSTREETMAP = true;
  const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY'; // Google Maps için API key

  // Konum izni isteme - Geçici olarak devre dışı
  const requestLocationPermission = async () => {
    // Geçici olarak devre dışı - konum özelliği olmadan çalışır
    setHasLocationPermission(false);
    return false;
  };

  // Kullanıcı konumunu al - Geçici olarak devre dışı
  const getUserLocation = async () => {
    // Geçici olarak devre dışı
    setUserLocation(null);
  };

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    if (hasLocationPermission) {
      getUserLocation();
    }
  }, [hasLocationPermission]);

  const handleRegionChange = (newRegion: any) => {
    setRegion(newRegion);
    if (onRegionChange) {
      onRegionChange(newRegion);
    }
  };

  // Harita HTML oluştur (Google Maps veya OpenStreetMap)
  const generateMapHTML = () => {
    const markersData = markers.map(marker => {
      const coord = normalizeCoordinate(marker.coordinate) || (marker.coordinate as any);
      return {
        id: marker.id,
        lat: coord.latitude,
        lng: coord.longitude,
        title: marker.title,
        description: marker.description
      };
    });

    const userLocationData = userLocation ? {
      lat: userLocation.latitude,
      lng: userLocation.longitude
    } : null;

    if (USE_OPENSTREETMAP) {
      // OpenStreetMap kullan
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
          <style>
            body { margin: 0; padding: 0; }
            #map { width: 100%; height: 100vh; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            const markers = ${JSON.stringify(markersData)};
            const userLocation = ${JSON.stringify(userLocationData)};
            const initialRegion = ${JSON.stringify(region)};

            const map = L.map('map').setView([initialRegion.latitude, initialRegion.longitude], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            // Kullanıcı konumu marker'ı
            if (userLocation) {
              const userIcon = L.divIcon({
                className: 'user-marker',
                html: '<div style="width: 24px; height: 24px; background: #3B82F6; border: 2px solid white; border-radius: 50%;"></div>',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
              });
              
              L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
                .addTo(map)
                .bindPopup('Konumunuz');
            }

            // Usta marker'ları
            markers.forEach(marker => {
              const mechanicIcon = L.divIcon({
                className: 'mechanic-marker',
                html: '<div style="width: 32px; height: 32px; background: #10B981; border: 2px solid white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px;">📞</div>',
                iconSize: [32, 32],
                iconAnchor: [16, 16]
              });

              const markerObj = L.marker([marker.lat, marker.lng], { icon: mechanicIcon })
                .addTo(map)
                .bindPopup(\`
                  <div style="padding: 8px;">
                    <h3 style="margin: 0 0 4px 0; font-size: 14px;">\${marker.title}</h3>
                    <p style="margin: 0; font-size: 12px; color: #666;">\${marker.description}</p>
                  </div>
                \`);

              markerObj.on('click', () => {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'markerClick',
                  markerId: marker.id
                }));
              });
            });

            // Harita değişikliklerini dinle
            map.on('moveend', () => {
              const center = map.getCenter();
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'regionChange',
                region: {
                  latitude: center.lat,
                  longitude: center.lng,
                  latitudeDelta: 0.0922,
                  longitudeDelta: 0.0421
                }
              }));
            });
          </script>
        </body>
        </html>
      `;
    } else {
      // Google Maps kullan
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <script src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places"></script>
          <style>
            body { margin: 0; padding: 0; }
            #map { width: 100%; height: 100vh; }
          </style>
        </head>
        <body>
          <div id="map"></div>
          <script>
            const markers = ${JSON.stringify(markersData)};
            const userLocation = ${JSON.stringify(userLocationData)};
            const initialRegion = ${JSON.stringify(region)};

            function initMap() {
              const map = new google.maps.Map(document.getElementById('map'), {
                zoom: 13,
                center: { lat: initialRegion.latitude, lng: initialRegion.longitude },
                mapTypeId: 'roadmap',
                styles: [
                  {
                    featureType: 'poi',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }]
                  }
                ]
              });

              // Kullanıcı konumu marker'ı
              if (userLocation) {
                new google.maps.Marker({
                  position: { lat: userLocation.lat, lng: userLocation.lng },
                  map: map,
                  title: 'Konumunuz',
                  icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(\`
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="8" fill="#3B82F6" stroke="white" stroke-width="2"/>
                      </svg>
                    \`),
                    scaledSize: new google.maps.Size(24, 24)
                  }
                });
              }

              // Usta marker'ları
              markers.forEach(marker => {
                const markerObj = new google.maps.Marker({
                  position: { lat: marker.lat, lng: marker.lng },
                  map: map,
                  title: marker.title,
                  icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(\`
                      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="16" cy="16" r="12" fill="#10B981" stroke="white" stroke-width="2"/>
                        <text x="16" y="20" text-anchor="middle" fill="white" font-size="12" font-weight="bold">📞</text>
                      </svg>
                    \`),
                    scaledSize: new google.maps.Size(32, 32)
                  }
                });

                const infoWindow = new google.maps.InfoWindow({
                  content: \`
                    <div style="padding: 8px;">
                      <h3 style="margin: 0 0 4px 0; font-size: 14px;">\${marker.title}</h3>
                      <p style="margin: 0; font-size: 12px; color: #666;">\${marker.description}</p>
                    </div>
                  \`
                });

                markerObj.addListener('click', () => {
                  infoWindow.open(map, markerObj);
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'markerClick',
                    markerId: marker.id
                  }));
                });
              });

              // Harita değişikliklerini dinle
              map.addListener('center_changed', () => {
                const center = map.getCenter();
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'regionChange',
                  region: {
                    latitude: center.lat(),
                    longitude: center.lng(),
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421
                  }
                }));
              });
            }

            window.onload = initMap;
          </script>
        </body>
        </html>
      `;
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      if (data.type === 'markerClick') {
        const marker = markers.find(m => m.id === data.markerId);
        if (marker && onMarkerPress) {
          onMarkerPress(marker);
        }
      } else if (data.type === 'regionChange') {
        handleRegionChange(data.region);
      }
    } catch (error) {
      }
  };

  // Harici harita uygulamasını aç
  const openInMaps = (coordinate: { latitude: number; longitude: number }, title: string) => {
    const { latitude, longitude } = coordinate;
    
    if (Platform.OS === 'ios') {
      // iOS için Apple Maps
      const url = `http://maps.apple.com/?q=${title}&ll=${latitude},${longitude}`;
      Linking.openURL(url).catch(() => {
        // Apple Maps yoksa Google Maps'i dene
        const googleUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        Linking.openURL(googleUrl);
      });
    } else {
      // Android için Google Maps
      const url = `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(title)})`;
      Linking.openURL(url).catch(() => {
        // Google Maps yoksa web versiyonunu aç
        const webUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        Linking.openURL(webUrl);
      });
    }
  };

  // Tüm ustaları haritada göster
  const showAllInMaps = () => {
    if (markers.length === 0) return;
    
    const firstMarker = markers[0];
    const { latitude, longitude } = firstMarker.coordinate;
    
    if (Platform.OS === 'ios') {
      const url = `http://maps.apple.com/?ll=${latitude},${longitude}&z=13`;
      Linking.openURL(url);
    } else {
      const url = `geo:${latitude},${longitude}?z=13`;
      Linking.openURL(url).catch(() => {
        const webUrl = `https://www.google.com/maps/@${latitude},${longitude},13z`;
        Linking.openURL(webUrl);
      });
    }
  };

  // Usta arama fonksiyonu
  const handleCallMechanic = (marker: any) => {
    // Marker'dan telefon numarasını al
    const phoneNumber = marker.phone || '+90 555 123 4567';
    const phoneUrl = `tel:${phoneNumber}`;
    Linking.openURL(phoneUrl).catch(err => {
      Alert.alert('Hata', 'Telefon araması başlatılamadı');
    });
  };

  // Harita açma fonksiyonu
  const handleOpenMap = (marker: any) => {
    openInMaps(marker.coordinate, marker.title);
  };

  // Profil görüntüleme fonksiyonu
  const handleViewProfile = (marker: any) => {
    // Eğer marker'da mechanic bilgisi varsa, onMarkerPress'i çağır
    if (onMarkerPress && marker.mechanic) {
      onMarkerPress(marker);
    } else {
      Alert.alert('Profil', `${marker.title} profil sayfasına yönlendiriliyorsunuz...`);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.mapContainer}>

        {/* Marker Listesi - Sadece showMarkersList true ise göster */}
        {showMarkersList && (
          <ScrollView style={styles.markersList}>
            {markers.map((marker) => (
              <View
                key={marker.id}
                style={[styles.markerItem, { backgroundColor: backgroundColor }]}
              >
                <TouchableOpacity
                  style={styles.markerContent}
                  onPress={() => handleViewProfile(marker)}
                >
                  <View style={styles.markerIcon}>
                    <View style={styles.markerIconContainer}>
                      <MaterialCommunityIcons name="phone" size={20} color="#FFFFFF" />
                    </View>
                  </View>
                  <View style={styles.markerInfo}>
                    <Text style={[styles.markerTitle, { color: textColor }]}>
                      {marker.title} Usta
                    </Text>
                    {marker.description && (
                      <Text style={[styles.markerDescription, { color: textColor }]}>
                        {marker.description}
                      </Text>
                    )}
                    <Text style={[styles.markerCoordinates, { color: textColor }]}>
                      📍 {marker.coordinate.latitude.toFixed(4)}, {marker.coordinate.longitude.toFixed(4)}
                    </Text>
                  </View>
                </TouchableOpacity>
                <View style={styles.markerActions}>
                  <TouchableOpacity
                    style={[styles.markerActionButton, { backgroundColor: '#10B981' }]}
                    onPress={() => handleCallMechanic(marker)}
                  >
                    <MaterialCommunityIcons name="phone" size={16} color="#FFFFFF" />
                    <Text style={styles.markerActionText}>Ara</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.markerActionButton, { backgroundColor: '#3B82F6' }]}
                    onPress={() => handleOpenMap(marker)}
                  >
                    <MaterialCommunityIcons name="map" size={16} color="#FFFFFF" />
                    <Text style={styles.markerActionText}>Harita</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Kullanıcı Konumu */}
        {userLocation && (
          <View style={[styles.userLocationCard, { backgroundColor: backgroundColor }]}>
            <View style={styles.userLocationIcon}>
              <View style={styles.userLocationIconContainer}>
                <MaterialCommunityIcons name="crosshairs-gps" size={18} color="#FFFFFF" />
              </View>
            </View>
            <View style={styles.userLocationInfo}>
              <Text style={[styles.userLocationTitle, { color: textColor }]}>
                Konumunuz
              </Text>
              <Text style={[styles.userLocationCoords, { color: textColor }]}>
                📍 {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.userLocationButton, { backgroundColor: '#3B82F6' }]}
              onPress={() => openInMaps(userLocation, 'Konumunuz')}
            >
              <MaterialCommunityIcons name="map" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    padding: 16,
  },
  mapWrapper: {
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F8FAFC',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  mapButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  mapPlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
    opacity: 0.7,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mapTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
    flex: 1,
  },
  showAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  showAllText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  markersList: {
    flex: 1,
    marginBottom: 16,
  },
  markerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    marginBottom: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    backgroundColor: '#FFFFFF',
  },
  markerIcon: {
    marginRight: 16,
  },
  markerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  markerInfo: {
    flex: 1,
  },
  markerTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  markerDescription: {
    fontSize: 14,
    marginBottom: 4,
    opacity: 0.7,
  },
  markerCoordinates: {
    fontSize: 12,
    opacity: 0.6,
  },
  markerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  markerActions: {
    flexDirection: 'row',
    marginLeft: 12,
    gap: 8,
  },
  markerActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  markerActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  userLocationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    backgroundColor: '#FFFFFF',
  },
  userLocationIcon: {
    marginRight: 12,
  },
  userLocationIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  userLocationInfo: {
    flex: 1,
  },
  userLocationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  userLocationCoords: {
    fontSize: 12,
    opacity: 0.7,
  },
  userLocationButton: {
    padding: 8,
    borderRadius: 20,
  },
  mapInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  mapInfoText: {
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    fontStyle: 'italic',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default CustomMapView;
