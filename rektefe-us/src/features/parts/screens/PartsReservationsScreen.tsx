import React, { useState, useEffect } from 'react';
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
  const styles = createStyles(colors);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');

  useEffect(() => {
    fetchReservations();
  }, [filter]);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const response = await apiService.PartsService.getMechanicReservations(
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

  const handleApprove = async (reservation: Reservation) => {
    Alert.alert(
      'Rezervasyonu Onayla',
      'Bu rezervasyonu onaylamak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Onayla',
          onPress: async () => {
            try {
              const response = await apiService.PartsService.approveReservation(reservation._id);
              if (response.success) {
                Alert.alert('Başarılı', 'Rezervasyon onaylandı');
                await fetchReservations();
              } else {
                Alert.alert('Hata', response.message || 'Rezervasyon onaylanamadı');
              }
            } catch (error) {
              Alert.alert('Hata', 'Rezervasyon onaylanamadı');
            }
          },
        },
      ]
    );
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
              const response = await apiService.PartsService.cancelReservation(reservation._id);
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
      default: return colors.textSecondary;
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

  const pendingCount = reservations.filter(r => r.status === 'pending').length;

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
                backgroundColor: filter === filterItem.key ? colors.primary : colors.inputBackground,
                borderColor: filter === filterItem.key ? colors.primary : colors.border,
              }
            ]}
            onPress={() => setFilter(filterItem.key as any)}
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
                    {reservation.buyerId.name} {reservation.buyerId.surname}
                  </Text>
                  {reservation.buyerId.phone && (
                    <Text style={[styles.buyerPhone, { color: colors.textSecondary }]}>
                      {reservation.buyerId.phone}
                    </Text>
                  )}
                </View>

                <View style={styles.partInfo}>
                  <Text style={[styles.partName, { color: colors.text }]}>
                    {reservation.partInfo.partName}
                  </Text>
                  <Text style={[styles.partBrand, { color: colors.textSecondary }]}>
                    {reservation.partInfo.brand}
                  </Text>
                  <View style={styles.partDetails}>
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                      Adet: {reservation.quantity}
                    </Text>
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                      Durum: {reservation.partInfo.condition}
                    </Text>
                  </View>
                </View>

                <View style={styles.pricing}>
                  <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>
                    Toplam Fiyat
                  </Text>
                  <Text style={[styles.priceValue, { color: colors.text }]}>
                    {reservation.negotiatedPrice || reservation.totalPrice} TL
                  </Text>
                  {reservation.negotiatedPrice && (
                    <Text style={[styles.oldPrice, { color: colors.textSecondary }]}>
                      {reservation.totalPrice} TL
                    </Text>
                  )}
                </View>

                <View style={styles.deliveryInfo}>
                  <Text style={[styles.deliveryLabel, { color: colors.textSecondary }]}>
                    Teslimat: {getDeliveryMethodLabel(reservation.delivery.method)}
                  </Text>
                </View>

                {/* Actions */}
                {reservation.status === 'pending' && (
                  <View style={styles.actions}>
                    <Button
                      title="Onayla"
                      onPress={() => handleApprove(reservation)}
                      style={[styles.actionButton, { flex: 1 }]}
                      textStyle={{ color: '#FFFFFF' }}
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
                    />
                  </View>
                )}
              </Card>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
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
});

