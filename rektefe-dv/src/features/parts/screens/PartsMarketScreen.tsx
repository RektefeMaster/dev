import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import Background from '@/shared/components/Background';
import { BackButton } from '@/shared/components';
import Button from '@/shared/components/Button';
import { apiService } from '@/shared/services/api';
import { isRateLimitOrCanceledError } from '@/shared/utils/errorHandler';

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

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PartsMarketScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<PartsMarketScreenNavigationProp>();
  const styles = useMemo(() => createStyles(theme), [theme]);

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

  // Animations
  const filterAnimation = useRef(new Animated.Value(0)).current;

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

  const fetchParts = useCallback(async () => {
    try {
      setLoading(true);
      const filters: any = {};
      
      if (searchQuery) filters.query = searchQuery;
      if (selectedCategory) filters.category = selectedCategory;
      if (selectedCondition) filters.condition = selectedCondition;
      if (priceRange.min) filters.minPrice = parseFloat(priceRange.min);
      if (priceRange.max) filters.maxPrice = parseFloat(priceRange.max);

      const response = await apiService.searchParts(filters);
      
      // Rate limit hatası ise sessizce atla
      if (!response.success && (response as any).error?.code === 'RATE_LIMIT_EXCEEDED') {
        console.log('⚠️ PartsMarketScreen: Rate limit hatası, sessizce atlanıyor');
        setParts([]);
        setLoading(false);
        return;
      }
      
      if (response.success && response.data) {
        const partsArray = Array.isArray(response.data.parts) ? response.data.parts : [];
        setParts(partsArray);
      } else {
        setParts([]);
      }
    } catch (error: any) {
      // Rate limit hatası veya cancel edilen istek ise sessizce atla
      if (isRateLimitOrCanceledError(error)) {
        console.log('⚠️ PartsMarketScreen: Rate limit veya cancel edilen istek, sessizce atlanıyor');
        // Mevcut verileri koru, sadece loading'i kapat
        setLoading(false);
        return;
      }
      
      console.error('Parçalar yüklenemedi:', error);
      Alert.alert('Hata', 'Parçalar yüklenemedi');
      setParts([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedCondition, priceRange.min, priceRange.max]);

  useEffect(() => {
    fetchParts();
  }, [fetchParts]); // fetchParts useCallback ile optimize edildi, dependency array'e eklendi

  // Filter animation
  useEffect(() => {
    Animated.spring(filterAnimation, {
      toValue: showFilters ? 1 : 0,
      useNativeDriver: false,
      tension: 80,
      friction: 10,
    }).start();
  }, [showFilters]);

  // Layout animation for filter container
  const toggleFilters = useCallback(() => {
    LayoutAnimation.configureNext({
      duration: 300,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.easeInEaseOut,
      },
    });
    setShowFilters(!showFilters);
  }, [showFilters]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchParts();
    setRefreshing(false);
  }, [fetchParts]);

  const handleSearch = useCallback(() => {
    fetchParts();
  }, [fetchParts]);

  const handleClearFilters = useCallback(() => {
    setSelectedCategory('');
    setSelectedCondition('');
    setPriceRange({ min: '', max: '' });
  }, []);

  const handlePartPress = useCallback((part: Part) => {
    navigation.navigate('PartDetail', { partId: part._id });
  }, [navigation]);

  const getCategoryLabel = useCallback((category: string) => {
    return categories.find(c => c.id === category)?.label || category;
  }, []);

  const getConditionLabel = useCallback((condition: string) => {
    return conditions.find(c => c.id === condition)?.label || condition;
  }, []);

  const renderPartCard = useCallback(({ item, index }: { item: Part; index: number }) => {
    return (
      <TouchableOpacity 
        onPress={() => handlePartPress(item)}
        activeOpacity={0.9}
        style={styles.cardContainer}
      >
        <View style={styles.partCard}>
          {/* Photo Section */}
          <View style={styles.photoSection}>
            {item.photos && Array.isArray(item.photos) && item.photos.length > 0 && item.photos[0] ? (
              <Image
                source={{ uri: String(item.photos[0]).trim() }}
                style={styles.photoImage}
                resizeMode="cover"
                onError={() => {}}
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="cube-outline" size={40} color={theme.colors.text.secondary} />
              </View>
            )}
            
            {/* Negotiable Badge on Photo */}
            {item.pricing?.isNegotiable && (
              <View style={styles.photoBadge}>
                <Ionicons name="chatbubbles" size={12} color={theme.colors.warning.main} />
                <Text style={[styles.photoBadgeText, { color: theme.colors.warning.main }]}>
                  Pazarlık Var
                </Text>
              </View>
            )}
          </View>

          {/* Content Section */}
          <View style={styles.contentSection}>
            {/* Header - Brand */}
            {item.brand && (
              <Text 
                style={[styles.brandText, { color: theme.colors.text.secondary }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.brand}
              </Text>
            )}

            {/* Title */}
            <Text 
              style={[styles.titleText, { color: theme.colors.text.primary }]} 
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {item.partName || 'İsimsiz Parça'}
            </Text>

            {/* Badges */}
            <View style={styles.badgeRow}>
              {item.category && (
                <View style={[styles.categoryBadge, { backgroundColor: theme.colors.primary.light + '20' }]}>
                  <Text 
                    style={[styles.categoryBadgeText, { color: theme.colors.primary.main }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {getCategoryLabel(item.category) || 'Bilinmeyen'}
                  </Text>
                </View>
              )}
              {item.condition && (
                <View style={[styles.conditionBadge, { backgroundColor: theme.colors.success.light + '20' }]}>
                  <Text 
                    style={[styles.conditionBadgeText, { color: theme.colors.success.main }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {getConditionLabel(item.condition) || 'Bilinmeyen'}
                  </Text>
                </View>
              )}
            </View>

            {/* Price Section */}
            {item.pricing && typeof item.pricing.unitPrice === 'number' ? (
              <View style={styles.priceSection}>
                <View style={styles.priceRow}>
                  <Text 
                    style={[styles.priceText, { color: theme.colors.text.primary }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.75}
                  >
                    {item.pricing.unitPrice.toLocaleString('tr-TR')} {item.pricing.currency || 'TRY'}
                  </Text>
                  {item.pricing.oldPrice && typeof item.pricing.oldPrice === 'number' && (
                    <Text 
                      style={[styles.oldPriceText, { color: theme.colors.text.secondary }]}
                      numberOfLines={1}
                    >
                      {item.pricing.oldPrice.toLocaleString('tr-TR')} {item.pricing.currency || 'TRY'}
                    </Text>
                  )}
                </View>
              </View>
            ) : null}

            {/* Footer - Stock & Seller */}
            <View style={styles.footerSection}>
              {/* Stock Info */}
              <View style={styles.stockInfo}>
                <View 
                  style={[
                    styles.stockIndicator, 
                    { backgroundColor: (item.stock?.available ?? 0) > 0 ? theme.colors.success.main + '20' : theme.colors.error.main + '20' }
                  ]}
                >
                  <Ionicons 
                    name={(item.stock?.available ?? 0) > 0 ? "checkmark-circle" : "close-circle"} 
                    size={12} 
                    color={(item.stock?.available ?? 0) > 0 ? theme.colors.success.main : theme.colors.error.main}
                  />
                </View>
                <Text 
                  style={[
                    styles.stockText,
                    { color: (item.stock?.available ?? 0) > 0 ? theme.colors.success.main : theme.colors.error.main }
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.8}
                >
                  {(item.stock?.available ?? 0) > 0 ? `${item.stock.available} Adet` : 'Yok'}
                </Text>
              </View>

              {/* Seller Info */}
              {item.mechanicId && (
                <View style={styles.sellerInfo}>
                  {item.mechanicId?.rating !== undefined && item.mechanicId.rating !== null && (
                    <View style={styles.ratingBadge}>
                      <Ionicons name="star" size={10} color="#FBBF24" />
                      <Text style={styles.ratingText}>
                        {typeof item.mechanicId.rating === 'number' ? item.mechanicId.rating.toFixed(1) : '0.0'}
                      </Text>
                    </View>
                  )}
                  <Text 
                    style={[styles.sellerText, { color: theme.colors.text.secondary }]} 
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    adjustsFontSizeToFit={true}
                    minimumFontScale={0.75}
                  >
                    {item.mechanicId?.shopName || `${item.mechanicId?.name || ''} ${item.mechanicId?.surname || ''}`.trim() || 'Satıcı'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [handlePartPress, getCategoryLabel, getConditionLabel, theme, styles]);

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
              onPress={toggleFilters}
              style={styles.filterButton}
              activeOpacity={0.7}
            >
              <Animated.View
                style={{
                  transform: [{
                    rotate: filterAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '180deg'],
                    }),
                  }],
                }}
              >
                <Ionicons 
                  name="options-outline" 
                  size={24} 
                  color={showFilters ? theme.colors.primary.main : theme.colors.text.secondary} 
                />
              </Animated.View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={[styles.searchContainer, { 
          backgroundColor: theme.colors.background.card,
          borderColor: theme.colors.border.primary,
        }]}>
          <Ionicons name="search-outline" size={20} color={theme.colors.text.secondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text.primary }]}
            placeholder="Parça ara..."
            placeholderTextColor={theme.colors.text.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color={theme.colors.text.secondary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
            <Ionicons name="arrow-forward" size={20} color={theme.colors.primary.main} />
          </TouchableOpacity>
        </View>

        {/* Filters */}
        {showFilters && (
          <Animated.View 
            style={[
              styles.filtersContainer, 
              { 
                backgroundColor: theme.colors.background.secondary,
                opacity: filterAnimation,
                transform: [{
                  translateY: filterAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, 0],
                  }),
                }],
              }
            ]}
          >
            {/* Category */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterLabel, { color: theme.colors.text.primary }]}>
                Kategori
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {categories.map((cat, index) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => {
                      setSelectedCategory(cat.id);
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    }}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: selectedCategory === cat.id 
                          ? theme.colors.primary.main 
                          : theme.colors.background.card,
                        borderColor: selectedCategory === cat.id 
                          ? theme.colors.primary.main 
                          : theme.colors.border.primary,
                      }
                    ]}
                    activeOpacity={0.7}
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
                    onPress={() => {
                      setSelectedCondition(cond.id);
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    }}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: selectedCondition === cond.id 
                          ? theme.colors.primary.main 
                          : theme.colors.background.card,
                        borderColor: selectedCondition === cond.id 
                          ? theme.colors.primary.main 
                          : theme.colors.border.primary,
                      }
                    ]}
                    activeOpacity={0.7}
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
                onPress={() => {
                  handleClearFilters();
                  setTimeout(() => fetchParts(), 100);
                }}
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
          </Animated.View>
        )}

        {/* Content */}
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary.main} />
            <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>
              Parçalar yükleniyor...
            </Text>
          </View>
        ) : parts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Animated.View
              style={[
                styles.emptyIconContainer,
                {
                  opacity: loading ? 0 : 1,
                },
              ]}
            >
              <Ionicons name="cube-outline" size={80} color={theme.colors.text.secondary} />
            </Animated.View>
            <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
              Parça Bulunamadı
            </Text>
            <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
              {searchQuery || selectedCategory || selectedCondition || priceRange.min || priceRange.max
                ? 'Arama kriterlerinize uygun parça bulunamadı. Filtreleri değiştirerek tekrar deneyin.'
                : 'Henüz parça eklenmemiş.'}
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
            renderItem={({ item, index }) => renderPartCard({ item, index })}
            keyExtractor={(item) => item._id}
            numColumns={2}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                tintColor={theme.colors.primary.main}
                colors={[theme.colors.primary.main]}
              />
            }
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
    backgroundColor: theme.colors.background.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reservationsButton: {
    padding: 8,
  },
  filterButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
    marginRight: 4,
  },
  searchButton: {
    padding: 4,
    marginLeft: 4,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
    backgroundColor: theme.colors.background.secondary,
  },
  filterSection: {
    marginBottom: 14,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1.5,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  priceRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: '500',
  },
  priceSeparator: {
    fontSize: 16,
    fontWeight: '600',
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 12,
  },
  filterActionButton: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
    opacity: 0.7,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyIconContainer: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '400',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.8,
    paddingHorizontal: 16,
  },
  emptyButton: {
    minWidth: 150,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 16,
  },
  // New Modern Card Styles
  cardContainer: {
    flex: 1,
    margin: 6,
  },
  partCard: {
    flex: 1,
    backgroundColor: theme.colors.background.card,
    borderRadius: 12,
    overflow: 'hidden',
    height: 420,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  // Photo Section
  photoSection: {
    width: '100%',
    height: 170,
    backgroundColor: theme.colors.background.secondary,
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.background.secondary,
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
  },
  photoBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: theme.colors.warning.main + '20',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: theme.colors.warning.main + '40',
  },
  photoBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  // Content Section
  contentSection: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  brandText: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 4,
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titleText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: 8,
    minHeight: 36,
    maxHeight: 36,
  },
  // Badges
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
    gap: 6,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  conditionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  conditionBadgeText: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  // Price Section
  priceSection: {
    marginTop: 'auto',
    marginBottom: 10,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    flexWrap: 'wrap',
  },
  priceText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
    minWidth: 0,
  },
  oldPriceText: {
    fontSize: 12,
    fontWeight: '500',
    textDecorationLine: 'line-through',
    opacity: 0.5,
  },
  // Footer Section
  footerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.primary + '40',
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  stockIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 0,
    flexShrink: 1,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    justifyContent: 'flex-end',
    minWidth: 0,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: theme.colors.background.tertiary,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    flexShrink: 0,
  },
  ratingText: {
    fontSize: 9,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  sellerText: {
    fontSize: 10,
    fontWeight: '500',
    opacity: 0.7,
    flexShrink: 1,
    minWidth: 0,
  },
});

export default PartsMarketScreen;


