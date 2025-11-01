import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, FlatList, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '@/context/ThemeContext';
import { NavigationProps, MechanicSearchResult } from '@/shared/types/common';
import { openLocationInMaps } from '@/shared/utils/distanceCalculator';
import { useMechanicSearch } from '../hooks/useMechanicSearch';
import { useSearchUI } from '../hooks/useSearchUI';
import { SearchBar, MechanicCard } from '../components';

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

      {/* TODO: Filters Component */}
      {showFilters && (
        <View style={styles.filtersPlaceholder}>
          {/* SearchFilters component buraya gelecek */}
        </View>
      )}

      {/* Results List */}
      <FlatList
        data={processedMechanics}
        keyExtractor={(item) => item._id}
        renderItem={renderMechanicItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        onRefresh={fetchMechanics}
        refreshing={loading}
      />

      {/* TODO: Map View */}
      {showMapView && (
        <View style={styles.mapPlaceholder}>
          {/* Map component buraya gelecek */}
        </View>
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
  },
  filtersPlaceholder: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholder: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    bottom: 0,
  },
});

export default MechanicSearchScreen;
