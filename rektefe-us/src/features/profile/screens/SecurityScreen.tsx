import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSettings } from '@/shared/context/SettingsContext';
import { useAuth } from '@/shared/context';
import apiService from '@/shared/services/api';
import { colors, typography, spacing, borderRadius, shadows } from '@/shared/theme';
import { BackButton } from '@/shared/components';

export default function SecurityScreen() {
  const { changePassword } = useSettings();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [emailData, setEmailData] = useState({
    newEmail: '',
  });

  const handleChangePassword = async () => {
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      Alert.alert('Hata', 'Tüm alanları doldurun');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert('Hata', 'Yeni şifreler eşleşmiyor');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır');
      return;
    }

    try {
      setLoading(true);
      await changePassword(passwordData.currentPassword, passwordData.newPassword);
      Alert.alert('Başarılı', 'Şifreniz başarıyla değiştirildi');
      setShowChangePassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Şifre değiştirilemedi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary.main} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <BackButton />
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>Güvenlik</Text>
              <Text style={styles.headerSubtitle}>Hesap güvenliği ayarlarınızı yönetin</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Şifre Değiştir */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Şifre Değiştir</Text>
          <View style={styles.settingsCard}>
            {!showChangePassword ? (
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => setShowChangePassword(true)}
                activeOpacity={0.7}
              >
                <View style={styles.settingLeft}>
                  <View style={styles.settingIconContainer}>
                    <Ionicons name="key" size={22} color={colors.primary.main} />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>Şifre Değiştir</Text>
                    <Text style={styles.settingSubtitle}>Hesap şifrenizi güncelleyin</Text>
                  </View>
                </View>
                <View style={styles.chevronContainer}>
                  <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.passwordForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Mevcut Şifre</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Mevcut şifrenizi girin"
                    secureTextEntry
                    value={passwordData.currentPassword}
                    onChangeText={(text) => setPasswordData(prev => ({ ...prev, currentPassword: text }))}
                    placeholderTextColor={colors.text.tertiary}
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Yeni Şifre</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Yeni şifrenizi girin"
                    secureTextEntry
                    value={passwordData.newPassword}
                    onChangeText={(text) => setPasswordData(prev => ({ ...prev, newPassword: text }))}
                    placeholderTextColor={colors.text.tertiary}
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Yeni Şifreyi Onayla</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Yeni şifrenizi tekrar girin"
                    secureTextEntry
                    value={passwordData.confirmPassword}
                    onChangeText={(text) => setPasswordData(prev => ({ ...prev, confirmPassword: text }))}
                    placeholderTextColor={colors.text.tertiary}
                  />
                </View>
                
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowChangePassword(false);
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    }}
                    activeOpacity={0.8}
                    disabled={loading}
                  >
                    <Text style={styles.cancelButtonText}>İptal</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleChangePassword}
                    activeOpacity={0.8}
                    disabled={loading}
                  >
                    <Text style={styles.saveButtonText}>
                      {loading ? 'Değiştiriliyor...' : 'Şifreyi Değiştir'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* E-posta Değiştir */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>E-posta Değiştir</Text>
          <View style={styles.settingsCard}>
            {!showChangeEmail ? (
              <TouchableOpacity
                style={styles.settingItem}
                onPress={() => setShowChangeEmail(true)}
                activeOpacity={0.7}
              >
                <View style={styles.settingLeft}>
                  <View style={styles.settingIconContainer}>
                    <Ionicons name="mail" size={22} color={colors.primary.main} />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={styles.settingTitle}>E-posta Değiştir</Text>
                    <Text style={styles.settingSubtitle}>Mevcut: {user?.email}</Text>
                  </View>
                </View>
                <View style={styles.chevronContainer}>
                  <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
                </View>
              </TouchableOpacity>
            ) : (
              <View style={styles.passwordForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Yeni E-posta</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Yeni e-posta adresinizi girin"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={emailData.newEmail}
                    onChangeText={(text) => setEmailData({ newEmail: text })}
                    placeholderTextColor={colors.text.tertiary}
                  />
                </View>
                
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowChangeEmail(false);
                      setEmailData({ newEmail: '' });
                    }}
                    activeOpacity={0.8}
                    disabled={loading}
                  >
                    <Text style={styles.cancelButtonText}>İptal</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.saveButton}
                    onPress={async () => {
                      if (!emailData.newEmail) {
                        Alert.alert('Hata', 'Yeni e-posta adresini girin');
                        return;
                      }

                      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                      if (!emailRegex.test(emailData.newEmail)) {
                        Alert.alert('Hata', 'Geçerli bir e-posta adresi girin');
                        return;
                      }

                      try {
                        setLoading(true);
                        const response = await apiService.changeEmail(emailData.newEmail);
                        
                        if (response.success) {
                          Alert.alert(
                            'Başarılı', 
                            'Yeni e-posta adresinize onay linki gönderildi. Lütfen e-postanızı kontrol edin.'
                          );
                          setShowChangeEmail(false);
                          setEmailData({ newEmail: '' });
                        } else {
                          Alert.alert('Hata', response.message || 'E-posta değiştirilemedi');
                        }
                      } catch (error: any) {
                        Alert.alert('Hata', error.message || 'E-posta değiştirilirken hata oluştu');
                      } finally {
                        setLoading(false);
                      }
                    }}
                    activeOpacity={0.8}
                    disabled={loading}
                  >
                    <Text style={styles.saveButtonText}>
                      {loading ? 'Gönderiliyor...' : 'Onay Linki Gönder'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Güvenlik İpuçları */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Güvenlik İpuçları</Text>
          <View style={styles.tipsCard}>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary.main} />
              <Text style={styles.tipText}>Güçlü bir şifre kullanın (en az 6 karakter)</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary.main} />
              <Text style={styles.tipText}>Şifrenizi düzenli olarak değiştirin</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary.main} />
              <Text style={styles.tipText}>E-posta adresinizi güncel tutun</Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary.main} />
              <Text style={styles.tipText}>Şüpheli aktiviteleri hemen bildirin</Text>
            </View>
          </View>
        </View>

        {/* Alt Boşluk */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    backgroundColor: colors.primary.main,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  headerContent: {
    flex: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  headerTitle: {
    fontSize: typography.h1.fontSize,
    fontWeight: '700',
    color: colors.text.inverse,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.body2.fontSize,
    color: colors.text.inverse,
    opacity: 0.9,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.h4.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  settingsCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.sm,
    ...shadows.medium,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    marginVertical: spacing.xs,
    backgroundColor: colors.background.primary,
    ...shadows.small,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary.main + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  settingSubtitle: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  chevronContainer: {
    paddingLeft: spacing.sm,
    paddingRight: spacing.xs,
  },
  passwordForm: {
    padding: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.body2.fontSize,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.body1.fontSize,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  cancelButtonText: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary.main,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    marginLeft: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },
  saveButtonText: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  tipsCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    ...shadows.medium,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  tipText: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.body2.fontSize,
    color: colors.text.primary,
    lineHeight: 20,
  },
  bottomSpacing: {
    height: spacing.xl * 2,
  },
});