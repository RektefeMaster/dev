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
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, borderRadius, shadows, typography } from '@/shared/theme';
import { BackButton } from '@/shared/components';
import apiService from '@/shared/services';
import { useAuth } from '@/shared/context';

const { width } = Dimensions.get('window');

interface QuoteItem {
  id: string;
  service: string;
  description: string;
  price: number;
  quantity: number;
  total: number;
}

interface QuoteTemplate {
  id: string;
  name: string;
  description: string;
  items: QuoteItem[];
  totalPrice: number;
  createdAt: string;
}

export default function QuickQuoteScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [quoteTemplates, setQuoteTemplates] = useState<QuoteTemplate[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<QuoteItem | null>(null);
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: '',
    vehicleInfo: '',
  });

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      
      // Gerçek API çağrısı
      const response = await apiService.getQuoteTemplates();
      
      if (response.success && response.data) {
        setQuoteTemplates(response.data);
      } else {
        Alert.alert('Hata', response.message || 'Teklif şablonları yüklenirken bir hata oluştu.');
      }
    } catch (error: any) {
      console.error('Quote templates fetch error:', error);
      Alert.alert('Hata', 'Teklif şablonları yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTemplates();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  const calculateTotal = () => {
    return quoteItems.reduce((total, item) => total + item.total, 0);
  };

  const addQuoteItem = () => {
    const newItem: QuoteItem = {
      id: Date.now().toString(),
      service: '',
      description: '',
      price: 0,
      quantity: 1,
      total: 0,
    };
    setEditingItem(newItem);
    setShowItemModal(true);
  };

  const editQuoteItem = (item: QuoteItem) => {
    setEditingItem(item);
    setShowItemModal(true);
  };

  const saveQuoteItem = (itemData: Partial<QuoteItem>) => {
    if (!editingItem) return;

    const updatedItem: QuoteItem = {
      ...editingItem,
      ...itemData,
      total: (itemData.price || editingItem.price) * (itemData.quantity || editingItem.quantity),
    };

    if (editingItem.id === 'new') {
      // Add new item
      setQuoteItems(prev => [...prev, { ...updatedItem, id: Date.now().toString() }]);
    } else {
      // Update existing item
      setQuoteItems(prev => prev.map(item => 
        item.id === editingItem.id ? updatedItem : item
      ));
    }

    setShowItemModal(false);
    setEditingItem(null);
  };

  const removeQuoteItem = (itemId: string) => {
    setQuoteItems(prev => prev.filter(item => item.id !== itemId));
  };

  const loadTemplate = (template: QuoteTemplate) => {
    setQuoteItems(template.items.map(item => ({ ...item })));
    setShowTemplateModal(false);
    Alert.alert('Başarılı', 'Şablon yüklendi.');
  };

  const sendQuote = () => {
    if (quoteItems.length === 0) {
      Alert.alert('Uyarı', 'Lütfen en az bir hizmet ekleyin.');
      return;
    }

    if (!customerInfo.name.trim() || !customerInfo.phone.trim()) {
      Alert.alert('Uyarı', 'Lütfen müşteri bilgilerini doldurun.');
      return;
    }

    Alert.alert(
      'Teklif Gönder',
      `${customerInfo.name} müşterisine ${formatCurrency(calculateTotal())} tutarında teklif gönderilecek.`,
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Gönder', 
          onPress: () => {
            // Gerçek API çağrısı yapılacak
            Alert.alert('Başarılı', 'Teklif başarıyla gönderildi.');
            // Reset form
            setQuoteItems([]);
            setCustomerInfo({ name: '', phone: '', email: '', vehicleInfo: '' });
          }
        }
      ]
    );
  };

  const renderQuoteItem = ({ item }: { item: QuoteItem }) => (
    <View style={styles.quoteItem}>
      <View style={styles.quoteItemInfo}>
        <Text style={styles.quoteItemService}>{item.service}</Text>
        <Text style={styles.quoteItemDescription}>{item.description}</Text>
        <View style={styles.quoteItemDetails}>
          <Text style={styles.quoteItemPrice}>
            {formatCurrency(item.price)} × {item.quantity}
          </Text>
          <Text style={styles.quoteItemTotal}>
            {formatCurrency(item.total)}
          </Text>
        </View>
      </View>
      
      <View style={styles.quoteItemActions}>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => editQuoteItem(item)}
        >
          <Ionicons name="create" size={16} color={colors.primary.main} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.removeButton}
          onPress={() => removeQuoteItem(item.id)}
        >
          <Ionicons name="trash" size={16} color={colors.error.main} />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <Ionicons name="document-text" size={40} color={colors.primary.main} />
          <Text style={styles.loadingText}>Teklif hazırlanıyor...</Text>
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
              <Text style={styles.headerTitle}>Hızlı Teklif</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary.main]}
            tintColor={colors.primary.main}
          />
        }
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Customer Info */}
        <View style={styles.customerCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleContainer}>
              <Ionicons name="person" size={24} color={colors.primary.main} />
              <Text style={styles.cardTitle}>Müşteri Bilgileri</Text>
            </View>
          </View>
          
          <View style={styles.customerForm}>
            <View style={styles.inputRow}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Ad Soyad *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Müşteri adı"
                  placeholderTextColor={colors.text.tertiary}
                  value={customerInfo.name}
                  onChangeText={(text) => setCustomerInfo(prev => ({ ...prev, name: text }))}
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Telefon *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Telefon numarası"
                  placeholderTextColor={colors.text.tertiary}
                  value={customerInfo.phone}
                  onChangeText={(text) => setCustomerInfo(prev => ({ ...prev, phone: text }))}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            
            <View style={styles.inputRow}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>E-posta</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="E-posta adresi"
                  placeholderTextColor={colors.text.tertiary}
                  value={customerInfo.email}
                  onChangeText={(text) => setCustomerInfo(prev => ({ ...prev, email: text }))}
                  keyboardType="email-address"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Araç Bilgisi</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Marka, model, plaka"
                  placeholderTextColor={colors.text.tertiary}
                  value={customerInfo.vehicleInfo}
                  onChangeText={(text) => setCustomerInfo(prev => ({ ...prev, vehicleInfo: text }))}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Quote Items */}
        <View style={styles.quoteCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleContainer}>
              <Ionicons name="list" size={24} color={colors.primary.main} />
              <Text style={styles.cardTitle}>Hizmetler</Text>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity 
                style={styles.templateButton}
                onPress={() => setShowTemplateModal(true)}
              >
                <Ionicons name="library" size={20} color={colors.primary.main} />
                <Text style={styles.templateButtonText}>Şablon</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={addQuoteItem}
              >
                <Ionicons name="add" size={20} color={colors.primary.main} />
                <Text style={styles.addButtonText}>Ekle</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {quoteItems.length > 0 ? (
            <FlatList
              data={quoteItems}
              renderItem={renderQuoteItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              scrollEnabled={false}
            />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyStateText}>Henüz hizmet eklenmemiş</Text>
              <Text style={styles.emptyStateSubtext}>
                Şablon yükleyin veya manuel olarak hizmet ekleyin
              </Text>
            </View>
          )}
        </View>

        {/* Total */}
        {quoteItems.length > 0 && (
          <View style={styles.totalCard}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Toplam Tutar</Text>
              <Text style={styles.totalAmount}>
                {formatCurrency(calculateTotal())}
              </Text>
            </View>
          </View>
        )}

        {/* Send Quote Button */}
        <TouchableOpacity 
          style={[styles.sendButton, quoteItems.length === 0 && styles.sendButtonDisabled]}
          onPress={sendQuote}
          disabled={quoteItems.length === 0}
        >
          <Ionicons name="send" size={20} color={colors.text.inverse} />
          <Text style={styles.sendButtonText}>Teklifi Gönder</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Template Modal */}
      <Modal
        visible={showTemplateModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Şablon Seç</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowTemplateModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {quoteTemplates.map((template) => (
              <TouchableOpacity
                key={template.id}
                style={styles.templateItem}
                onPress={() => loadTemplate(template)}
                activeOpacity={0.7}
              >
                <View style={styles.templateInfo}>
                  <Text style={styles.templateName}>{template.name}</Text>
                  <Text style={styles.templateDescription}>{template.description}</Text>
                  <Text style={styles.templatePrice}>
                    {formatCurrency(template.totalPrice)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Item Modal */}
      <Modal
        visible={showItemModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowItemModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.itemModalOverlay}>
            <TouchableWithoutFeedback>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidingView}
              >
                <View style={styles.itemModal}>
                  <View style={styles.itemModalHeader}>
                    <Text style={styles.itemModalTitle}>
                      {editingItem?.id === 'new' ? 'Hizmet Ekle' : 'Hizmet Düzenle'}
                    </Text>
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={() => setShowItemModal(false)}
                    >
                      <Ionicons name="close" size={24} color={colors.text.primary} />
                    </TouchableOpacity>
                  </View>
                  
                  <ScrollView 
                    style={styles.itemModalContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Hizmet Adı *</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Hizmet adı"
                        placeholderTextColor={colors.text.tertiary}
                        value={editingItem?.service || ''}
                        onChangeText={(text) => editingItem && saveQuoteItem({ service: text })}
                        returnKeyType="next"
                        blurOnSubmit={false}
                      />
                    </View>
                    
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputLabel}>Açıklama</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="Hizmet açıklaması"
                        placeholderTextColor={colors.text.tertiary}
                        value={editingItem?.description || ''}
                        onChangeText={(text) => editingItem && saveQuoteItem({ description: text })}
                        returnKeyType="next"
                        blurOnSubmit={false}
                      />
                    </View>
                    
                    <View style={styles.inputRow}>
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Birim Fiyat *</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="0"
                          placeholderTextColor={colors.text.tertiary}
                          value={editingItem?.price?.toString() || ''}
                          onChangeText={(text) => {
                            const price = parseFloat(text) || 0;
                            editingItem && saveQuoteItem({ price });
                          }}
                          keyboardType="numeric"
                          returnKeyType="next"
                          blurOnSubmit={false}
                        />
                      </View>
                      <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Miktar *</Text>
                        <TextInput
                          style={styles.textInput}
                          placeholder="1"
                          placeholderTextColor={colors.text.tertiary}
                          value={editingItem?.quantity?.toString() || ''}
                          onChangeText={(text) => {
                            const quantity = parseInt(text) || 1;
                            editingItem && saveQuoteItem({ quantity });
                          }}
                          keyboardType="numeric"
                          returnKeyType="done"
                          blurOnSubmit={true}
                          onSubmitEditing={Keyboard.dismiss}
                        />
                      </View>
                    </View>
                    
                    <View style={styles.itemModalActions}>
                      <TouchableOpacity 
                        style={styles.cancelButton}
                        onPress={() => setShowItemModal(false)}
                      >
                        <Text style={styles.cancelButtonText}>İptal</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.saveButton, (!editingItem?.service || !editingItem?.price) && styles.saveButtonDisabled]}
                        onPress={() => setShowItemModal(false)}
                        disabled={!editingItem?.service || !editingItem?.price}
                      >
                        <Text style={styles.saveButtonText}>Kaydet</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
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

  // Cards
  customerCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.medium,
  },
  quoteCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.medium,
  },
  totalCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.medium,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: colors.text.primary,
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  // Customer Form
  customerForm: {
    gap: spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  inputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: typography.caption.large.fontSize,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.body2.fontSize,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },

  // Quote Items
  quoteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  quoteItemInfo: {
    flex: 1,
  },
  quoteItemService: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  quoteItemDescription: {
    fontSize: typography.body3.fontSize,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  quoteItemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quoteItemPrice: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
  },
  quoteItemTotal: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.primary.main,
  },
  quoteItemActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  editButton: {
    padding: spacing.sm,
  },
  removeButton: {
    padding: spacing.sm,
  },

  // Buttons
  templateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.primary,
    gap: spacing.xs,
  },
  templateButtonText: {
    fontSize: typography.caption.large.fontSize,
    fontWeight: '600',
    color: colors.primary.main,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary.main,
    gap: spacing.xs,
  },
  addButtonText: {
    fontSize: typography.caption.large.fontSize,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary.main,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  sendButtonDisabled: {
    backgroundColor: colors.text.tertiary,
  },
  sendButtonText: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.inverse,
  },

  // Total
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: typography.h3.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
  },
  totalAmount: {
    fontSize: typography.h2.fontSize,
    fontWeight: '700',
    color: colors.primary.main,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyStateText: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: typography.body3.fontSize,
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

  // Template Items
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.small,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  templateDescription: {
    fontSize: typography.body3.fontSize,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  templatePrice: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.primary.main,
  },

  // Item Modal
  itemModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardAvoidingView: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemModal: {
    width: width * 0.9,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    ...shadows.large,
  },
  itemModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.secondary,
  },
  itemModalTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: colors.text.primary,
  },
  itemModalContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  itemModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.md,
    marginTop: spacing.md,
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
});
