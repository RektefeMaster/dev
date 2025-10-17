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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/context';
import { useAuth } from '@/shared/context';
import { Card, Button } from '@/shared/components';
import { spacing, borderRadius, typography } from '@/shared/theme';
import apiService from '@/shared/services';

interface InventoryItem {
  _id: string;
  itemName: string;
  category: 'shampoo' | 'wax' | 'polish' | 'cleaner' | 'microfiber' | 'chemical' | 'accessory' | 'other';
  stock: {
    currentQuantity: number;
    unit: 'litre' | 'kg' | 'adet' | 'paket' | 'ml';
    lowThreshold: number;
    reorderThreshold: number;
  };
  cost: {
    unitCost: number;
  };
  consumption: {
    averagePerJob: number;
  };
  alerts: {
    isLowStock: boolean;
    needsReorder: boolean;
  };
  isActive: boolean;
}

export default function InventoryScreen() {
  const navigation = useNavigation();
  const { themeColors: colors } = useTheme();
  const { user } = useAuth();
  const styles = createStyles(colors);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    itemName: '',
    category: 'shampoo' as 'shampoo' | 'wax' | 'polish' | 'cleaner' | 'microfiber' | 'chemical' | 'accessory' | 'other',
    currentQuantity: '',
    unit: 'litre' as 'litre' | 'kg' | 'adet' | 'paket' | 'ml',
    lowThreshold: '',
    reorderThreshold: '',
    unitCost: '',
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      // TODO: Backend'den stok bilgilerini getir
      // Şimdilik boş array
      setInventory([]);
    } catch (error) {
      console.error('Stok yüklenemedi:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInventory();
    setRefreshing(false);
  };

  const resetForm = () => {
    setFormData({
      itemName: '',
      category: 'shampoo',
      currentQuantity: '',
      unit: 'litre',
      lowThreshold: '',
      reorderThreshold: '',
      unitCost: '',
    });
    setEditingItem(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      itemName: item.itemName,
      category: item.category,
      currentQuantity: item.stock.currentQuantity.toString(),
      unit: item.stock.unit,
      lowThreshold: item.stock.lowThreshold.toString(),
      reorderThreshold: item.stock.reorderThreshold.toString(),
      unitCost: item.cost.unitCost.toString(),
    });
    setShowAddModal(true);
  };

  const handleSave = async () => {
    // Validasyon
    if (!formData.itemName.trim()) {
      Alert.alert('Uyarı', 'Malzeme adı giriniz');
      return;
    }

    if (!formData.currentQuantity || parseFloat(formData.currentQuantity) < 0) {
      Alert.alert('Uyarı', 'Geçerli bir miktar giriniz');
      return;
    }

    try {
      // TODO: Backend'e kaydet
      Alert.alert('Başarılı', editingItem ? 'Malzeme güncellendi' : 'Malzeme eklendi');
      setShowAddModal(false);
      resetForm();
      await fetchInventory();
    } catch (error) {
      Alert.alert('Hata', 'Malzeme kaydedilemedi');
    }
  };

  const handleDelete = (item: InventoryItem) => {
    Alert.alert(
      'Malzemeyi Sil',
      `"${item.itemName}" malzemesini silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: Backend'den sil
              Alert.alert('Başarılı', 'Malzeme silindi');
              await fetchInventory();
            } catch (error) {
              Alert.alert('Hata', 'Malzeme silinemedi');
            }
          },
        },
      ]
    );
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      shampoo: 'Şampuan',
      wax: 'Cila',
      polish: 'Pasta',
      cleaner: 'Temizleyici',
      microfiber: 'Mikrofiber',
      chemical: 'Kimyasal',
      accessory: 'Aksesuar',
      other: 'Diğer',
    };
    return labels[category] || category;
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      shampoo: 'water',
      wax: 'sparkles',
      polish: 'star',
      cleaner: 'spray-bottle',
      microfiber: 'fiber-manual-record',
      chemical: 'flask',
      accessory: 'wrench',
      other: 'cube',
    };
    return icons[category] || 'cube';
  };

  const getUnitLabel = (unit: string) => {
    const labels: Record<string, string> = {
      litre: 'L',
      kg: 'kg',
      adet: 'adet',
      paket: 'paket',
      ml: 'ml',
    };
    return labels[unit] || unit;
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Stok bilgileri yükleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const lowStockItems = inventory.filter(item => item.alerts.isLowStock);
  const reorderItems = inventory.filter(item => item.alerts.needsReorder);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Sarf Malzeme Stok
        </Text>
        <TouchableOpacity onPress={handleOpenAddModal} style={styles.addButton}>
          <Ionicons name="add" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Alerts */}
      {(lowStockItems.length > 0 || reorderItems.length > 0) && (
        <View style={styles.alertsContainer}>
          {lowStockItems.length > 0 && (
            <View style={[styles.alertBadge, { backgroundColor: '#EF444410', borderColor: '#EF4444' }]}>
              <Ionicons name="alert-circle" size={20} color="#EF4444" />
              <Text style={[styles.alertText, { color: '#EF4444' }]}>
                {lowStockItems.length} malzeme kritik seviyede
              </Text>
            </View>
          )}
          {reorderItems.length > 0 && (
            <View style={[styles.alertBadge, { backgroundColor: '#F59E0B10', borderColor: '#F59E0B' }]}>
              <Ionicons name="warning" size={20} color="#F59E0B" />
              <Text style={[styles.alertText, { color: '#F59E0B' }]}>
                {reorderItems.length} malzeme sipariş edilmeli
              </Text>
            </View>
          )}
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {inventory.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Henüz stok eklemediniz
            </Text>
            <Button
              title="İlk Malzemenizi Ekleyin"
              onPress={handleOpenAddModal}
              style={styles.emptyButton}
            />
          </View>
        ) : (
          <View style={styles.inventoryContainer}>
            {inventory.map((item) => (
              <Card key={item._id} style={styles.inventoryCard}>
                <View style={styles.inventoryHeader}>
                  <View style={styles.inventoryHeaderLeft}>
                    <View style={[styles.categoryIcon, { backgroundColor: colors.primary + '20' }]}>
                      <Ionicons
                        name={getCategoryIcon(item.category) as any}
                        size={24}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.inventoryInfo}>
                      <Text style={[styles.inventoryName, { color: colors.text }]}>
                        {item.itemName}
                      </Text>
                      <Text style={[styles.inventoryCategory, { color: colors.textSecondary }]}>
                        {getCategoryLabel(item.category)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.inventoryActions}>
                    <TouchableOpacity
                      onPress={() => handleOpenEditModal(item)}
                      style={styles.actionButton}
                    >
                      <Ionicons name="create-outline" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDelete(item)}
                      style={styles.actionButton}
                    >
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inventoryDetails}>
                  <View style={styles.inventoryDetailRow}>
                    <View style={styles.inventoryDetailItem}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                        Mevcut Stok
                      </Text>
                      <Text style={[
                        styles.detailValue,
                        { 
                          color: item.alerts.isLowStock ? '#EF4444' : 
                                 item.alerts.needsReorder ? '#F59E0B' : colors.text 
                        }
                      ]}>
                        {item.stock.currentQuantity} {getUnitLabel(item.stock.unit)}
                      </Text>
                    </View>
                    <View style={styles.inventoryDetailItem}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                        İş Başına Ort.
                      </Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {item.consumption.averagePerJob} {getUnitLabel(item.stock.unit)}
                      </Text>
                    </View>
                    <View style={styles.inventoryDetailItem}>
                      <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                        Birim Maliyet
                      </Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>
                        {item.cost.unitCost} TL
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar */}
                  <View style={styles.stockProgress}>
                    <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            backgroundColor: item.alerts.isLowStock ? '#EF4444' : 
                                           item.alerts.needsReorder ? '#F59E0B' : '#10B981',
                            width: `${Math.min(100, (item.stock.currentQuantity / item.stock.reorderThreshold) * 100)}%`,
                          }
                        ]}
                      />
                    </View>
                    <Text style={[styles.thresholdText, { color: colors.textSecondary }]}>
                      Eşik: {item.stock.lowThreshold} {getUnitLabel(item.stock.unit)}
                    </Text>
                  </View>

                  {/* Alerts */}
                  {item.alerts.isLowStock && (
                    <View style={[styles.warningBadge, { backgroundColor: '#EF444420' }]}>
                      <Ionicons name="alert-circle" size={16} color="#EF4444" />
                      <Text style={[styles.warningText, { color: '#EF4444' }]}>
                        Kritik Seviye!
                      </Text>
                    </View>
                  )}
                  {item.alerts.needsReorder && !item.alerts.isLowStock && (
                    <View style={[styles.warningBadge, { backgroundColor: '#F59E0B20' }]}>
                      <Ionicons name="warning" size={16} color="#F59E0B" />
                      <Text style={[styles.warningText, { color: '#F59E0B' }]}>
                        Sipariş Edin
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

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingItem ? 'Malzemeyi Düzenle' : 'Yeni Malzeme Ekle'}
            </Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Malzeme Adı *</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.inputBackground,
                  color: colors.text,
                  borderColor: colors.border,
                }]}
                value={formData.itemName}
                onChangeText={(text) => setFormData({ ...formData, itemName: text })}
                placeholder="Örn: Köpük Şampuanı"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Kategori *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['shampoo', 'wax', 'polish', 'cleaner', 'microfiber', 'chemical', 'accessory', 'other'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: formData.category === cat ? colors.primary : colors.inputBackground,
                        borderColor: formData.category === cat ? colors.primary : colors.border,
                      }
                    ]}
                    onPress={() => setFormData({ ...formData, category: cat as any })}
                  >
                    <Text style={[styles.categoryChipText, {
                      color: formData.category === cat ? '#FFFFFF' : colors.textSecondary
                    }]}>
                      {getCategoryLabel(cat)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Miktar *</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: colors.border,
                  }]}
                  value={formData.currentQuantity}
                  onChangeText={(text) => setFormData({ ...formData, currentQuantity: text })}
                  placeholder="100"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Birim</Text>
                <View style={styles.unitButtons}>
                  {['litre', 'kg', 'adet', 'paket', 'ml'].map((unit) => (
                    <TouchableOpacity
                      key={unit}
                      style={[
                        styles.unitButton,
                        {
                          backgroundColor: formData.unit === unit ? colors.primary : colors.inputBackground,
                          borderColor: formData.unit === unit ? colors.primary : colors.border,
                        }
                      ]}
                      onPress={() => setFormData({ ...formData, unit: unit as any })}
                    >
                      <Text style={[styles.unitButtonText, {
                        color: formData.unit === unit ? '#FFFFFF' : colors.textSecondary
                      }]}>
                        {getUnitLabel(unit)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Kritik Eşik</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: colors.border,
                  }]}
                  value={formData.lowThreshold}
                  onChangeText={(text) => setFormData({ ...formData, lowThreshold: text })}
                  placeholder="10"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.label, { color: colors.text }]}>Sipariş Eşiği</Text>
                <TextInput
                  style={[styles.input, { 
                    backgroundColor: colors.inputBackground,
                    color: colors.text,
                    borderColor: colors.border,
                  }]}
                  value={formData.reorderThreshold}
                  onChangeText={(text) => setFormData({ ...formData, reorderThreshold: text })}
                  placeholder="20"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Birim Maliyet (TL)</Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.inputBackground,
                  color: colors.text,
                  borderColor: colors.border,
                }]}
                value={formData.unitCost}
                onChangeText={(text) => setFormData({ ...formData, unitCost: text })}
                placeholder="25.00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
              />
            </View>

            <Button
              title={editingItem ? "Güncelle" : "Ekle"}
              onPress={handleSave}
              style={styles.saveButton}
            />
          </ScrollView>
        </SafeAreaView>
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
  addButton: {
    padding: spacing.xs,
  },
  alertsContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    gap: spacing.sm,
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
    ...typography.bodyBold,
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
  inventoryContainer: {
    padding: spacing.md,
  },
  inventoryCard: {
    marginBottom: spacing.md,
  },
  inventoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  inventoryHeaderLeft: {
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
  inventoryInfo: {
    flex: 1,
  },
  inventoryName: {
    ...typography.bodyBold,
    marginBottom: 2,
  },
  inventoryCategory: {
    ...typography.caption,
  },
  inventoryActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.xs,
  },
  inventoryDetails: {
    gap: spacing.sm,
  },
  inventoryDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inventoryDetailItem: {
    flex: 1,
  },
  detailLabel: {
    ...typography.caption,
    marginBottom: 2,
  },
  detailValue: {
    ...typography.bodyBold,
  },
  stockProgress: {
    marginTop: spacing.sm,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  thresholdText: {
    ...typography.caption,
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
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...typography.h2,
  },
  modalContent: {
    flex: 1,
    padding: spacing.md,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodyBold,
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
  },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginRight: spacing.sm,
  },
  categoryChipText: {
    ...typography.body,
    fontWeight: '500',
  },
  unitButtons: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  unitButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    alignItems: 'center',
  },
  unitButtonText: {
    ...typography.caption,
    fontWeight: '600',
  },
  saveButton: {
    marginTop: spacing.lg,
  },
});

