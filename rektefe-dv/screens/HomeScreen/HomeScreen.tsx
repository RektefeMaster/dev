import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, SafeAreaView, TouchableOpacity, Text } from 'react-native';
import Background from '../../components/Background';
import { useHomeData } from './hooks/useHomeData';
import { GreetingHeader } from './components/GreetingHeader';
import { QuickAccess } from './components/QuickAccess';
import { StatCards } from './components/StatCards';
import { CampaignCarousel } from './components/CampaignCarousel';
import { ServicesGrid } from './components/ServicesGrid';
import { UpdateCardModal } from './components/UpdateCardModal';
import { AdDetailModal } from './components/AdDetailModal';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorState from '../../components/ErrorState';
import NoDataCard from '../../components/NoDataCard';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

// Import theme values
import { useTheme } from '../../context/ThemeContext';

const HomeScreen = () => {
  const { theme } = useTheme();
  
  const services = [
    { title: 'Ağır Bakım', icon: 'cog', color: theme.colors.primary.main },
    { title: 'Genel Bakım', icon: 'cog', color: theme.colors.success.main },
    { title: 'Alt Takım', icon: 'cog', color: theme.colors.warning.main },
    { title: 'Üst Takım', icon: 'cog', color: theme.colors.secondary.main },
    { title: 'Kaporta/Boya', icon: 'cog', color: theme.colors.error.main },
    { title: 'Elektrik-Elektronik', icon: 'cog', color: theme.colors.warning.main },
    { title: 'Yedek Parça', icon: 'cog', color: theme.colors.secondary.main },
    { title: 'Lastik', icon: 'cog', color: theme.colors.primary.main },
    { title: 'Egzoz & Emisyon', icon: 'cog', color: theme.colors.secondary.main },
    { title: 'Ekspertiz', icon: 'cog', color: theme.colors.warning.main },
    { title: 'Sigorta/Kasko', icon: 'cog', color: theme.colors.success.main },
    { title: 'Araç Yıkama', icon: 'cog', color: theme.colors.primary.main },
  ];

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
    if (card.title === 'Usta Ara') {
      navigation.navigate('MechanicSearch');
    } else {
      setSelectedCard(card);
      setShowUpdateModal(true);
    }
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background.primary }]}>
      <Background>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              colors={[theme.colors.primary.main]}
              tintColor={theme.colors.primary.main}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.section}>
            <GreetingHeader userName={userName} favoriteCar={favoriteCar} />
            
            <TouchableOpacity 
              style={[styles.maintenanceButton, { backgroundColor: theme.colors.primary.main }]}
              onPress={handleMaintenancePlan}
            >
              <Text style={[styles.maintenanceButtonText, { color: theme.colors.text.inverse }]}>Bakım Planı Oluştur</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Access Cards */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary, borderBottomColor: theme.colors.border.primary }]}>Hızlı Erişim</Text>
            
            <QuickAccess 
              cards={[
                {
                  title: 'Bakım Geçmişi',
                  value: maintenanceRecord && maintenanceRecord.date ? new Date(maintenanceRecord.date).toLocaleDateString('tr-TR') : 'Bilgi yok',
                  icon: 'cog',
                  color: theme.colors.warning.main,
                  lastUpdate: maintenanceRecord?.date,
                  isClickable: !!maintenanceRecord,
                },
                {
                  title: 'Araç Durumu',
                  value: vehicleStatus && vehicleStatus.overallStatus ? vehicleStatus.overallStatus : 'Bilgi yok',
                  icon: 'cog',
                  color: theme.colors.success.main,
                  lastUpdate: vehicleStatus?.lastCheck,
                  isClickable: !!vehicleStatus,
                },
                {
                  title: 'Sigorta Bilgisi',
                  value: insuranceInfo && insuranceInfo.company ? `${insuranceInfo.company} - ${insuranceInfo.type}` : 'Bilgi yok',
                  icon: 'cog',
                  color: theme.colors.primary.main,
                  lastUpdate: insuranceInfo?.endDate,
                  isClickable: !!insuranceInfo,
                },
                {
                  title: 'Lastik Durumu',
                  value: tireStatus ? tireStatus : 'Bilgi yok',
                  icon: 'cog',
                  color: theme.colors.error.main,
                  isClickable: !!tireStatus,
                },
                {
                  title: 'Usta Ara',
                  value: 'Randevu al',
                  icon: 'cog',
                  color: theme.colors.secondary.main,
                  isClickable: true,
                },
              ]} 
              onCardPress={handleCardPress} 
            />
          </View>

          {/* Campaigns Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary, borderBottomColor: theme.colors.border.primary }]}>Kampanyalar</Text>
            
            {(!campaigns || campaigns.length === 0) ? (
              <NoDataCard
                icon="document-outline"
                title="Henüz veri yok"
                subtitle="Yeni veriler eklendikçe burada görünecek"
                actionText="Yenile"
                onActionPress={handleRefresh}
                style={[styles.noDataCard, { backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.border.primary }]}
              />
            ) : (
              <CampaignCarousel 
                campaigns={campaigns} 
                onCampaignPress={handleCampaignPress} 
              />
            )}
          </View>

          {/* Services Section */}
          <View style={styles.section}>
            <View style={styles.servicesHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text.primary, borderBottomColor: theme.colors.border.primary }]}>Hizmetler</Text>
              
              <TouchableOpacity
                style={[styles.toggleButton, { backgroundColor: theme.colors.background.secondary }]}
                onPress={() => setShowAllServices(!showAllServices)}
              >
                <Text style={[styles.toggleButtonText, { color: theme.colors.text.primary }]}>
                  {showAllServices ? "Daha Az Göster" : "Tümünü Göster"}
                </Text>
              </TouchableOpacity>
            </View>
            
            <ServicesGrid 
              services={showAllServices ? services : services.slice(0, 6)} 
              onServicePress={handleServicePress} 
            />
          </View>

          {/* Bottom Spacing */}
          <View style={{ height: 48 }} />
        </ScrollView>
      </Background>

      {/* Modals */}
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 48,
  },
  section: {
    padding: 24,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 24,
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  maintenanceButton: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  maintenanceButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  noDataCard: {
    // Tema renkleri dinamik olarak uygulanacak
    borderWidth: 1,
  },
  servicesHeader: {
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default HomeScreen;
