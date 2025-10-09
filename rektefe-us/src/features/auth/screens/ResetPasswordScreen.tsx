import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius, shadows } from '@shared/theme';
import { apiService } from '@shared/services';

type ResetPasswordRouteProp = RouteProp<{ params: { token: string } }, 'params'>;

export default function ResetPasswordScreen() {
  const navigation = useNavigation();
  const route = useRoute<ResetPasswordRouteProp>();
  const { token } = route.params || {};

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!newPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurunuz');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor');
      return;
    }

    if (!token) {
      Alert.alert('Hata', 'Geçersiz sıfırlama linki');
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.resetPassword(token, newPassword);

      if (response.success) {
        Alert.alert(
          'Başarılı',
          'Şifreniz başarıyla değiştirildi. Yeni şifrenizle giriş yapabilirsiniz.',
          [
            {
              text: 'Giriş Yap',
              onPress: () => {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Auth' as never }],
                });
              }
            }
          ]
        );
      } else {
        Alert.alert('Hata', response.message || 'Şifre sıfırlanamadı');
      }
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary.main} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.inverse} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Şifre Sıfırla</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="key" size={48} color={colors.primary.main} />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Yeni Şifre Belirleyin</Text>
        <Text style={styles.subtitle}>
          Hesabınız için yeni ve güçlü bir şifre oluşturun
        </Text>

        {/* New Password Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Yeni Şifre</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.text.tertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="En az 6 karakter"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={colors.text.tertiary}
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color={colors.text.tertiary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Confirm Password Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Yeni Şifre Tekrar</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.text.tertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Şifrenizi tekrar girin"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={colors.text.tertiary}
              editable={!loading}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showConfirmPassword ? 'eye-off' : 'eye'}
                size={20}
                color={colors.text.tertiary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Password Requirements */}
        <View style={styles.requirementsBox}>
          <Text style={styles.requirementsTitle}>Şifre Gereksinimleri:</Text>
          <View style={styles.requirement}>
            <Ionicons
              name={newPassword.length >= 6 ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={newPassword.length >= 6 ? colors.success.main : colors.text.tertiary}
            />
            <Text style={[
              styles.requirementText,
              newPassword.length >= 6 && styles.requirementMet
            ]}>
              En az 6 karakter
            </Text>
          </View>
          <View style={styles.requirement}>
            <Ionicons
              name={newPassword === confirmPassword && newPassword ? 'checkmark-circle' : 'ellipse-outline'}
              size={16}
              color={newPassword === confirmPassword && newPassword ? colors.success.main : colors.text.tertiary}
            />
            <Text style={[
              styles.requirementText,
              newPassword === confirmPassword && newPassword && styles.requirementMet
            ]}>
              Şifreler eşleşiyor
            </Text>
          </View>
        </View>

        {/* Reset Button */}
        <TouchableOpacity
          style={[
            styles.resetButton,
            (!newPassword.trim() || !confirmPassword.trim() || loading) && styles.disabledButton
          ]}
          onPress={handleResetPassword}
          disabled={!newPassword.trim() || !confirmPassword.trim() || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <Text style={styles.resetButtonText}>Şifreyi Sıfırla</Text>
          )}
        </TouchableOpacity>
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
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: '700',
    color: colors.text.inverse,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
  },
  iconContainer: {
    alignSelf: 'center',
    marginBottom: spacing.xl,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary.main + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.h2.fontSize,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.body1.fontSize,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    lineHeight: 22,
  },
  inputContainer: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.secondary,
    paddingHorizontal: spacing.md,
    ...shadows.small,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: typography.body1.fontSize,
    color: colors.text.primary,
  },
  requirementsBox: {
    width: '100%',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  requirementsTitle: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  requirementText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  requirementMet: {
    color: colors.success.main,
  },
  resetButton: {
    width: '100%',
    backgroundColor: colors.primary.main,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.medium,
  },
  resetButtonText: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
