import { Ionicons } from '@expo/vector-icons';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Input } from '../components';
import { useAuth } from '../context/AuthContext';
import { borderRadius, colors, shadows, spacing, typography } from '../theme/theme';

export default function AuthScreen({ navigation }: any) {
  const { login, register, isAuthenticated } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  // Eğer kullanıcı zaten authenticated ise ana ekrana yönlendir
  useEffect(() => {
    if (isAuthenticated) {
      navigation.replace('Main');
    }
  }, [isAuthenticated, navigation]);
  
  
  // Form states
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    surname: '',
    phone: '',
  });


  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };


  const validateForm = () => {
    if (!formData.email || !formData.password) {
      Alert.alert('Hata', 'E-posta ve şifre gereklidir');
      return false;
    }

    if (!isLogin) {
      if (!formData.name || !formData.surname || !formData.phone) {
        Alert.alert('Hata', 'Tüm alanlar gereklidir');
        return false;
      }
      
      if (formData.password !== formData.confirmPassword) {
        Alert.alert('Hata', 'Şifreler eşleşmiyor');
        return false;
      }
      
      if (formData.password.length < 6) {
        Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır');
        return false;
      }

    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      if (isLogin) {
        const response = await login(formData.email, formData.password);
        if (response.success) {
          // Navigation otomatik olarak AppNavigator tarafından yapılacak
          console.log('✅ Login başarılı, navigation otomatik yapılacak');
        } else {
          Alert.alert('Hata', response.message || 'Giriş başarısız');
        }
      } else {
        const response = await register({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          surname: formData.surname,
          phone: formData.phone,
          userType: 'driver' // Şoför uygulamasından kayıt olanlar driver olarak kaydedilir
        });
        
        if (response.success) {
          Alert.alert('Başarılı', 'Hesabınız oluşturuldu. Giriş yapabilirsiniz.');
          setIsLogin(true);
          setFormData({
            email: '',
            password: '',
            confirmPassword: '',
            name: '',
            surname: '',
            phone: '',
          });
          // Navigation otomatik olarak AppNavigator tarafından yapılacak
          console.log('✅ Register başarılı, login ekranına geçiliyor');
        } else {
          Alert.alert('Hata', response.message || 'Kayıt başarısız');
        }
      }
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    Alert.alert('Bilgi', 'Google ile giriş özelliği yakında eklenecek');
  };

  const handleAppleLogin = () => {
    Alert.alert('Bilgi', 'Apple ile giriş özelliği yakında eklenecek');
  };

  const handlePhoneLogin = () => {
    Alert.alert('Bilgi', 'Telefon numarası ile giriş özelliği yakında eklenecek');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.primary} />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {isLogin ? 'Hoş Geldiniz' : 'Hesap Oluştur'}
            </Text>
            <Text style={styles.subtitle}>
              {isLogin 
                ? 'Hesabınıza giriş yapın' 
                : 'Yeni hesap oluşturun'
              }
            </Text>
          </View>

          {/* Form Card */}
          <Card variant="elevated" style={styles.formCard}>
            {/* Toggle Buttons */}
            <View style={styles.toggleContainer}>
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  isLogin && styles.activeToggleButton
                ]}
                onPress={() => setIsLogin(true)}
              >
                <Text style={[
                  styles.toggleText,
                  isLogin && styles.activeToggleText
                ]}>
                  Giriş Yap
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.toggleButton,
                  !isLogin && styles.activeToggleButton
                ]}
                onPress={() => setIsLogin(false)}
              >
                <Text style={[
                  styles.toggleText,
                  !isLogin && styles.activeToggleText
                ]}>
                  Kayıt Ol
                </Text>
              </TouchableOpacity>
            </View>

            {/* Form Fields */}
            {!isLogin && (
              <>
                <Input
                  label="Ad"
                  placeholder="Adınızı giriniz"
                  value={formData.name}
                  onChangeText={(text) => handleInputChange('name', text)}
                  leftIcon="person"
                />
                
                <Input
                  label="Soyad"
                  placeholder="Soyadınızı giriniz"
                  value={formData.surname}
                  onChangeText={(text) => handleInputChange('surname', text)}
                  leftIcon="person"
                />
                
                <Input
                  label="Telefon"
                  placeholder="Telefon numaranızı giriniz"
                  value={formData.phone}
                  onChangeText={(text) => handleInputChange('phone', text)}
                  leftIcon="call"
                  keyboardType="phone-pad"
                />
              </>
            )}

            <Input
              label="E-posta"
              placeholder="E-postanızı giriniz"
              value={formData.email}
              onChangeText={(text) => handleInputChange('email', text)}
              leftIcon="mail"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              label="Şifre"
              placeholder="Şifrenizi giriniz"
              value={formData.password}
              onChangeText={(text) => handleInputChange('password', text)}
              leftIcon="lock-closed"
              secureTextEntry
            />

            {!isLogin && (
              <Input
                label="Şifre Tekrar"
                placeholder="Şifrenizi tekrar giriniz"
                value={formData.confirmPassword}
                onChangeText={(text) => handleInputChange('confirmPassword', text)}
                leftIcon="lock-closed"
                secureTextEntry
              />
            )}


            {/* Submit Button */}
            <Button
              title={isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
              onPress={handleSubmit}
              loading={loading}
              fullWidth
              style={styles.submitButton}
            />

            {/* Social Login Buttons */}
            {isLogin && (
              <>
                <View style={styles.dividerContainer}>
                  <View style={styles.divider} />
                  <Text style={styles.dividerText}>veya</Text>
                  <View style={styles.divider} />
                </View>

                {/* Google Login */}
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={handleGoogleLogin}
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-google" size={20} color="#DB4437" />
                  <Text style={styles.socialButtonText}>Google ile Giriş Yap</Text>
                </TouchableOpacity>

                {/* Apple Login */}
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={handleAppleLogin}
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-apple" size={20} color="#000000" />
                  <Text style={styles.socialButtonText}>Apple ile Giriş Yap</Text>
                </TouchableOpacity>

                {/* Phone Login */}
                <TouchableOpacity
                  style={styles.socialButton}
                  onPress={handlePhoneLogin}
                  activeOpacity={0.8}
                >
                  <Ionicons name="call" size={20} color={colors.primary.main} />
                  <Text style={styles.socialButtonText}>Telefon ile Giriş Yap</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Forgot Password */}
            {isLogin && (
              <TouchableOpacity style={styles.forgotPasswordButton}>
                <Text style={styles.forgotPasswordText}>
                  Şifremi Unuttum
                </Text>
              </TouchableOpacity>
            )}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    marginBottom: spacing.xxl,
  },
  title: {
    fontSize: typography.h1.fontSize,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.body1.fontSize,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  formCard: {
    padding: spacing.lg,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  activeToggleButton: {
    backgroundColor: colors.background.primary,
    ...shadows.small,
  },
  toggleText: {
    fontSize: typography.button.medium.fontSize,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  activeToggleText: {
    color: colors.text.primary,
  },
  submitButton: {
    marginTop: spacing.lg,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.secondary,
  },
  dividerText: {
    marginHorizontal: spacing.md,
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.card,
    borderWidth: 1,
    borderColor: colors.border.primary,
    borderRadius: borderRadius.input,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.small,
  },
  socialButtonText: {
    marginLeft: spacing.sm,
    fontSize: typography.button.medium.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
  },
  forgotPasswordButton: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  forgotPasswordText: {
    fontSize: typography.body2.fontSize,
    color: colors.primary.main,
    fontWeight: '600',
  },
  
});
