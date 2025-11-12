import React, { useMemo, useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNetworkStatus } from '@/shared/hooks/useNetworkStatus';

export interface OdometerQuickUpdatePayload {
  km: number;
  timestampUtc: string;
  notes?: string;
  evidenceType?: 'none' | 'photo' | 'document';
  odometerReset?: boolean;
  clientRequestId?: string;
}

export interface OdometerQuickUpdateModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: OdometerQuickUpdatePayload, options?: { offline?: boolean }) => Promise<void> | void;
  initialKm?: number;
  defaultUnit?: 'km' | 'mi';
  submitting?: boolean;
  errorMessage?: string | null;
  lastVerifiedAt?: string;
}

const sanitizeNumericInput = (value: string) => value.replace(/[^\d]/g, '');

const formatPreview = (value: string, unit: 'km' | 'mi' = 'km') => {
  if (!value) {
    return `0 ${unit}`;
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return `0 ${unit}`;
  }

  return `${numeric.toLocaleString('tr-TR')} ${unit}`;
};

export const OdometerQuickUpdateModal: React.FC<OdometerQuickUpdateModalProps> = ({
  visible,
  onClose,
  onSubmit,
  initialKm,
  defaultUnit = 'km',
  submitting,
  errorMessage,
  lastVerifiedAt,
}) => {
  const [inputValue, setInputValue] = useState(initialKm ? String(Math.round(initialKm)) : '');
  const [notes, setNotes] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const { isConnected } = useNetworkStatus();

  useEffect(() => {
    if (visible) {
      setInputValue(initialKm ? String(Math.round(initialKm)) : '');
      setNotes('');
      setHasSubmitted(false);
    }
  }, [visible, initialKm]);

  const formattedPreview = useMemo(() => formatPreview(inputValue, defaultUnit), [inputValue, defaultUnit]);
  const hasError = hasSubmitted && !inputValue;

  const handleSubmit = () => {
    setHasSubmitted(true);
    if (!inputValue) {
      return;
    }

    const km = Number(inputValue);
    if (Number.isNaN(km)) {
      return;
    }

    const payload: OdometerQuickUpdatePayload = {
      km,
      timestampUtc: new Date().toISOString(),
      notes: notes?.trim()?.length ? notes.trim() : undefined,
      evidenceType: 'none',
      clientRequestId: `mobile:${Date.now()}`,
    };

    onSubmit(payload, { offline: !isConnected });
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Hızlı Kilometre Güncelle</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Kapat">
              <MaterialCommunityIcons name="close" size={24} color="#1F2933" />
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>Yeni gösterge değeri</Text>
              <Text style={styles.previewValue}>{formattedPreview}</Text>
              {lastVerifiedAt && (
                <Text style={styles.previewMeta}>Son doğrulama: {formatDate(lastVerifiedAt)}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Gösterge kilometresi ({defaultUnit.toUpperCase()})</Text>
              <View style={[styles.inputWrapper, hasError && styles.inputWrapperError]}>
                <TextInput
                  value={inputValue}
                  onChangeText={(text) => setInputValue(sanitizeNumericInput(text))}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  placeholder="Örn. 128450"
                  maxLength={9}
                  style={styles.input}
                  accessibilityLabel="Gösterge kilometresi"
                />
                <MaterialCommunityIcons name="counter" size={18} color="#9AA5B1" />
              </View>
              {hasError && <Text style={styles.errorText}>Kilometre değeri zorunludur.</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Not (opsiyonel)</Text>
              <View style={styles.textAreaWrapper}>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Servisle ilgili kısa bir not bırakabilirsiniz."
                  multiline
                  numberOfLines={3}
                  style={styles.textArea}
                />
              </View>
            </View>

            {!isConnected && (
              <View style={styles.offlineInfo}>
                <MaterialCommunityIcons name="cloud-off-outline" size={16} color="#FF9F1C" />
                <Text style={styles.offlineText}>
                  Bağlantı yok. Güncelleme sıraya alınacak ve internete bağlandığınızda gönderilecek.
                </Text>
              </View>
            )}

            {errorMessage && (
              <View style={styles.errorBanner}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#B00020" />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelButtonText}>Vazgeç</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Kilometre kaydet"
            >
              {submitting ? (
                <MaterialCommunityIcons name="loading" size={20} color="#fff" />
              ) : (
                <MaterialCommunityIcons name="check" size={20} color="#fff" />
              )}
              <Text style={styles.submitButtonText}>{submitting ? 'Kaydediliyor...' : 'Kaydet'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const formatDate = (iso: string) => {
  if (!iso) {
    return '-';
  }
  const date = new Date(iso);
  return new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    paddingBottom: 24,
  },
  previewCard: {
    backgroundColor: '#F5F8FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E3EBFF',
  },
  previewLabel: {
    fontSize: 13,
    color: '#475467',
    marginBottom: 4,
  },
  previewValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  previewMeta: {
    marginTop: 6,
    fontSize: 12,
    color: '#52606D',
  },
  inputGroup: {
    marginTop: 18,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2933',
    marginBottom: 8,
  },
  inputWrapper: {
    borderWidth: 1,
    borderColor: '#E4E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
  },
  inputWrapperError: {
    borderColor: '#F97066',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  textAreaWrapper: {
    borderWidth: 1,
    borderColor: '#E4E7EB',
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#E4E7EB',
  },
  cancelButtonText: {
    color: '#52606D',
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#007AFF',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  submitButtonDisabled: {
    backgroundColor: '#9AA5B1',
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: '#D92D20',
  },
  offlineInfo: {
    marginTop: 16,
    backgroundColor: '#FFF4E5',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  offlineText: {
    flex: 1,
    fontSize: 12,
    color: '#8A4B08',
  },
  errorBanner: {
    marginTop: 16,
    backgroundColor: '#FDECEC',
    padding: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorBannerText: {
    color: '#B00020',
    fontSize: 13,
    flex: 1,
  },
});

export default OdometerQuickUpdateModal;


