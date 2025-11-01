import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import Background from '@/shared/components/Background';
import { BackButton, Button } from '@/shared/components';
import Card from '@/shared/components/Card';
import { apiService } from '@/shared/services/api';

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
  const styles = createStyles(theme);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');
  const [showNegotiateModal, setShowNegotiateModal] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [negotiatedPrice, setNegotiatedPrice] = useState('');
  const [negotiating, setNegotiating] = useState(false);

  useEffect(() => {
    fetchReservations();
  }, [filter]);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const response = await apiService.getMyPartsReservations(
        filter !== 'all' ? { status: filter } : undefined
      );
      if (response.success && response.data) {
        setReservations(response.data);
      }
    } catch (error) {
      console.error('Rezervasyonlar yüklenemedi:', error);
      Alert.alert('Hata', 'Rezervasyonlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReservations();
    setRefreshing(false);
  };

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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Beklemede';
      case 'confirmed': return 'Onaylandı';
      case 'completed': return 'Tamamlandı';
      case 'cancelled': return 'İptal Edildi';
      case 'expired': return 'Süresi Doldu';
      case 'delivered': return 'Teslim Edildi';
      default: return status;
    }
  };

  const getDeliveryMethodLabel = (method: string) => {
    switch (method) {
      case 'pickup': return 'Mağazadan Al';
      case 'standard': return 'Standart Kargo';
      case 'express': return 'Hızlı Kargo';
      default: return method;
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
        ''
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

  if (loading && !refreshing) {
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

  const pendingCount = reservations.filter(r => r.status === 'pending').length;

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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersContainer}>
          {[
            { key: 'all', label: 'Tümü', icon: 'list' },
            { key: 'pending', label: 'Beklemede', icon: 'time', badge: pendingCount },
            { key: 'confirmed', label: 'Onaylandı', icon: 'checkmark-circle' },
            { key: 'completed', label: 'Tamamlandı', icon: 'trophy' },
            { key: 'cancelled', label: 'İptal', icon: 'close-circle' },
          ].map((filterItem) => (
            <TouchableOpacity
              key={filterItem.key}
              style={[
                styles.filterChip,
                {
                  backgroundColor: filter === filterItem.key ? theme.colors.primary.main : theme.colors.background.card,
                }
              ]}
              onPress={() => setFilter(filterItem.key as any)}
            >
              <Ionicons
                name={filterItem.icon as any}
                size={16}
                color={filter === filterItem.key ? '#FFFFFF' : theme.colors.text.secondary}
              />
              <Text style={[
                styles.filterChipText,
                { color: filter === filterItem.key ? '#FFFFFF' : theme.colors.text.secondary }
              ]}>
                {filterItem.label}
              </Text>
              {filterItem.badge && filterItem.badge > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{filterItem.badge}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Reservations */}
        <ScrollView
          style={styles.scrollView}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {reservations.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={64} color={theme.colors.text.secondary} />
              <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                Rezervasyon bulunmuyor
              </Text>
            </View>
          ) : (
            <View style={styles.reservationsContainer}>
              {reservations.map((reservation) => (
                <TouchableOpacity 
                  key={reservation._id}
                  onPress={() => reservation.partId?._id && handlePartPress(reservation.partId._id)}
                  activeOpacity={0.7}
                >
                  <Card variant="elevated" style={styles.reservationCard}>
                    {/* Header */}
                    <View style={styles.reservationHeader}>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(reservation?.status || 'pending') + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(reservation?.status || 'pending') }]}>
                          {getStatusLabel(reservation?.status || 'pending')}
                        </Text>
                      </View>
                      <Text style={[styles.reservationDate, { color: theme.colors.text.secondary }]}>
                        {reservation?.createdAt ? new Date(reservation.createdAt).toLocaleDateString('tr-TR') : ''}
                      </Text>
                    </View>

                    {/* Seller Info */}
                    <View style={styles.sellerInfo}>
                      <View style={[styles.sellerAvatar, { backgroundColor: theme.colors.primary.main }]}>
                        <Ionicons name="storefront" size={20} color="#fff" />
                      </View>
                      <View style={styles.sellerDetails}>
                        <Text style={[styles.sellerName, { color: theme.colors.text.primary }]}>
                          {reservation.sellerId?.shopName || (reservation.sellerId?.name && reservation.sellerId?.surname ? `${reservation.sellerId.name} ${reservation.sellerId.surname}` : 'Satıcı')}
                        </Text>
                        {reservation.sellerId?.rating && (
                          <View style={styles.ratingRow}>
                            <Ionicons name="star" size={12} color="#FBBF24" />
                            <Text style={[styles.ratingText, { color: theme.colors.text.secondary }]}>
                              {typeof reservation.sellerId.rating === 'number' ? reservation.sellerId.rating.toFixed(1) : reservation.sellerId.rating} ({reservation.sellerId.ratingCount || 0})
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Part Info */}
                    <View style={styles.partInfo}>
                      <View style={styles.partHeader}>
                        {reservation.partId?.photos && reservation.partId.photos.length > 0 ? (
                          <Image
                            source={{ uri: reservation.partId.photos[0] }}
                            style={styles.partImage}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.partImagePlaceholder, { backgroundColor: theme.colors.background.secondary }]}>
                            <Ionicons name="cube" size={24} color={theme.colors.text.secondary} />
                          </View>
                        )}
                        <View style={styles.partTextInfo}>
                          <Text style={[styles.partName, { color: theme.colors.text.primary }]}>
                            {reservation.partInfo?.partName || 'Parça Adı'}
                          </Text>
                          {reservation.partInfo?.brand && (
                            <Text style={[styles.partBrand, { color: theme.colors.text.secondary }]}>
                              {reservation.partInfo.brand}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View style={styles.partDetails}>
                        <Text style={[styles.detailText, { color: theme.colors.text.secondary }]}>
                          Adet: {reservation.quantity || 1}
                        </Text>
                        {reservation.partInfo?.condition && (
                          <Text style={[styles.detailText, { color: theme.colors.text.secondary }]}>
                            Durum: {reservation.partInfo.condition}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Pricing */}
                    <View style={styles.pricing}>
                      <View style={styles.priceLeft}>
                        <Text style={[styles.priceLabel, { color: theme.colors.text.secondary }]}>
                          Toplam
                        </Text>
                        <Text style={[styles.priceValue, { color: theme.colors.text.primary }]}>
                          {(reservation.negotiatedPrice || reservation.totalPrice || 0).toLocaleString('tr-TR')} TL
                        </Text>
                        {reservation.negotiatedPrice && reservation.totalPrice && (
                          <Text style={[styles.oldPrice, { color: theme.colors.text.secondary }]}>
                            <Text style={styles.strikethrough}>{reservation.totalPrice.toLocaleString('tr-TR')} TL</Text>
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Delivery Info */}
                    {reservation.delivery?.method && (
                      <View style={styles.deliveryInfo}>
                        <Ionicons name="car-outline" size={16} color={theme.colors.text.secondary} />
                        <Text style={[styles.deliveryLabel, { color: theme.colors.text.secondary }]}>
                          {getDeliveryMethodLabel(reservation.delivery.method)}
                        </Text>
                      </View>
                    )}

                    {/* Actions */}
                    {reservation.status === 'pending' && (
                      <View style={styles.actions}>
                        <TouchableOpacity
                          style={[styles.negotiateButton, { backgroundColor: theme.colors.warning.light }]}
                          onPress={() => handleNegotiate(reservation)}
                        >
                          <Ionicons name="chatbubbles" size={16} color={theme.colors.warning.main} />
                          <Text style={[styles.negotiateButtonText, { color: theme.colors.warning.main }]}>
                            Pazarlık Yap
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.cancelButton, { borderColor: theme.colors.error.main }]}
                          onPress={() => handleCancel(reservation)}
                        >
                          <Text style={[styles.cancelButtonText, { color: theme.colors.error.main }]}>
                            İptal Et
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    {reservation.status === 'confirmed' && (
                      <TouchableOpacity
                        style={[styles.cancelButton, { borderColor: theme.colors.error.main }]}
                        onPress={() => handleCancel(reservation)}
                      >
                        <Text style={[styles.cancelButtonText, { color: theme.colors.error.main }]}>
                          İptal Et
                        </Text>
                      </TouchableOpacity>
                    )}
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>

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

              <ScrollView style={styles.modalScroll}>
                {selectedReservation && (
                  <>
                    <View style={styles.modalSection}>
                      <Text style={[styles.modalSectionTitle, { color: theme.colors.text.primary }]}>
                        Mevcut Toplam Fiyat
                      </Text>
                      <Text style={[styles.currentPrice, { color: theme.colors.text.secondary }]}>
                        {selectedReservation.totalPrice.toLocaleString('tr-TR')} TL
                      </Text>
                      <Text style={[styles.modalHint, { color: theme.colors.text.secondary }]}>
                        Birim: {selectedReservation.unitPrice.toLocaleString('tr-TR')} TL × {selectedReservation.quantity}
                      </Text>
                    </View>

                    <View style={styles.modalSection}>
                      <Text style={[styles.modalSectionTitle, { color: theme.colors.text.primary }]}>
                        Teklif Ettiğiniz Toplam Fiyat
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
                        placeholder="Toplam fiyat giriniz"
                        placeholderTextColor={theme.colors.text.secondary}
                        value={negotiatedPrice}
                        onChangeText={setNegotiatedPrice}
                        keyboardType="decimal-pad"
                      />
                      <Text style={[styles.inputHint, { color: theme.colors.text.secondary }]}>
                        Usta teklifinizi değerlendirip size dönüş yapacaktır
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  filtersContainer: {
    maxHeight: 70,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    gap: 6,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  badge: {
    backgroundColor: theme.colors.error.main,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
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
  },
  reservationsContainer: {
    padding: 16,
  },
  reservationCard: {
    marginBottom: 16,
    padding: 16,
  },
  reservationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reservationDate: {
    fontSize: 12,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  sellerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sellerDetails: {
    flex: 1,
  },
  sellerName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    marginLeft: 4,
  },
  partInfo: {
    marginBottom: 12,
  },
  partName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  partBrand: {
    fontSize: 14,
    marginBottom: 8,
  },
  partDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  detailText: {
    fontSize: 12,
  },
  pricing: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.primary,
  },
  priceLeft: {
    flexDirection: 'column',
  },
  priceLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  oldPrice: {
    fontSize: 14,
    marginTop: 4,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  partHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  partImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  partImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  partTextInfo: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  negotiateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  negotiateButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  deliveryLabel: {
    fontSize: 12,
    marginLeft: 6,
  },
  cancelButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalScroll: {
    maxHeight: 400,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  currentPrice: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalHint: {
    fontSize: 12,
  },
  priceInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginTop: 8,
  },
  inputHint: {
    fontSize: 12,
    marginTop: 6,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
  },
});

export default PartsReservationsScreen;

