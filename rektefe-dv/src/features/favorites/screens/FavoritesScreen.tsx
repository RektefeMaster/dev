import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { RootStackParamList } from '@/navigation/AppNavigator';
import ScreenHeader from '@/shared/components/ScreenHeader';
import EmptyState from '@/shared/components/NoDataCard';
import ErrorState from '@/shared/components/ErrorState';
import LoadingSkeleton from '@/shared/components/LoadingSkeleton';
import { apiService } from '@/shared/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translateServiceName } from '@/shared/utils/serviceTranslator';

// Spacing ve borderRadius değerleri (import sorununu önlemek için doğrudan tanımla)
const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  card: 16,
  button: 12,
};

type FavoritesScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Favorites'>;

interface FavoriteMechanic {
  id: string;
  name: string;
  surname: string;
  avatar?: string;
  rating?: number;
  specialties?: string[];
  city?: string;
  isAvailable?: boolean;
}

interface FavoriteVehicle {
  id: string;
  brand: string;
  model: string;
  plateNumber: string;
  year?: number;
  image?: string;
}

type FavoriteType = 'mechanics' | 'vehicles' | 'services';

const createStyles = (theme: any) => {
  return StyleSheet.create({
    container: {
      flex: 1,
    },
    tabsContainer: {
      flexDirection: 'row',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      gap: spacing.sm,
    },
    tabButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.button,
      borderWidth: 1,
      gap: spacing.xs,
    },
    tabButtonText: {
      fontSize: 14,
      fontWeight: '500',
    },
    listContent: {
      padding: spacing.md,
      gap: spacing.md,
    },
    itemCard: {
      borderRadius: borderRadius.card,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    itemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    avatar: {
      width: 60,
      height: 60,
      borderRadius: 30,
      marginRight: spacing.md,
    },
    avatarPlaceholder: {
      width: 60,
      height: 60,
      borderRadius: 30,
      marginRight: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    vehicleImage: {
      width: 80,
      height: 60,
      borderRadius: borderRadius.sm,
      marginRight: spacing.md,
    },
    vehicleImagePlaceholder: {
      width: 80,
      height: 60,
      borderRadius: borderRadius.sm,
      marginRight: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemInfo: {
      flex: 1,
    },
    itemTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
    },
    itemSubtitle: {
      fontSize: 14,
      marginBottom: 4,
    },
    itemMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.xs,
    },
    itemMetaText: {
      fontSize: 13,
    },
    favoriteButton: {
      padding: spacing.xs,
    },
    itemFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.sm,
      gap: spacing.xs,
    },
    ratingText: {
      fontSize: 13,
    },
  });
};

