import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Alert,
  StatusBar,
  Dimensions,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, borderRadius, shadows, typography } from '@/shared/theme';
import { BackButton } from '@/shared/components';
import apiService from '@/shared/services';
import { useAuth } from '@/shared/context';

const { width } = Dimensions.get('window');

interface Customer {
  _id: string;
  name: string;
  surname: string;
  email: string;
  phone: string;
  avatar?: string;
  totalSpent: number;
  lastVisit: string;
  totalServices: number;
  vehicles: Array<{
    _id: string;
    brand: string;
    modelName: string;
    year: number;
    plateNumber: string;
  }>;
  notes: Array<{
    _id: string;
    content: string;
    createdAt: string;
  }>;
  createdAt: string;
}

interface CustomerNote {
  _id: string;
  content: string;
  createdAt: string;
}

export default function CustomerScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'lastVisit' | 'totalSpent'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [customerDetails, setCustomerDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [loyaltyInfo, setLoyaltyInfo] = useState<any>(null);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      
      // Gerçek API çağrısı
      const response = await apiService.getMechanicCustomers(searchQuery);
      
      if (response.success && response.data) {
        // API'den gelen veriyi Customer interface'ine uygun hale getir
        const apiCustomers = response.data.map((customer: any) => ({
          _id: customer._id,
          name: customer.name || '',
          surname: customer.surname || '',
          email: customer.email || '',
          phone: customer.phone || '',
          totalSpent: customer.totalSpent || 0,
          lastVisit: customer.lastVisit ? new Date(customer.lastVisit).toISOString() : new Date().toISOString(),
          totalServices: customer.totalJobs || 0,
          vehicles: [], // Araç bilgileri şimdilik boş
          notes: [], // Notlar ayrı endpoint'ten gelecek
          createdAt: customer.firstVisit ? new Date(customer.firstVisit).toISOString() : new Date().toISOString()
        }));

        setCustomers(apiCustomers);
        setFilteredCustomers(apiCustomers);
      } else {
        Alert.alert('Hata', response.message || 'Müşteri verileri yüklenirken bir hata oluştu.');
      }

    } catch (error: any) {
      console.error('Customer fetch error:', error);
      Alert.alert('Hata', 'Müşteri verileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  const fetchCustomerDetails = useCallback(async (customerId: string) => {
    try {
      setLoadingDetails(true);
      
      const response = await apiService.getCustomerDetails(customerId);
      
      if (response.success && response.data) {
        setCustomerDetails(response.data);
        
        // Sadık müşteri kontrolü yap
        const loyaltyResponse = await apiService.checkCustomerLoyalty(customerId);
        if (loyaltyResponse.success && loyaltyResponse.data) {
          setLoyaltyInfo(loyaltyResponse.data);
        }
      } else {
        Alert.alert('Hata', response.message || 'Müşteri detayları yüklenirken bir hata oluştu.');
      }
    } catch (error: any) {
      console.error('Customer details fetch error:', error);
      Alert.alert('Hata', 'Müşteri detayları yüklenirken bir hata oluştu.');
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  // Arama için debounce
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      fetchCustomers();
    }, 500);

    setSearchTimeout(timeout);

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [searchQuery, fetchCustomers]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    // Sort customers (arama API'de yapılıyor)
    let filtered = [...customers];

    // Sort customers
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = `${a.name} ${a.surname}`;
          bValue = `${b.name} ${b.surname}`;
          break;
        case 'lastVisit':
          aValue = new Date(a.lastVisit).getTime();
          bValue = new Date(b.lastVisit).getTime();
          break;
        case 'totalSpent':
          aValue = a.totalSpent;
          bValue = b.totalSpent;
          break;
        default:
          aValue = `${a.name} ${a.surname}`;
          bValue = `${b.name} ${b.surname}`;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredCustomers(filtered);
  }, [customers, sortBy, sortOrder]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCustomers();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const addNote = async () => {
    if (!newNote.trim() || !selectedCustomer) return;

    try {
      const response = await apiService.addCustomerNote(selectedCustomer._id, newNote.trim());
      
      if (response.success) {
        // Müşteri detaylarını yeniden yükle
        await fetchCustomerDetails(selectedCustomer._id);
        
        // Müşteri listesini de güncelle
        await fetchCustomers();
        
        setNewNote('');
        setShowNoteModal(false);
        
        Alert.alert('Başarılı', 'Not başarıyla eklendi.');
      } else {
        Alert.alert('Hata', response.message || 'Not eklenirken bir hata oluştu.');
      }
    } catch (error: any) {
      console.error('Add note error:', error);
      Alert.alert('Hata', 'Not eklenirken bir hata oluştu.');
    }
  };

  const openCustomerDetail = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerModal(true);
    
    // Müşteri detaylarını yükle
    await fetchCustomerDetails(customer._id);
  };

  const renderCustomerItem = ({ item }: { item: Customer }) => (
    <TouchableOpacity 
      style={styles.customerItem}
      onPress={() => openCustomerDetail(item)}
      activeOpacity={0.7}
    >
      <View style={styles.customerAvatar}>
        <Text style={styles.customerAvatarText}>
          {item.name.charAt(0)}{item.surname.charAt(0)}
        </Text>
      </View>
      
      <View style={styles.customerInfo}>
        <Text style={styles.customerName}>
          {item.name} {item.surname}
        </Text>
        <Text style={styles.customerPhone}>{item.phone}</Text>
        <View style={styles.customerStats}>
          <View style={styles.customerStat}>
            <Ionicons name="car" size={14} color={colors.text.secondary} />
            <Text style={styles.customerStatText}>{item.vehicles.length} araç</Text>
          </View>
          <View style={styles.customerStat}>
            <Ionicons name="cash" size={14} color={colors.text.secondary} />
            <Text style={styles.customerStatText}>{formatCurrency(item.totalSpent)}</Text>
          </View>
          <View style={styles.customerStat}>
            <Ionicons name="time" size={14} color={colors.text.secondary} />
            <Text style={styles.customerStatText}>{formatDate(item.lastVisit)}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.customerActions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => {
            setSelectedCustomer(item);
            setShowNoteModal(true);
          }}
        >
          <Ionicons name="add-circle" size={20} color={colors.primary.main} />
        </TouchableOpacity>
        <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
      </View>
    </TouchableOpacity>
  );

  const renderSortButton = (type: 'name' | 'lastVisit' | 'totalSpent', label: string) => (
    <TouchableOpacity 
      style={[styles.sortButton, sortBy === type && styles.sortButtonActive]}
      onPress={() => {
        if (sortBy === type) {
          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
          setSortBy(type);
          setSortOrder('asc');
        }
      }}
    >
      <Text style={[styles.sortButtonText, sortBy === type && styles.sortButtonTextActive]}>
        {label}
      </Text>
      {sortBy === type && (
        <Ionicons 
          name={sortOrder === 'asc' ? 'chevron-up' : 'chevron-down'} 
          size={16} 
          color={colors.primary.main} 
        />
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <Ionicons name="people" size={40} color={colors.primary.main} />
          <Text style={styles.loadingText}>Müşteriler yükleniyor...</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <BackButton />
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Müşteri Defterim</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color={colors.text.tertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Müşteri ara..."
              placeholderTextColor={colors.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={colors.text.tertiary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Sort Options */}
        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Sırala:</Text>
          <View style={styles.sortButtons}>
            {renderSortButton('name', 'İsim')}
            {renderSortButton('lastVisit', 'Son Ziyaret')}
            {renderSortButton('totalSpent', 'Toplam Harcama')}
          </View>
        </View>

        {/* Customer List */}
        <FlatList
          data={filteredCustomers}
          renderItem={renderCustomerItem}
          keyExtractor={(item) => item._id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary.main]}
              tintColor={colors.primary.main}
            />
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color={colors.text.tertiary} />
              <Text style={styles.emptyStateTitle}>Müşteri bulunamadı</Text>
              <Text style={styles.emptyStateSubtitle}>
                {searchQuery ? 'Arama kriterlerinize uygun müşteri bulunamadı.' : 'Henüz müşteri eklenmemiş.'}
              </Text>
            </View>
          }
        />
      </View>

      {/* Customer Detail Modal */}
      <Modal
        visible={showCustomerModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Müşteri Detayları</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowCustomerModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          
          {selectedCustomer && (
            <ScrollView style={styles.modalContent}>
              {loadingDetails ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Müşteri detayları yükleniyor...</Text>
                </View>
              ) : customerDetails ? (
                <>
                  {/* Customer Info */}
                  <View style={styles.customerDetailCard}>
                    <View style={styles.customerDetailHeader}>
                      <View style={styles.customerDetailAvatar}>
                        <Text style={styles.customerDetailAvatarText}>
                          {customerDetails.customer.name.charAt(0)}{customerDetails.customer.surname.charAt(0)}
                        </Text>
                      </View>
                      <View style={styles.customerDetailInfo}>
                        <View style={styles.customerNameRow}>
                          <Text style={styles.customerDetailName}>
                            {customerDetails.customer.name} {customerDetails.customer.surname}
                          </Text>
                          {loyaltyInfo?.isLoyal && (
                            <View style={[styles.loyaltyBadge, { backgroundColor: colors.warning.main }]}>
                              <Ionicons name="star" size={14} color={colors.text.inverse} />
                              <Text style={styles.loyaltyText}>Sadık</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.customerDetailPhone}>{customerDetails.customer.phone}</Text>
                        <Text style={styles.customerDetailEmail}>{customerDetails.customer.email}</Text>
                        {loyaltyInfo?.isLoyal && (
                          <Text style={styles.loyaltyDetailText}>
                            {loyaltyInfo.loyalty.visitCount}. ziyaret • {loyaltyInfo.loyalty.totalJobs} iş
                          </Text>
                        )}
                      </View>
                    </View>
                    
                    <View style={styles.customerDetailStats}>
                      <View style={styles.customerDetailStat}>
                        <Text style={styles.customerDetailStatValue}>{formatCurrency(customerDetails.stats.totalSpent)}</Text>
                        <Text style={styles.customerDetailStatLabel}>Toplam Harcama</Text>
                      </View>
                      <View style={styles.customerDetailStat}>
                        <Text style={styles.customerDetailStatValue}>{customerDetails.stats.totalJobs}</Text>
                        <Text style={styles.customerDetailStatLabel}>Toplam Hizmet</Text>
                      </View>
                      <View style={styles.customerDetailStat}>
                        <Text style={styles.customerDetailStatValue}>{formatDate(customerDetails.stats.lastVisit)}</Text>
                        <Text style={styles.customerDetailStatLabel}>Son Ziyaret</Text>
                      </View>
                    </View>
                  </View>

                  {/* Recent Jobs */}
                  <View style={styles.vehiclesCard}>
                    <Text style={styles.cardTitle}>Son İşler</Text>
                    {customerDetails.jobs && customerDetails.jobs.length > 0 ? (
                      customerDetails.jobs.slice(0, 5).map((job: any) => (
                        <View key={job._id} style={styles.vehicleItem}>
                          <View style={styles.vehicleInfo}>
                            <Text style={styles.vehicleName}>
                              {job.serviceType} - {formatCurrency(job.price)}
                            </Text>
                            <Text style={styles.vehiclePlate}>{formatDate(job.appointmentDate)}</Text>
                          </View>
                        </View>
                      ))
                    ) : (
                      <View style={styles.emptyNotes}>
                        <Ionicons name="car-outline" size={32} color={colors.text.tertiary} />
                        <Text style={styles.emptyNotesText}>Henüz iş kaydı yok</Text>
                      </View>
                    )}
                  </View>

                  {/* Notes */}
                  <View style={styles.notesCard}>
                    <View style={styles.notesHeader}>
                      <Text style={styles.cardTitle}>Notlar</Text>
                      <TouchableOpacity 
                        style={styles.addNoteButton}
                        onPress={() => {
                          setShowCustomerModal(false);
                          setShowNoteModal(true);
                        }}
                      >
                        <Ionicons name="add" size={20} color={colors.primary.main} />
                      </TouchableOpacity>
                    </View>
                    
                    {customerDetails.notes && customerDetails.notes.length > 0 ? (
                      customerDetails.notes.map((note: any) => (
                        <View key={note._id} style={styles.noteItem}>
                          <Text style={styles.noteContent}>{note.note}</Text>
                          <Text style={styles.noteDate}>{formatDate(note.createdAt)}</Text>
                        </View>
                      ))
                    ) : (
                      <View style={styles.emptyNotes}>
                        <Ionicons name="document-text-outline" size={32} color={colors.text.tertiary} />
                        <Text style={styles.emptyNotesText}>Henüz not eklenmemiş</Text>
                      </View>
                    )}
                  </View>
                </>
              ) : (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Müşteri detayları yüklenemedi</Text>
                </View>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Add Note Modal */}
      <Modal
        visible={showNoteModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNoteModal(false)}
      >
        <View style={styles.noteModalOverlay}>
          <View style={styles.noteModal}>
            <View style={styles.noteModalHeader}>
              <Text style={styles.noteModalTitle}>Not Ekle</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowNoteModal(false)}
              >
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.noteModalContent}>
              <TextInput
                style={styles.noteInput}
                placeholder="Müşteri hakkında not yazın..."
                placeholderTextColor={colors.text.tertiary}
                value={newNote}
                onChangeText={setNewNote}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              
              <View style={styles.noteModalActions}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setShowNoteModal(false)}
                >
                  <Text style={styles.cancelButtonText}>İptal</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.saveButton, !newNote.trim() && styles.saveButtonDisabled]}
                  onPress={addNote}
                  disabled={!newNote.trim()}
                >
                  <Text style={styles.saveButtonText}>Kaydet</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.secondary,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitleContainer: {
    marginLeft: spacing.md,
  },
  headerTitle: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
    color: colors.text.inverse,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.inverse,
    marginTop: spacing.md,
  },

  // Search
  searchContainer: {
    paddingVertical: spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.body2.fontSize,
    color: colors.text.primary,
  },

  // Sort
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  sortLabel: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.secondary,
    gap: spacing.xs,
  },
  sortButtonActive: {
    backgroundColor: colors.primary.ultraLight,
  },
  sortButtonText: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
  },
  sortButtonTextActive: {
    color: colors.primary.main,
    fontWeight: '600',
  },

  // Customer List
  listContent: {
    paddingBottom: spacing.xl,
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.small,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  customerAvatarText: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  customerPhone: {
    fontSize: typography.body3.fontSize,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  customerStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  customerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  customerStatText: {
    fontSize: typography.caption.small.fontSize,
    color: colors.text.secondary,
  },
  customerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    padding: spacing.sm,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyStateTitle: {
    fontSize: typography.h4.fontSize,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyStateSubtitle: {
    fontSize: typography.body2.fontSize,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.secondary,
  },
  modalTitle: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
    color: colors.text.primary,
  },
  closeButton: {
    padding: spacing.sm,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },

  // Customer Detail
  customerDetailCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.medium,
  },
  customerDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  customerDetailAvatar: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  customerDetailAvatarText: {
    fontSize: typography.h3.fontSize,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  customerDetailInfo: {
    flex: 1,
  },
  customerDetailName: {
    fontSize: typography.h3.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  customerDetailPhone: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  customerDetailEmail: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
  },
  customerDetailStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  customerDetailStat: {
    alignItems: 'center',
  },
  customerDetailStatValue: {
    fontSize: typography.h4.fontSize,
    fontWeight: '600',
    color: colors.primary.main,
    marginBottom: spacing.xs,
  },
  customerDetailStatLabel: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
  },

  // Vehicles
  vehiclesCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.medium,
  },
  cardTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  vehicleItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.secondary,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  vehiclePlate: {
    fontSize: typography.body3.fontSize,
    color: colors.text.secondary,
  },

  // Notes
  notesCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.medium,
  },
  notesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  addNoteButton: {
    padding: spacing.sm,
  },
  noteItem: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.secondary,
  },
  noteContent: {
    fontSize: typography.body2.fontSize,
    color: colors.text.primary,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  noteDate: {
    fontSize: typography.caption.small.fontSize,
    color: colors.text.tertiary,
  },
  emptyNotes: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyNotesText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.tertiary,
    marginTop: spacing.sm,
  },

  // Note Modal
  noteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noteModal: {
    width: width * 0.9,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    ...shadows.large,
  },
  noteModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.secondary,
  },
  noteModalTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: colors.text.primary,
  },
  noteModalContent: {
    padding: spacing.lg,
  },
  noteInput: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    fontSize: typography.body2.fontSize,
    color: colors.text.primary,
    minHeight: 100,
    marginBottom: spacing.lg,
  },
  noteModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
  },
  cancelButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.primary,
  },
  cancelButtonText: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  saveButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary.main,
  },
  saveButtonDisabled: {
    backgroundColor: colors.text.tertiary,
  },
  saveButtonText: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  // Loyalty Customer Styles
  customerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  loyaltyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  loyaltyText: {
    fontSize: typography.caption.small.fontSize,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  loyaltyDetailText: {
    fontSize: typography.caption.small.fontSize,
    color: colors.warning.main,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
});
