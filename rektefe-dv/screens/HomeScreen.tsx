import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Animated, FlatList, RefreshControl, Image, Alert, Modal, TextInput, SafeAreaView } from 'react-native';
import Background from '../components/Background';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@env';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart } from 'react-native-chart-kit';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

const { width } = Dimensions.get('window');

type ServiceIcon = 'wrench' | 'tools' | 'cog' | 'nut' | 'spray' | 'lightning-bolt' | 'tire' | 'smoke' | 'magnify' | 'shield-check' | 'car-wash' | 'fuel' | 'car-cog';

interface Service {
  title: string;
  icon: ServiceIcon;
  color: string;
}

const services: Service[] = [
  { title: 'Ağır Bakım', icon: 'wrench', color: '#007AFF' },
  { title: 'Genel Bakım', icon: 'tools', color: '#34C759' },
  { title: 'Alt Takım', icon: 'cog', color: '#FF9500' },
  { title: 'Üst Takım', icon: 'nut', color: '#AF52DE' },
  { title: 'Kaporta/Boya', icon: 'spray', color: '#FF375F' },
  { title: 'Elektrik-Elektronik', icon: 'lightning-bolt', color: '#FFD60A' },
  { title: 'Yedek Parça', icon: 'car-wash', color: '#00B8D9' },
  { title: 'Lastik', icon: 'tire', color: '#5856D6' },
  { title: 'Egzoz & Emisyon', icon: 'smoke', color: '#5AC8FA' },
  { title: 'Ekspertiz', icon: 'magnify', color: '#FF9F0A' },
  { title: 'Sigorta/Kasko', icon: 'shield-check', color: '#32D74B' },
  { title: 'Araç Yıkama', icon: 'car-wash', color: '#64D2FF' },
];

interface Campaign {
  id: number;
  title: string;
  description: string;
  icon: ServiceIcon;
  color: string;
  gradient: string[];
}

const campaigns: Campaign[] = [
  {
    id: 1,
    title: 'Ağır bakımda %10 indirim!',
    description: 'Tüm ağır bakım hizmetlerinde geçerli',
    icon: 'wrench',
    color: '#5AC8FA',
    gradient: ['#5AC8FA', '#007AFF'],
  },
  {
    id: 2,
    title: 'Araç yıkama kampanyası',
    description: 'İlk yıkamada %20 indirim',
    icon: 'car-wash',
    color: '#FF9500',
    gradient: ['#FF9500', '#FF2D55'],
  },
];

interface Vehicle {
  _id: string;
  userId: string;
  brand: string;
  model: string;
  package: string;
  year: string;
  fuelType: string;
  mileage: string;
  plate: string;
  isFavorite: boolean;
  createdAt: string;
}

interface MaintenanceRecord {
  date: string;
  mileage: string;
  type: string;
  details: string[];
  serviceName: string;
}

interface InsuranceInfo {
  company: string;
  type: string;
  startDate: string;
  endDate: string;
  policyNumber: string;
}

interface VehicleStatus {
  overallStatus: 'İyi' | 'Orta' | 'Dikkat Gerekli';
  lastCheck: string;
  issues: string[];
}

interface QuickAccessCard {
  title: string;
  value: string;
  icon: ServiceIcon;
  color: string;
  details?: string[];
  lastUpdate?: string;
}

interface StatCard {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
}

interface ServiceCard {
  name: string;
  rating: number;
  distance: string;
  price: string;
  image: string;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Günaydın';
  if (hour >= 12 && hour < 18) return 'İyi akşamlar';
  return 'İyi geceler';
};

