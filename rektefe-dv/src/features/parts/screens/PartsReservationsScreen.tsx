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
  RefreshControl,
  Modal,
  TextInput,
  Image,
  Platform,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import Background from '@/shared/components/Background';
import { BackButton, Button } from '@/shared/components';
import { apiService } from '@/shared/services/api';
import { isRateLimitOrCanceledError } from '@/shared/utils/errorHandler';

type PartsReservationsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'PartsReservations'>;

interface Reservation {
  _id: string;
  sellerId: {
    _id: string;
    name: string;
    surname: string;
    shopName?: string;
    rating?: number;
    ratingCount?: number;
    phone?: string;
  };
  partId: {
    _id: string;
    partName: string;
    brand: string;
    partNumber?: string;
    photos: string[];
  };
  vehicleId?: {
    _id: string;
    brand: string;
    modelName: string;
    year: number;
    plateNumber?: string;
  };
  partInfo: {
    partName: string;
    brand: string;
    partNumber?: string;
    condition: string;
  };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  negotiatedPrice?: number;
  delivery: {
    method: 'pickup' | 'standard' | 'express';
    address?: string;
    estimatedDelivery?: Date;
  };
  payment: {
    method: 'cash' | 'card' | 'transfer';
    status: 'pending' | 'paid' | 'completed' | 'refunded';
  };
  status: 'pending' | 'confirmed' | 'cancelled' | 'expired' | 'delivered' | 'completed';
  cancellationReason?: string;
  cancelledBy?: 'buyer' | 'seller' | 'system';
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

const PartsReservationsScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<PartsReservationsScreenNavigationProp>();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [showNegotiateModal, setShowNegotiateModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [negotiatedPrice, setNegotiatedPrice] = useState('');
  const [negotiating, setNegotiating] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const scrollPositionRef = useRef<number>(0);
  const previousFilterRef = useRef<string>(filter);

  const fetchReservations = useCallback(async () => {
    const isInitialLoad = reservations.length === 0;
    try {
      // İlk yüklemede loading göster, filter değişiminde gösterme
      if (isInitialLoad) {
        setLoading(true);
      }
      const response = await apiService.getMyPartsReservations(
        filter !== 'all' ? { status: filter } : undefined
      );
      console.log('🔍 PartsReservations - API Response:', JSON.stringify(response, null, 2));
      
      if (response.success && response.data) {
        // Güvenli array kontrolü - response.data array değilse boş array kullan
        const reservationsArray = Array.isArray(response.data) ? response.data : [];
        console.log('🔍 PartsReservations - Reservations Array:', reservationsArray.length, 'items');
        console.log('🔍 PartsReservations - First Item:', reservationsArray[0]);
        setReservations(reservationsArray);
      } else {
        console.log('⚠️ PartsReservations - No data in response:', response);
        setReservations([]);
      }
    } catch (error: any) {
      // Rate limit hatası veya cancel edilen istek ise sessizce atla
      if (isRateLimitOrCanceledError(error)) {
        console.log('⚠️ PartsReservationsScreen: Rate limit veya cancel edilen istek, sessizce atlanıyor');
        // Mevcut verileri koru, sadece loading'i kapat
        setLoading(false);
        return;
      }
      
      console.error('❌ Rezervasyonlar yüklenemedi:', error);
      Alert.alert('Hata', 'Rezervasyonlar yüklenemedi');
      setReservations([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  // Filter değiştiğinde scroll position'ı koru
  useEffect(() => {
    const filterChanged = previousFilterRef.current !== filter;
    if (filterChanged) {
      previousFilterRef.current = filter;
      // Filter değişti ama scroll pozisyonunu kaydetmeye gerek yok
      // onScroll zaten sürekli kaydediyor
    }
  }, [filter]);

  // Reservations yüklendikten sonra scroll position'ı geri yükle
  useEffect(() => {
    const savedPosition = scrollPositionRef.current;
    if (flatListRef.current && savedPosition > 0 && reservations.length > 0 && !loading) {
      // Render tamamlandıktan sonra scroll position'ı geri yükle
      const timer = setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToOffset({ 
            offset: savedPosition, 
            animated: false 
          });
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [reservations, loading]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReservations();
    setRefreshing(false);
  }, [fetchReservations]);

  const handleCancel = async (reservation: Reservation) => {
    Alert.alert(
      'Rezervasyonu İptal Et',
      'Bu rezervasyonu iptal etmek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'İptal Et',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiService.cancelPartsReservation(reservation._id);
              if (response.success) {
                Alert.alert('Başarılı', 'Rezervasyon iptal edildi');
                await fetchReservations();
              } else {
                Alert.alert('Hata', response.message || 'Rezervasyon iptal edilemedi');
              }
            } catch (error) {
              Alert.alert('Hata', 'Rezervasyon iptal edilemedi');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'confirmed': return '#3B82F6';
      case 'completed': return '#10B981';
      case 'cancelled': return '#EF4444';
      case 'expired': return '#6B7280';
      case 'delivered': return '#8B5CF6';
      default: return theme.colors.text.secondary;
    }
  };

  const getStatusLabel = (status?: string | null) => {
    if (!status) return 'Bilinmiyor';
    switch (status) {
      case 'pending': return 'Beklemede';
      case 'confirmed': return 'Onaylandı';
      case 'completed': return 'Tamamlandı';
      case 'cancelled': return 'İptal Edildi';
      case 'expired': return 'Süresi Doldu';
      case 'delivered': return 'Teslim Edildi';
      default: return String(status);
    }
  };

  const getDeliveryMethodLabel = (method?: string | null) => {
    if (!method) return 'Bilinmiyor';
    switch (method) {
      case 'pickup': return 'Mağazadan Al';
      case 'standard': return 'Standart Kargo';
      case 'express': return 'Hızlı Kargo';
      default: return String(method);
    }
  };

  const getConditionLabel = (condition?: string | null) => {
    if (!condition) return 'Bilinmiyor';
    switch (condition) {
      case 'new': return 'Sıfır';
      case 'used': return 'İkinci El';
      case 'refurbished': return 'Yenilenmiş';
      default: return String(condition);
    }
  };

  const handlePartPress = (partId: string) => {
    navigation.navigate('PartDetail', { partId });
  };

  const handleNegotiate = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setNegotiatedPrice('');
    setShowNegotiateModal(true);
  };

  const handleConfirmNegotiation = async () => {
    if (!selectedReservation || !negotiatedPrice) return;

    const totalPrice = parseFloat(negotiatedPrice);
    if (isNaN(totalPrice) || totalPrice <= 0) {
      Alert.alert('Uyarı', 'Geçerli bir fiyat giriniz');
      return;
    }

    if (totalPrice >= selectedReservation.totalPrice) {
      Alert.alert('Uyarı', 'Pazarlık fiyatı toplam fiyattan düşük olmalıdır');
      return;
    }

    // API birim fiyat bekliyor, toplam fiyattan birim fiyata çevir
    const unitPrice = totalPrice / selectedReservation.quantity;

    try {
      setNegotiating(true);
      const response = await apiService.negotiateReservationPrice(
        selectedReservation._id,
        unitPrice,
        undefined
      );
      if (response.success) {
        Alert.alert('Başarılı', 'Pazarlık teklifi gönderildi. Usta değerlendirecek.');
        setShowNegotiateModal(false);
        setNegotiatedPrice('');
        setSelectedReservation(null);
        await fetchReservations();
      } else {
        Alert.alert('Hata', response.message || 'Pazarlık teklifi gönderilemedi');
      }
    } catch (error) {
      console.error('Pazarlık hatası:', error);
      Alert.alert('Hata', 'Pazarlık teklifi gönderilemedi');
    } finally {
      setNegotiating(false);
    }
  };

  const pendingCount = useMemo(() => {
    return Array.isArray(reservations) 
      ? reservations.filter(r => r && r.status === 'pending').length 
      : 0;
  }, [reservations]);

  const filterItems = useMemo(() => [
    { key: 'all', label: 'Tümü', icon: 'list' },
    { key: 'pending', label: 'Beklemede', icon: 'time', badge: pendingCount },
    { key: 'confirmed', label: 'Onaylandı', icon: 'checkmark-circle' },
    { key: 'completed', label: 'Tamamlandı', icon: 'trophy' },
    { key: 'cancelled', label: 'İptal', icon: 'close-circle' },
  ], [pendingCount]);

  // İlk yüklemede loading göster, filter değişiminde FlatList'i unmount etme
  const isInitialLoading = loading && reservations.length === 0 && !refreshing;
  
  if (isInitialLoading) {
    return (
      <Background>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary.main} />
          </View>
        </SafeAreaView>
      </Background>
    );
  }

  return (
    <Background>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: theme.colors.background.primary }]}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
            Rezervasyonlarım
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.filtersContent}
          >
            {filterItems.map((filterItem) => {
              const isSelected = filter === filterItem.key;
              const badgeCount = typeof filterItem.badge === 'number' && filterItem.badge > 0 ? filterItem.badge : null;
              
              return (
                <TouchableOpacity
                  key={filterItem.key}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isSelected ? theme.colors.primary.main : theme.colors.background.card,
                      borderColor: isSelected ? theme.colors.primary.main : theme.colors.border.primary + '60',
                    }
                  ]}
                  onPress={() => {
                    setFilter(filterItem.key as any);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={filterItem.icon as any}
                    size={14}
                    color={isSelected ? '#FFFFFF' : theme.colors.text.secondary}
                    style={styles.filterIcon}
                  />
                  <Text 
                    style={[
                      styles.filterChipText,
                      { color: isSelected ? '#FFFFFF' : theme.colors.text.primary }
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {filterItem.label}
                  </Text>
                  {badgeCount !== null ? (
                    <View style={[
                      styles.badge, 
                      { 
                        backgroundColor: isSelected ? '#FFFFFF' : theme.colors.error.main 
                      }
                    ]}>
                      <Text style={[
                        styles.badgeText, 
                        { 
                          color: isSelected ? theme.colors.primary.main : '#FFFFFF' 
                        }
                      ]}>
                        {String(badgeCount)}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.badgePlaceholder} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Reservations List */}
        <FlatList
          ref={flatListRef}
          data={reservations}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScroll={(event) => {
            scrollPositionRef.current = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          removeClippedSubviews={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor={theme.colors.primary.main}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={72} color={theme.colors.text.secondary} opacity={0.5} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text.primary }]}>
                Rezervasyon Yok
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.text.secondary }]}>
                {filter !== 'all' 
                  ? `${filterItems.find(f => f.key === filter)?.label || 'Bu filtre'} için rezervasyon bulunmuyor`
                  : 'Henüz rezervasyon yapmadınız'}
              </Text>
            </View>
          }
          renderItem={({ item: reservation }) => {
            if (!reservation || !reservation._id) return null;
            
            return (
              <TouchableOpacity 
                key={reservation._id}
                onPress={() => reservation.partId?._id && handlePartPress(reservation.partId._id)}
                activeOpacity={0.95}
                style={styles.reservationItem}
              >
                <View style={styles.card}>
                  {/* Header with Status */}
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <View style={[styles.statusPill, { 
                        backgroundColor: getStatusColor(reservation?.status || 'pending') + '15',
                      }]}>
                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(reservation?.status || 'pending') }]} />
                        <Text style={[styles.statusLabel, { color: getStatusColor(reservation?.status || 'pending') }]}>
                          {getStatusLabel(reservation?.status || 'pending')}
                        </Text>
                      </View>
                      <Text style={[styles.dateText, { color: theme.colors.text.secondary }]}>
                        {reservation?.createdAt ? new Date(reservation.createdAt).toLocaleDateString('tr-TR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        }) : ''}
                      </Text>
                    </View>
                  </View>

                  {/* Main Content Row */}
                  <View style={styles.contentRow}>
                    {/* Image */}
                    <View style={styles.imageWrapper}>
                      {reservation.partId?.photos && reservation.partId.photos.length > 0 ? (
                        <Image
                          source={{ uri: reservation.partId.photos[0] }}
                          style={styles.image}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.imagePlaceholder, { backgroundColor: theme.colors.background.secondary }]}>
                          <Ionicons name="cube-outline" size={28} color={theme.colors.text.secondary} />
                        </View>
                      )}
                    </View>

                    {/* Info */}
                    <View style={styles.infoSection}>
                      {/* Brand */}
                      {reservation.partInfo?.brand && (
                        <Text style={[styles.brandLabel, { color: theme.colors.text.secondary }]} numberOfLines={1}>
                          {reservation.partInfo.brand}
                        </Text>
                      )}
                      
                      {/* Part Name */}
                      <Text style={[styles.partTitle, { color: theme.colors.text.primary }]} numberOfLines={2}>
                        {reservation.partInfo?.partName || 'Parça Adı'}
                      </Text>

                      {/* Meta Info */}
                      <View style={styles.metaInfo}>
                        <View style={styles.metaItem}>
                          <Ionicons name="cube" size={12} color={theme.colors.text.secondary} />
                          <Text style={[styles.metaText, { color: theme.colors.text.secondary }]}>
                            {String(reservation.quantity || 1)} Adet
                          </Text>
                        </View>
                        {reservation.partInfo?.condition && (
                          <View style={[styles.conditionTag, { backgroundColor: theme.colors.success.light + '20' }]}>
                            <Text style={[styles.conditionText, { color: theme.colors.success.main }]}>
                              {getConditionLabel(reservation.partInfo.condition)}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* Seller */}
                      <View style={styles.sellerRow}>
                        <Ionicons name="storefront" size={12} color={theme.colors.text.secondary} />
                        <Text style={[styles.sellerName, { color: theme.colors.text.secondary }]} numberOfLines={1}>
                          {reservation.sellerId?.shopName || (reservation.sellerId?.name && reservation.sellerId?.surname ? `${reservation.sellerId.name} ${reservation.sellerId.surname}` : 'Satıcı')}
                        </Text>
                        {reservation.sellerId?.rating !== undefined && reservation.sellerId.rating !== null && (
                          <View style={styles.ratingTag}>
                            <Ionicons name="star" size={10} color="#FBBF24" />
                            <Text style={styles.ratingValue}>
                              {typeof reservation.sellerId.rating === 'number' 
                                ? reservation.sellerId.rating.toFixed(1)
                                : String(reservation.sellerId.rating)}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Price & Actions */}
                    <View style={styles.rightSection}>
                      {/* Price */}
                      <View style={styles.priceBox}>
                        <Text style={[styles.priceValue, { color: theme.colors.text.primary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                          {typeof (reservation.negotiatedPrice || reservation.totalPrice || 0) === 'number'
                            ? `${(reservation.negotiatedPrice || reservation.totalPrice || 0).toLocaleString('tr-TR')}`
                            : String(reservation.negotiatedPrice || reservation.totalPrice || 0)}
                        </Text>
                        <Text style={[styles.currencyText, { color: theme.colors.text.secondary }]}>TL</Text>
                        {reservation.negotiatedPrice && reservation.totalPrice && (
                          <Text style={[styles.oldPriceValue, { color: theme.colors.text.secondary }]} numberOfLines={1}>
                            {typeof reservation.totalPrice === 'number' 
                              ? `${reservation.totalPrice.toLocaleString('tr-TR')} TL`
                              : `${String(reservation.totalPrice)} TL`}
                          </Text>
                        )}
                      </View>

                      {/* Actions */}
                      {(reservation.status === 'pending' || reservation.status === 'confirmed') && (
                        <View style={styles.actionButtons}>
                          {reservation.status === 'pending' && (
                            <TouchableOpacity
                              style={[styles.actionBtn, styles.negotiateBtn, { backgroundColor: theme.colors.warning.main }]}
                              onPress={(e) => {
                                e.stopPropagation();
                                handleNegotiate(reservation);
                              }}
                            >
                              <Ionicons name="chatbubbles" size={14} color="#fff" />
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.cancelBtn, { backgroundColor: theme.colors.error.main }]}
                            onPress={(e) => {
                              e.stopPropagation();
                              handleCancel(reservation);
                            }}
                          >
                            <Ionicons name="close" size={14} color="#fff" />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Delivery Method */}
                  {reservation.delivery?.method && (
                    <View style={styles.deliveryRow}>
                      <Ionicons 
                        name={
                          reservation.delivery.method === 'pickup' ? 'storefront-outline' :
                          reservation.delivery.method === 'express' ? 'flash-outline' : 'car-outline'
                        } 
                        size={14} 
                        color={theme.colors.text.secondary} 
                      />
                      <Text style={[styles.deliveryText, { color: theme.colors.text.secondary }]}>
                        {getDeliveryMethodLabel(reservation.delivery.method)}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />

        {/* Negotiate Modal */}
        <Modal
          visible={showNegotiateModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => {
            setShowNegotiateModal(false);
            setSelectedReservation(null);
            setNegotiatedPrice('');
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.colors.background.primary }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
                  Fiyat Pazarlığı
                </Text>
                <TouchableOpacity onPress={() => {
                  setShowNegotiateModal(false);
                  setSelectedReservation(null);
                  setNegotiatedPrice('');
                }}>
                  <Ionicons name="close" size={24} color={theme.colors.text.primary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                {selectedReservation && (
                  <>
                    <View style={styles.modalSection}>
                      <Text style={[styles.modalSectionTitle, { color: theme.colors.text.secondary }]}>
                        Mevcut Fiyat
                      </Text>
                      <View style={styles.modalPriceBox}>
                        <Text 
                          style={[styles.currentPrice, { color: theme.colors.text.primary }]}
                          numberOfLines={1}
                          adjustsFontSizeToFit={true}
                          minimumFontScale={0.8}
                        >
                          {selectedReservation.totalPrice.toLocaleString('tr-TR')} TL
                        </Text>
                        <Text 
                          style={[styles.modalHint, { color: theme.colors.text.secondary }]}
                          numberOfLines={1}
                        >
                          {selectedReservation.unitPrice.toLocaleString('tr-TR')} TL × {selectedReservation.quantity} Adet
                        </Text>
                      </View>
                    </View>

                    <View style={styles.modalSection}>
                      <Text style={[styles.modalSectionTitle, { color: theme.colors.text.secondary }]}>
                        Teklif Ettiğiniz Fiyat
                      </Text>
                      <TextInput
                        style={[
                          styles.priceInput,
                          {
                            borderColor: theme.colors.border.primary,
                            color: theme.colors.text.primary,
                            backgroundColor: theme.colors.background.secondary,
                          }
                        ]}
                        placeholder="Örn: 1500"
                        placeholderTextColor={theme.colors.text.secondary + '80'}
                        value={negotiatedPrice}
                        onChangeText={setNegotiatedPrice}
                        keyboardType="decimal-pad"
                      />
                      <Text style={[styles.inputHint, { color: theme.colors.text.secondary }]}>
                        Usta teklifinizi değerlendirecek ve size dönüş yapacaktır
                      </Text>
                    </View>
                  </>
                )}
              </ScrollView>

              <View style={styles.modalActions}>
                <Button
                  title="İptal"
                  variant="outline"
                  onPress={() => {
                    setShowNegotiateModal(false);
                    setSelectedReservation(null);
                    setNegotiatedPrice('');
                  }}
                  style={styles.modalButton}
                  disabled={negotiating}
                />
                <Button
                  title={negotiating ? 'Gönderiliyor...' : 'Teklif Gönder'}
                  onPress={handleConfirmNegotiation}
                  style={styles.modalButton}
                  disabled={negotiating || !negotiatedPrice}
                  loading={negotiating}
                />
              </View>
            </View>
          </View>
        </Modal>
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
    letterSpacing: 0.3,
  },
  filtersContainer: {
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary + '30',
    backgroundColor: theme.colors.background.primary,
  },
  filtersContent: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    height: 40,
    minWidth: 70,
    borderWidth: 1.5,
    gap: 6,
    flexShrink: 0,
  },
  filterIcon: {
    width: 14,
    height: 14,
    flexShrink: 0,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
    includeFontPadding: false,
    textAlignVertical: 'center',
    flexShrink: 0,
  },
  badge: {
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    flexShrink: 0,
    marginLeft: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.1,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  badgePlaceholder: {
    width: 22,
    height: 20,
    flexShrink: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 120,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.7,
    paddingHorizontal: 16,
  },
  // New Modern Reservation Card
  reservationItem: {
    marginBottom: 12,
  },
  card: {
    backgroundColor: theme.colors.background.card,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  cardHeader: {
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
    alignSelf: 'flex-start',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.7,
  },
  contentRow: {
    flexDirection: 'row',
    gap: 12,
  },
  imageWrapper: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.colors.background.secondary,
    flexShrink: 0,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.colors.background.secondary,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background.secondary,
  },
  infoSection: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'space-between',
  },
  brandLabel: {
    fontSize: 10,
    fontWeight: '500',
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  partTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 8,
    minHeight: 40,
    maxHeight: 40,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.8,
  },
  conditionTag: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  conditionText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  sellerName: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.8,
    flex: 1,
    minWidth: 0,
  },
  ratingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: theme.colors.background.tertiary,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 8,
    flexShrink: 0,
  },
  ratingValue: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.text.primary,
  },
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minWidth: 80,
    flexShrink: 0,
  },
  priceBox: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.3,
    minWidth: 0,
  },
  currencyText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  oldPriceValue: {
    fontSize: 11,
    opacity: 0.5,
    fontWeight: '500',
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  negotiateBtn: {
    // backgroundColor from inline style
  },
  cancelBtn: {
    // backgroundColor from inline style
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.primary + '30',
    gap: 6,
  },
  deliveryText: {
    fontSize: 11,
    fontWeight: '500',
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 32,
    maxHeight: '85%',
    backgroundColor: theme.colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary + '40',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.7,
  },
  modalPriceBox: {
    backgroundColor: theme.colors.background.secondary,
    borderRadius: 12,
    padding: 16,
  },
  currentPrice: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 6,
    flexShrink: 1,
    minWidth: 0,
    letterSpacing: 0.3,
  },
  modalHint: {
    fontSize: 13,
    flexShrink: 1,
    minWidth: 0,
    opacity: 0.7,
    marginTop: 4,
  },
  priceInput: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    marginTop: 8,
    fontWeight: '600',
    minHeight: 56,
  },
  inputHint: {
    fontSize: 12,
    marginTop: 8,
    opacity: 0.6,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.primary + '40',
  },
  modalButton: {
    flex: 1,
  },
});

export default PartsReservationsScreen;

