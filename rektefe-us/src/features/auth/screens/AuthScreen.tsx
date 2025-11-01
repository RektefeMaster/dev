import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { RootStackParamList } from '@shared/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import { typography, spacing, borderRadius, shadows, dimensions } from '@shared/theme';
import { Button, Input, Card } from '@shared/components';
import { useAuth } from '@/shared/context';
import { useTheme } from '@shared/context';
import { STORAGE_KEYS } from '@/constants/config';

const { width, height } = Dimensions.get('window');

export default function AuthScreen() {
  const navigation = useNavigation<any>();
  const { login, register } = useAuth();
  const { themeColors: colors } = useTheme();
  const styles = createStyles(colors);
  
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    surname: '',
    phone: '',
  });

  // Service categories state
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  // Location state
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    city?: string;
    district?: string;
  } | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Otomatik konum alma fonksiyonu
  const getCurrentLocation = async () => {
    try {
      // Konum izni iste
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return null;
      }

      // Mevcut konumu al
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Reverse geocoding ile adres bilgilerini al
      const addressResponse = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (addressResponse.length > 0) {
        const address = addressResponse[0];
        const locationData = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          city: address.city || '',
          district: address.district || '',
        };
        
        setUserLocation(locationData);
        return locationData;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };

  // Service categories data
  const serviceCategories = [
    {
      id: 'towing',
      title: 'Çekici Hizmeti',
      icon: 'car',
      color: '#EF4444',
      description: 'Acil kurtarma hizmetleri'
    },
    {
      id: 'repair',
      title: 'Tamir & Bakım',
      icon: 'construct',
      color: '#3B82F6',
      description: 'Arıza tespit ve onarım'
    },
    {
      id: 'wash',
      title: 'Yıkama Hizmeti',
      icon: 'water',
      color: '#10B981',
      description: 'Araç temizlik hizmetleri'
    },
    {
      id: 'tire',
      title: 'Lastik & Parça',
      icon: 'car',
      color: '#F59E0B',
      description: 'Lastik ve yedek parça'
    },
    {
      id: 'bodywork',
      title: 'Kaporta & Boya',
      icon: 'brush',
      color: '#8B5CF6',
      description: 'Kaporta düzeltme ve boya'
    },
    {
      id: 'electrical',
      title: 'Elektrik & Elektronik',
      icon: 'flask',
      color: '#F97316',
      description: 'Elektrik ve elektronik arızalar'
    },
    {
      id: 'parts',
      title: 'Yedek Parça',
      icon: 'settings',
      color: '#6366F1',
      description: 'Yedek parça satış ve montaj'
    }
  ];

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      Alert.alert('Hata', 'E-posta ve şifre gereklidir');
      return false;
    }

    // Email format kontrolü
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Hata', 'Geçerli bir e-posta adresi giriniz');
      return false;
    }

    if (!isLogin) {
      if (!formData.name || !formData.surname || !formData.phone) {
        Alert.alert('Hata', 'Tüm alanlar gereklidir');
        return false;
      }
      
      // Telefon numarası kontrolü (en az 10 karakter)
      if (formData.phone.length < 10) {
        Alert.alert('Hata', 'Geçerli bir telefon numarası giriniz');
        return false;
      }
      
      if (selectedCategories.length === 0) {
        Alert.alert('Hata', 'En az bir hizmet kategorisi seçmelisiniz');
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
          navigation.navigate('Main');
        } else {
          Alert.alert('Hata', response.message || 'Giriş başarısız');
        }
      } else {
        // Register işleminde otomatik konum al
        const locationData = await getCurrentLocation();
        
        // Location verisini backend formatına çevir
        const locationPayload = locationData ? {
          city: locationData.city || '',
          district: locationData.district || '',
          neighborhood: '',
          street: '',
          building: '',
          floor: '',
          apartment: '',
          coordinates: {
            latitude: locationData.latitude,
            longitude: locationData.longitude
          }
        } : undefined;
        
        const response = await register({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          surname: formData.surname,
          phone: formData.phone,
          userType: 'mechanic',
          serviceCategories: selectedCategories,
          location: locationPayload,
        });
        
        if (response.success) {
          // Kayıt başarılı - Test için direkt ana ekrana yönlendir (email doğrulama devre dışı)
          // TODO: Email doğrulama aktif edildiğinde EmailVerification ekranına yönlendirilecek
          navigation.navigate('Main');
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

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
                  placeholder="Adınızı girin"
                  value={formData.name}
                  onChangeText={(text) => handleInputChange('name', text)}
                  leftIcon="person"
                />
                
                <Input
                  label="Soyad"
                  placeholder="Soyadınızı girin"
                  value={formData.surname}
                  onChangeText={(text) => handleInputChange('surname', text)}
                  leftIcon="person"
                />
                
                <Input
                  label="Telefon"
                  placeholder="Telefon numaranızı girin"
                  value={formData.phone}
                  onChangeText={(text) => handleInputChange('phone', text)}
                  leftIcon="call"
                  keyboardType="phone-pad"
                />
              </>
            )}

            <Input
              label="E-posta"
              placeholder="E-posta adresinizi girin"
              value={formData.email}
              onChangeText={(text) => handleInputChange('email', text)}
              leftIcon="mail"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Input
              label="Şifre"
              placeholder="Şifrenizi girin"
              value={formData.password}
              onChangeText={(text) => handleInputChange('password', text)}
              leftIcon="lock-closed"
              secureTextEntry
            />

            {!isLogin && (
              <Input
                label="Şifre Tekrar"
                placeholder="Şifrenizi tekrar girin"
                value={formData.confirmPassword}
                onChangeText={(text) => handleInputChange('confirmPassword', text)}
                leftIcon="lock-closed"
                secureTextEntry
              />
            )}

            {/* Service Categories Selection - Only for Registration */}
            {!isLogin && (
              <View style={styles.categoriesSection}>
                <Text style={styles.categoriesTitle}>Hizmet Kategorileri</Text>
                <Text style={styles.categoriesSubtitle}>
                  Hangi hizmetleri sunabileceğinizi seçin (en az 1)
                </Text>
                
                <View style={styles.categoriesGrid}>
                  {serviceCategories.map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      style={[
                        styles.categoryCard,
                        selectedCategories.includes(category.id) && styles.selectedCategoryCard,
                        { borderColor: category.color }
                      ]}
                      onPress={() => handleCategoryToggle(category.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[
                        styles.categoryIcon,
                        { backgroundColor: selectedCategories.includes(category.id) ? category.color : colors.background.secondary }
                      ]}>
                        <Ionicons 
                          name={category.icon as any} 
                          size={24} 
                          color={selectedCategories.includes(category.id) ? '#FFFFFF' : category.color} 
                        />
                      </View>
                      <Text style={[
                        styles.categoryTitle,
                        selectedCategories.includes(category.id) && styles.selectedCategoryTitle
                      ]}>
                        {category.title}
                      </Text>
                      <Text style={[
                        styles.categoryDescription,
                        selectedCategories.includes(category.id) && styles.selectedCategoryDescription
                      ]}>
                        {category.description}
                      </Text>
                      {selectedCategories.includes(category.id) && (
                        <View style={styles.checkmark}>
                          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Submit Button */}
            <Button
              title={isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
              onPress={handleSubmit}
              loading={loading}
              fullWidth
              style={styles.submitButton}
            />

            {/* Forgot Password */}
            {isLogin && (
              <TouchableOpacity 
                style={styles.forgotPasswordButton}
                onPress={() => navigation.navigate('ForgotPassword')}
                activeOpacity={0.7}
              >
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

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: dimensions.screenPadding,
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
  forgotPasswordButton: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  forgotPasswordText: {
    fontSize: typography.body2.fontSize,
    color: colors.primary,
    fontWeight: '600',
  },
  // Service Categories Styles
  categoriesSection: {
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  categoriesTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  categoriesSubtitle: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoryCard: {
    width: '48%',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.border.secondary,
    position: 'relative',
    alignItems: 'center',
    minHeight: 120,
  },
  selectedCategoryCard: {
    backgroundColor: colors.primary.ultraLight,
    borderColor: colors.primary,
    ...shadows.small,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  categoryTitle: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  selectedCategoryTitle: {
    color: colors.primary,
  },
  categoryDescription: {
    fontSize: typography.caption.large.fontSize,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  selectedCategoryDescription: {
    color: colors.text.primary,
  },
  checkmark: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// styles will be created inside component
