import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import Background from '@/shared/components/Background';
import { BackButton } from '@/shared/components';
import Button from '@/shared/components/Button';
import Card from '@/shared/components/Card';
import { apiService } from '@/shared/services/api';

type PartsMarketScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PartsMarket'>;

interface Part {
  _id: string;
  partName: string;
  brand: string;
  partNumber?: string;
  description?: string;
  photos: string[];
  category: string;
  compatibility: {
    makeModel: string[];
    years: { start: number; end: number };
  };
  stock: {
    quantity: number;
    available: number;
  };
  pricing: {
    unitPrice: number;
    oldPrice?: number;
    currency: string;
    isNegotiable: boolean;
  };
  condition: string;
  mechanicId: {
    _id: string;
    name: string;
    surname: string;
    shopName?: string;
    rating?: number;
    ratingCount?: number;
  };
}

const PartsMarketScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<PartsMarketScreenNavigationProp>();
  const styles = createStyles(theme);

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [parts, setParts] = useState<Part[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedCondition, setSelectedCondition] = useState<string>('');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });

  // Categories
  const categories = [
    { id: '', label: 'Tümü' },
    { id: 'engine', label: 'Motor' },
    { id: 'electrical', label: 'Elektrik' },
    { id: 'suspension', label: 'Süspansiyon' },
    { id: 'brake', label: 'Fren' },
    { id: 'body', label: 'Kaporta' },
    { id: 'interior', label: 'İç Aksam' },
    { id: 'exterior', label: 'Dış Aksam' },
    { id: 'fuel', label: 'Yakıt' },
    { id: 'cooling', label: 'Soğutma' },
    { id: 'transmission', label: 'Şanzıman' },
    { id: 'exhaust', label: 'Egzoz' },
    { id: 'other', label: 'Diğer' },
  ];

  const conditions = [
    { id: '', label: 'Tümü' },
    { id: 'new', label: 'Sıfır' },
    { id: 'used', label: 'İkinci El' },
    { id: 'refurbished', label: 'Yenilenmiş' },
    { id: 'oem', label: 'Orijinal OEM' },
    { id: 'aftermarket', label: 'Yan Sanayi' },
  ];

  useEffect(() => {
    fetchParts();
  }, []);

  const fetchParts = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      
      if (searchQuery) filters.query = searchQuery;
      if (selectedCategory) filters.category = selectedCategory;
      if (selectedCondition) filters.condition = selectedCondition;
      if (priceRange.min) filters.minPrice = parseFloat(priceRange.min);
      if (priceRange.max) filters.maxPrice = parseFloat(priceRange.max);

      const response = await apiService.searchParts(filters);
      
      if (response.success && response.data) {
        setParts(response.data.parts || []);
      }
    } catch (error) {
      console.error('Parçalar yüklenemedi:', error);
      Alert.alert('Hata', 'Parçalar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchParts();
    setRefreshing(false);
  };

  const handleSearch = () => {
    fetchParts();
  };

  const handleClearFilters = () => {
    setSelectedCategory('');
    setSelectedCondition('');
    setPriceRange({ min: '', max: '' });
    fetchParts();
  };

  const handlePartPress = (part: Part) => {
    navigation.navigate('PartDetail', { partId: part._id });
  };

  const getCategoryLabel = (category: string) => {
    return categories.find(c => c.id === category)?.label || category;
  };

  const getConditionLabel = (condition: string) => {
    return conditions.find(c => c.id === condition)?.label || condition;
  };

  const renderPartCard = ({ item }: { item: Part }) => (
    <TouchableOpacity onPress={() => handlePartPress(item)}>
      <Card variant="elevated" style={styles.partCard}>
        {/* Photo */}
        {item.photos && item.photos.length > 0 ? (
          <View style={styles.photoContainer}>
            <Image
              source={{ uri: item.photos[0] }}
              style={styles.photoImage}
              resizeMode="cover"
              onError={() => {
                console.error('Fotoğraf yüklenemedi:', item.photos[0]);
              }}
            />
          </View>
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="cube" size={40} color={theme.colors.text.secondary} />
            <Text style={[styles.photoPlaceholderText, { color: theme.colors.text.secondary }]}>
              Fotoğraf Yok
            </Text>
          </View>
        )}

        {/* Info */}
        <View style={styles.partInfo}>
          <Text style={[styles.partName, { color: theme.colors.text.primary }]} numberOfLines={2}>
            {item.partName}
          </Text>
          <Text style={[styles.partBrand, { color: theme.colors.text.secondary }]}>
            {item.brand}
          </Text>
          
          {/* Category & Condition */}
          <View style={styles.badgeContainer}>
            <View style={[styles.badge, { backgroundColor: theme.colors.primary.light }]}>
              <Text style={[styles.badgeText, { color: theme.colors.primary.main }]}>
                {getCategoryLabel(item.category)}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: theme.colors.success.light }]}>
              <Text style={[styles.badgeText, { color: theme.colors.success.main }]}>
                {getConditionLabel(item.condition)}
              </Text>
            </View>
          </View>

          {/* Stock */}
          <View style={styles.stockContainer}>
            <Ionicons 
              name={item.stock.available > 0 ? "checkmark-circle" : "close-circle"} 
              size={16} 
              color={item.stock.available > 0 ? theme.colors.success.main : theme.colors.error.main} 
            />
            <Text style={[
              styles.stockText,
              { color: item.stock.available > 0 ? theme.colors.success.main : theme.colors.error.main }
            ]}>
              {item.stock.available > 0 ? `${item.stock.available} Adet` : 'Stokta Yok'}
            </Text>
          </View>

          {/* Price */}
          <View style={styles.priceContainer}>
            <View style={styles.priceLeft}>
              <Text style={[styles.price, { color: theme.colors.text.primary }]}>
                {item.pricing.unitPrice.toLocaleString('tr-TR')} {item.pricing.currency}
              </Text>
              {item.pricing.oldPrice && (
                <Text style={[styles.oldPrice, { color: theme.colors.text.secondary }]}>
                  {item.pricing.oldPrice.toLocaleString('tr-TR')} {item.pricing.currency}
                </Text>
              )}
            </View>
            {item.pricing.isNegotiable && (
              <View style={[styles.negotiableBadge, { backgroundColor: theme.colors.warning.light }]}>
                <Ionicons name="chatbubbles" size={12} color={theme.colors.warning.main} />
                <Text style={[styles.negotiableText, { color: theme.colors.warning.main }]}>
                  Pazarlık
                </Text>
              </View>
            )}
          </View>

          {/* Seller */}
          <View style={styles.sellerContainer}>
            <Ionicons name="storefront" size={14} color={theme.colors.text.secondary} />
            <Text style={[styles.sellerText, { color: theme.colors.text.secondary }]} numberOfLines={1}>
              {item.mechanicId.shopName || `${item.mechanicId.name} ${item.mechanicId.surname}`}
            </Text>
            {item.mechanicId.rating && (
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={12} color="#FBBF24" />
                <Text style={[styles.ratingText, { color: theme.colors.text.secondary }]}>
                  {item.mechanicId.rating.toFixed(1)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  return (
    <Background>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.background.primary }]}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
            Yedek Parça Market
          </Text>
          <View style={styles.headerRight}>
            <TouchableOpacity 
              onPress={() => navigation.navigate('PartsReservations' as never)}
              style={styles.reservationsButton}
            >
              <Ionicons name="list" size={24} color={theme.colors.primary.main} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setShowFilters(!showFilters)}
              style={styles.filterButton}
            >
              <Ionicons 
                name="options-outline" 
                size={24} 
                color={showFilters ? theme.colors.primary.main : theme.colors.text.secondary} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { backgroundColor: theme.colors.background.secondary }]}>
          <Ionicons name="search" size={20} color={theme.colors.text.secondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text.primary }]}
            placeholder="Parça ara..."
            placeholderTextColor={theme.colors.text.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity onPress={handleSearch}>
            <Ionicons name="search" size={24} color={theme.colors.primary.main} />
          </TouchableOpacity>
        </View>

        {/* Filters */}
        {showFilters && (
          <View style={[styles.filtersContainer, { backgroundColor: theme.colors.background.secondary }]}>
            {/* Category */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: theme.colors.text.primary }]}>
                Kategori
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setSelectedCategory(cat.id)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: selectedCategory === cat.id 
                          ? theme.colors.primary.main 
                          : theme.colors.background.card,
                      }
                    ]}
                  >
                    <Text style={[
                      styles.filterChipText,
                      { 
                        color: selectedCategory === cat.id 
                          ? '#fff' 
                          : theme.colors.text.primary 
                      }
                    ]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Condition */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: theme.colors.text.primary }]}>
                Durum
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {conditions.map((cond) => (
                  <TouchableOpacity
                    key={cond.id}
                    onPress={() => setSelectedCondition(cond.id)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: selectedCondition === cond.id 
                          ? theme.colors.primary.main 
                          : theme.colors.background.card,
                      }
                    ]}
                  >
                    <Text style={[
                      styles.filterChipText,
                      { 
                        color: selectedCondition === cond.id 
                          ? '#fff' 
                          : theme.colors.text.primary 
                      }
                    ]}>
                      {cond.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Price Range */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: theme.colors.text.primary }]}>
                Fiyat Aralığı
              </Text>
              <View style={styles.priceRangeContainer}>
                <TextInput
                  style={[styles.priceInput, { 
                    color: theme.colors.text.primary,
                    borderColor: theme.colors.border.primary 
                  }]}
                  placeholder="Min"
                  placeholderTextColor={theme.colors.text.secondary}
                  value={priceRange.min}
                  onChangeText={(text) => setPriceRange({ ...priceRange, min: text })}
                  keyboardType="numeric"
                />
                <Text style={[styles.priceSeparator, { color: theme.colors.text.secondary }]}>
                  -
                </Text>
                <TextInput
                  style={[styles.priceInput, { 
                    color: theme.colors.text.primary,
                    borderColor: theme.colors.border.primary 
                  }]}
                  placeholder="Max"
                  placeholderTextColor={theme.colors.text.secondary}
                  value={priceRange.max}
                  onChangeText={(text) => setPriceRange({ ...priceRange, max: text })}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Actions */}
            <View style={styles.filterActions}>
              <Button
                title="Temizle"
                variant="outline"
                onPress={handleClearFilters}
                style={styles.filterActionButton}
              />
              <Button
                title="Uygula"
                onPress={() => {
                  fetchParts();
                  setShowFilters(false);
                }}
                style={styles.filterActionButton}
              />
            </View>
          </View>
        )}

        {/* Content */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary.main} />
          </View>
        ) : parts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color={theme.colors.text.secondary} />
            <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
              Parça bulunamadı
            </Text>
            <Button
              title="Yeniden Dene"
              variant="outline"
              onPress={fetchParts}
              style={styles.emptyButton}
            />
          </View>
        ) : (
          <FlatList
            data={parts}
            renderItem={renderPartCard}
            keyExtractor={(item) => item._id}
            numColumns={2}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}
      </SafeAreaView>
    </Background>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reservationsButton: {
    padding: 8,
  },
  filterButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  filtersContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  filterSection: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 14,
  },
  priceRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  priceSeparator: {
    marginHorizontal: 8,
    fontSize: 16,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  filterActionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  emptyButton: {
    minWidth: 150,
  },
  listContent: {
    padding: 8,
  },
  partCard: {
    flex: 1,
    margin: 4,
    overflow: 'hidden',
  },
  photoContainer: {
    width: '100%',
    height: 120,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.background.secondary,
  },
  photoPlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: theme.colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPlaceholderText: {
    marginTop: 4,
    fontSize: 10,
  },
  partInfo: {
    padding: 12,
  },
  partName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  partBrand: {
    fontSize: 12,
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 4,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  stockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLeft: {
    flex: 1,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
  },
  oldPrice: {
    fontSize: 11,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  negotiableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  negotiableText: {
    fontSize: 10,
    fontWeight: '600',
  },
  sellerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  sellerText: {
    fontSize: 11,
    marginLeft: 4,
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 2,
  },
});

export default PartsMarketScreen;

