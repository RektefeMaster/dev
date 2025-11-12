import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { RootStackParamList } from '@/navigation/AppNavigator';
import ScreenHeader from '@/shared/components/ScreenHeader';
import { spacing, borderRadius } from '@/theme/theme';
import { apiService } from '@/shared/services/api';
import Input from '@/shared/components/Input';
import Button from '@/shared/components/Button';

type DeleteAccountScreenNavigationProp = StackNavigationProp<RootStackParamList, 'DeleteAccount'>;

const DeleteAccountScreen = () => {
  const navigation = useNavigation<DeleteAccountScreenNavigationProp>();
  const { theme, isDark } = useTheme();
  const { logout, user } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<1 | 2>(1); // 1: Warning, 2: Confirmation

  const requiredConfirmText = 'SİL';

  const handleDeleteAccount = async () => {
    if (step === 1) {
      // İlk adım: Uyarı göster, şifre iste
      if (!password) {
        Alert.alert('Hata', 'Lütfen şifrenizi girin');
        return;
      }
      setStep(2);
      return;
    }

    // İkinci adım: Onay metni kontrolü
    if (confirmText !== requiredConfirmText) {
      Alert.alert('Hata', `Lütfen onay metnini doğru yazın: "${requiredConfirmText}"`);
      return;
    }

    // Son onay
    Alert.alert(
      'Son Onay',
      'Hesabınız kalıcı olarak silinecek. Bu işlem geri alınamaz. Emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet, Sil',
          style: 'destructive',
          onPress: async () => {
            await performDelete();
          },
        },
      ]
    );
  };

  const performDelete = async () => {
    try {
      setLoading(true);

      // API'ye hesap silme isteği gönder
      // Not: Backend'de delete account endpoint'i olmayabilir, bu durumda logout yapıp kullanıcıyı auth ekranına yönlendir
      // Şimdilik API endpoint'i olmadığı için direkt logout yapıyoruz
      const response: { success?: boolean } | null = null; // await apiService.deleteAccount?.(password);

      if (response?.success) {
        Alert.alert(
          'Hesap Silindi',
          'Hesabınız başarıyla silindi. Uygulamadan çıkış yapılıyor...',
          [
            {
              text: 'Tamam',
              onPress: async () => {
                await logout();
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Auth' }],
                });
              },
            },
          ]
        );
      } else {
        // API endpoint yoksa veya hata varsa, sadece logout yap
        Alert.alert(
          'Bilgi',
          'Hesap silme özelliği henüz aktif değil. Hesabınızdan çıkış yapılıyor...',
          [
            {
              text: 'Tamam',
              onPress: async () => {
                await logout();
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Auth' }],
                });
              },
            },
          ]
        );
      }
    } catch (error: any) {
      console.error('DeleteAccount error:', error);
      if (error.response?.status === 401) {
        Alert.alert('Hata', 'Şifre yanlış. Lütfen tekrar deneyin.');
      } else {
        Alert.alert(
          'Hata',
          'Hesap silinirken bir hata oluştu. Lütfen daha sonra tekrar deneyin veya destek ekibi ile iletişime geçin.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? theme.colors.background.primary : '#F2F2F7' }
      ]}
    >
      {/* Header */}
      <ScreenHeader title="Hesabı Sil" />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Warning Card */}
        <View
          style={[
            styles.warningCard,
            {
              backgroundColor: isDark
                ? theme.colors.background.secondary
                : '#FFFFFF',
              borderColor: theme.colors.error.main,
              ...theme.shadows.card,
            }
          ]}
        >
          <View style={styles.warningIconContainer}>
            <Ionicons name="warning" size={48} color={theme.colors.error.main} />
          </View>
          <Text
            style={[
              styles.warningTitle,
              { color: theme.colors.error.main }
            ]}
          >
            Hesap Silme İşlemi
          </Text>
          <Text
            style={[
              styles.warningText,
              { color: theme.colors.text.secondary }
            ]}
          >
            Hesabınızı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
          </Text>
        </View>

        {/* Information List */}
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: isDark
                ? theme.colors.background.secondary
                : '#FFFFFF',
              ...theme.shadows.card,
            }
          ]}
        >
          <Text
            style={[
              styles.infoTitle,
              { color: theme.colors.text.primary }
            ]}
          >
            Hesap silindiğinde:
          </Text>
          <View style={styles.infoList}>
            {[
              'Tüm kişisel bilgileriniz silinecek',
              'Randevu geçmişiniz silinecek',
              'TefePuan bakiyeniz silinecek',
              'Favorileriniz ve ayarlarınız silinecek',
              'Bu işlem geri alınamaz',
            ].map((item, index) => (
              <View key={index} style={styles.infoItem}>
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={theme.colors.error.main}
                />
                <Text
                  style={[
                    styles.infoItemText,
                    { color: theme.colors.text.secondary }
                  ]}
                >
                  {item}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Step 1: Password Input */}
        {step === 1 && (
          <View style={styles.formSection}>
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.colors.text.primary }
              ]}
            >
              Devam etmek için şifrenizi girin
            </Text>
            <Input
              label="Şifre"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="Şifrenizi girin"
              rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onRightIconPress={() => setShowPassword(!showPassword)}
            />
          </View>
        )}

        {/* Step 2: Confirmation Text */}
        {step === 2 && (
          <View style={styles.formSection}>
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.colors.text.primary }
              ]}
            >
              Hesabınızı silmek için onaylayın
            </Text>
            <Text
              style={[
                styles.confirmInstruction,
                { color: theme.colors.text.secondary }
              ]}
            >
              Aşağıya <Text style={{ fontWeight: 'bold' }}>"{requiredConfirmText}"</Text> yazın
              {'\n'}Hesabınız kalıcı olarak silinecektir.
            </Text>
            <Input
              label="Onay Metni"
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder={requiredConfirmText}
              autoCapitalize="characters"
            />
            {confirmText && confirmText !== requiredConfirmText && (
              <Text
                style={[
                  styles.errorText,
                  { color: theme.colors.error.main }
                ]}
              >
                Onay metni eşleşmiyor
              </Text>
            )}
          </View>
        )}

        {/* Delete Button */}
        <View style={styles.buttonContainer}>
          <Button
            title={step === 1 ? 'Devam Et' : 'Hesabı Sil'}
            onPress={handleDeleteAccount}
            variant="error"
            loading={loading}
            disabled={
              loading ||
              (step === 1 && !password) ||
              (step === 2 && confirmText !== requiredConfirmText)
            }
            fullWidth
          />
          {step === 2 && (
            <Button
              title="Geri"
              onPress={() => {
                setStep(1);
                setConfirmText('');
              }}
              variant="outline"
              fullWidth
              style={{ marginTop: spacing.md }}
            />
          )}
        </View>

        {/* Help Text */}
        <View style={styles.helpSection}>
          <Ionicons
            name="help-circle-outline"
            size={20}
            color={theme.colors.text.tertiary}
          />
          <Text
            style={[
              styles.helpText,
              { color: theme.colors.text.tertiary }
            ]}
          >
            Hesabınızı silmek istemiyorsanız, lütfen{' '}
            <Text
              style={{ color: theme.colors.primary.main }}
              onPress={() => navigation.navigate('Support')}
            >
              destek ekibi
            </Text>
            {' '}ile iletişime geçin.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  warningCard: {
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    alignItems: 'center',
  },
  warningIconContainer: {
    marginBottom: spacing.md,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  warningText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  infoCard: {
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  infoList: {
    gap: spacing.sm,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoItemText: {
    fontSize: 14,
    flex: 1,
  },
  formSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  confirmInstruction: {
    fontSize: 14,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  errorText: {
    fontSize: 12,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  buttonContainer: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  helpSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.card,
    backgroundColor: 'transparent',
  },
  helpText: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
});

export default DeleteAccountScreen;

