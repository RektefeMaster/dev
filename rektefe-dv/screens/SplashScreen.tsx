import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions, SafeAreaView } from 'react-native';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ navigation }: any) => {
  const { token, isAuthenticated } = useAuth();

  useEffect(() => {
    const checkAuthAndNavigate = async () => {
      console.log('🔍 SplashScreen: Giriş kontrolü başlıyor');
      console.log('🔍 SplashScreen: Token:', token ? 'Mevcut' : 'Yok');
      console.log('🔍 SplashScreen: isAuthenticated:', isAuthenticated);
      
      // 2 saniye bekle (splash gösterimi için)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (token && isAuthenticated) {
        console.log('✅ SplashScreen: Kullanıcı giriş yapmış, Main\'e yönlendiriliyor');
        navigation.replace('Main');
      } else {
        console.log('⚠️ SplashScreen: Kullanıcı giriş yapmamış, Onboarding\'e yönlendiriliyor');
        navigation.replace('Onboarding');
      }
    };

    checkAuthAndNavigate();
  }, [navigation, token, isAuthenticated]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Image
          source={require('../assets/splash-icon.png')}
          style={styles.logo}
          resizeMode="cover"
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: width,
    height: height,
    resizeMode: 'cover'
  },
});

export default SplashScreen; 