import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ResetPasswordScreen = ({ navigation, route }: any) => {
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [secure, setSecure] = useState(true);
  const [secure2, setSecure2] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!password || !password2) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
      return;
    }
    if (password !== password2) {
      Alert.alert('Hata', 'Şifreler uyuşmuyor.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: route.params?.token,
          password,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert(
          'Başarılı',
          'Şifreniz başarıyla değiştirildi.',
          [
            {
              text: 'Tamam',
              onPress: () => navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              }),
            },
          ]
        );
      } else {
        Alert.alert('Hata', data.message || 'Şifre sıfırlama başarısız oldu.');
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
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ position: 'absolute', left: 16, top: 16, zIndex: 10 }}>
        <Ionicons name="arrow-back" size={28} color="#007AFF" />
      </TouchableOpacity>
      <ScrollView contentContainerStyle={{padding: 20, paddingBottom: 100}} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Yeni Şifre Belirle</Text>
        <Text style={styles.description}>
          Lütfen yeni şifrenizi belirleyin.
        </Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.inputPassword}
            placeholder="Yeni Şifre"
            placeholderTextColor="#aaa"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={secure}
            textContentType="newPassword"
            autoComplete="password"
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
            placeholder="Yeni Şifre Tekrar"
            placeholderTextColor="#aaa"
            value={password2}
            onChangeText={setPassword2}
            secureTextEntry={secure2}
            textContentType="newPassword"
            autoComplete="password"
            autoCorrect={false}
            spellCheck={false}
          />
          <TouchableOpacity onPress={() => setSecure2(!secure2)}>
            <Ionicons name={secure2 ? 'eye-off' : 'eye'} size={22} color="#aaa" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? 'İşleniyor...' : 'Şifreyi Değiştir'}</Text>
        </TouchableOpacity>
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
    marginBottom: 16,
    marginTop: 24,
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    marginBottom: 16,
    paddingRight: 12,
  },
  inputPassword: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    color: '#222',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    elevation: 2,
    shadowColor: '#007AFF',
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
});

export default ResetPasswordScreen; 