const FavoritesScreen = () => {
  const navigation = useNavigation<FavoritesScreenNavigationProp>();
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<FavoriteType>('mechanics');
  const [favoriteMechanics, setFavoriteMechanics] = useState<FavoriteMechanic[]>([]);
  const [favoriteVehicles, setFavoriteVehicles] = useState<FavoriteVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Theme henüz hazır değilse fallback kullan
  const styles = useMemo(() => {
    if (!theme) {
      // Fallback styles - theme yüklenene kadar
      return StyleSheet.create({
        container: { flex: 1 },
        tabsContainer: {},
        tabButton: {},
        tabButtonText: {},
        listContent: {},
        itemCard: {},
        itemHeader: {},
        avatar: {},
        avatarPlaceholder: {},
        vehicleImage: {},
        vehicleImagePlaceholder: {},
        itemInfo: {},
        itemTitle: {},
        itemSubtitle: {},
        itemMeta: {},
        itemMetaText: {},
        favoriteButton: {},
        itemFooter: {},
        ratingText: {},
      });
    }
    return createStyles(theme);
  }, [theme]);

  useEffect(() => {
    loadFavorites();
  }, [activeTab]);

  const loadFavorites = async () => {
    try {
      setError(null);
      setLoading(true);

      if (activeTab === 'mechanics') {
        await loadFavoriteMechanics();
      } else if (activeTab === 'vehicles') {
        await loadFavoriteVehicles();
      } else {
        // Services için şimdilik boş
        setLoading(false);
      }
    } catch (err: any) {
      console.error('FavoritesScreen: Error loading favorites:', err);
      setError('Favoriler yüklenirken bir hata oluştu');
      setLoading(false);
    }
  };

  const loadFavoriteMechanics = async () => {
    try {
      // Local storage'dan favori usta ID'lerini al
      const storedFavorites = await AsyncStorage.getItem('favorite_mechanics');
      let favoriteIds: string[] = [];
      if (storedFavorites) {
        try {
          const parsed = JSON.parse(storedFavorites);
          favoriteIds = Array.isArray(parsed) ? parsed : [];
        } catch (parseError) {
          console.error('Error parsing favorite mechanics:', parseError);
          favoriteIds = [];
        }
      }

      if (favoriteIds.length === 0) {
        setFavoriteMechanics([]);
        setLoading(false);
        return;
      }

      // Her bir usta için detay bilgilerini çek
      const mechanicsPromises = favoriteIds.map(async (id) => {
        try {
          const response = await apiService.getMechanicDetails(id);
          if (response.success && response.data) {
            return {
              id: response.data._id || response.data.id,
              name: response.data.name || '',
              surname: response.data.surname || '',
              avatar: response.data.avatar,
              rating: response.data.rating,
              specialties: response.data.specialties || response.data.serviceCategories || [],
              city: response.data.city,
              isAvailable: response.data.isAvailable,
            };
          }
          return null;
        } catch (err) {
          console.error(`Error loading mechanic ${id}:`, err);
          return null;
        }
      });

      const mechanics = (await Promise.all(mechanicsPromises)).filter(
        (m) => m !== null
      ) as FavoriteMechanic[];

      setFavoriteMechanics(mechanics);
    } catch (err) {
      console.error('Error loading favorite mechanics:', err);
      setFavoriteMechanics([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadFavoriteVehicles = async () => {
    try {
      const response = await apiService.getVehicles();
      if (response.success && response.data) {
        const vehicles = Array.isArray(response.data) 
          ? response.data 
          : (response.data?.vehicles && Array.isArray(response.data.vehicles) 
              ? response.data.vehicles 
              : []);
        const favorites = vehicles
          .filter((v: any) => v && v.isFavorite)
          .map((v: any) => ({
            id: v._id || v.id || '',
            brand: v.brand || '',
            model: v.modelName || v.model || '',
            plateNumber: v.plateNumber || '',
            year: v.year,
            image: v.image,
          }))
          .filter((v: any) => v.id); // Boş ID'leri filtrele
        setFavoriteVehicles(favorites);
      } else {
        setFavoriteVehicles([]);
      }
    } catch (err) {
      console.error('Error loading favorite vehicles:', err);
      setFavoriteVehicles([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadFavorites();
  };

  const removeFavoriteMechanic = async (mechanicId: string) => {
    Alert.alert(
      'Favoriden Çıkar',
      'Bu ustayı favorilerden çıkarmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkar',
          style: 'destructive',
          onPress: async () => {
            try {
              const storedFavorites = await AsyncStorage.getItem('favorite_mechanics');
              let favoriteIds: string[] = [];
              if (storedFavorites) {
                try {
                  const parsed = JSON.parse(storedFavorites);
                  favoriteIds = Array.isArray(parsed) ? parsed : [];
                } catch (parseError) {
                  console.error('Error parsing favorite mechanics:', parseError);
                  favoriteIds = [];
                }
              }
              const updatedIds = favoriteIds.filter((id) => id !== mechanicId);
              await AsyncStorage.setItem('favorite_mechanics', JSON.stringify(updatedIds));
              setFavoriteMechanics((prev) => prev.filter((m) => m.id !== mechanicId));
            } catch (err) {
              Alert.alert('Hata', 'Favori çıkarılırken bir hata oluştu');
            }
          },
        },
      ]
    );
  };

  const removeFavoriteVehicle = async (vehicleId: string) => {
    Alert.alert(
      'Favoriden Çıkar',
      'Bu aracı favorilerden çıkarmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkar',
          style: 'destructive',
          onPress: async () => {
            try {
              // Local storage'dan favori araçları güncelle
              // Not: updateVehicle API'si isFavorite property'sini desteklemiyor olabilir
              // Şimdilik sadece local state'i güncelle
              setFavoriteVehicles((prev) => prev.filter((v) => v.id !== vehicleId));
            } catch (err) {
              Alert.alert('Hata', 'Favori çıkarılırken bir hata oluştu');
            }
          },
        },
      ]
    );
  };

  const renderMechanicItem = ({ item }: { item: FavoriteMechanic }) => {
    if (!item || !item.id) {
      return null; // Invalid item
    }
    
    return (
      <TouchableOpacity
        style={[
          styles.itemCard,
          {
            backgroundColor: isDark ? theme.colors.background.secondary : '#FFFFFF',
            ...theme.shadows.card,
          }
        ]}
        onPress={() => {
          if (navigation && item && item.id) {
            navigation.navigate('MechanicDetail', {
              mechanic: {
                id: item.id,
                name: item.name || '',
                surname: item.surname || '',
                avatar: item.avatar,
                rating: (typeof item.rating === 'number' ? item.rating : 0),
                specialties: Array.isArray(item.specialties) ? item.specialties : [],
                city: item.city || '',
                isAvailable: item.isAvailable || false,
                totalJobs: 0,
                experience: 0,
              },
            });
          }
        }}
        activeOpacity={0.7}
      >
      <View style={styles.itemHeader}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
        ) : (
          <View
            style={[
              styles.avatarPlaceholder,
              { backgroundColor: isDark ? theme.colors.background.tertiary : '#F5F5F5' }
            ]}
          >
            <Ionicons name="person" size={24} color={theme.colors.text.tertiary} />
          </View>
        )}
        <View style={styles.itemInfo}>
          <Text
            style={[
              styles.itemTitle,
              { color: theme.colors.text.primary }
            ]}
          >
            {item.name} {item.surname}
          </Text>
          {item.specialties && Array.isArray(item.specialties) && item.specialties.length > 0 && (
            <Text
              style={[
                styles.itemSubtitle,
                { color: theme.colors.text.secondary }
              ]}
            >
              {item.specialties
                .filter((s) => s) // Null/undefined filtrele
                .slice(0, 2)
                .map((s) => translateServiceName(s))
                .filter((s) => s) // Boş string filtrele
                .join(', ')}
            </Text>
          )}
          {item.city && (
            <View style={styles.itemMeta}>
              <Ionicons
                name="location-outline"
                size={14}
                color={theme.colors.text.tertiary}
              />
              <Text
                style={[
                  styles.itemMetaText,
                  { color: theme.colors.text.tertiary }
                ]}
              >
                {item.city}
              </Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => removeFavoriteMechanic(item.id)}
        >
          <Ionicons name="heart" size={24} color={theme.colors.error.main} />
        </TouchableOpacity>
      </View>
      {item.rating && typeof item.rating === 'number' && (
        <View style={styles.itemFooter}>
          <Ionicons name="star" size={16} color={theme.colors.warning.main} />
          <Text
            style={[
              styles.ratingText,
              { color: theme.colors.text.secondary }
            ]}
          >
            {item.rating.toFixed(1)} ({item.isAvailable ? 'Müsait' : 'Müsait değil'})
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
  };

  const renderVehicleItem = ({ item }: { item: FavoriteVehicle }) => {
    if (!item || !item.id) {
      return null; // Invalid item
    }
    
    return (
      <TouchableOpacity
        style={[
          styles.itemCard,
          {
            backgroundColor: isDark ? theme.colors.background.secondary : '#FFFFFF',
            ...theme.shadows.card,
          }
        ]}
        onPress={() => {
          if (navigation) {
            navigation.navigate('Garage');
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.itemHeader}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.vehicleImage} />
          ) : (
            <View
              style={[
                styles.vehicleImagePlaceholder,
                { backgroundColor: isDark ? theme.colors.background.tertiary : '#F5F5F5' }
              ]}
            >
              <Ionicons name="car" size={32} color={theme.colors.text.tertiary} />
            </View>
          )}
          <View style={styles.itemInfo}>
            <Text
              style={[
                styles.itemTitle,
                { color: theme.colors.text.primary }
              ]}
            >
              {item.brand || ''} {item.model || ''}
            </Text>
            <Text
              style={[
                styles.itemSubtitle,
                { color: theme.colors.text.secondary }
              ]}
            >
              {item.plateNumber || ''}
            </Text>
            {item.year && (
              <Text
                style={[
                  styles.itemMetaText,
                  { color: theme.colors.text.tertiary }
                ]}
              >
                {item.year}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={() => item.id && removeFavoriteVehicle(item.id)}
          >
            <Ionicons name="heart" size={24} color={theme.colors.error.main} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderTabButton = (type: FavoriteType, label: string, icon: string) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        {
          backgroundColor:
            activeTab === type
              ? theme.colors.primary.main
              : isDark
              ? theme.colors.background.secondary
              : '#FFFFFF',
          borderColor:
            activeTab === type
              ? theme.colors.primary.main
              : theme.colors.border.primary,
        }
      ]}
      onPress={() => setActiveTab(type)}
      activeOpacity={0.7}
    >
      <Ionicons
        name={icon as any}
        size={20}
        color={
          activeTab === type
            ? '#FFFFFF'
            : theme.colors.text.primary
        }
      />
      <Text
        style={[
          styles.tabButtonText,
          {
            color:
              activeTab === type
                ? '#FFFFFF'
                : theme.colors.text.primary,
          }
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const getCurrentData = (): FavoriteMechanic[] | FavoriteVehicle[] => {
    if (activeTab === 'mechanics') {
      return Array.isArray(favoriteMechanics) ? favoriteMechanics : [];
    }
    if (activeTab === 'vehicles') {
      return Array.isArray(favoriteVehicles) ? favoriteVehicles : [];
    }
    return [];
  };

  const getEmptyMessage = () => {
    if (activeTab === 'mechanics') {
      return {
        title: 'Favori Usta Yok',
        subtitle: 'Henüz favori ustanız bulunmuyor',
        actionText: 'Usta Ara',
        onAction: () => {
          if (navigation) {
            navigation.navigate('MechanicSearch');
          }
        },
      };
    }
    if (activeTab === 'vehicles') {
      return {
        title: 'Favori Araç Yok',
        subtitle: 'Henüz favori aracınız bulunmuyor',
        actionText: 'Araçları Görüntüle',
        onAction: () => {
          if (navigation) {
            navigation.navigate('Garage');
          }
        },
      };
    }
    return {
      title: 'Favori Servis Yok',
      subtitle: 'Henüz favori servisiniz bulunmuyor',
    };
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: isDark ? theme.colors.background.primary : '#F2F2F7' }
        ]}
      >
        <ScreenHeader title="Favorilerim" />
        <LoadingSkeleton variant="list" count={5} />
      </SafeAreaView>
    );
  }

  if (error && !refreshing) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: isDark ? theme.colors.background.primary : '#F2F2F7' }
        ]}
      >
        <ScreenHeader title="Favorilerim" />
        <ErrorState message={error} onRetry={loadFavorites} />
      </SafeAreaView>
    );
  }

  const currentData = getCurrentData();
  const emptyMessage = getEmptyMessage();

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? theme.colors.background.primary : '#F2F2F7' }
      ]}
    >
      {/* Header */}
      <ScreenHeader title="Favorilerim" />

      {/* Tabs */}
      <View
        style={[
          styles.tabsContainer,
          {
            backgroundColor: isDark
              ? theme.colors.background.primary
              : '#FFFFFF',
            borderBottomColor: isDark ? theme.colors.border.primary : '#E5E5E5',
          }
        ]}
      >
        {renderTabButton('mechanics', 'Ustalar', 'construct-outline')}
        {renderTabButton('vehicles', 'Araçlar', 'car-outline')}
        {renderTabButton('services', 'Servisler', 'build-outline')}
      </View>

      {/* List */}
      {currentData.length === 0 ? (
        <EmptyState
          icon={activeTab === 'mechanics' ? 'people-outline' : activeTab === 'vehicles' ? 'car-outline' : 'build-outline'}
          title={emptyMessage.title}
          subtitle={emptyMessage.subtitle}
          actionText={emptyMessage.actionText}
          onActionPress={emptyMessage.onAction}
        />
      ) : activeTab === 'mechanics' ? (
        <FlatList
          data={favoriteMechanics}
          renderItem={renderMechanicItem}
          keyExtractor={(item) => item?.id || `mechanic-${Math.random()}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary.main}
            />
          }
        />
      ) : activeTab === 'vehicles' ? (
        <FlatList
          data={favoriteVehicles}
          renderItem={renderVehicleItem}
          keyExtractor={(item) => item?.id || `vehicle-${Math.random()}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary.main}
            />
          }
        />
      ) : null}
    </SafeAreaView>
  );
};

export default FavoritesScreen;
