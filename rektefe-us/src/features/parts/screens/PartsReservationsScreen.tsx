import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Image,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/context';
import { useAuth } from '@/shared/context';
import { Card, Button } from '@/shared/components';
import { spacing, borderRadius, typography } from '@/shared/theme';
import apiService from '@/shared/services';

interface Reservation {
  _id: string;
  buyerId: {
    _id: string;
    name: string;
    surname: string;
    phone?: string;
    avatar?: string;
  };
  partId: {
    _id: string;
    partName: string;
    brand: string;
    partNumber?: string;
    condition: string;
    photos?: string[];
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
    transactionId?: string;
    paidAt?: Date;
  };
  status: 'pending' | 'confirmed' | 'cancelled' | 'expired' | 'delivered' | 'completed';
  cancellationReason?: string;
  cancelledBy?: 'buyer' | 'seller' | 'system';
  cancelledAt?: Date;
  deliveredAt?: Date;
  receivedBy?: string;
  stockRestored: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function PartsReservationsScreen() {
  const navigation = useNavigation();
  const { themeColors: colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [showNegotiationModal, setShowNegotiationModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [counterPrice, setCounterPrice] = useState('');
  const [responding, setResponding] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [delivering, setDelivering] = useState<string | null>(null);

  const fetchReservations = useCallback(async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      const response = await apiService.PartsService.getMechanicReservations(
        filter !== 'all' ? { status: filter } : undefined
      );
      
      if (response.success && response.data) {
        const reservationsArray = Array.isArray(response.data) ? response.data : [];
        setReservations(reservationsArray);
      } else {
        setReservations([]);
        if (showLoading && response.message && !response.message.includes('bulunmuyor')) {
          Alert.alert('Hata', response.message || 'Rezervasyonlar yüklenemedi');
        }
      }
    } catch (error: any) {
      console.error('❌ [PartsReservations] Rezervasyonlar yüklenemedi:', error);
      
      if (showLoading) {
        if (error.response?.status === 401 || error.message?.includes('401')) {
          Alert.alert(
            'Oturum Hatası',
            'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.',
            [
              {
                text: 'Tamam',
                onPress: () => {
                  if (navigation.canGoBack()) {
                    navigation.goBack();
                  }
                },
              },
            ]
          );
        } else {
          Alert.alert('Hata', error.message || 'Rezervasyonlar yüklenemedi');
        }
      }
      
      setReservations([]);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [filter, navigation]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReservations(false);
    setRefreshing(false);
  }, [fetchReservations]);

  const pendingCount = useMemo(() => {
    return Array.isArray(reservations)
      ? reservations.filter(r => r && r.status === 'pending').length
      : 0;
  }, [reservations]);

  /**
   * Rezervasyonu teslim et
   */
  const handleDeliver = useCallback(async (reservation: Reservation) => {
    Alert.alert(
      'Rezervasyonu Teslim Et',
      'Bu rezervasyonu teslim edildi olarak işaretlemek istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Teslim Et',
          onPress: async () => {
            try {
              setDelivering(reservation._id);
              
              const response = await apiService.PartsService.deliverReservation(reservation._id);
              
              if (response.success && response.data) {
                // Optimistic update: Status'ü 'delivered' olarak güncelle
                setReservations(prev => {
                  if (!Array.isArray(prev)) return prev;
                  
                  // Filter'a göre işlem yap
                  if (filter === 'confirmed') {
                    // Confirmed filter'da - rezervasyonu kaldır
                    return prev.filter(r => r._id !== reservation._id);
                  } else {
                    // All filter'da - rezervasyonu güncelle
                    return prev.map(r => {
                      if (r._id === reservation._id) {
                        return {
                          ...r,
                          ...response.data,
                          status: 'delivered' as const,
                          deliveredAt: response.data.deliveredAt || new Date().toISOString(),
                        };
                      }
                      return r;
                    });
                  }
                });
                
                Alert.alert('Başarılı', 'Rezervasyon teslim edildi olarak işaretlendi');
              } else {
                const errorMessage = response.message || 'Rezervasyon teslim edilemedi';
                Alert.alert(
                  'Hata',
                  errorMessage,
                  [{ text: 'Tamam' }]
                );
                await fetchReservations(false);
              }
            } catch (error: any) {
              console.error('❌ [PartsReservations] Teslim etme hatası:', error);
              const errorMessage = error?.response?.data?.message || 
                                 error?.message || 
                                 'Rezervasyon teslim edilemedi';
              Alert.alert(
                'Hata',
                errorMessage,
                [{ text: 'Tamam' }]
              );
              await fetchReservations(false);
            } finally {
              setDelivering(null);
            }
          },
        },
      ]
    );
  }, [filter, fetchReservations]);

