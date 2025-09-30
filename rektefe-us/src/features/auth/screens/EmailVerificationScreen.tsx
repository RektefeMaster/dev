import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius, shadows } from '@/shared/theme';
import apiService from '@/shared/services/api';

type EmailVerificationRouteProp = RouteProp<{ params: { email: string } }, 'params'>;

export default function EmailVerificationScreen() {
  const navigation = useNavigation();
  const route = useRoute<EmailVerificationRouteProp>();
  const { email } = route.params || {};

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(600); // 10 dakika = 600 saniye
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCodeChange = (value: string, index: number) => {
    if (value.length > 1) {
      value = value[0];
    }

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Otomatik sonraki input'a geç
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Tüm kod girildiyse otomatik doğrula
    if (newCode.every(digit => digit !== '') && newCode.join('').length === 6) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (verificationCode?: string) => {
    const codeToVerify = verificationCode || code.join('');
    
    if (codeToVerify.length !== 6) {
      Alert.alert('Hata', 'Lütfen 6 haneli kodu giriniz');
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.verifyEmail(codeToVerify);

      if (response.success) {
        Alert.alert(
          'Başarılı',
          'E-posta adresiniz doğrulandı!',
          [
            {
              text: 'Tamam',
              onPress: () => {
                // Ana ekrana yönlendir
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'MainTabs' as never }],
                });
              }
            }
          ]
        );
      } else {
        Alert.alert('Hata', response.message || 'Doğrulama kodu geçersiz');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Doğrulama sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setResending(true);
      const response = await apiService.sendEmailVerification();

      if (response.success) {
        Alert.alert('Başarılı', 'Yeni doğrulama kodu gönderildi');
        setTimer(600);
        setCanResend(false);
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        Alert.alert('Hata', response.message || 'Kod gönderilemedi');
      }
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Kod gönderilirken hata oluştu');
    } finally {
      setResending(false);
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
        <Text style={styles.headerTitle}>E-posta Doğrulama</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="mail" size={48} color={colors.primary.main} />
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Doğrulama Kodu</Text>
        <Text style={styles.subtitle}>
          {email} adresine gönderilen 6 haneli kodu giriniz
        </Text>

        {/* OTP Input */}
        <View style={styles.otpContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={(ref) => (inputRefs.current[index] = ref)}
              style={[
                styles.otpInput,
                digit && styles.otpInputFilled
              ]}
              value={digit}
              onChangeText={(value) => handleCodeChange(value, index)}
              onKeyPress={(e) => handleKeyPress(e, index)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
              editable={!loading}
            />
          ))}
        </View>

        {/* Timer */}
        <View style={styles.timerContainer}>
          {timer > 0 ? (
            <Text style={styles.timerText}>
              Kod süresi: {formatTime(timer)}
            </Text>
          ) : (
            <Text style={styles.expiredText}>
              Kodun süresi doldu
            </Text>
          )}
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          style={[
            styles.verifyButton,
            (loading || code.some(d => !d)) && styles.disabledButton
          ]}
          onPress={() => handleVerify()}
          disabled={loading || code.some(d => !d)}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <Text style={styles.verifyButtonText}>Doğrula</Text>
          )}
        </TouchableOpacity>

        {/* Resend Code */}
        <TouchableOpacity
          style={[
            styles.resendButton,
            (!canResend || resending) && styles.disabledResendButton
          ]}
          onPress={handleResendCode}
          disabled={!canResend || resending}
          activeOpacity={0.7}
        >
          {resending ? (
            <ActivityIndicator size="small" color={colors.primary.main} />
          ) : (
            <Text style={[
              styles.resendButtonText,
              !canResend && styles.disabledResendButtonText
            ]}>
              Kodu Tekrar Gönder
            </Text>
          )}
        </TouchableOpacity>
      </View>
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
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    lineHeight: 22,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  otpInput: {
    width: 50,
    height: 60,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.background.secondary,
    borderWidth: 2,
    borderColor: colors.border.secondary,
    fontSize: typography.h2.fontSize,
    fontWeight: '700',
    color: colors.text.primary,
    textAlign: 'center',
    ...shadows.small,
  },
  otpInputFilled: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.main + '10',
  },
  timerContainer: {
    marginBottom: spacing.xl,
  },
  timerText: {
    fontSize: typography.body1.fontSize,
    color: colors.primary.main,
    fontWeight: '600',
  },
  expiredText: {
    fontSize: typography.body1.fontSize,
    color: colors.error.main,
    fontWeight: '600',
  },
  verifyButton: {
    width: '100%',
    backgroundColor: colors.primary.main,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.medium,
  },
  disabledButton: {
    opacity: 0.5,
  },
  verifyButtonText: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.inverse,
  },
  resendButton: {
    paddingVertical: spacing.sm,
  },
  disabledResendButton: {
    opacity: 0.5,
  },
  resendButtonText: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.primary.main,
  },
  disabledResendButtonText: {
    color: colors.text.tertiary,
  },
});
