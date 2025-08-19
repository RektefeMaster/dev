import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { theme } from '../components';
import { useAuth } from '../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

const LoginScreen = ({ navigation }: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: '310108124458.apps.googleusercontent.com',
    androidClientId: '509841981751-ohittnea1ssau3e30gg5tltb1emh1g1c.apps.googleusercontent.com',
    webClientId: '509841981751-k21fnh03fhdfr6kc9va2u7ftr7cpne7g.apps.googleusercontent.com',
  });

  const { setTokenAndUserId, token, isAuthenticated } = useAuth();

  // Giriş kontrolü
  useEffect(() => {
    if (token && isAuthenticated) {
      console.log('✅ LoginScreen: Kullanıcı zaten giriş yapmış, Main\'e yönlendiriliyor');
      navigation.replace('Main');
    }
  }, [token, isAuthenticated, navigation]);

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      handleGoogleLogin(authentication?.accessToken);
    }
  }, [response]);

  const handleGoogleLogin = async (accessToken: string | undefined) => {
    if (!accessToken) {
      Alert.alert('Hata', 'Google girişi başarısız oldu.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      });
      const data = await response.json();
      if (response.ok) {
        console.log('🔍 LoginScreen: Google backend response:', data);
        
        // Backend response formatı: { success: true, data: { userId, token } }
        const userId = data.data?.userId || data.userId;
        const token = data.data?.token || data.token;
        
        console.log('🔍 LoginScreen: Google extracted userId:', userId);
        console.log('🔍 LoginScreen: Google extracted token:', !!token);
        
        if (userId && token) {
          await setTokenAndUserId(token, userId);
          if (data.data?.refreshToken || data.refreshToken) {
            await AsyncStorage.setItem('refreshToken', data.data?.refreshToken || data.refreshToken);
          }
          console.log('LOGIN SCREEN - TOKEN:', token);
          console.log('LOGIN SCREEN - USERID:', userId);
          
          // Token kaydedildikten sonra navigation yap
          setTimeout(() => {
            Alert.alert('Başarılı', 'Google ile giriş başarılı!');
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            });
          }, 100);
        } else {
          console.log('⚠️ LoginScreen: Google userId veya token bulunamadı');
          Alert.alert('Hata', 'Google token bilgileri alınamadı!');
        }
      } else {
        Alert.alert('Hata', data.message || 'Google ile giriş başarısız oldu.');
      }
    } catch (error) {
      console.log('Google Login Hatası:', error);
      Alert.alert('Hata', 'Sunucuya bağlanılamadı.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    try {
      console.log('API_URL:', API_URL);
      console.log('LOGIN SCREEN - API_URL değeri:', API_URL);
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (response.ok) {
        console.log('🔍 LoginScreen: Backend response:', data);
        
        // Backend response formatı: { success: true, data: { userId, token } }
        const userId = data.data?.userId || data.userId;
        const token = data.data?.token || data.token;
        
        console.log('🔍 LoginScreen: Extracted userId:', userId);
        console.log('🔍 LoginScreen: Extracted token:', !!token);
        
        if (userId && token) {
          console.log('🔧 LoginScreen: setTokenAndUserId çağrılıyor:', { userId, token: !!token });
          await setTokenAndUserId(token, userId);
          console.log('✅ LoginScreen: Token ve userId kaydedildi');
          setFailedAttempts(0);
          
          // Token kaydedildikten sonra navigation yap
          setTimeout(() => {
            Alert.alert('Başarılı', 'Giriş başarılı!');
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            });
          }, 100);
        } else {
          console.log('⚠️ LoginScreen: userId veya token bulunamadı');
          Alert.alert('Hata', 'Token bilgileri alınamadı!');
        }
      } else if (data && data.message) {
        const newFailedAttempts = failedAttempts + 1;
        setFailedAttempts(newFailedAttempts);
        console.log('LoginScreen: Hatalı giriş, mesaj:', data.message);
        if (newFailedAttempts >= 3) {
          Alert.alert(
            'Çok Fazla Başarısız Deneme',
            'Şifrenizi yenilemek ister misiniz?',
            [
              { text: 'Hayır', style: 'cancel' },
              { text: 'Evet', onPress: () => navigation.navigate('ForgotPassword') },
            ]
          );
        } else {
          Alert.alert('Hata', data.message);
        }
      } else {
        Alert.alert('Hata', 'Giriş başarısız!');
      }
    } catch (error) {
      console.log('Login Hatası:', error);
      Alert.alert('Hata', 'Sunucuya bağlanılamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentContainerStyle={{padding: 20, paddingBottom: 100}} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Giriş Yap</Text>
        <TextInput
          style={styles.input}
          placeholder="E-posta"
          placeholderTextColor="#aaa"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.inputPassword}
            placeholder="Şifre"
            placeholderTextColor="#aaa"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={secure}
            textContentType="username"
            autoComplete="off"
            autoCorrect={false}
            spellCheck={false}
          />
          <TouchableOpacity onPress={() => setSecure(!secure)}>
            <Ionicons name={secure ? 'eye-off' : 'eye'} size={22} color="#aaa" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.forgot} onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={styles.forgotText}>Şifremi Unuttum?</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}</Text>
        </TouchableOpacity>
        <View style={styles.altContainer}>
          <Text style={styles.altText}>veya ile giriş yap</Text>
          <View style={styles.socialRow}>
            <TouchableOpacity 
              style={styles.socialButton}
              onPress={() => promptAsync()}
              disabled={!request}
            >
              <Ionicons name="logo-google" size={22} color="#EA4335" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <Ionicons name="logo-apple" size={22} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialButton}>
              <Ionicons name="call" size={22} color="#34C759" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.bottomRow}>
          <Text style={styles.bottomText}>Hesabın yok mu?</Text>
          <TouchableOpacity onPress={() => navigation.replace('Register')}>
            <Text style={styles.bottomLink}> Kayıt Ol</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'center',
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    color: '#222',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginBottom: 8,
    paddingRight: 12,
  },
  inputPassword: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#222',
  },
  forgot: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  buttonText: {
    color: theme.colors.primary.contrast,
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
  },
  altContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  altText: {
    color: '#888',
    marginBottom: 8,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  socialButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 50,
    padding: 12,
    marginHorizontal: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 12,
  },
  bottomText: {
    color: '#888',
  },
  bottomLink: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
});

export default LoginScreen; 