  /**
   * Rezervasyonu onayla
   */
  const handleApprove = useCallback(async (reservation: Reservation) => {
    Alert.alert(
      'Rezervasyonu Onayla',
      'Bu rezervasyonu onaylamak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Onayla',
          onPress: async () => {
            try {
              setApproving(reservation._id);
              
              const response = await apiService.PartsService.approveReservation(reservation._id);
              
              if (response.success && response.data) {
                // Optimistic update: Status'ü 'confirmed' olarak güncelle
                setReservations(prev => {
                  if (!Array.isArray(prev)) return prev;
                  
                  // Filter'a göre işlem yap
                  if (filter === 'pending') {
                    // Pending filter'da - rezervasyonu kaldır
                    return prev.filter(r => r._id !== reservation._id);
                  } else {
                    // All veya confirmed filter'da - rezervasyonu güncelle
                    return prev.map(r => {
                      if (r._id === reservation._id) {
                        return {
                          ...r,
                          ...response.data,
                          status: 'confirmed' as const,
                          buyerId: response.data.buyerId || r.buyerId,
                          partId: response.data.partId || r.partId,
                          partInfo: response.data.partInfo || r.partInfo,
                          vehicleId: response.data.vehicleId || r.vehicleId,
                        };
                      }
                      return r;
                    });
                  }
                });
                
                Alert.alert('Başarılı', 'Rezervasyon onaylandı');
              } else {
                // API'den gelen hata mesajını göster
                const errorMessage = response.message || 'Rezervasyon onaylanamadı';
                Alert.alert(
                  'Hata',
                  errorMessage,
                  [{ text: 'Tamam' }]
                );
                await fetchReservations(false);
              }
            } catch (error: any) {
              console.error('❌ [PartsReservations] Onaylama hatası:', error);
              // API'den gelen hata mesajını öncelikle göster
              const errorMessage = error?.response?.data?.message || 
                                 error?.message || 
                                 'Rezervasyon onaylanamadı';
              Alert.alert(
                'Hata',
                errorMessage,
                [{ text: 'Tamam' }]
              );
              await fetchReservations(false);
            } finally {
              setApproving(null);
            }
          },
        },
      ]
    );
  }, [fetchReservations, filter]);

  /**
   * Rezervasyonu iptal et
   */
  const handleCancel = useCallback(async (reservation: Reservation) => {
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
              setApproving(reservation._id);
              
              const response = await apiService.PartsService.cancelReservation(
                reservation._id,
                undefined,
                'seller'
              );
              
              if (response.success) {
                // Optimistic update - rezervasyonu listeden kaldır
                setReservations(prev => {
                  if (!Array.isArray(prev)) return prev;
                  return prev.filter(r => r._id !== reservation._id);
                });
                
                Alert.alert('Başarılı', 'Rezervasyon iptal edildi');
              } else {
                Alert.alert('Hata', response.message || 'Rezervasyon iptal edilemedi');
                await fetchReservations(false);
              }
            } catch (error: any) {
              console.error('❌ [PartsReservations] İptal hatası:', error);
              Alert.alert('Hata', error.message || 'Rezervasyon iptal edilemedi');
              await fetchReservations(false);
            } finally {
              setApproving(null);
            }
          },
        },
      ]
    );
  }, [fetchReservations]);

  /**
   * Pazarlık yanıtı modalını aç
   */
  const handleNegotiationResponse = useCallback((reservation: Reservation, action: 'accept' | 'reject') => {
    setSelectedReservation(reservation);
    if (action === 'reject') {
      setCounterPrice('');
    }
    setShowNegotiationModal(true);
  }, []);

  /**
   * Pazarlık yanıtını gönder (kabul/red/karşı teklif)
   */
  const handleConfirmNegotiationResponse = useCallback(async (action: 'accept' | 'reject') => {
    if (!selectedReservation) return;

    try {
      setResponding(true);
      let response;
      
      if (action === 'accept') {
        // Pazarlık kabul et
        response = await apiService.PartsService.respondToNegotiation(
          selectedReservation._id,
          'accept'
        );
      } else {
        // Reddet veya karşı teklif gönder
        const counterPriceValue = parseFloat(counterPrice);
        
        if (counterPrice && !isNaN(counterPriceValue) && counterPriceValue > 0) {
          // Karşı teklif validasyonları
          if (counterPriceValue >= selectedReservation.totalPrice) {
            Alert.alert('Uyarı', 'Karşı teklif toplam fiyattan düşük olmalıdır');
            setResponding(false);
            return;
          }
          
          if (selectedReservation.negotiatedPrice && counterPriceValue <= selectedReservation.negotiatedPrice) {
            Alert.alert('Uyarı', 'Karşı teklif, müşterinin pazarlık teklifinden yüksek olmalıdır');
            setResponding(false);
            return;
          }
          
          const unitPrice = counterPriceValue / selectedReservation.quantity;
          
          if (unitPrice >= selectedReservation.unitPrice) {
            Alert.alert('Uyarı', 'Karşı teklif birim fiyatı orijinal birim fiyattan düşük olmalıdır');
            setResponding(false);
            return;
          }
          
          // Karşı teklif gönder
          response = await apiService.PartsService.respondToNegotiation(
            selectedReservation._id,
            'reject',
            unitPrice
          );
        } else {
          // Sadece reddet
          response = await apiService.PartsService.respondToNegotiation(
            selectedReservation._id,
            'reject'
          );
        }
      }

      if (response.success && response.data) {
        // Optimistic update - rezervasyonu güncelle
        setReservations(prev => {
          if (!Array.isArray(prev) || !selectedReservation) return prev;
          
          return prev.map(r => {
            if (r._id === selectedReservation._id) {
              const updatedData = response.data || {};
              
              if (action === 'accept') {
                // Pazarlık kabul edildi
                return {
                  ...r,
                  ...updatedData,
                  status: 'pending' as const,
                  totalPrice: updatedData.totalPrice || r.totalPrice,
                  negotiatedPrice: undefined,
                  buyerId: updatedData.buyerId || r.buyerId,
                  partId: updatedData.partId || r.partId,
                  partInfo: updatedData.partInfo || r.partInfo,
                  vehicleId: updatedData.vehicleId || r.vehicleId,
                };
              } else if (action === 'reject') {
                if (counterPrice && !isNaN(parseFloat(counterPrice)) && parseFloat(counterPrice) > 0) {
                  // Karşı teklif gönderildi
                  return {
                    ...r,
                    ...updatedData,
                    negotiatedPrice: updatedData.negotiatedPrice,
                    buyerId: updatedData.buyerId || r.buyerId,
                    partId: updatedData.partId || r.partId,
                    partInfo: updatedData.partInfo || r.partInfo,
                    vehicleId: updatedData.vehicleId || r.vehicleId,
                  };
                } else {
                  // Pazarlık reddedildi
                  return {
                    ...r,
                    negotiatedPrice: undefined,
                  };
                }
              }
            }
            return r;
          });
        });
        
        Alert.alert('Başarılı', response.message || 'Pazarlık yanıtı verildi');
        
        setShowNegotiationModal(false);
        setSelectedReservation(null);
        setCounterPrice('');
      } else {
        Alert.alert('Hata', response.message || 'Pazarlık yanıtı verilemedi');
        await fetchReservations(false);
      }
    } catch (error: any) {
      console.error('❌ [PartsReservations] Pazarlık yanıt hatası:', error);
      Alert.alert('Hata', error.message || 'Pazarlık yanıtı verilemedi');
      await fetchReservations(false);
    } finally {
      setResponding(false);
    }
  }, [selectedReservation, counterPrice, fetchReservations]);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'pending': return colors.warning.main;
      case 'confirmed': return colors.info.main;
      case 'completed': return colors.success.main;
      case 'cancelled': return colors.error.main;
      case 'expired': return colors.text.tertiary;
      case 'delivered': return colors.secondary.main;
      default: return colors.text.secondary;
    }
  }, [colors]);

  const getStatusLabel = useCallback((status: string) => {
    switch (status) {
      case 'pending': return 'Beklemede';
      case 'confirmed': return 'Onaylandı';
      case 'completed': return 'Tamamlandı';
      case 'cancelled': return 'İptal Edildi';
      case 'expired': return 'Süresi Doldu';
      case 'delivered': return 'Teslim Edildi';
      default: return status;
    }
  }, []);

  const getDeliveryMethodLabel = useCallback((method: string) => {
    switch (method) {
      case 'pickup': return 'Mağazadan Al';
      case 'standard': return 'Standart Kargo';
      case 'express': return 'Hızlı Kargo';
      default: return method;
    }
  }, []);

  const filterItems = useMemo(() => [
    { key: 'all', label: 'Tümü', icon: 'list' },
    { key: 'pending', label: 'Beklemede', icon: 'time', badge: pendingCount },
    { key: 'confirmed', label: 'Onaylandı', icon: 'checkmark-circle' },
    { key: 'completed', label: 'Tamamlandı', icon: 'checkmark-done-circle' },
    { key: 'cancelled', label: 'İptal Edildi', icon: 'close-circle' },
  ], [pendingCount]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
            Rezervasyonlar yükleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]} edges={['top']}>
      {/* Header */}
      <View style={[
        styles.header, 
        { 
          backgroundColor: colors.background.primary, 
          borderBottomColor: colors.border.primary,
        }
      ]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
            Rezervasyonlar
          </Text>
          {pendingCount > 0 && (
            <View style={[styles.headerBadge, { backgroundColor: colors.error.main }]}>
              <Text style={styles.headerBadgeText}>{pendingCount}</Text>
            </View>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Filters */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={[
          styles.filtersContainer, 
          { 
            backgroundColor: colors.background.primary, 
            borderBottomColor: colors.border.primary,
          }
        ]}
        contentContainerStyle={styles.filtersContent}
      >
        {filterItems.map((filterItem) => (
          <TouchableOpacity
            key={filterItem.key}
            style={[
              styles.filterChip,
              {
                backgroundColor: filter === filterItem.key ? colors.primary.main : colors.background.secondary,
                borderColor: filter === filterItem.key ? colors.primary.main : colors.border.primary,
              }
            ]}
            onPress={() => setFilter(filterItem.key as any)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={filterItem.icon as any}
              size={16}
              color={filter === filterItem.key ? colors.text.inverse : colors.text.secondary}
            />
            <Text style={[
              styles.filterChipText,
              { color: filter === filterItem.key ? colors.text.inverse : colors.text.secondary }
            ]}>
              {filterItem.label}
            </Text>
            {filterItem.badge !== undefined && filterItem.badge > 0 && (
              <View style={[styles.badge, { backgroundColor: filter === filterItem.key ? 'rgba(255,255,255,0.3)' : colors.error.main }]}>
                <Text style={[styles.badgeText, { color: colors.text.inverse }]}>
                  {String(filterItem.badge)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Reservations */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.main} />
        }
        showsVerticalScrollIndicator={false}
      >
        {reservations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.background.secondary }]}>
              <Ionicons name="document-text-outline" size={48} color={colors.text.tertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              Rezervasyon Bulunmuyor
            </Text>
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              {filter !== 'all' 
                ? `${filterItems.find(f => f.key === filter)?.label} rezervasyon bulunmuyor`
                : 'Henüz rezervasyon bulunmuyor'}
            </Text>
          </View>
        ) : (
          <View style={styles.reservationsContainer}>
            {reservations.map((reservation) => (
              <TouchableOpacity
                key={reservation._id}
                style={[
                  styles.reservationCard, 
                  { 
                    backgroundColor: colors.background.card, 
                    borderColor: colors.border.primary,
                  }
                ]}
                activeOpacity={0.8}
                onPress={() => {
                  // Rezervasyon detayları burada gösterilebilir veya başka bir ekrana yönlendirilebilir
                }}
              >
                {/* Card Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeft}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(reservation.status) + '15' }]}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(reservation.status) }]} />
                      <Text style={[styles.statusText, { color: getStatusColor(reservation.status) }]}>
                        {getStatusLabel(reservation.status)}
                      </Text>
                    </View>
                    {reservation.negotiatedPrice && (
                      <View style={[styles.negotiatedBadge, { backgroundColor: colors.accent.main + '15' }]}>
                        <Ionicons name="swap-horizontal" size={12} color={colors.accent.main} />
                        <Text style={[styles.negotiatedText, { color: colors.accent.main }]}>
                          Pazarlık
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.dateText, { color: colors.text.tertiary }]}>
                    {new Date(reservation.createdAt).toLocaleDateString('tr-TR', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </Text>
                </View>

                {/* Buyer Info */}
                <View style={[styles.buyerSection, { borderBottomColor: colors.border.primary }]}>
                  <View style={[styles.buyerAvatar, { backgroundColor: colors.background.secondary }]}>
                    {reservation.buyerId?.avatar ? (
                      <Image 
                        source={{ uri: reservation.buyerId.avatar }} 
                        style={styles.avatarImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <Ionicons name="person" size={20} color={colors.text.secondary} />
                    )}
                  </View>
                  <View style={styles.buyerDetails}>
                    <Text style={[styles.buyerName, { color: colors.text.primary }]} numberOfLines={1}>
                      {reservation.buyerId?.name || ''} {reservation.buyerId?.surname || ''}
                    </Text>
                    {reservation.buyerId?.phone && (
                      <View style={styles.phoneRow}>
                        <Ionicons name="call-outline" size={12} color={colors.text.tertiary} />
                        <Text style={[styles.buyerPhone, { color: colors.text.secondary }]}>
                          {String(reservation.buyerId.phone)}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Part Info */}
                <View style={styles.partSection}>
                  <View style={styles.partHeader}>
                    <View style={styles.partInfoLeft}>
                      {reservation.partId?.photos && reservation.partId.photos.length > 0 && (
                        <Image 
                          source={{ uri: reservation.partId.photos[0] }} 
                          style={styles.partThumbnail}
                          resizeMode="cover"
                        />
                      )}
                      <View style={styles.partTextInfo}>
                        <Text style={[styles.partName, { color: colors.text.primary }]} numberOfLines={2}>
                          {reservation.partInfo?.partName || reservation.partId?.partName || 'Bilinmeyen Parça'}
                        </Text>
                        <Text style={[styles.partBrand, { color: colors.text.secondary }]}>
                          {reservation.partInfo?.brand || reservation.partId?.brand || ''}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.partMeta}>
                    <View style={[styles.metaItem, { backgroundColor: colors.background.secondary }]}>
                      <Ionicons name="cube-outline" size={14} color={colors.text.secondary} />
                      <Text style={[styles.metaValue, { color: colors.text.primary }]}>{reservation.quantity || 0}x</Text>
                    </View>
                    <View style={[styles.metaItem, { backgroundColor: colors.background.secondary }]}>
                      <Ionicons name="checkmark-circle-outline" size={14} color={colors.text.secondary} />
                      <Text style={[styles.metaValue, { color: colors.text.primary }]}>
                        {reservation.partInfo?.condition || reservation.partId?.condition || 'Bilinmiyor'}
                      </Text>
                    </View>
                    <View style={[styles.metaItem, { backgroundColor: colors.background.secondary }]}>
                      <Ionicons name="location-outline" size={14} color={colors.text.secondary} />
                      <Text style={[styles.deliveryText, { color: colors.text.primary }]}>
                        {getDeliveryMethodLabel(reservation.delivery?.method || 'pickup')}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Pricing */}
                <View style={[styles.pricingSection, { backgroundColor: colors.background.secondary, borderColor: colors.border.primary }]}>
                  <View style={styles.pricingHeader}>
                    <Text style={[styles.priceLabel, { color: colors.text.secondary }]}>
                      Toplam Tutar
                    </Text>
                    {reservation.negotiatedPrice && reservation.negotiatedPrice !== reservation.totalPrice && (
                      <View style={[styles.discountBadge, { backgroundColor: colors.success.main + '15' }]}>
                        <Text style={[styles.discountText, { color: colors.success.main }]}>
                          İndirimli
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.priceRow}>
                    {reservation.negotiatedPrice && reservation.negotiatedPrice !== reservation.totalPrice ? (
                      <>
                        <Text style={[styles.negotiatedPrice, { color: colors.primary.main }]}>
                          {typeof reservation.negotiatedPrice === 'number'
                            ? `${reservation.negotiatedPrice.toLocaleString('tr-TR')} TL`
                            : '0 TL'}
                        </Text>
                        <Text style={[styles.oldPrice, { color: colors.text.tertiary }]}>
                          {typeof reservation.totalPrice === 'number'
                            ? `${reservation.totalPrice.toLocaleString('tr-TR')} TL`
                            : '0 TL'}
                        </Text>
                      </>
                    ) : (
                      <Text style={[styles.priceValue, { color: colors.text.primary }]}>
                        {typeof reservation.totalPrice === 'number'
                          ? `${reservation.totalPrice.toLocaleString('tr-TR')} TL`
                          : '0 TL'}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Actions */}
                {reservation.status === 'pending' && (
                  <View style={styles.actions}>
                    {reservation.negotiatedPrice ? (
                      <>
                        <Button
                          title="Kabul Et"
                          onPress={() => {
                            setSelectedReservation(reservation);
                            handleConfirmNegotiationResponse('accept');
                          }}
                          variant="success"
                          size="medium"
                          style={styles.actionButton}
                          disabled={responding || approving === reservation._id}
                          loading={responding && approving === reservation._id}
                        />
                        <Button
                          title="Yanıtla"
                          onPress={() => handleNegotiationResponse(reservation, 'reject')}
                          variant="outline"
                          size="medium"
                          style={styles.actionButton}
                          disabled={responding || approving === reservation._id}
                        />
                      </>
                    ) : (
                      <>
                        <Button
                          title="Onayla"
                          onPress={() => handleApprove(reservation)}
                          variant="primary"
                          size="medium"
                          style={styles.actionButton}
                          disabled={approving === reservation._id}
                          loading={approving === reservation._id}
                        />
                        <Button
                          title="İptal Et"
                          onPress={() => handleCancel(reservation)}
                          variant="error"
                          size="medium"
                          style={styles.actionButton}
                          disabled={approving === reservation._id}
                        />
                      </>
                    )}
                  </View>
                )}

                {reservation.status === 'confirmed' && (
                  <View style={styles.actions}>
                    <Button
                      title="Teslim Et"
                      onPress={() => handleDeliver(reservation)}
                      variant="primary"
                      size="medium"
                      style={styles.actionButton}
                      disabled={delivering === reservation._id}
                      loading={delivering === reservation._id}
                      icon="checkmark-circle"
                    />
                  </View>
                )}

                {/* Arrow indicator */}
                <View style={styles.arrowContainer}>
                  <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Negotiation Response Modal */}
      <Modal
        visible={showNegotiationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowNegotiationModal(false);
          setSelectedReservation(null);
          setCounterPrice('');
        }}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.background.overlay }]}>
          <View style={[
            styles.modalContent, 
            { 
              backgroundColor: colors.background.primary,
            }
          ]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.primary }]}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIconContainer, { backgroundColor: colors.accent.main + '15' }]}>
                  <Ionicons name="swap-horizontal" size={24} color={colors.accent.main} />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                    Pazarlık Teklifi
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: colors.text.secondary }]}>
                    Müşteriden gelen teklif
                  </Text>
                </View>
              </View>
              <TouchableOpacity 
                onPress={() => {
                  setShowNegotiationModal(false);
                  setSelectedReservation(null);
                  setCounterPrice('');
                }}
                style={[styles.closeButton, { backgroundColor: colors.background.secondary }]}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color={colors.text.primary} />
              </TouchableOpacity>
            </View>

            {selectedReservation && (
              <>
                <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                  {/* Offer Info Card */}
                  <View style={[styles.modalInfoCard, { backgroundColor: colors.background.secondary, borderColor: colors.border.primary }]}>
                    <View style={styles.modalInfoRow}>
                      <View style={styles.modalInfoLeft}>
                        <Text style={[styles.modalInfoLabel, { color: colors.text.secondary }]}>
                          Müşterinin Teklifi
                        </Text>
                        <Text style={[styles.modalPrice, { color: colors.accent.main }]}>
                          {typeof selectedReservation.negotiatedPrice === 'number'
                            ? `${selectedReservation.negotiatedPrice.toLocaleString('tr-TR')} TL`
                            : '0 TL'}
                        </Text>
                      </View>
                      <View style={[styles.modalPriceChangeBadge, { backgroundColor: colors.success.main + '15' }]}>
                        <Ionicons name="arrow-down" size={16} color={colors.success.main} />
                        <Text style={[styles.modalPriceChangeText, { color: colors.success.main }]}>
                          {typeof selectedReservation.negotiatedPrice === 'number' && typeof selectedReservation.totalPrice === 'number'
                            ? `${((1 - selectedReservation.negotiatedPrice / selectedReservation.totalPrice) * 100).toFixed(0)}%`
                            : '0%'}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.modalDivider, { backgroundColor: colors.border.primary }]} />
                    <View style={styles.modalInfoRow}>
                      <Text style={[styles.modalInfoHint, { color: colors.text.tertiary }]}>
                        Orijinal Fiyat
                      </Text>
                      <Text style={[styles.modalOriginalPrice, { color: colors.text.tertiary }]}>
                        {typeof selectedReservation.totalPrice === 'number'
                          ? `${selectedReservation.totalPrice.toLocaleString('tr-TR')} TL`
                          : '0 TL'}
                      </Text>
                    </View>
                  </View>

                  {/* Counter Offer Input */}
                  <View style={styles.modalInputContainer}>
                    <Text style={[styles.modalInputLabel, { color: colors.text.primary }]}>
                      Karşı Teklif (Toplam)
                    </Text>
                    <View style={[styles.modalInputWrapper, { 
                      backgroundColor: colors.background.secondary,
                      borderColor: counterPrice ? colors.primary.main : colors.border.primary
                    }]}>
                      <TextInput
                        style={[styles.modalInput, { color: colors.text.primary }]}
                        value={counterPrice}
                        onChangeText={setCounterPrice}
                        placeholder="0.00"
                        placeholderTextColor={colors.text.tertiary}
                        keyboardType="decimal-pad"
                      />
                      <Text style={[styles.modalCurrency, { color: colors.text.secondary }]}>
                        TL
                      </Text>
                    </View>
                    <Text style={[styles.modalInputHint, { color: colors.text.secondary }]}>
                      Müşterinin teklifinden yüksek, orijinal fiyattan düşük olmalıdır
                    </Text>
                  </View>
                </ScrollView>

                {/* Modal Actions */}
                <View style={[styles.modalActions, { borderTopColor: colors.border.primary, backgroundColor: colors.background.primary }]}>
                  <Button
                    title="Kabul Et"
                    onPress={() => handleConfirmNegotiationResponse('accept')}
                    variant="success"
                    size="medium"
                    fullWidth
                    style={styles.modalButton}
                    disabled={responding}
                    loading={responding}
                    icon="checkmark-circle"
                  />
                  <Button
                    title="Karşı Teklif Gönder"
                    onPress={() => handleConfirmNegotiationResponse('reject')}
                    variant="primary"
                    size="medium"
                    fullWidth
                    style={styles.modalButton}
                    disabled={responding || !counterPrice}
                    loading={responding}
                    icon="send"
                  />
                  <Button
                    title="Reddet"
                    onPress={() => {
                      setCounterPrice('');
                      handleConfirmNegotiationResponse('reject');
                    }}
                    variant="ghost"
                    size="medium"
                    fullWidth
                    style={styles.modalButton}
                    disabled={responding}
                    textStyle={{ color: colors.error.main }}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
  },
  headerTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    ...typography.h2,
    fontWeight: '700',
  },
  headerBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: borderRadius.full,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  filtersContainer: {
    borderBottomWidth: 1,
    maxHeight: 64,
  },
  filtersContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    gap: spacing.xs,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    marginRight: spacing.xs,
    borderWidth: 1.5,
    gap: spacing.xs,
    height: 36,
    minHeight: 36,
  },
  filterChipText: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  badge: {
    borderRadius: borderRadius.full,
    paddingHorizontal: 5,
    paddingVertical: 2,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -2,
  },
  badgeText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...typography.h3,
    fontWeight: '700',
    marginTop: spacing.md,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
    opacity: 0.8,
  },
  reservationsContainer: {
    padding: spacing.md,
    gap: spacing.md,
  },
  reservationCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    position: 'relative',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  negotiatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    gap: 4,
  },
  negotiatedText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 11,
  },
  dateText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '500',
  },
  buyerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: 1,
  },
  buyerAvatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  buyerDetails: {
    flex: 1,
  },
  buyerName: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs / 2,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  buyerPhone: {
    ...typography.caption,
    fontSize: 12,
  },
  partSection: {
    marginBottom: spacing.md,
  },
  partHeader: {
    marginBottom: spacing.sm,
  },
  partInfoLeft: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  partThumbnail: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.secondary,
  },
  partTextInfo: {
    flex: 1,
  },
  partName: {
    ...typography.body,
    fontWeight: '700',
    marginBottom: spacing.xs / 2,
    lineHeight: 20,
  },
  partBrand: {
    ...typography.caption,
    fontSize: 12,
  },
  partMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    gap: spacing.xs / 2,
  },
  metaLabel: {
    ...typography.caption,
    fontSize: 11,
    marginRight: 4,
  },
  metaValue: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 12,
  },
  deliveryText: {
    ...typography.caption,
    fontSize: 11,
    fontWeight: '500',
  },
  pricingSection: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  pricingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  priceLabel: {
    ...typography.caption,
    fontSize: 12,
    fontWeight: '500',
  },
  discountBadge: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  discountText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  priceValue: {
    ...typography.h3,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  negotiatedPrice: {
    ...typography.h3,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  oldPrice: {
    ...typography.body,
    fontSize: 14,
    textDecorationLine: 'line-through',
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  actionButton: {
    flex: 1,
  },
  arrowContainer: {
    position: 'absolute',
    right: spacing.md,
    top: '50%',
    marginTop: -10,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    ...typography.h3,
    fontWeight: '700',
    marginBottom: 2,
  },
  modalSubtitle: {
    ...typography.caption,
    fontSize: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    maxHeight: 400,
  },
  modalInfoCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalInfoLeft: {
    flex: 1,
  },
  modalInfoLabel: {
    ...typography.caption,
    fontSize: 12,
    marginBottom: spacing.xs / 2,
  },
  modalPrice: {
    ...typography.h2,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  modalPriceChangeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  modalPriceChangeText: {
    ...typography.body,
    fontSize: 13,
    fontWeight: '700',
  },
  modalDivider: {
    height: 1,
    marginVertical: spacing.sm,
  },
  modalInfoHint: {
    ...typography.caption,
    fontSize: 11,
  },
  modalOriginalPrice: {
    ...typography.body,
    fontSize: 14,
    textDecorationLine: 'line-through',
  },
  modalInputContainer: {
    marginBottom: spacing.lg,
  },
  modalInputLabel: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    minHeight: 52,
  },
  modalInput: {
    ...typography.body,
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    paddingVertical: spacing.sm,
  },
  modalCurrency: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
  modalInputHint: {
    ...typography.caption,
    fontSize: 11,
    marginTop: spacing.xs,
    opacity: 0.8,
  },
  modalActions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    gap: spacing.sm,
  },
  modalButton: {
    marginHorizontal: 0,
  },
});
