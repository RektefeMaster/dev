import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/context';
import { Button } from '@/shared/components';
import { typography, spacing, borderRadius } from '@/shared/theme';
import apiService from '@/shared/services';

interface TirePriceQuoteModalProps {
  visible: boolean;
  jobId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const TirePriceQuoteModal: React.FC<TirePriceQuoteModalProps> = ({
  visible,
  jobId,
  onClose,
  onSuccess,
}) => {
  const { themeColors: colors } = useTheme();
  const styles = createStyles(colors);

  const [loading, setLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [laborCost, setLaborCost] = useState('');
  const [partsCost, setPartsCost] = useState('');
  const [taxAmount, setTaxAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');

  const calculateTotal = () => {
    const labor = parseFloat(laborCost) || 0;
    const parts = parseFloat(partsCost) || 0;
    const tax = parseFloat(taxAmount) || 0;
    return labor + parts + tax;
  };

  const handleSubmit = async () => {
    const totalAmount = parseFloat(amount) || calculateTotal();

    if (!totalAmount || totalAmount <= 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir tutar girin');
      return;
    }

    try {
      setLoading(true);

      const quoteData = {
        amount: totalAmount,
        breakdown: (laborCost || partsCost || taxAmount) ? {
          labor: parseFloat(laborCost) || 0,
          parts: parseFloat(partsCost) || 0,
          tax: parseFloat(taxAmount) || 0,
        } : undefined,
        notes: notes || undefined,
        estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : undefined,
      };

      const response = await apiService.sendTirePriceQuote(jobId, quoteData);

      if (response.success) {
        Alert.alert('Başarılı', 'Fiyat teklifi müşteriye gönderildi');
        onSuccess();
        onClose();
        resetForm();
      } else {
        throw new Error(response.message || 'Fiyat teklifi gönderilemedi');
      }
    } catch (error: any) {
      console.error('Fiyat teklifi gönderme hatası:', error);
      Alert.alert('Hata', error.message || 'Fiyat teklifi gönderilemedi');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setAmount('');
    setLaborCost('');
    setPartsCost('');
    setTaxAmount('');
    setNotes('');
    setEstimatedDuration('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, { backgroundColor: colors.background.primary }]}>
            {/* Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border.primary }]}>
              <Text style={[styles.modalTitle, { color: colors.text.primary }]}>
                Fiyat Teklifi Gönder
              </Text>
              <TouchableOpacity onPress={handleClose} disabled={loading}>
                <Ionicons name="close" size={28} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Detaylı Fiyatlandırma */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                  Fiyat Detayları
                </Text>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text.secondary }]}>
                    İşçilik Ücreti (TL)
                  </Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: colors.background.secondary,
                      color: colors.text.primary,
                      borderColor: colors.border.primary 
                    }]}
                    value={laborCost}
                    onChangeText={setLaborCost}
                    placeholder="0.00"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="decimal-pad"
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text.secondary }]}>
                    Parça/Malzeme Ücreti (TL)
                  </Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: colors.background.secondary,
                      color: colors.text.primary,
                      borderColor: colors.border.primary 
                    }]}
                    value={partsCost}
                    onChangeText={setPartsCost}
                    placeholder="0.00"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="decimal-pad"
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text.secondary }]}>
                    KDV/Vergi (TL)
                  </Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: colors.background.secondary,
                      color: colors.text.primary,
                      borderColor: colors.border.primary 
                    }]}
                    value={taxAmount}
                    onChangeText={setTaxAmount}
                    placeholder="0.00"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="decimal-pad"
                    editable={!loading}
                  />
                </View>

                {/* Toplam */}
                {(laborCost || partsCost || taxAmount) && (
                  <View style={[styles.totalCard, { 
                    backgroundColor: colors.primary.main + '10',
                    borderColor: colors.primary.main 
                  }]}>
                    <Text style={[styles.totalLabel, { color: colors.text.secondary }]}>
                      Toplam Tutar
                    </Text>
                    <Text style={[styles.totalValue, { color: colors.primary.main }]}>
                      {calculateTotal().toFixed(2)} TL
                    </Text>
                  </View>
                )}
              </View>

              {/* veya Direkt Tutar */}
              <View style={styles.section}>
                <Text style={[styles.orText, { color: colors.text.tertiary }]}>
                  - veya -
                </Text>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text.secondary }]}>
                    Toplam Tutar (TL)
                  </Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: colors.background.secondary,
                      color: colors.text.primary,
                      borderColor: colors.border.primary 
                    }]}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="decimal-pad"
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Tahmini Süre */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
                  Ek Bilgiler
                </Text>
                
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text.secondary }]}>
                    Tahmini Süre (Dakika)
                  </Text>
                  <TextInput
                    style={[styles.input, { 
                      backgroundColor: colors.background.secondary,
                      color: colors.text.primary,
                      borderColor: colors.border.primary 
                    }]}
                    value={estimatedDuration}
                    onChangeText={setEstimatedDuration}
                    placeholder="60"
                    placeholderTextColor={colors.text.tertiary}
                    keyboardType="number-pad"
                    editable={!loading}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.text.secondary }]}>
                    Notlar (Opsiyonel)
                  </Text>
                  <TextInput
                    style={[styles.textArea, { 
                      backgroundColor: colors.background.secondary,
                      color: colors.text.primary,
                      borderColor: colors.border.primary 
                    }]}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Fiyat hakkında ek bilgiler..."
                    placeholderTextColor={colors.text.tertiary}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    editable={!loading}
                  />
                </View>
              </View>

              {/* Bottom Spacing */}
              <View style={{ height: spacing.lg }} />
            </ScrollView>

            {/* Actions */}
            <View style={[styles.modalActions, { borderTopColor: colors.border.primary }]}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: colors.background.secondary }]}
                onPress={handleClose}
                disabled={loading}
              >
                <Text style={[styles.cancelButtonText, { color: colors.text.primary }]}>
                  İptal
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitButton, { backgroundColor: colors.primary.main }]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={20} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Gönder</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '90%',
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
  },
  modalBody: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.h4.fontSize,
    fontWeight: typography.h4.fontWeight,
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.body2.fontSize,
    fontWeight: typography.body2.fontWeight,
    marginBottom: spacing.xs,
  },
  input: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    fontSize: typography.body1.fontSize,
    borderWidth: 1,
  },
  textArea: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    fontSize: typography.body1.fontSize,
    borderWidth: 1,
    minHeight: 100,
  },
  totalCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    marginTop: spacing.sm,
  },
  totalLabel: {
    fontSize: typography.body1.fontSize,
    fontWeight: typography.body1.fontWeight,
  },
  totalValue: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
  },
  orText: {
    textAlign: 'center',
    fontSize: typography.body2.fontSize,
    marginVertical: spacing.sm,
  },
  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: typography.body1.fontSize,
    fontWeight: typography.body1.fontWeight,
  },
  submitButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: typography.body1.fontSize,
    fontWeight: typography.body1.fontWeight,
    marginLeft: spacing.xs,
  },
});

export default TirePriceQuoteModal;

