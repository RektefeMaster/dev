import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { getRealUserLocation, getFallbackUserLocation, normalizeCoordinate, Coordinate } from '../utils/distanceCalculator';

interface LocationPickerProps {
  initialCoordinate?: Coordinate | any;
  onConfirm: (coordinate: Coordinate) => void;
  onCancel: () => void;
  title?: string;
}

const LocationPicker: React.FC<LocationPickerProps> = ({ initialCoordinate, onConfirm, onCancel, title }) => {
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Coordinate | null>(null);
  const mapRef = useRef<MapView | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const normalized = normalizeCoordinate(initialCoordinate);
        let start = normalized;
        if (!start) {
          start = await getRealUserLocation();
        }
        if (!start) {
          start = getFallbackUserLocation();
        }
        setSelected(start!);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const onRegionChangeComplete = (region: Region) => {
    setSelected({ latitude: region.latitude, longitude: region.longitude });
  };

  if (loading || !selected) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Harita yükleniyor…</Text>
      </View>
    );
  }

  const region: Region = {
    latitude: selected.latitude,
    longitude: selected.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <View style={styles.container}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <MapView
        ref={(r) => (mapRef.current = r)}
        style={styles.map}
        initialRegion={region}
        onRegionChangeComplete={onRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton
      >
        {selected && (
          <Marker
            coordinate={{ latitude: selected.latitude, longitude: selected.longitude }}
            title={'Seçilen Konum'}
            draggable
            onDragEnd={(e) => setSelected(e.nativeEvent.coordinate)}
          />
        )}
      </MapView>
      <View style={styles.footer}>
        <Text style={styles.coords}>
          📍 {selected.latitude.toFixed(6)}, {selected.longitude.toFixed(6)}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.button, styles.cancel]} onPress={onCancel}>
            <Text style={styles.buttonText}>İptal</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.confirm]}
            onPress={() => onConfirm(selected)}
          >
            <Text style={styles.buttonText}>Konumu Onayla</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700', padding: 16 },
  map: { flex: 1 },
  footer: {
    padding: 12,
    gap: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  coords: { textAlign: 'center', fontSize: 14 },
  actions: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancel: { backgroundColor: '#9CA3AF' },
  confirm: { backgroundColor: '#10B981' },
  buttonText: { color: '#fff', fontWeight: '700' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 8 },
});

export default LocationPicker;

