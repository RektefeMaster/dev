import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { registerMechanic, saveToken } from '../../services/auth';
import { COLORS, SIZES } from '../../constants/config';

export default function RegisterScreen() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  // Sadece e-posta ve şifre için form verisi
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    if (!formData.email || !formData.password || !formData.confirmPassword) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
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
    return true;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      // Sadece email ve password ile registerMechanic fonksiyonunu çağır
      const response = await registerMechanic({
        email: formData.email,
        password: formData.password,
      });
      const token = response.token;
      const userId = response.user?._id || response.userId || response.mechanic?._id;
      if (token && userId) {
        await saveToken(token, userId);
        await login(token, userId);
        router.replace('/(tabs)');
      } else {
        Alert.alert('Kayıt Hatası', 'Kayıt başarılı oldu ama kullanıcı bilgisi alınamadı.');
      }
    } catch (error: any) {
      Alert.alert(
        'Kayıt Hatası',
        error.response?.data?.message || 'Kayıt olurken bir hata oluştu'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={[COLORS.primary, COLORS.secondary]}
      style={styles.container}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={24}
                color={COLORS.surface}
              />
            </TouchableOpacity>
            <Text style={styles.title}>Kayıt Ol</Text>
            <Text style={styles.subtitle}>Sadece e-posta ve şifre ile kayıt olun</Text>
          </View>
          <View style={styles.formContainer}>
            <TextInput
              label="E-posta"
              value={formData.email}
              onChangeText={(text) => updateFormData('email', text)}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              left={<TextInput.Icon icon="email" />}
              style={styles.input}
            />
            <TextInput
              label="Şifre"
              value={formData.password}
              onChangeText={(text) => updateFormData('password', text)}
              mode="outlined"
              secureTextEntry
              left={<TextInput.Icon icon="lock" />}
              style={styles.input}
            />
            <TextInput
              label="Şifre Tekrar"
              value={formData.confirmPassword}
              onChangeText={(text) => updateFormData('confirmPassword', text)}
              mode="outlined"
              secureTextEntry
              left={<TextInput.Icon icon="lock-check" />}
              style={styles.input}
            />
            <Button
              mode="contained"
              onPress={handleRegister}
              loading={loading}
              disabled={loading}
              style={styles.registerButton}
            >
              Kayıt Ol
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SIZES.padding,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 0,
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.surface,
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.surface,
    opacity: 0.8,
    marginTop: 8,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radius,
    padding: SIZES.padding,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  input: {
    marginBottom: 16,
    backgroundColor: COLORS.surface,
  },
  registerButton: {
    marginTop: 8,
  },
}); 