import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions, SafeAreaView } from 'react-native';
import Background from '../components 2/Background';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ navigation }: any) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Onboarding');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <SafeAreaView style={{flex:1}}>
      <Background>
        <View style={styles.container}>
          <Image
            source={require('../assets/splash-icon.png')}
            style={styles.splash}
            resizeMode="contain"
          />
        </View>
      </Background>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splash: {
    width: '100%',
    height: '100%',
  },
});

export default SplashScreen; 