const HomeScreen = () => {
  const [selectedIndex, setSelectedIndex] = useState(Math.floor(services.length / 2));
  const [favoriteCar, setFavoriteCar] = useState<Vehicle | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [maintenanceRecord, setMaintenanceRecord] = useState<MaintenanceRecord | null>(null);
  const [insuranceInfo, setInsuranceInfo] = useState<InsuranceInfo | null>(null);
  const [vehicleStatus, setVehicleStatus] = useState<VehicleStatus | null>(null);

  const memoizedQuickAccessCards = useMemo(() => [
    {
      title: 'Son Bakım',
      value: maintenanceRecord ? `${maintenanceRecord.mileage} km önce` : 'Bakım kaydı yok',
      icon: 'wrench',
      color: '#007AFF',
      details: maintenanceRecord?.details,
      lastUpdate: maintenanceRecord?.date,
    },
    {
      title: 'Araç Durumu',
      value: vehicleStatus?.overallStatus || 'Bilgi yok',
      icon: 'car-cog',
      color: vehicleStatus?.overallStatus === 'İyi' ? '#34C759' : 
             vehicleStatus?.overallStatus === 'Orta' ? '#FF9500' : '#FF3B30',
      details: vehicleStatus?.issues,
      lastUpdate: vehicleStatus?.lastCheck,
    },
    {
      title: 'Sigorta',
      value: insuranceInfo ? `${insuranceInfo.company} - ${insuranceInfo.type}` : 'Sigorta bilgisi yok',
      icon: 'shield-check',
      color: '#FF9500',
      details: insuranceInfo ? [
        `Poliçe No: ${insuranceInfo.policyNumber}`,
        `Bitiş: ${insuranceInfo.endDate}`
      ] : undefined,
      lastUpdate: insuranceInfo?.endDate,
    },
    {
      title: 'Lastik Durumu',
      value: 'Bilgi yok',
      icon: 'tire',
      color: '#5856D6',
      details: undefined,
      lastUpdate: undefined,
    },
  ], [maintenanceRecord, vehicleStatus, insuranceInfo]);

  const memoizedStatCards = useMemo(() => [
    {
      title: 'Aylık Bakım',
      value: '₺1.250',
      change: '+₺150',
      trend: 'up',
    },
    {
      title: 'En Yakın Bakım Tarihi',
      value: maintenanceRecord?.date || 'Bilgi yok',
      change: '',
      trend: 'neutral',
    },
    {
      title: 'Son Servis Tarihi',
      value: maintenanceRecord?.date || 'Bilgi yok',
      change: '',
      trend: 'neutral',
    },
    {
      title: 'Son Bakım Tarihi',
      value: maintenanceRecord?.date || 'Bilgi yok',
      change: '',
      trend: 'neutral',
    },
  ], [maintenanceRecord]);

  const [nearbyServices, setNearbyServices] = useState<ServiceCard[]>([
    {
      name: 'Oto Plus Servis',
      rating: 4.8,
      distance: '2.3 km',
      price: '₺500-₺800',
      image: 'https://example.com/service1.jpg',
    },
    {
      name: 'Mega Oto',
      rating: 4.6,
      distance: '3.1 km',
      price: '₺450-₺750',
      image: 'https://example.com/service2.jpg',
    },
  ]);

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<QuickAccessCard | null>(null);
  const [updateValue, setUpdateValue] = useState('');

  const getUserData = async () => {
    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      const storedToken = await AsyncStorage.getItem('token');
      if (storedUserId && storedToken) {
        setUserId(storedUserId);
        setToken(storedToken);
        // Kullanıcı adını backend'den çek
        const res = await axios.get(`${API_URL}/user/${storedUserId}`, {
          headers: { Authorization: `Bearer ${storedToken}` }
        });
        setUserName(res.data.name);
      }
    } catch (error) {
      console.error('Kullanıcı adı alınırken hata:', error);
    }
  };

  const fetchVehicleData = async () => {
    if (!userId) return;
    try {
      // Bakım kaydı
      const maintenanceRes = await axios.get(`${API_URL}/maintenance/${userId}`);
      if (maintenanceRes.data.length > 0) {
        setMaintenanceRecord(maintenanceRes.data[0]);
      }

      // Sigorta bilgisi
      const insuranceRes = await axios.get(`${API_URL}/insurance/${userId}`);
      if (insuranceRes.data) {
        setInsuranceInfo(insuranceRes.data);
      }

      // Araç durumu
      const statusRes = await axios.get(`${API_URL}/vehicle-status/${userId}`);
      if (statusRes.data) {
        setVehicleStatus(statusRes.data);
      }
    } catch (error) {
      console.error('Araç verileri alınırken hata:', error);
    }
  };

  useEffect(() => {
    getUserData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      getUserData();
      fetchFavoriteCar(false);
      fetchVehicleData();
    }, [])
  );

  useEffect(() => {
    if (userId) {
      fetchFavoriteCar();
    }
  }, [userId]);

  const fetchFavoriteCar = async (showRefresh: boolean = false) => {
    if (!userId) return;
    try {
      if (showRefresh) setRefreshing(true);
      const response = await axios.get(`${API_URL}/vehicles/${userId}`);
      const fav = response.data.find((v: Vehicle) => v.isFavorite);
      setFavoriteCar(fav || null);
    } catch (e) {
      setFavoriteCar(null);
    } finally {
      if (showRefresh) setRefreshing(false);
    }
  };

  const ITEM_WIDTH = 136; // kart genişliği + margin

  const renderService = ({ item, index }: { item: Service; index: number }) => {
    let scale = 0.85;
    let opacity = 0.5;
    if (index === selectedIndex) {
      scale = 1.1;
      opacity = 1;
    } else if (index === selectedIndex - 1 || index === selectedIndex + 1) {
      scale = 0.95;
      opacity = 0.7;
    }
    return (
      <Animated.View style={{
        transform: [{ scale }],
        opacity,
        marginHorizontal: 8,
        zIndex: index === selectedIndex ? 2 : 1,
      }}>
        <TouchableOpacity
          style={[styles.carouselCard, { borderColor: index === selectedIndex ? '#5AC8FA' : 'transparent', borderWidth: 1 }]}
          activeOpacity={0.85}
          onPress={() => {
            setSelectedIndex(index);
            flatListRef.current?.scrollToIndex({ index, animated: true });
          }}
        >
          <BlurView intensity={30} tint="light" style={styles.cardIconWrap}>
            <MaterialCommunityIcons name={item.icon} size={36} color={item.color} />
          </BlurView>
          <Text style={[styles.cardTitle, index === selectedIndex && { textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 4, textAlign: 'center' }]}>
            {item.title}
          </Text>
          {index === selectedIndex && (
            <Text style={{ fontSize: 11, color: '#777', marginTop: 4 }}>4 usta aktif</Text>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const handleUpdateCard = (card: QuickAccessCard) => {
    setSelectedCard(card);
    setUpdateValue(card.value);
    setShowUpdateModal(true);
  };

  const handleSaveUpdate = () => {
    if (!selectedCard) return;

    const updatedCards = memoizedQuickAccessCards.map(card => {
      if (card.title === selectedCard.title) {
        return {
          ...card,
          value: updateValue,
          lastUpdate: 'Şimdi',
        };
      }
      return card;
    });

    setQuickAccessCards(updatedCards);
    setShowUpdateModal(false);
    setSelectedCard(null);
    setUpdateValue('');
  };

  const renderQuickAccessCard = useCallback((card: QuickAccessCard, index: number) => (
    <TouchableOpacity
      key={index}
      style={styles.quickAccessCard}
      onPress={() => handleUpdateCard(card)}
    >
      <View style={[styles.cardIconWrap, { backgroundColor: card.color + '20' }]}>
        <MaterialCommunityIcons name={card.icon as any} size={24} color={card.color} />
      </View>
      <Text style={styles.cardTitle}>{card.title}</Text>
      <Text style={styles.cardValue}>{card.value}</Text>
      {card.lastUpdate && (
        <Text style={styles.cardUpdate}>Son güncelleme: {formatDistanceToNow(new Date(card.lastUpdate), { addSuffix: true, locale: tr })}</Text>
      )}
    </TouchableOpacity>
  ), []);

  const renderStatCard = useCallback((card: StatCard, index: number) => (
    <View key={index} style={styles.statCard}>
      <Text style={styles.statCardTitle}>{card.title}</Text>
      <Text style={styles.statCardValue}>{card.value}</Text>
      {card.change && (
        <View style={styles.statCardChange}>
          <MaterialCommunityIcons
            name={card.trend === 'up' ? 'trending-up' : card.trend === 'down' ? 'trending-down' : 'trending-neutral'}
            size={16}
            color={card.trend === 'up' ? '#34C759' : card.trend === 'down' ? '#FF3B30' : '#8E8E93'}
          />
          <Text style={[
            styles.statCardChangeText,
            { color: card.trend === 'up' ? '#34C759' : card.trend === 'down' ? '#FF3B30' : '#8E8E93' }
          ]}>
            {card.change}
          </Text>
        </View>
      )}
    </View>
  ), []);

  const renderServiceCard = (service: ServiceCard) => (
    <TouchableOpacity key={service.name} style={styles.serviceCard}>
      <Image source={{ uri: service.image }} style={styles.serviceImage} />
      <View style={styles.serviceContent}>
        <Text style={styles.serviceName}>{service.name}</Text>
        <View style={styles.serviceDetails}>
          <View style={styles.serviceRating}>
            <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
            <Text style={styles.serviceRatingText}>{service.rating}</Text>
          </View>
          <Text style={styles.serviceDistance}>{service.distance}</Text>
        </View>
        <Text style={styles.servicePrice}>{service.price}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <>
      {/* Logo ve Bildirimler */}
      <View style={styles.logoRow}>
        <Text style={styles.logo}>🔷</Text>
        <TouchableOpacity>
          <MaterialCommunityIcons name="bell" size={24} color="#fff" style={{ opacity: 0.9 }} />
        </TouchableOpacity>
      </View>
      {/* Selamlama */}
      <Text style={styles.greeting}>
        {getGreeting()}, <Text style={styles.greetingName}>{userName}</Text> 👋
      </Text>
      {/* Araç Bilgisi */}
      {favoriteCar && (
        <View style={styles.carRow}>
          <MaterialCommunityIcons name="car" size={24} color="#fff" style={{ opacity: 0.9, marginRight: 12 }} />
          <Text style={styles.carText}>{favoriteCar.brand} {favoriteCar.model} ({favoriteCar.plate}) aracınız için ne yapmak istersiniz?</Text>
        </View>
      )}
      {/* Hızlı Erişim Kartları */}
      <View style={styles.quickAccessContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Hızlı Erişim</Text>
          <TouchableOpacity style={styles.reminderButton}>
            <MaterialCommunityIcons name="bell-outline" size={20} color="#fff" />
            <Text style={styles.reminderButtonText}>Hatırlatıcılar</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.quickAccessGrid}>
          {memoizedQuickAccessCards.map((card, index) => renderQuickAccessCard(card, index))}
        </View>
      </View>
      {/* İstatistik Kartları */}
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>İstatistikler</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 8}}>
          <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
            {memoizedStatCards.map((card, index) => renderStatCard(card, index))}
          </View>
        </ScrollView>
      </View>
      {/* Yakındaki Servisler */}
      <View style={styles.servicesContainer}>
        <Text style={styles.sectionTitle}>Yakındaki Servisler</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {nearbyServices.map(renderServiceCard)}
        </ScrollView>
      </View>
      {/* Kampanya Banner Carousel */}
      <ScrollView 
        horizontal 
        pagingEnabled 
        showsHorizontalScrollIndicator={false} 
        style={styles.campaignContainer}
        contentContainerStyle={styles.campaignContent}
      >
        {campaigns.map((campaign, index) => (
          <TouchableOpacity 
            key={campaign.id}
            style={[
              styles.campaignCard,
              { backgroundColor: campaign.color }
            ]}
            activeOpacity={0.9}
          >
            <View style={styles.campaignInnerContent}>
              <MaterialCommunityIcons name={campaign.icon} size={48} color="#fff" style={{ marginRight: 20 }} />
              <View style={styles.campaignTextContainer}>
                <Text style={styles.campaignTitle}>{campaign.title}</Text>
                <Text style={styles.campaignDescription}>{campaign.description}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {/* Hizmetler Grid'i */}
      <View style={styles.servicesGridContainer}>
        <Text style={styles.sectionTitle}>Hizmetler</Text>
        <ScrollView style={{maxHeight: 350}} showsVerticalScrollIndicator={false}>
          <View style={styles.servicesGrid}>
            {services.map((item, idx) => (
              <TouchableOpacity key={item.title} style={styles.serviceGridItem} onPress={() => Alert.alert(item.title, `${item.title} hizmetine tıkladınız!`)}>
                <View style={[styles.cardIconWrap, { backgroundColor: 'rgba(255,255,255,0.15)' }]}> 
                  <MaterialCommunityIcons name={item.icon} size={32} color={item.color} />
                </View>
                <Text style={styles.cardTitle}>{item.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    </>
  );

  return (
    <SafeAreaView style={{flex:1}}>
      <Background>
        <FlatList
          data={[]}
          ListHeaderComponent={renderHeader}
          keyExtractor={() => 'header'}
          renderItem={null}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => {
              fetchFavoriteCar(true);
              fetchVehicleData();
            }} />
          }
        />
        {/* Güncelleme Modalı */}
        <Modal
          visible={showUpdateModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowUpdateModal(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {selectedCard?.title} Güncelle
              </Text>
              <TextInput
                style={styles.modalInput}
                value={updateValue}
                onChangeText={setUpdateValue}
                placeholder="Yeni değer"
                placeholderTextColor="#999"
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => setShowUpdateModal(false)}
                >
                  <Text style={styles.cancelButtonText}>İptal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton]}
                  onPress={handleSaveUpdate}
                >
                  <Text style={styles.saveButtonText}>Kaydet</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </Background>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    paddingTop: 44,
    paddingBottom: 32,
    paddingHorizontal: 20,
    minHeight: '100%',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    opacity: 0.9,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  greetingName: {
    color: '#5AC8FA',
    fontWeight: 'bold',
  },
  carRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    borderRadius: 16,
  },
  carIcon: {
    fontSize: 24,
    marginRight: 12,
    color: '#fff',
    opacity: 0.9,
  },
  carText: {
    fontSize: 16,
    color: '#fff',
    flex: 1,
  },
  servicesGridContainer: {
    marginTop: 24,
    marginBottom: 24,
    paddingBottom: 100,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  serviceGridItem: {
    width: '30%',
    alignItems: 'center',
    marginBottom: 32,
  },
  card: {
    width: (width - 64) / 2,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 20,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  cardIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  cardIcon: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  cardTitle: {
    fontSize: 16,
    color: '#f5f7fa',
    fontWeight: '600',
    textAlign: 'center',
  },
  campaignContainer: {
    marginBottom: 28,
  },
  campaignContent: {
    paddingHorizontal: 4,
  },
  campaignCard: {
    width: width - 40,
    height: 160,
    borderRadius: 20,
    marginRight: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  campaignInnerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  campaignIcon: {
    fontSize: 48,
    marginRight: 20,
  },
  campaignTextContainer: {
    flex: 1,
  },
  campaignTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  campaignDescription: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 15,
    lineHeight: 22,
  },
  carouselContainer: {
    marginTop: 92,
    marginBottom: 92,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselCard: {
    width: 136,
    height: 130,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    marginLeft: 4,
  },
  quickAccessContainer: {
    marginTop: 24,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reminderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  reminderButtonText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 4,
  },
  lastUpdateText: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.6,
    marginTop: 4,
  },
  updateButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  quickAccessCard: {
    width: '48%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickAccessContent: {
    flex: 1,
    marginLeft: 12,
  },
  quickAccessTitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  quickAccessValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 4,
  },
  statsContainer: {
    marginTop: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  statCardTitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  statCardValue: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 8,
  },
  statCardChange: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statCardChangeText: {
    fontSize: 14,
    marginLeft: 4,
  },
  chartContainer: {
    marginTop: 24,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  servicesContainer: {
    marginTop: 24,
  },
  serviceCard: {
    width: 280,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    marginRight: 16,
    overflow: 'hidden',
  },
  serviceImage: {
    width: '100%',
    height: 140,
  },
  serviceContent: {
    padding: 16,
  },
  serviceName: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  serviceDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  serviceRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  serviceRatingText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 4,
  },
  serviceDistance: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
  },
  servicePrice: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 24,
    textAlign: 'center',
  },
  modalInput: {
    backgroundColor: '#f5f7fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e1e4e8',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f7fa',
    marginRight: 8,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    marginLeft: 8,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  detailsContainer: {
    marginTop: 8,
  },
  detailText: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8
  }
});

export default HomeScreen; 
// TODO: In TabNavigator, increase spacing between icons so REKAİ does not cover Rektagram.
// Consider placing REKAİ as a floating centered action button and adjusting adjacent tab buttons.