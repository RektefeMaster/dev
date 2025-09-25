import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const onboardingData = [
  {
    id: 1,
    title: 'Hoş Geldiniz!',
    subtitle: 'Rektefe Usta uygulamasına hoş geldiniz',
    description: 'Müşterilerinizden gelen iş taleplerini yönetin, randevularınızı organize edin ve kazançlarınızı takip edin.',
    icon: '🔧',
    color: '#3B82F6',
  },
  {
    id: 2,
    title: 'İş Yönetimi',
    subtitle: 'İşlerinizi kolayca yönetin',
    description: 'Gelen iş taleplerini onaylayın veya reddedin, müşterilerle iletişim kurun ve iş süreçlerinizi takip edin.',
    icon: 'clipboard',
    color: '#10B981',
  },
  {
    id: 3,
    title: 'Finansal Takip',
    subtitle: 'Kazançlarınızı takip edin',
    description: 'Tamamlanan işlerinizden elde ettiğiniz kazançları görün, cüzdanınızı yönetin ve para çekme işlemlerinizi gerçekleştirin.',
    icon: 'trending-up',
    color: '#F59E0B',
  },
  {
    id: 4,
    title: 'Müşteri İlişkileri',
    subtitle: 'Müşterilerinizle bağlantıda kalın',
    description: 'Müşterilerinizle mesajlaşın, değerlendirmeleri görün ve müşteri memnuniyetini artırın.',
    icon: 'people',
    color: '#8B5CF6',
  },
];

export default function OnboardingScreen() {
  const navigation = useNavigation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('onboardingCompleted', 'true');
      navigation.navigate('Auth' as never);
    } catch (error) {
      }
  };

  const renderOnboardingItem = ({ item, index }: { item: any; index: number }) => (
    <View style={styles.slide}>
      <View style={styles.iconContainer}>
        <Ionicons name={item.icon as any} size={80} color={item.color} />
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
        >
          <Text style={styles.skipButtonText}>Atla</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.nextButton, { backgroundColor: item.color }]}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>
            {index === onboardingData.length - 1 ? 'Başla' : 'İleri'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPaginationDots = () => (
    <View style={styles.paginationContainer}>
      {onboardingData.map((_, index) => (
        <View
          key={index}
          style={[
            styles.paginationDot,
            index === currentIndex && styles.activePaginationDot
          ]}
        />
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          ref={flatListRef}
          data={onboardingData}
          renderItem={renderOnboardingItem}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            const index = Math.round(event.nativeEvent.contentOffset.x / width);
            setCurrentIndex(index);
          }}
          scrollEnabled={false}
        />
        
        {renderPaginationDots()}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },
  slide: {
    width,
    height,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 60,
  },
  icon: {
    fontSize: 60,
  },
  contentContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 28,
  },
  description: {
    fontSize: 16,
    color: '#D1D5DB',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  skipButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  nextButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 16,
    minWidth: 120,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
    gap: 12,
  },
  paginationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  activePaginationDot: {
    backgroundColor: '#FFFFFF',
    width: 24,
  },
});
