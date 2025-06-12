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
import { API_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ChangePasswordScreen = ({ navigation }: any) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [secureCurrent, setSecureCurrent] = useState(true);
  const [secureNew, setSecureNew] = useState(true);
  const [secureNew2, setSecureNew2] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !newPassword2) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun.');
      return;
    }
    if (newPassword !== newPassword2) {
      Alert.alert('Hata', 'Yeni şifreler uyuşmuyor.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Hata', 'Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
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
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Hata', data.message || 'Şifre değiştirme başarısız oldu.');
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
        <Text style={styles.title}>Şifre Değiştir</Text>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.inputPassword}
            placeholder="Mevcut Şifre"
            placeholderTextColor="#aaa"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry={secureCurrent}
            textContentType="password"
            autoComplete="password"
            autoCorrect={false}
            spellCheck={false}
          />
          <TouchableOpacity onPress={() => setSecureCurrent(!secureCurrent)}>
            <Ionicons name={secureCurrent ? 'eye-off' : 'eye'} size={22} color="#aaa" />
          </TouchableOpacity>
        </View>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.inputPassword}
            placeholder="Yeni Şifre"
            placeholderTextColor="#aaa"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={secureNew}
            textContentType="newPassword"
            autoComplete="password"
            autoCorrect={false}
            spellCheck={false}
          />
          <TouchableOpacity onPress={() => setSecureNew(!secureNew)}>
            <Ionicons name={secureNew ? 'eye-off' : 'eye'} size={22} color="#aaa" />
          </TouchableOpacity>
        </View>
        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.inputPassword}
            placeholder="Yeni Şifre Tekrar"
            placeholderTextColor="#aaa"
            value={newPassword2}
            onChangeText={setNewPassword2}
            secureTextEntry={secureNew2}
            textContentType="newPassword"
            autoComplete="password"
            autoCorrect={false}
            spellCheck={false}
          />
          <TouchableOpacity onPress={() => setSecureNew2(!secureNew2)}>
            <Ionicons name={secureNew2 ? 'eye-off' : 'eye'} size={22} color="#aaa" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.button} onPress={handleChangePassword} disabled={loading}>
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
    marginBottom: 32,
    marginTop: 24,
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

export default ChangePasswordScreen; 