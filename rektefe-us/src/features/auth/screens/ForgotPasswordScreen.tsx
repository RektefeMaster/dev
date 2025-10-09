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
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius, shadows } from '@shared/theme';
import { apiService } from '@shared/services';

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendResetLink = async () => {
    if (!email.trim()) {
      Alert.alert('Hata', 'Lütfen e-posta adresinizi giriniz');
      return;
    }

    // E-posta formatı kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Hata', 'Geçerli bir e-posta adresi giriniz');
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.forgotPassword(email);

      if (response.success) {
        Alert.alert(
          'E-posta Gönderildi',
          'Eğer bu e-posta kayıtlıysa, şifre sıfırlama linki gönderildi. Lütfen e-postanızı kontrol edin.',
          [
            {
              text: 'Tamam',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        Alert.alert('Hata', response.message || 'E-posta gönderilemedi');
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
        <Text style={styles.headerTitle}>Şifremi Unuttum</Text>
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
            <Ionicons name="lock-closed" size={48} color={colors.primary.main} />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Şifrenizi mi unuttunuz?</Text>
        <Text style={styles.subtitle}>
          E-posta adresinizi girin, size şifre sıfırlama linki gönderelim
        </Text>

        {/* Email Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>E-posta Adresi</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color={colors.text.tertiary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="ornek@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={colors.text.tertiary}
              editable={!loading}
            />
          </View>
        </View>

        {/* Send Button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!email.trim() || loading) && styles.disabledButton
          ]}
          onPress={handleSendResetLink}
          disabled={!email.trim() || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <>
              <Ionicons name="send" size={20} color={colors.text.inverse} style={styles.buttonIcon} />
              <Text style={styles.sendButtonText}>Sıfırlama Linki Gönder</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Info */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={20} color={colors.info.main} style={styles.infoIcon} />
          <Text style={styles.infoText}>
            E-posta adresinize şifre sıfırlama linki gönderilecektir. Link 1 saat geçerlidir.
          </Text>
        </View>
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
    alignItems: 'center',
  },
  iconContainer: {
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
    marginBottom: spacing.xl,
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
  sendButton: {
    width: '100%',
    backgroundColor: colors.primary.main,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.medium,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonIcon: {
    marginRight: spacing.sm,
  },
  sendButtonText: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.info.main + '10',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.info.main + '30',
  },
  infoIcon: {
    marginRight: spacing.sm,
    marginTop: 2,
  },
  infoText: {
    flex: 1,
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    lineHeight: 20,
  },
});
