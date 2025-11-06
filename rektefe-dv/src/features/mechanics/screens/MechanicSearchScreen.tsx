import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useTheme } from '@/context/ThemeContext';
import { NavigationProps, MechanicSearchResult } from '@/shared/types/common';
import { openLocationInMaps } from '@/shared/utils/distanceCalculator';
import { useMechanicSearch } from '../hooks/useMechanicSearch';
import { useSearchUI } from '../hooks/useSearchUI';
import { SearchBar, SearchFilters, MechanicCard } from '../components';
import EmptyState from '@/shared/components/NoDataCard';
import ErrorState from '@/shared/components/ErrorState';
import LoadingSkeleton from '@/shared/components/LoadingSkeleton';

const MechanicSearchScreen: React.FC<NavigationProps> = ({ navigation, route }) => {
  const { theme } = useTheme();
  
  const {
    searchQuery,
    selectedService,
    mechanics,
    loading,
    selectedFilters,
    sortBy,
    userLocation,
    isLocationLoading,
    setSearchQuery,
    setSelectedService,
    setLoading,
    setSelectedFilters,
    setSortBy,
    fetchMechanics,
    loadUserLocation,
    filterMechanics,
    sortMechanics,
  } = useMechanicSearch();

  const {
    searchFocused,
    showFilters,
    expandedCards,
    showMapView,
    selectedMechanic,
    setSearchFocused,
    setShowFilters,
    setShowMapView,
    setSelectedMechanic,
    toggleCardExpansion,
    isCardExpanded,
  } = useSearchUI();

  // Filtered ve sorted mechanics
  const processedMechanics = useMemo(() => {
    const filtered = filterMechanics(mechanics);
    return sortMechanics(filtered);
  }, [mechanics, filterMechanics, sortMechanics]);

  // Screen focus effect
  useFocusEffect(
    useCallback(() => {
      if (route.params?.serviceType) {
        setSelectedService(route.params.serviceType as string);
      }
      
      if (!mechanics.length) {
        fetchMechanics();
      }
    }, [route.params, mechanics.length, fetchMechanics, setSelectedService])
  );

  const handleMechanicPress = (mechanic: MechanicSearchResult) => {
    console.log('🔍 MechanicSearchScreen handleMechanicPress: Fonksiyon çağrıldı');
    console.log('🔍 Mechanic data:', mechanic);
    
    navigation.navigate('MechanicDetail' as never, { mechanic } as never);
    
    console.log('✅ MechanicSearchScreen: Navigation çağrısı yapıldı');
  };

  const handleCallMechanic = async (mechanic: MechanicSearchResult) => {
    if (!mechanic.phone) {
      Alert.alert('Bilgi', 'Bu ustanın telefon numarası kayıtlı değil.');
      return;
    }

    Alert.alert(
      'Telefon Araması',
      `${mechanic.name} ${mechanic.surname}'i aramak istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Ara',
          onPress: () => {
            const phoneUrl = `tel:${mechanic.phone}`;
            Linking.canOpenURL(phoneUrl).then((supported) => {
              if (supported) {
                Linking.openURL(phoneUrl);
              } else {
                Alert.alert('Hata', 'Telefon uygulaması açılamadı.');
              }
            });
          },
        },
      ]
    );
  };

  const handleMessageMechanic = (mechanic: MechanicSearchResult) => {
    navigation.navigate('ChatScreen' as never, {
      otherParticipant: {
        _id: mechanic._id,
        name: mechanic.name,
        surname: mechanic.surname,
        avatar: mechanic.avatar,
        userType: 'mechanic'
      }
    });
  };

  const handleOpenInMaps = async (mechanic: MechanicSearchResult) => {
    if (mechanic.location?.coordinates) {
      const coords = mechanic.location.coordinates;
      const latitude = coords.latitude;
      const longitude = coords.longitude;
      await openLocationInMaps({ latitude, longitude }, mechanic.name);
    } else {
      Alert.alert('Bilgi', 'Bu ustanın konum bilgisi mevcut değil.');
    }
  };

  const renderMechanicItem = ({ item }: { item: MechanicSearchResult }) => (
    <MechanicCard
      mechanic={item}
      isExpanded={isCardExpanded(item._id)}
      onToggleExpansion={() => toggleCardExpansion(item._id)}
      onPress={() => handleMechanicPress(item)}
      onCall={() => handleCallMechanic(item)}
      onMessage={() => handleMessageMechanic(item)}
      onOpenInMaps={() => handleOpenInMaps(item)}
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      {/* Search Bar */}
      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchFocused={searchFocused}
        onSearchFocus={() => setSearchFocused(true)}
        onSearchBlur={() => setSearchFocused(false)}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        showMapView={showMapView}
        onToggleMapView={() => setShowMapView(!showMapView)}
      />

      {/* Filters Component */}
      {showFilters && (
        <SearchFilters
          selectedFilters={selectedFilters}
          sortBy={sortBy}
          onFiltersChange={setSelectedFilters}
          onSortChange={setSortBy}
          onClose={() => setShowFilters(false)}
        />
      )}

      {/* Loading State */}
      {loading && processedMechanics.length === 0 && (
        <LoadingSkeleton variant="list" count={5} />
      )}

      {/* Error State */}
      {!loading && processedMechanics.length === 0 && mechanics.length === 0 && (
        <ErrorState
          message="Usta bilgileri yüklenirken bir hata oluştu."
          onRetry={fetchMechanics}
          title="Yükleme Hatası"
        />
      )}

      {/* Empty State */}
      {!loading && processedMechanics.length === 0 && mechanics.length > 0 && (
        <EmptyState
          icon="search-outline"
          title="Sonuç Bulunamadı"
          subtitle="Arama kriterlerinize uygun usta bulunamadı. Filtreleri değiştirerek tekrar deneyin."
          actionText="Filtreleri Temizle"
          onActionPress={() => {
            setSelectedFilters([]);
            setSortBy('rating');
            setSearchQuery('');
          }}
        />
      )}

      {/* Map View */}
      {showMapView ? (
        <View style={styles.mapContainer}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: userLocation?.latitude || 41.0082,
              longitude: userLocation?.longitude || 28.9784,
              latitudeDelta: 0.1,
              longitudeDelta: 0.1,
            }}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            {processedMechanics.map((mechanic) => {
              if (!mechanic.location?.coordinates) return null;
              return (
                <Marker
                  key={mechanic._id}
                  coordinate={{
                    latitude: mechanic.location.coordinates.latitude,
                    longitude: mechanic.location.coordinates.longitude,
                  }}
                  title={`${mechanic.name} ${mechanic.surname}`}
                  description={mechanic.shopName || mechanic.city}
                  onPress={() => handleMechanicPress(mechanic)}
                />
              );
            })}
          </MapView>
        </View>
      ) : (
        /* Results List */
      <FlatList
        data={processedMechanics}
          keyExtractor={(item) => item._id || 'unknown'}
        renderItem={renderMechanicItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        onRefresh={fetchMechanics}
        refreshing={loading}
          ListEmptyComponent={
            !loading && mechanics.length === 0 ? (
              <ErrorState
                message="Usta bilgileri yüklenirken bir hata oluştu."
                onRetry={fetchMechanics}
                title="Yükleme Hatası"
              />
            ) : !loading && processedMechanics.length === 0 ? (
              <EmptyState
                icon="search-outline"
                title="Sonuç Bulunamadı"
                subtitle="Arama kriterlerinize uygun usta bulunamadı. Filtreleri değiştirerek tekrar deneyin."
                actionText="Filtreleri Temizle"
                onActionPress={() => {
                  setSelectedFilters([]);
                  setSortBy('rating');
                  setSearchQuery('');
                }}
              />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
});

export default MechanicSearchScreen;
