import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
  ActivityIndicator,
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

interface Part {
  _id: string;
  partName: string;
  brand: string;
  partNumber?: string;
  description?: string;
  photos: string[];
  category: 'engine' | 'electrical' | 'suspension' | 'brake' | 'body' | 'interior' | 'exterior' | 'fuel' | 'cooling' | 'transmission' | 'exhaust' | 'other';
  compatibility: {
    makeModel: string[];
    years: { start: number; end: number };
    engine?: string[];
    vinPrefix?: string[];
    notes?: string;
  };
  stock: {
    quantity: number;
    available: number;
    reserved: number;
    lowThreshold: number;
  };
  pricing: {
    unitPrice: number;
    oldPrice?: number;
    currency: string;
    isNegotiable: boolean;
  };
  condition: 'new' | 'used' | 'refurbished' | 'oem' | 'aftermarket';
  warranty?: {
    months: number;
    description: string;
  };
  stats: {
    views: number;
    reservations: number;
    sales: number;
    rating?: number;
  };
  moderation: {
    status: 'pending' | 'approved' | 'rejected';
    rejectionReason?: string;
    moderatedAt?: Date;
  };
  isActive: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function PartsInventoryScreen() {
  const navigation = useNavigation();
  const { themeColors: colors } = useTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [parts, setParts] = useState<Part[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);

  const fetchParts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.PartsService.getMechanicParts();
      if (response.success && response.data) {
        setParts(Array.isArray(response.data) ? response.data : []);
      } else {
        setParts([]);
      }
    } catch (error) {
      console.error('Parçalar yüklenemedi:', error);
      Alert.alert('Hata', 'Parçalar yüklenemedi');
      setParts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParts();
  }, [fetchParts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchParts();
    setRefreshing(false);
  }, [fetchParts]);

  const handleDelete = useCallback((part: Part) => {
    Alert.alert(
      'Parçayı Pasifleştir',
      `"${part.partName}" parçasını pasifleştirmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Pasifleştir',
          style: 'destructive',
          onPress: async () => {
            try {
              if (__DEV__) {
                console.log('🔍 [PartsInventory] Pasifleştirme başlatılıyor:', part._id);
              }
              
              const response = await apiService.PartsService.updatePart(part._id, { isActive: false });
              
              if (response.success) {
                if (__DEV__) {
                  console.log('✅ [PartsInventory] Parça pasifleştirildi');
                }
                
                // Optimistic update
                setParts(prev => {
                  if (!Array.isArray(prev)) return prev;
                  return prev.map(p => 
                    p._id === part._id ? { ...p, isActive: false } : p
                  );
                });
                
                await fetchParts();
                Alert.alert('Başarılı', 'Parça pasifleştirildi');
              } else {
                Alert.alert('Hata', response.message || 'Parça pasifleştirilemedi');
                await fetchParts();
              }
            } catch (error: any) {
              console.error('❌ [PartsInventory] Pasifleştirme hatası:', error);
              Alert.alert('Hata', error.message || 'Parça pasifleştirilemedi');
              await fetchParts();
            }
          },
        },
      ]
    );
  }, [fetchParts]);

  const togglePublish = useCallback(async (part: Part) => {
    try {
      if (__DEV__) {
        console.log('🔍 [PartsInventory] Yayın durumu değiştiriliyor:', part._id, 'Yeni durum:', !part.isPublished);
      }
      
      const newPublishedStatus = !part.isPublished;
      
      // Optimistic update
      setParts(prev => {
        if (!Array.isArray(prev)) return prev;
        return prev.map(p => 
          p._id === part._id ? { ...p, isPublished: newPublishedStatus } : p
        );
      });
      
      const response = await apiService.PartsService.updatePart(part._id, {
        isPublished: newPublishedStatus,
      });
      
      if (response.success) {
        if (__DEV__) {
          console.log('✅ [PartsInventory] Yayın durumu güncellendi');
        }
        await fetchParts();
      } else {
        Alert.alert('Hata', response.message || 'Yayın durumu güncellenemedi');
        // Hata durumunda listeyi yenile
        await fetchParts();
      }
    } catch (error: any) {
      console.error('❌ [PartsInventory] Yayın durumu güncelleme hatası:', error);
      Alert.alert('Hata', error.message || 'Yayın durumu güncellenemedi');
      // Hata durumunda listeyi yenile
      await fetchParts();
    }
  }, [fetchParts]);

  const getCategoryLabel = useCallback((category: string) => {
    const labels: Record<string, string> = {
      engine: 'Motor',
      electrical: 'Elektrik',
      suspension: 'Süspansiyon',
      brake: 'Fren',
      body: 'Kaporta',
      interior: 'İç Donanım',
      exterior: 'Dış Donanım',
      fuel: 'Yakıt',
      cooling: 'Soğutma',
      transmission: 'Şanzıman',
      exhaust: 'Egzoz',
      other: 'Diğer',
    };
    return labels[category] || category;
  }, []);

  const getConditionLabel = useCallback((condition: string) => {
    const labels: Record<string, string> = {
      new: 'Sıfır',
      used: 'İkinci El',
      refurbished: 'Yenilenmiş',
      oem: 'Orijinal',
      aftermarket: 'Yan Sanayi',
    };
    return labels[condition] || condition;
  }, []);

  const lowStockParts = useMemo(() => {
    return Array.isArray(parts) 
      ? parts.filter(part => part && part.stock?.available <= part.stock?.lowThreshold && part.isActive)
      : [];
  }, [parts]);

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={[styles.loadingText, { color: colors.text.secondary }]}>
            Parçalar yükleniyor...
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
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          Parça Envanteri
        </Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate('AddPart' as never)} 
          style={[styles.addButton, { backgroundColor: colors.primary.main + '15' }]}
          activeOpacity={0.7}
        >
          <Ionicons name="add" size={24} color={colors.primary.main} />
        </TouchableOpacity>
      </View>

      {/* Alerts */}
      {lowStockParts.length > 0 && (
        <View style={styles.alertsContainer}>
          <View style={[styles.alertBadge, { backgroundColor: colors.error.main + '15', borderColor: colors.error.main }]}>
            <Ionicons name="alert-circle" size={20} color={colors.error.main} />
            <Text style={[styles.alertText, { color: colors.error.main }]}>
              {lowStockParts.length} parça düşük stokta
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary.main} />
        }
        showsVerticalScrollIndicator={false}
      >
        {parts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.background.secondary }]}>
              <Ionicons name="cube-outline" size={48} color={colors.text.tertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text.primary }]}>
              Henüz Parça Eklenmedi
            </Text>
            <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
              İlk parçanızı ekleyerek başlayın
            </Text>
            <Button
              title="İlk Parçanızı Ekleyin"
              onPress={() => navigation.navigate('AddPart' as never)}
              variant="primary"
              size="medium"
              style={styles.emptyButton}
              icon="add-circle"
            />
          </View>
        ) : (
          <View style={styles.partsContainer}>
            {parts.map((part) => (
              <TouchableOpacity
                key={part._id}
                style={[
                  styles.partCard, 
                  { 
                    backgroundColor: colors.background.card, 
                    borderColor: colors.border.primary,
                  }
                ]}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('AddPart', { partId: part._id } as never)}
              >
                {/* Photo Section */}
                <View style={styles.photoSection}>
                  {part.photos && Array.isArray(part.photos) && part.photos.length > 0 && part.photos[0] ? (
                    <Image
                      source={{ uri: String(part.photos[0]).trim() }}
                      style={styles.photoImage}
                      resizeMode="cover"
                      onError={() => {}}
                    />
                  ) : (
                    <View style={[styles.photoPlaceholder, { backgroundColor: colors.background.secondary }]}>
                      <Ionicons name="cube-outline" size={40} color={colors.text.tertiary} />
                    </View>
                  )}
                  
                  {/* Status Badges on Photo */}
                  <View style={styles.photoBadges}>
                    {part.isPublished && (
                      <View style={[styles.photoBadge, { backgroundColor: colors.success.main + '20', borderColor: colors.success.main }]}>
                        <Ionicons name="eye" size={12} color={colors.success.main} />
                        <Text style={[styles.photoBadgeText, { color: colors.success.main }]}>
                          Yayında
                        </Text>
                      </View>
                    )}
                    {part.pricing?.isNegotiable && (
                      <View style={[styles.photoBadge, { backgroundColor: colors.accent.main + '20', borderColor: colors.accent.main }]}>
                        <Ionicons name="swap-horizontal" size={12} color={colors.accent.main} />
                        <Text style={[styles.photoBadgeText, { color: colors.accent.main }]}>
                          Pazarlık
                        </Text>
                      </View>
                    )}
                    {part.moderation?.status === 'pending' && (
                      <View style={[styles.photoBadge, { backgroundColor: colors.warning.main + '20', borderColor: colors.warning.main }]}>
                        <Ionicons name="time" size={12} color={colors.warning.main} />
                        <Text style={[styles.photoBadgeText, { color: colors.warning.main }]}>
                          Beklemede
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Content Section */}
                <View style={styles.contentSection}>
                  {/* Header with Actions */}
                  <View style={styles.cardHeader}>
                    <View style={styles.titleSection}>
                      {part.brand && (
                        <Text 
                          style={[styles.brandText, { color: colors.text.secondary }]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {part.brand}
                        </Text>
                      )}
                      <Text 
                        style={[styles.partName, { color: colors.text.primary }]}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {part.partName || 'İsimsiz Parça'}
                      </Text>
                    </View>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          togglePublish(part);
                        }}
                        style={[styles.actionButton, { backgroundColor: colors.background.secondary }]}
                        activeOpacity={0.7}
                      >
                        <Ionicons 
                          name={part.isPublished ? 'eye' : 'eye-off'} 
                          size={18} 
                          color={part.isPublished ? colors.primary.main : colors.text.secondary} 
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDelete(part);
                        }}
                        style={[styles.actionButton, { backgroundColor: colors.error.main + '15' }]}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.error.main} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Badges */}
                  <View style={styles.badgeRow}>
                    {part.category && (
                      <View style={[styles.categoryBadge, { backgroundColor: colors.primary.main + '15' }]}>
                        <Text 
                          style={[styles.categoryBadgeText, { color: colors.primary.main }]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {getCategoryLabel(part.category)}
                        </Text>
                      </View>
                    )}
                    {part.condition && (
                      <View style={[styles.conditionBadge, { backgroundColor: colors.success.main + '15' }]}>
                        <Text 
                          style={[styles.conditionBadgeText, { color: colors.success.main }]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {getConditionLabel(part.condition)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Price Section */}
                  {part.pricing && typeof part.pricing.unitPrice === 'number' ? (
                    <View style={[styles.priceSection, { borderTopColor: colors.border.primary, borderBottomColor: colors.border.primary }]}>
                      <Text 
                        style={[styles.priceText, { color: colors.text.primary }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit={true}
                        minimumFontScale={0.75}
                      >
                        {part.pricing.unitPrice.toLocaleString('tr-TR')} {part.pricing.currency || 'TRY'}
                      </Text>
                      {part.pricing.oldPrice && typeof part.pricing.oldPrice === 'number' && (
                        <Text 
                          style={[styles.oldPrice, { color: colors.text.tertiary }]}
                          numberOfLines={1}
                        >
                          {part.pricing.oldPrice.toLocaleString('tr-TR')} {part.pricing.currency || 'TRY'}
                        </Text>
                      )}
                    </View>
                  ) : null}

                  {/* Stats & Stock Footer */}
                  <View style={[styles.footerSection, { borderTopColor: colors.border.primary }]}>
                    <View style={styles.stockInfo}>
                      <View 
                        style={[
                          styles.stockIndicator, 
                          { 
                            backgroundColor: (part.stock?.available ?? 0) <= (part.stock?.lowThreshold ?? 0) 
                              ? colors.error.main + '20' 
                              : colors.success.main + '20' 
                          }
                        ]}
                      >
                        <Ionicons 
                          name={(part.stock?.available ?? 0) > (part.stock?.lowThreshold ?? 0) ? "checkmark-circle" : "alert-circle"} 
                          size={14} 
                          color={(part.stock?.available ?? 0) > (part.stock?.lowThreshold ?? 0) ? colors.success.main : colors.error.main} 
                        />
                      </View>
                      <Text 
                        style={[
                          styles.stockText,
                          { 
                            color: (part.stock?.available ?? 0) <= (part.stock?.lowThreshold ?? 0) 
                              ? colors.error.main 
                              : colors.text.primary 
                          }
                        ]}
                        numberOfLines={1}
                      >
                        Stok: {part.stock?.available ?? 0} / {part.stock?.quantity ?? 0}
                      </Text>
                      {part.stock?.reserved ? (
                        <Text style={[styles.reservedText, { color: colors.text.secondary }]} numberOfLines={1}>
                          • Rezerve: {part.stock.reserved}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.statsInfo}>
                      <View style={styles.statItem}>
                        <Ionicons name="eye-outline" size={14} color={colors.text.secondary} />
                        <Text style={[styles.statText, { color: colors.text.secondary }]} numberOfLines={1}>
                          {part.stats?.views ?? 0}
                        </Text>
                      </View>
                      <View style={styles.statItem}>
                        <Ionicons name="list-outline" size={14} color={colors.text.secondary} />
                        <Text style={[styles.statText, { color: colors.text.secondary }]} numberOfLines={1}>
                          {part.stats?.reservations ?? 0}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
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
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
  },
  headerTitle: {
    ...typography.h2,
    flex: 1,
    textAlign: 'center',
    fontWeight: '700',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertsContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    gap: spacing.sm,
  },
  alertText: {
    ...typography.body,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    marginTop: spacing.sm,
    ...typography.body,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
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
    marginBottom: spacing.md,
  },
  emptyButton: {
    marginHorizontal: spacing.xl,
    marginTop: spacing.sm,
  },
  partsContainer: {
    padding: spacing.md,
  },
  partCard: {
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
  },
  photoSection: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoBadges: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'flex-start',
  },
  photoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 4,
  },
  photoBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  contentSection: {
    padding: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  titleSection: {
    flex: 1,
    marginRight: spacing.sm,
  },
  brandText: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  partName: {
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexShrink: 0,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
    gap: 6,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  conditionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    alignSelf: 'flex-start',
  },
  conditionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  priceSection: {
    marginBottom: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  priceText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  oldPrice: {
    fontSize: 13,
    fontWeight: '500',
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  footerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  stockIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '600',
    minWidth: 0,
    flexShrink: 1,
  },
  reservedText: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4,
  },
  statsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexShrink: 0,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

