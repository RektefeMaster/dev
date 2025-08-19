import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Modal,
  ScrollView,
} from 'react-native';
import LottieView from 'lottie-react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    title: "REKTEFE'ye Sanayi Devrimine Hoş Geldiniz",
    description:
      'Bu kez bu devrimi kaçırmayın! Yüzlerce güvenilir deneyimli usta ve iş yerleri ile aracınızın tüm ihtiyaçlarını giderin!',
    animation: require('../assets/welcome.json'),
  },
  {
    id: '2',
    title: 'Usta isminin hakkını veren ustalarımızla tanışın!',
    description:
      'İşinde deneyimli ve profesyonel ustalarımız ile tanışın! Aracınız için gereken her usta burada!',
    animation: require('../assets/ustabulma.json'),
  },
  {
    id: '3',
    title: 'Ödemeleriniz bizimle güvende!',
    description:
      'Bir çok ödeme seçeneği, taksit ve indirim fırsatlarını keşfedin!',
    animation: require('../assets/payment.json'),
  },
];

const OnboardingScreen = ({ navigation }: any) => {
  const { token, isAuthenticated } = useAuth();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Giriş kontrolü
  React.useEffect(() => {
    if (token && isAuthenticated) {
      console.log('✅ OnboardingScreen: Kullanıcı zaten giriş yapmış, Main\'e yönlendiriliyor');
      navigation.replace('Main');
    }
  }, [token, isAuthenticated, navigation]);

  const updateSlide = (index: number) => {
    setCurrentSlideIndex(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.slide}>
      <LottieView
        source={item.animation}
        autoPlay
        loop
        style={styles.lottie}
      />
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  const Footer = () => (
    <View style={styles.footer}>
      <View style={styles.indicatorContainer}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[
              styles.indicator,
              currentSlideIndex === index && styles.activeIndicator,
            ]}
          />
        ))}
      </View>
      {currentSlideIndex === slides.length - 1 ? (
        <TouchableOpacity
          style={[styles.button, styles.startButton]}
          onPress={() => setShowModal(true)}
        >
          <Text style={styles.buttonText}>Başla</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.button}
          onPress={() => updateSlide(currentSlideIndex + 1)}
        >
          <Text style={styles.buttonText}>Devam Et</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => item.id}
        onMomentumScrollEnd={e => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentSlideIndex(index);
        }}
        style={{ flexGrow: 0 }}
      />
      <Footer />
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBalloon}>
            <LottieView
              source={require('../assets/startuser.json')}
              autoPlay
              loop
              style={styles.modalLottie}
            />
            <Text style={styles.modalTitle}>Son bir soru...</Text>
            <Text style={styles.modalDesc}>Hesabın var mı?</Text>
            <TouchableOpacity
              style={[styles.button, styles.modalButton]}
              onPress={() => {
                setShowModal(false);
                navigation.navigate('Login');
              }}
            >
              <Text style={styles.buttonText}>Giriş Yap</Text>
            </TouchableOpacity>
            <Text style={styles.modalDesc}>Yok mu? Sorun değil, hadi kayıt olalım!</Text>
            <TouchableOpacity
              style={[styles.button, styles.modalButton, styles.startButton]}
              onPress={() => {
                setShowModal(false);
                navigation.navigate('Register');
              }}
            >
              <Text style={styles.buttonText}>Kayıt Ol</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
  },
  lottie: {
    width: width * 0.8,
    height: height * 0.4,
    marginBottom: 24,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#222',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  description: {
    fontSize: 17,
    color: '#555',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 8,
    backgroundColor: 'transparent',
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 18,
  },
  indicator: {
    height: 10,
    width: 10,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 5,
    borderRadius: 5,
    opacity: 0.5,
  },
  activeIndicator: {
    backgroundColor: '#007AFF',
    opacity: 1,
    width: 22,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 10,
    marginTop: 8,
    elevation: 2,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  startButton: {
    backgroundColor: '#34C759',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBalloon: {
    width: width * 0.85,
    backgroundColor: '#fff',
    borderRadius: 32,
    alignItems: 'center',
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  modalLottie: {
    width: width * 0.5,
    height: width * 0.5,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 6,
    textAlign: 'center',
  },
  modalDesc: {
    fontSize: 16,
    color: '#444',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalButton: {
    width: '100%',
    marginVertical: 6,
  },
});

export default OnboardingScreen; 