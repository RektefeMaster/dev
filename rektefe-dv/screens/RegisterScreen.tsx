import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useAuth } from '../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

const RegisterScreen = ({ navigation }: any) => {
  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [secure, setSecure] = useState(true);
  const [secure2, setSecure2] = useState(true);
  const [loading, setLoading] = useState(false);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: '310108124458.apps.googleusercontent.com',
    androidClientId: '509841981751-ohittnea1ssau3e30gg5tltb1emh1g1c.apps.googleusercontent.com',
    webClientId: '509841981751-k21fnh03fhdfr6kc9va2u7ftr7cpne7g.apps.googleusercontent.com',
  });

  const { setTokenAndUserId, token, isAuthenticated } = useAuth();

  // Giriş kontrolü
  useEffect(() => {
    if (token && isAuthenticated) {
      console.log('✅ RegisterScreen: Kullanıcı zaten giriş yapmış, Main\'e yönlendiriliyor');
      navigation.replace('Main');
    }
  }, [token, isAuthenticated, navigation]);

  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      handleGoogleRegister(authentication?.accessToken);
    }
  }, [response]);

  const handleGoogleRegister = async (accessToken: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/google-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          accessToken,
          userType: 'driver' // Şöför uygulaması olduğu için driver
        }),
      });
      const data = await response.json();
      console.log('Backend yanıtı:', data);
      if (response.ok) {
        if (data.data?.userId && data.data?.token) {
          console.log('🔧 RegisterScreen: setTokenAndUserId çağrılıyor:', { userId: data.data.userId, token: !!data.data.token });
          await setTokenAndUserId(data.data.token, data.data.userId);
          
          // Refresh token'ı da kaydet
          if (data.data?.refreshToken) {
            await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.data.refreshToken);
            console.log('✅ RegisterScreen: Google refresh token kaydedildi');
          }
          
          console.log('✅ RegisterScreen: Token ve userId kaydedildi');
          
          // Token kaydedildikten sonra navigation yap
          setTimeout(() => {
            Alert.alert('Başarılı', 'Google ile kayıt başarılı!');
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            });
          }, 100);
        } else {
          Alert.alert('Hata', 'Google kayıt bilgileri alınamadı.');
        }
      } else {
        Alert.alert('Hata', data.message || 'Google ile kayıt başarısız oldu.');
      }
    } catch (error) {
      console.log('Google Register Hatası:', error);
      Alert.alert('Hata', 'Sunucuya bağlanılamadı.');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setUploading(true);
      const formData = new FormData();
      const uri = result.assets[0].uri;
      const filename = uri.split('/').pop() || 'photo.jpg';
      const match = /\.([a-zA-Z0-9]+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;
      formData.append('image', { uri, name: filename, type } as any);
      try {
        const res = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'multipart/form-data' },
          body: formData,
        });
        const data = await res.json();
        let url = data.url;
        if (!url.startsWith('http')) url = `${API_URL.replace('/api','')}${url}`;
        setAvatar(url);
      } catch (e) {
        Alert.alert('Hata', 'Fotoğraf yüklenemedi.');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleRegister = async () => {
    if (!name || !surname || !email || !password || !password2) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
      return;
    }
    if (password !== password2) {
      Alert.alert('Hata', 'Şifreler uyuşmuyor.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          surname,
          email,
          password,
        }),
      });
      const data = await response.json();
      console.log('Backend yanıtı:', data);
      if (response.ok) {
        if (data.userId && data.token) {
          console.log('🔧 RegisterScreen: setTokenAndUserId çağrılıyor:', { userId: data.userId, token: !!data.token });
          await setTokenAndUserId(data.token, data.userId);
          console.log('✅ RegisterScreen: Token ve userId kaydedildi');
          
          // Token kaydedildikten sonra navigation yap
          setTimeout(() => {
            Alert.alert('Başarılı', 'Kayıt başarılı!');
            navigation.reset({
              index: 0,
              routes: [{ name: 'Main' }],
            });
          }, 100);
        }
      } else {
        Alert.alert('Hata', data.message || 'Kayıt başarısız!');
      }
    } catch (error) {
      Alert.alert('Hata', 'Sunucuya bağlanılamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentContainerStyle={{padding: 20, paddingBottom: 100}} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Kayıt Ol</Text>
        <TextInput
          style={styles.input}
          placeholder="Ad"
          placeholderTextColor="#aaa"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Soyad"
          placeholderTextColor="#aaa"
          value={surname}
          onChangeText={setSurname}
        />
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
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.inputPassword}
            placeholder="Şifre Tekrar"
            placeholderTextColor="#aaa"
            value={password2}
            onChangeText={setPassword2}
            secureTextEntry={secure2}
            textContentType="username"
            autoComplete="off"
            autoCorrect={false}
            spellCheck={false}
          />
          <TouchableOpacity onPress={() => setSecure2(!secure2)}>
            <Ionicons name={secure2 ? 'eye-off' : 'eye'} size={22} color="#aaa" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'Kayıt Yapılıyor...' : 'Kayıt Ol'}</Text>
        </TouchableOpacity>
        <View style={styles.altContainer}>
          <Text style={styles.altText}>veya ile kayıt ol</Text>
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
          <Text style={styles.bottomText}>Zaten hesabın var mı?</Text>
          <TouchableOpacity onPress={() => navigation.replace('Login')}>
            <Text style={styles.bottomLink}> Giriş Yap</Text>
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'center',
    marginBottom: 32,
    marginTop: 24,
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
  button: {
    backgroundColor: '#34C759',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
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
    marginBottom: 24,
  },
  bottomText: {
    color: '#888',
  },
  bottomLink: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
});

export default RegisterScreen; 