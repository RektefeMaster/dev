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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/context';
import { useAuth } from '@/shared/context';
import { Card, Button } from '@/shared/components';
import { spacing, borderRadius, typography } from '@/shared/theme';
import apiService from '@/shared/services';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/config';

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
  expiresAt: string;
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

  const fetchReservations = useCallback(async (showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      // Token kontrolü - debug için
      if (__DEV__) {
        const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
        console.log('🔍 [PartsReservations] Token kontrolü:', token ? `${token.substring(0, 20)}...` : 'Token yok');
      }
      
      const response = await apiService.PartsService.getMechanicReservations(
        filter !== 'all' ? { status: filter } : undefined
      );
      
      if (__DEV__) {
        console.log('🔍 [PartsReservations] API Response:', {
          success: response.success,
          hasData: !!response.data,
          dataIsArray: Array.isArray(response.data),
          dataLength: Array.isArray(response.data) ? response.data.length : 0,
          message: response.message,
          filter: filter,
        });
      }
      
      if (response.success && response.data) {
        const reservationsArray = Array.isArray(response.data) ? response.data : [];
        setReservations(reservationsArray);
        
        if (__DEV__ && reservationsArray.length === 0) {
          console.log('⚠️ [PartsReservations] Rezervasyon array boş (filter:', filter, ')');
        }
      } else {
        if (__DEV__) {
          console.error('❌ [PartsReservations] API başarısız:', response.message || 'Bilinmeyen hata');
        }
        setReservations([]);
        
        // Kullanıcıya sadece önemli hataları göster (onaylama sırasında değil)
        if (showLoading && response.message && !response.message.includes('bulunmuyor')) {
          Alert.alert('Hata', response.message || 'Rezervasyonlar yüklenemedi');
        }
      }
    } catch (error: any) {
      console.error('❌ [PartsReservations] Rezervasyonlar yüklenemedi:', error);
      
      // 401 hatası için özel mesaj (sadece ilk yüklemede göster)
      if (showLoading) {
        if (error.response?.status === 401 || error.message?.includes('401')) {
          console.error('❌ [PartsReservations] 401 Unauthorized - Token geçersiz veya süresi dolmuş');
          Alert.alert(
            'Oturum Hatası',
            'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.',
            [
              {
                text: 'Tamam',
                onPress: () => {
                  // Navigation'a geri dön veya login'e yönlendir
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
    await fetchReservations();
    setRefreshing(false);
  }, [fetchReservations]);

  const pendingCount = useMemo(() => {
    return Array.isArray(reservations)
      ? reservations.filter(r => r && r.status === 'pending').length
      : 0;
  }, [reservations]);

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
              
              if (__DEV__) {
                console.log('🔍 [PartsReservations] Onaylama başlatılıyor:', {
                  reservationId: reservation._id,
                  currentFilter: filter,
                  currentStatus: reservation.status,
                });
              }
              
              const response = await apiService.PartsService.approveReservation(reservation._id);
              
              if (__DEV__) {
                console.log('🔍 [PartsReservations] Onaylama response:', {
                  success: response.success,
                  message: response.message,
                  dataStatus: response.data?.status,
                  hasData: !!response.data,
                  responseKeys: response.data ? Object.keys(response.data) : [],
                });
              }
              
              if (response.success) {
                if (__DEV__) {
                  console.log('✅ [PartsReservations] Rezervasyon onaylandı, güncellenmiş data:', {
                    reservationId: reservation._id,
                    newStatus: response.data?.status,
                    hasData: !!response.data,
                    filter: filter,
                  });
                }
                
                // Eğer filter 'pending' ise, rezervasyonu listeden kaldır (confirmed olmuştur)
                // Eğer filter 'all' veya 'confirmed' ise, rezervasyonu güncelle
                if (filter === 'pending') {
                  // Pending filter'da - rezervasyonu listeden kaldır (confirmed olmuştur)
                  setReservations(prev => {
                    if (!Array.isArray(prev)) return prev;
                    const filtered = prev.filter(r => r._id !== reservation._id);
                    if (__DEV__) {
                      console.log('🔍 [PartsReservations] Pending filter - rezervasyon kaldırıldı, yeni liste uzunluğu:', filtered.length);
                    }
                    return filtered;
                  });
                } else {
                  // All veya confirmed filter'da - rezervasyonu güncelle
                  setReservations(prev => {
                    if (!Array.isArray(prev)) return prev;
                    return prev.map(r => 
                      r._id === reservation._id && response.data
                        ? { ...r, ...response.data, status: 'confirmed' }
                        : r
                    );
                  });
                  if (__DEV__) {
                    console.log('🔍 [PartsReservations] All/Confirmed filter - rezervasyon güncellendi');
                  }
                }
                
                // Liste yenile - loading gösterme (optimistic update zaten gösterildi)
                // ÖNEMLI: fetchReservations çağrılmadan önce kısa bir delay ekle
                // Böylece state güncellemesi tamamlanır
                setTimeout(async () => {
                  await fetchReservations(false);
                }, 100);
                
                Alert.alert('Başarılı', 'Rezervasyon onaylandı');
              } else {
                if (__DEV__) {
                  console.error('❌ [PartsReservations] Onaylama başarısız:', {
                    reservationId: reservation._id,
                    message: response.message,
                    response: response,
                  });
                }
                
                Alert.alert('Hata', response.message || 'Rezervasyon onaylanamadı');
                // Hata durumunda listeyi yeniden yükle (loading gösterme)
                await fetchReservations(false);
              }
            } catch (error: any) {
              console.error('❌ [PartsReservations] Onaylama hatası:', error);
              Alert.alert('Hata', error.message || 'Rezervasyon onaylanamadı');
              // Hata durumunda listeyi yeniden yükle (loading gösterme)
              await fetchReservations(false);
            } finally {
              setApproving(null);
            }
          },
        },
      ]
    );
  }, [fetchReservations, filter]);

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
              
              if (__DEV__) {
                console.log('🔍 [PartsReservations] İptal işlemi başlatılıyor:', reservation._id);
              }
              
              const response = await apiService.PartsService.cancelReservation(
                reservation._id,
                undefined,
                'seller'
              );
              
              if (__DEV__) {
                console.log('🔍 [PartsReservations] İptal response:', {
                  success: response.success,
                  message: response.message,
                });
              }
              
              if (response.success) {
                // Optimistic update - rezervasyonu listeden kaldır
                setReservations(prev => {
                  if (!Array.isArray(prev)) return prev;
                  return prev.filter(r => r._id !== reservation._id);
                });
                
                // Liste yenile - loading gösterme
                await fetchReservations(false);
                Alert.alert('Başarılı', 'Rezervasyon iptal edildi');
              } else {
                Alert.alert('Hata', response.message || 'Rezervasyon iptal edilemedi');
                // Hata durumunda listeyi yenile
                await fetchReservations(false);
              }
            } catch (error: any) {
              console.error('❌ [PartsReservations] İptal hatası:', error);
              Alert.alert('Hata', error.message || 'Rezervasyon iptal edilemedi');
              // Hata durumunda listeyi yenile
              await fetchReservations(false);
            } finally {
              setApproving(null);
            }
          },
        },
      ]
    );
  }, [fetchReservations]);

  const handleNegotiationResponse = useCallback((reservation: Reservation, action: 'accept' | 'reject') => {
    setSelectedReservation(reservation);
    if (action === 'reject') {
      setCounterPrice('');
    }
    setShowNegotiationModal(true);
  }, []);

  const handleConfirmNegotiationResponse = useCallback(async (action: 'accept' | 'reject') => {
    if (!selectedReservation) return;

    try {
      setResponding(true);
      let response;
      
      if (action === 'accept') {
        response = await apiService.PartsService.respondToNegotiation(
          selectedReservation._id,
          'accept'
        );
      } else {
        const counterPriceValue = parseFloat(counterPrice);
        if (counterPrice && (!isNaN(counterPriceValue) && counterPriceValue > 0)) {
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
          
          response = await apiService.PartsService.respondToNegotiation(
            selectedReservation._id,
            'reject',
            unitPrice
          );
        } else {
          response = await apiService.PartsService.respondToNegotiation(
            selectedReservation._id,
            'reject'
          );
        }
      }

      if (response.success) {
        // Optimistic update - rezervasyonu güncelle
        if (action === 'accept') {
          // Pazarlık kabul edildi - rezervasyon hala pending ama negotiatedPrice onaylandı
          // Liste yenileme ile güncel hali gelecek
        } else if (action === 'reject') {
          if (counterPrice && !isNaN(parseFloat(counterPrice)) && parseFloat(counterPrice) > 0) {
            // Karşı teklif gönderildi - rezervasyon güncellenecek
          } else {
            // Pazarlık reddedildi - negotiatedPrice temizlendi, normal rezervasyona döndü
            // Optimistic update: rezervasyonu güncelle
            setReservations(prev => {
              if (!Array.isArray(prev) || !selectedReservation) return prev;
              return prev.map(r => 
                r._id === selectedReservation._id 
                  ? { ...r, negotiatedPrice: undefined }
                  : r
              );
            });
          }
        }
        
        setShowNegotiationModal(false);
        setSelectedReservation(null);
        setCounterPrice('');
        
        // Liste yenile - loading gösterme
        await fetchReservations(false);
        
        Alert.alert('Başarılı', response.message || 'Pazarlık yanıtı verildi');
      } else {
        Alert.alert('Hata', response.message || 'Pazarlık yanıtı verilemedi');
        // Hata durumunda listeyi yenile
        await fetchReservations(false);
      }
    } catch (error: any) {
      console.error('❌ [PartsReservations] Pazarlık yanıt hatası:', error);
      Alert.alert('Hata', error.message || 'Pazarlık yanıtı verilemedi');
      // Hata durumunda listeyi yenile
      await fetchReservations(false);
    } finally {
      setResponding(false);
    }
  }, [selectedReservation, counterPrice, fetchReservations]);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'confirmed': return '#3B82F6';
      case 'completed': return '#10B981';
      case 'cancelled': return '#EF4444';
      case 'expired': return '#6B7280';
      case 'delivered': return '#8B5CF6';
      default: return colors.textSecondary;
    }
  }, [colors.textSecondary]);

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
    { key: 'completed', label: 'Tamamlandı', icon: 'trophy' },
    { key: 'cancelled', label: 'İptal', icon: 'close-circle' },
  ], [pendingCount]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Rezervasyonlar yükleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Rezervasyonlar
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
        {filterItems.map((filterItem) => (
          <TouchableOpacity
            key={filterItem.key}
            style={[
              styles.filterChip,
              {
                backgroundColor: filter === filterItem.key ? colors.primary : colors.inputBackground,
                borderColor: filter === filterItem.key ? colors.primary : colors.border,
              }
            ]}
            onPress={() => setFilter(filterItem.key as any)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={filterItem.icon as any}
              size={16}
              color={filter === filterItem.key ? '#FFFFFF' : colors.textSecondary}
            />
            <Text style={[
              styles.filterChipText,
              { color: filter === filterItem.key ? '#FFFFFF' : colors.textSecondary }
            ]}>
              {filterItem.label}
            </Text>
            {filterItem.badge !== undefined && filterItem.badge > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{String(filterItem.badge)}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Reservations */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {reservations.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Rezervasyon bulunmuyor
            </Text>
          </View>
        ) : (
          <View style={styles.reservationsContainer}>
            {reservations.map((reservation) => (
              <Card key={reservation._id} style={styles.reservationCard}>
                <View style={styles.reservationHeader}>
                  <View style={styles.reservationHeaderLeft}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(reservation.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(reservation.status) }]}>
                        {getStatusLabel(reservation.status)}
                      </Text>
                    </View>
                    <Text style={[styles.reservationDate, { color: colors.textSecondary }]}>
                      {new Date(reservation.createdAt).toLocaleDateString('tr-TR')}
                    </Text>
                  </View>
                  {reservation.negotiatedPrice && (
                    <View style={styles.negotiatedBadge}>
                      <Ionicons name="hand-left-outline" size={16} color="#6366F1" />
                      <Text style={[styles.negotiatedText, { color: '#6366F1' }]}>
                        Pazarlıklı
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.buyerInfo}>
                  <Ionicons name="person-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.buyerName, { color: colors.text }]}>
                    {reservation.buyerId?.name || ''} {reservation.buyerId?.surname || ''}
                  </Text>
                  {reservation.buyerId?.phone && (
                    <Text style={[styles.buyerPhone, { color: colors.textSecondary }]}>
                      {String(reservation.buyerId.phone)}
                    </Text>
                  )}
                </View>

                <View style={styles.partInfo}>
                  <Text style={[styles.partName, { color: colors.text }]}>
                    {reservation.partInfo?.partName || 'Bilinmeyen Parça'}
                  </Text>
                  <Text style={[styles.partBrand, { color: colors.textSecondary }]}>
                    {reservation.partInfo?.brand || ''}
                  </Text>
                  <View style={styles.partDetails}>
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                      Adet: {String(reservation.quantity || 0)}
                    </Text>
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                      Durum: {reservation.partInfo?.condition || 'Bilinmiyor'}
                    </Text>
                  </View>
                </View>

                <View style={styles.pricing}>
                  <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>
                    Toplam Fiyat
                  </Text>
                  <Text style={[styles.priceValue, { color: colors.text }]}>
                    {typeof (reservation.negotiatedPrice || reservation.totalPrice) === 'number'
                      ? `${(reservation.negotiatedPrice || reservation.totalPrice).toLocaleString('tr-TR')} TL`
                      : `${String(reservation.negotiatedPrice || reservation.totalPrice)} TL`}
                  </Text>
                  {reservation.negotiatedPrice && reservation.totalPrice && (
                    <Text style={[styles.oldPrice, styles.strikethrough, { color: colors.textSecondary }]}>
                      {typeof reservation.totalPrice === 'number'
                        ? `${reservation.totalPrice.toLocaleString('tr-TR')} TL`
                        : `${String(reservation.totalPrice)} TL`}
                    </Text>
                  )}
                </View>

                <View style={styles.deliveryInfo}>
                  <Text style={[styles.deliveryLabel, { color: colors.textSecondary }]}>
                    Teslimat: {getDeliveryMethodLabel(reservation.delivery?.method || 'pickup')}
                  </Text>
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
                          style={[styles.actionButton, { flex: 1, backgroundColor: '#10B981' }]}
                          textStyle={{ color: '#FFFFFF' }}
                          disabled={responding || approving === reservation._id}
                          loading={responding}
                        />
                        <Button
                          title="Yanıtla"
                          onPress={() => handleNegotiationResponse(reservation, 'reject')}
                          style={[
                            styles.actionButton,
                            {
                              flex: 1,
                              backgroundColor: colors.background,
                              borderWidth: 1,
                              borderColor: colors.primary,
                            }
                          ]}
                          textStyle={{ color: colors.primary }}
                          disabled={responding || approving === reservation._id}
                        />
                      </>
                    ) : (
                      <>
                        <Button
                          title="Onayla"
                          onPress={() => handleApprove(reservation)}
                          style={[styles.actionButton, { flex: 1 }]}
                          textStyle={{ color: '#FFFFFF' }}
                          disabled={approving === reservation._id}
                          loading={approving === reservation._id}
                        />
                        <Button
                          title="İptal Et"
                          onPress={() => handleCancel(reservation)}
                          style={[
                            styles.actionButton,
                            {
                              flex: 1,
                              backgroundColor: colors.background,
                              borderWidth: 1,
                              borderColor: '#EF4444',
                            }
                          ]}
                          textStyle={{ color: '#EF4444' }}
                          disabled={approving === reservation._id || responding}
                          loading={approving === reservation._id}
                        />
                      </>
                    )}
                  </View>
                )}
              </Card>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
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
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Pazarlık Teklifi
              </Text>
              <TouchableOpacity onPress={() => {
                setShowNegotiationModal(false);
                setSelectedReservation(null);
                setCounterPrice('');
              }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {selectedReservation && (
                <>
                  <View style={styles.modalSection}>
                    <Text style={[styles.modalSectionTitle, { color: colors.text }]}>
                      Müşteri Teklifi
                    </Text>
                    <Text style={[styles.currentPrice, { color: colors.textSecondary }]}>
                      {typeof selectedReservation.negotiatedPrice === 'number'
                        ? `${selectedReservation.negotiatedPrice.toLocaleString('tr-TR')} TL`
                        : '0 TL'}
                    </Text>
                    <Text style={[styles.modalHint, { color: colors.textSecondary }]}>
                      Orijinal: {typeof selectedReservation.totalPrice === 'number'
                        ? `${selectedReservation.totalPrice.toLocaleString('tr-TR')} TL`
                        : '0 TL'}
                    </Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={[styles.modalSectionTitle, { color: colors.text }]}>
                      Karşı Teklif (İsteğe Bağlı)
                    </Text>
                    <TextInput
                      style={[
                        styles.priceInput,
                        {
                          borderColor: colors.border,
                          color: colors.text,
                          backgroundColor: colors.inputBackground,
                        }
                      ]}
                      placeholder="Toplam fiyat giriniz"
                      placeholderTextColor={colors.textSecondary}
                      value={counterPrice}
                      onChangeText={setCounterPrice}
                      keyboardType="decimal-pad"
                    />
                    <Text style={[styles.inputHint, { color: colors.textSecondary }]}>
                      Boş bırakırsanız teklif reddedilir
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
                  setShowNegotiationModal(false);
                  setSelectedReservation(null);
                  setCounterPrice('');
                }}
                style={styles.modalButton}
                disabled={responding}
              />
              <Button
                title="Kabul Et"
                onPress={() => handleConfirmNegotiationResponse('accept')}
                style={[styles.modalButton, { backgroundColor: '#10B981' }]}
                disabled={responding}
                loading={responding}
              />
              <Button
                title={counterPrice ? "Karşı Teklif Gönder" : "Reddet"}
                onPress={() => handleConfirmNegotiationResponse('reject')}
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: counterPrice ? colors.primary : colors.background,
                    borderWidth: counterPrice ? 0 : 1,
                    borderColor: '#EF4444',
                  }
                ]}
                textStyle={{ color: counterPrice ? '#FFFFFF' : '#EF4444' }}
                disabled={responding}
                loading={responding}
              />
            </View>
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
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h2,
    flex: 1,
    textAlign: 'center',
  },
  filtersContainer: {
    maxHeight: 70,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginRight: spacing.sm,
    gap: spacing.xs,
  },
  filterChipText: {
    ...typography.body,
    fontWeight: '500',
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    ...typography.body,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
  },
  emptyText: {
    ...typography.body,
    marginTop: spacing.md,
  },
  reservationsContainer: {
    padding: spacing.md,
  },
  reservationCard: {
    marginBottom: spacing.md,
  },
  reservationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  reservationHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    ...typography.caption,
    fontWeight: '600',
  },
  reservationDate: {
    ...typography.caption,
  },
  negotiatedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  negotiatedText: {
    ...typography.caption,
    fontWeight: '600',
  },
  buyerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  buyerName: {
    ...typography.body,
    fontWeight: '600',
  },
  buyerPhone: {
    ...typography.caption,
  },
  partInfo: {
    marginBottom: spacing.md,
  },
  partName: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  partBrand: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  partDetails: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  detailText: {
    ...typography.caption,
  },
  pricing: {
    marginBottom: spacing.md,
  },
  priceLabel: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  priceValue: {
    ...typography.h3,
  },
  oldPrice: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  deliveryInfo: {
    marginBottom: spacing.md,
  },
  deliveryLabel: {
    ...typography.caption,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  actionButton: {
    paddingVertical: spacing.sm,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h3,
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalSection: {
    marginBottom: spacing.lg,
  },
  modalSectionTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  currentPrice: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  modalHint: {
    ...typography.caption,
  },
  priceInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    marginTop: spacing.sm,
  },
  inputHint: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalButton: {
    flex: 1,
  },
});

