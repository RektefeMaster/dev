import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, SafeAreaView, TouchableOpacity, Text } from 'react-native';
import Background from '../components 2/Background';
import { useHomeData } from './HomeScreen/hooks/useHomeData';
import { GreetingHeader } from './HomeScreen/components/GreetingHeader';
import { QuickAccess } from './HomeScreen/components/QuickAccess';
import { StatCards } from './HomeScreen/components/StatCards';
import { CampaignCarousel } from './HomeScreen/components/CampaignCarousel';
import { ServicesGrid } from './HomeScreen/components/ServicesGrid';
import { UpdateCardModal } from './HomeScreen/components/UpdateCardModal';
import { AdDetailModal } from './HomeScreen/components/AdDetailModal';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import LoadingSkeleton from '../components 2/LoadingSkeleton';
import ErrorState from '../components 2/ErrorState';
import NoDataCard from '../components 2/NoDataCard';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

const services = [
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

const HomeScreen = () => {
  const {
    userName,
    favoriteCar,
    maintenanceRecord,
    insuranceInfo,
    vehicleStatus,
    serviceProviders,
    campaigns,
    ads,
    loading,
    error,
    refreshData,
    tireStatus,
  } = useHomeData();

  const [refreshing, setRefreshing] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<{ title: string; value: string } | null>(null);
  const [showAdModal, setShowAdModal] = useState(false);
  const [selectedAd, setSelectedAd] = useState<any>(null);
  const [showAllServices, setShowAllServices] = useState(false);

  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshData();
    setRefreshing(false);
  };

  const handleCardPress = (card: any) => {
    setSelectedCard(card);
    setShowUpdateModal(true);
  };

  const handleCardUpdate = (value: string) => {
    Alert.alert('Başarılı', 'Kart güncellendi');
  };

  const handleServicePress = (service: any) => {
    Alert.alert(service.title, `${service.title} hizmetine tıkladınız!`);
  };

  const handleCampaignPress = (campaign: any) => {
    Alert.alert(campaign.title, campaign.description);
  };

  const handleAdPress = (ad: any) => {
    setSelectedAd(ad);
    setShowAdModal(true);
  };

  const handleMaintenancePlan = () => {
    navigation.navigate('MaintenancePlan');
  };

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorState message={error} />;

  return (
    <SafeAreaView style={{flex:1}}>
      <Background>
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: 64 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <View style={styles.topSection}>
            <GreetingHeader userName={userName} favoriteCar={favoriteCar} />
            <TouchableOpacity
              style={styles.maintenanceButton}
              onPress={handleMaintenancePlan}
            >
              <Text style={styles.buttonText}>Bakım Planla</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.middleSection}>
            <QuickAccess 
              cards={[
                {
                  title: 'Son Bakım',
                  value: maintenanceRecord && maintenanceRecord.date ? new Date(maintenanceRecord.date).toLocaleDateString('tr-TR') : 'Bilgi yok',
                  icon: 'wrench',
                  color: '#FF9500',
                  lastUpdate: maintenanceRecord?.date,
                  isClickable: !!maintenanceRecord,
                },
                {
                  title: 'Araç Durumu',
                  value: vehicleStatus && vehicleStatus.overallStatus ? vehicleStatus.overallStatus : 'Bilgi yok',
                  icon: 'car-cog',
                  color: '#34C759',
                  lastUpdate: vehicleStatus?.lastCheck,
                  isClickable: !!vehicleStatus,
                },
                {
                  title: 'Sigorta',
                  value: insuranceInfo && insuranceInfo.company ? `${insuranceInfo.company} - ${insuranceInfo.type}` : 'Bilgi yok',
                  icon: 'shield-check',
                  color: '#007AFF',
                  lastUpdate: insuranceInfo?.endDate,
                  isClickable: !!insuranceInfo,
                },
                {
                  title: 'Lastik Durumu',
                  value: tireStatus ? tireStatus : 'Bilgi yok',
                  icon: 'tire',
                  color: '#FF2D55',
                  isClickable: !!tireStatus,
                },
              ]} 
              onCardPress={handleCardPress} 
            />

            <View style={styles.campaignSection}>
              <Text style={styles.sectionTitle}>Kampanyalar</Text>
              {(!campaigns || campaigns.length === 0) ? (
                <NoDataCard text="Kampanya bulunamadı" />
              ) : (
                <CampaignCarousel 
                  campaigns={campaigns} 
                  onCampaignPress={handleCampaignPress} 
                />
              )}
            </View>

            <View style={styles.rewardsSection}>
              <Text style={styles.sectionTitle}>Tefe Puanla İndirimler</Text>
              <View style={styles.rewardsGrid}>
                <TouchableOpacity style={styles.rewardCard}>
                  <MaterialCommunityIcons name="star-circle" size={32} color="#FFD700" />
                  <Text style={styles.rewardTitle}>500 Puan</Text>
                  <Text style={styles.rewardDesc}>%10 İndirim</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rewardCard}>
                  <MaterialCommunityIcons name="star-circle" size={32} color="#FFD700" />
                  <Text style={styles.rewardTitle}>1000 Puan</Text>
                  <Text style={styles.rewardDesc}>%20 İndirim</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rewardCard}>
                  <MaterialCommunityIcons name="star-circle" size={32} color="#FFD700" />
                  <Text style={styles.rewardTitle}>2000 Puan</Text>
                  <Text style={styles.rewardDesc}>%30 İndirim</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.bottomSection}>
            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>İstatistikler</Text>
              <StatCards 
                stats={[
                  {
                    title: 'Toplam Harcama',
                    value: maintenanceRecord && maintenanceRecord.cost !== undefined ? `₺${maintenanceRecord.cost}` : 'Bilgi yok',
                    change: '+₺150',
                    trend: 'up' as const,
                    icon: 'wrench',
                    color: '#FF9500',
                    lastUpdate: maintenanceRecord?.date,
                  },
                  {
                    title: 'Son Bakım',
                    value: maintenanceRecord ? new Date(maintenanceRecord.date).toLocaleDateString('tr-TR') : 'Bilgi yok',
                    change: '',
                    trend: 'neutral' as const,
                    icon: 'car-cog',
                    color: '#34C759',
                    lastUpdate: maintenanceRecord?.date,
                  },
                ]} 
              />
            </View>

            <View style={styles.servicesSection}>
              <Text style={styles.sectionTitle}>Hizmetler</Text>
              <View style={styles.servicesContainer}>
                {(!services || services.length === 0) ? (
                  <NoDataCard text="Hizmet bulunamadı" />
                ) : (
                  <ServicesGrid 
                    services={showAllServices ? services : services.slice(0, 6)} 
                    onServicePress={handleServicePress} 
                  />
                )}
                {!showAllServices && (
                  <TouchableOpacity style={styles.allServicesButton} onPress={() => setShowAllServices(true)}>
                    <Text style={styles.allServicesText}>Tüm Hizmetler</Text>
                    <MaterialCommunityIcons name="chevron-right" size={20} color="#007AFF" />
                  </TouchableOpacity>
                )}
                {showAllServices && (
                  <TouchableOpacity style={styles.allServicesButton} onPress={() => setShowAllServices(false)}>
                    <Text style={styles.allServicesText}>Kapat</Text>
                    <MaterialCommunityIcons name="chevron-up" size={20} color="#007AFF" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </ScrollView>

        <UpdateCardModal
          visible={showUpdateModal}
          card={selectedCard}
          onClose={() => setShowUpdateModal(false)}
          onSave={handleCardUpdate}
        />

        <AdDetailModal
          visible={showAdModal}
          ad={selectedAd}
          onClose={() => setShowAdModal(false)}
        />
      </Background>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  middleSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  bottomSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  maintenanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderColor: '#3a3a3a',
    paddingBottom: 8,
  },
  campaignSection: {
    marginTop: 24,
  },
  rewardsSection: {
    marginTop: 24,
  },
  rewardsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  rewardCard: {
    flex: 1,
    backgroundColor: '#23242a',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rewardTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12, // was 8
  },
  rewardDesc: {
    color: '#999',
    fontSize: 14,
    marginTop: 6, // was 4
  },
  statsSection: {
    marginTop: 24,
  },
  servicesSection: {
    marginTop: 24,
  },
  servicesContainer: {
    gap: 16,
  },
  allServicesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#23242a',
    borderRadius: 12,
  },
  allServicesText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
    marginRight: 4,
  },
});

export default HomeScreen; 