import React, { useState, useEffect } from 'react';
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
  const styles = createStyles(colors);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [parts, setParts] = useState<Part[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);

  useEffect(() => {
    fetchParts();
  }, []);

  const fetchParts = async () => {
    try {
      setLoading(true);
      const response = await apiService.PartsService.getMechanicParts();
      if (response.success && response.data) {
        setParts(response.data);
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

  const handleDelete = (part: Part) => {
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
              const response = await apiService.PartsService.updatePart(part._id, { isActive: false });
              if (response.success) {
                Alert.alert('Başarılı', 'Parça pasifleştirildi');
                await fetchParts();
              } else {
                Alert.alert('Hata', response.message || 'Parça pasifleştirilemedi');
              }
            } catch (error) {
              Alert.alert('Hata', 'Parça pasifleştirilemedi');
            }
          },
        },
      ]
    );
  };

  const togglePublish = async (part: Part) => {
    try {
      const response = await apiService.PartsService.updatePart(part._id, {
        isPublished: !part.isPublished,
      });
      if (response.success) {
        await fetchParts();
      } else {
        Alert.alert('Hata', response.message || 'Yayın durumu güncellenemedi');
      }
    } catch (error) {
      Alert.alert('Hata', 'Yayın durumu güncellenemedi');
    }
  };

  const getCategoryLabel = (category: string) => {
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
  };

  const getConditionLabel = (condition: string) => {
    const labels: Record<string, string> = {
      new: 'Sıfır',
      used: 'İkinci El',
      refurbished: 'Yenilenmiş',
      oem: 'Orijinal',
      aftermarket: 'Yan Sanayi',
    };
    return labels[condition] || condition;
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Parçalar yükleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const lowStockParts = parts.filter(part => part.stock.available <= part.stock.lowThreshold && part.isActive);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Parça Envanteri
        </Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate('AddPart' as never)} 
          style={styles.addButton}
        >
          <Ionicons name="add" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Alerts */}
      {lowStockParts.length > 0 && (
        <View style={styles.alertsContainer}>
          <View style={[styles.alertBadge, { backgroundColor: '#EF444410', borderColor: '#EF4444' }]}>
            <Ionicons name="alert-circle" size={20} color="#EF4444" />
            <Text style={[styles.alertText, { color: '#EF4444' }]}>
              {lowStockParts.length} parça düşük stokta
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {parts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Henüz parça eklemediniz
            </Text>
            <Button
              title="İlk Parçanızı Ekleyin"
              onPress={() => navigation.navigate('AddPart' as never)}
              style={styles.emptyButton}
            />
          </View>
        ) : (
          <View style={styles.partsContainer}>
            {parts.map((part) => (
              <Card key={part._id} style={styles.partCard}>
                <View style={styles.partHeader}>
                  <View style={styles.partHeaderLeft}>
                    {part.photos && part.photos.length > 0 ? (
                      <Image
                        source={{ uri: part.photos[0] }}
                        style={styles.partImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.categoryIcon, { backgroundColor: colors.primary + '20' }]}>
                        <Ionicons name="settings" size={24} color={colors.primary} />
                      </View>
                    )}
                    <View style={styles.partInfo}>
                      <Text style={[styles.partName, { color: colors.text }]}>
                        {part.partName}
                      </Text>
                      <Text style={[styles.partCategory, { color: colors.textSecondary }]}>
                        {getCategoryLabel(part.category)}
                      </Text>
                      <Text style={[styles.partBrand, { color: colors.textSecondary }]}>
                        {part.brand}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.partActions}>
                    <TouchableOpacity
                      onPress={() => navigation.navigate('AddPart', { partId: part._id } as never)}
                      style={styles.actionButton}
                    >
                      <Ionicons name="pencil" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => togglePublish(part)}
                      style={styles.actionButton}
                    >
                      <Ionicons 
                        name={part.isPublished ? 'eye' : 'eye-off'} 
                        size={20} 
                        color={part.isPublished ? colors.primary : colors.textSecondary} 
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(part)}
                      style={styles.actionButton}
                    >
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.partDetails}>
                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                        Stok
                      </Text>
                      <Text style={[
                        styles.detailValue,
                        { 
                          color: part.stock.available <= part.stock.lowThreshold ? '#EF4444' : colors.text 
                        }
                      ]}>
                        {part.stock.available} / {part.stock.quantity}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                        Rezerve
                      </Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {part.stock.reserved}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                        Fiyat
                      </Text>
                      <View>
                        <Text style={[styles.detailValue, { color: colors.text }]}>
                          {part.pricing.unitPrice.toLocaleString('tr-TR')} {part.pricing.currency}
                        </Text>
                        {part.pricing.oldPrice && (
                          <Text style={[styles.oldPrice, { color: colors.textSecondary }]}>
                            {part.pricing.oldPrice.toLocaleString('tr-TR')} {part.pricing.currency}
                          </Text>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                        Durum
                      </Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {getConditionLabel(part.condition)}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                        Görüntüleme
                      </Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {part.stats.views}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                        Rezervasyon
                      </Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {part.stats.reservations}
                      </Text>
                    </View>
                  </View>

                  {/* Moderation Status */}
                  {part.moderation.status === 'pending' && (
                    <View style={[styles.moderationBadge, { backgroundColor: '#F59E0B20' }]}>
                      <Ionicons name="time" size={16} color="#F59E0B" />
                      <Text style={[styles.moderationText, { color: '#F59E0B' }]}>
                        Moderasyonda
                      </Text>
                    </View>
                  )}
                  {part.moderation.status === 'rejected' && (
                    <View style={[styles.moderationBadge, { backgroundColor: '#EF444420' }]}>
                      <Ionicons name="close-circle" size={16} color="#EF4444" />
                      <Text style={[styles.moderationText, { color: '#EF4444' }]}>
                        Reddedildi
                      </Text>
                    </View>
                  )}

                  {/* Low Stock Warning */}
                  {part.stock.available <= part.stock.lowThreshold && (
                    <View style={[styles.warningBadge, { backgroundColor: '#EF444420' }]}>
                      <Ionicons name="alert-circle" size={16} color="#EF4444" />
                      <Text style={[styles.warningText, { color: '#EF4444' }]}>
                        Düşük Stok!
                      </Text>
                    </View>
                  )}
                </View>
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
  addButton: {
    padding: spacing.xs,
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
    borderWidth: 1,
    gap: spacing.sm,
  },
  alertText: {
    ...typography.body,
    fontWeight: '600',
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
    marginBottom: spacing.lg,
  },
  emptyButton: {
    marginHorizontal: spacing.xl,
  },
  partsContainer: {
    padding: spacing.md,
  },
  partCard: {
    marginBottom: spacing.md,
  },
  partHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  partHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  partInfo: {
    flex: 1,
  },
  partName: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  partCategory: {
    ...typography.caption,
  },
  partBrand: {
    ...typography.caption,
  },
  partActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.xs,
  },
  partDetails: {
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    ...typography.caption,
    marginBottom: 2,
  },
  detailValue: {
    ...typography.body,
    fontWeight: '600',
  },
  oldPrice: {
    ...typography.caption,
    textDecorationLine: 'line-through',
    marginTop: 2,
  },
  moderationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  moderationText: {
    ...typography.caption,
    fontWeight: '600',
  },
  warningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  warningText: {
    ...typography.caption,
    fontWeight: '600',
  },
});

