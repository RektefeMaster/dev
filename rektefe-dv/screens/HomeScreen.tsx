import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, SafeAreaView, TouchableOpacity } from 'react-native';
import Background from '../components/Background';
import { useHomeData } from './HomeScreen/hooks/useHomeData';
import { GreetingHeader } from './HomeScreen/components/GreetingHeader';
import { QuickAccess } from './HomeScreen/components/QuickAccess';
import { StatCards } from './HomeScreen/components/StatCards';
import { CampaignCarousel } from './HomeScreen/components/CampaignCarousel';
import { ServicesGrid } from './HomeScreen/components/ServicesGrid';
import { UpdateCardModal } from './HomeScreen/components/UpdateCardModal';
import { AdDetailModal } from './HomeScreen/components/AdDetailModal';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ErrorState from '../components/ErrorState';
import NoDataCard from '../components/NoDataCard';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';

// Import modern UI components
import { 
  Button, 
  Card, 
  Typography, 
  Layout, 
  Container, 
  Section, 
  Spacing,
  theme 
} from '../components';

const services = [
  { title: 'Ağır Bakım', icon: 'wrench', color: theme.colors.primary.main },
  { title: 'Genel Bakım', icon: 'tools', color: theme.colors.success.main },
  { title: 'Alt Takım', icon: 'cog', color: theme.colors.warning.main },
  { title: 'Üst Takım', icon: 'nut', color: theme.colors.secondary.main },
  { title: 'Kaporta/Boya', icon: 'spray', color: theme.colors.error.main },
  { title: 'Elektrik-Elektronik', icon: 'lightning-bolt', color: theme.colors.warning.main },
  { title: 'Yedek Parça', icon: 'car-wash', color: theme.colors.secondary.main },
  { title: 'Lastik', icon: 'tire', color: theme.colors.primary.main },
  { title: 'Egzoz & Emisyon', icon: 'smoke', color: theme.colors.secondary.main },
  { title: 'Ekspertiz', icon: 'magnify', color: theme.colors.warning.main },
  { title: 'Sigorta/Kasko', icon: 'shield-check', color: theme.colors.success.main },
  { title: 'Araç Yıkama', icon: 'car-wash', color: theme.colors.primary.main },
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
    <SafeAreaView style={styles.safeArea}>
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
          <Section padding="lg" margin="sm">
            <GreetingHeader userName={userName} favoriteCar={favoriteCar} />
            
            <Spacing top="md">
              <Button
                title="Bakım Planla"
                onPress={handleMaintenancePlan}
                variant="primary"
                size="lg"
                icon="wrench"
                fullWidth
                style={styles.maintenanceButton}
              />
            </Spacing>
          </Section>

          {/* Quick Access Cards */}
          <Section padding="lg" margin="sm">
            <Typography variant="h4" color="white" weight="semibold" style={styles.sectionTitle}>
              Hızlı Erişim
            </Typography>
            
            <QuickAccess 
              cards={[
                {
                  title: 'Son Bakım',
                  value: maintenanceRecord && maintenanceRecord.date ? new Date(maintenanceRecord.date).toLocaleDateString('tr-TR') : 'Bilgi yok',
                  icon: 'wrench',
                  color: theme.colors.warning.main,
                  lastUpdate: maintenanceRecord?.date,
                  isClickable: !!maintenanceRecord,
                },
                {
                  title: 'Araç Durumu',
                  value: vehicleStatus && vehicleStatus.overallStatus ? vehicleStatus.overallStatus : 'Bilgi yok',
                  icon: 'car-cog',
                  color: theme.colors.success.main,
                  lastUpdate: vehicleStatus?.lastCheck,
                  isClickable: !!vehicleStatus,
                },
                {
                  title: 'Sigorta',
                  value: insuranceInfo && insuranceInfo.company ? `${insuranceInfo.company} - ${insuranceInfo.type}` : 'Bilgi yok',
                  icon: 'shield-check',
                  color: theme.colors.primary.main,
                  lastUpdate: insuranceInfo?.endDate,
                  isClickable: !!insuranceInfo,
                },
                {
                  title: 'Lastik Durumu',
                  value: tireStatus ? tireStatus : 'Bilgi yok',
                  icon: 'tire',
                  color: theme.colors.error.main,
                  isClickable: !!tireStatus,
                },
                {
                  title: 'Usta Ara',
                  value: 'Randevu al',
                  icon: 'account-wrench',
                  color: theme.colors.secondary.main,
                  isClickable: true,
                },
              ]} 
              onCardPress={handleCardPress} 
            />
          </Section>

          {/* Campaigns Section */}
          <Section padding="lg" margin="sm">
            <Typography variant="h4" color="white" weight="semibold" style={styles.sectionTitle}>
              Kampanyalar
            </Typography>
            
            {(!campaigns || campaigns.length === 0) ? (
              <Card variant="filled" style={styles.noDataCard}>
                <NoDataCard text="Kampanya bulunamadı" />
              </Card>
            ) : (
              <CampaignCarousel 
                campaigns={campaigns} 
                onCampaignPress={handleCampaignPress} 
              />
            )}
          </Section>

          {/* Rewards Section */}
          <Section padding="lg" margin="sm">
            <Typography variant="h4" color="white" weight="semibold" style={styles.sectionTitle}>
              Tefe Puanla İndirimler
            </Typography>
            
            <Layout direction="row" gap="md" style={styles.rewardsGrid}>
              <Card variant="filled" style={styles.rewardCard} onPress={() => {}}>
                <Layout direction="column" align="center" padding="md">
                  <MaterialCommunityIcons 
                    name="star-circle" 
                    size={32} 
                    color={theme.colors.warning.main} 
                  />
                  <Typography variant="h6" color="white" weight="semibold" style={styles.rewardTitle}>
                    500 Puan
                  </Typography>
                  <Typography variant="body2" color="secondary" align="center">
                    %10 İndirim
                  </Typography>
                </Layout>
              </Card>
              
              <Card variant="filled" style={styles.rewardCard} onPress={() => {}}>
                <Layout direction="column" align="center" padding="md">
                  <MaterialCommunityIcons 
                    name="star-circle" 
                    size={32} 
                    color={theme.colors.warning.main} 
                  />
                  <Typography variant="h6" color="white" weight="semibold" style={styles.rewardTitle}>
                    1000 Puan
                  </Typography>
                  <Typography variant="body2" color="secondary" align="center">
                    %20 İndirim
                  </Typography>
                </Layout>
              </Card>
              
              <Card variant="filled" style={styles.rewardCard} onPress={() => {}}>
                <Layout direction="column" align="center" padding="md">
                  <MaterialCommunityIcons 
                    name="star-circle" 
                    size={32} 
                    color={theme.colors.warning.main} 
                  />
                  <Typography variant="h6" color="white" weight="semibold" style={styles.rewardTitle}>
                    2000 Puan
                  </Typography>
                  <Typography variant="body2" color="secondary" align="center">
                    %30 İndirim
                  </Typography>
                </Layout>
              </Card>
            </Layout>
          </Section>

          {/* Statistics Section */}
          <Section padding="lg" margin="sm">
            <Typography variant="h4" color="white" weight="semibold" style={styles.sectionTitle}>
              İstatistikler
            </Typography>
            
            <StatCards 
              stats={[
                {
                  title: 'Toplam Harcama',
                  value: maintenanceRecord && maintenanceRecord.cost !== undefined ? `₺${maintenanceRecord.cost}` : 'Bilgi yok',
                  change: '+₺150',
                  trend: 'up' as const,
                  icon: 'wrench',
                  color: theme.colors.warning.main,
                  lastUpdate: maintenanceRecord?.date,
                },
                {
                  title: 'Bakım Sayısı',
                  value: maintenanceRecord ? '1' : '0',
                  change: '+2',
                  trend: 'up' as const,
                  icon: 'wrench',
                  color: theme.colors.success.main,
                  lastUpdate: maintenanceRecord?.date,
                },
                {
                  title: 'Ortalama Maliyet',
                  value: maintenanceRecord && maintenanceRecord.cost ? 
                    `₺${maintenanceRecord.cost}` : 'Bilgi yok',
                  change: '-₺50',
                  trend: 'down' as const,
                  icon: 'calculator',
                  color: theme.colors.primary.main,
                  lastUpdate: maintenanceRecord?.date,
                },
              ]} 
            />
          </Section>

          {/* Services Section */}
          <Section padding="lg" margin="sm">
            <Layout direction="row" justify="space-between" align="center" style={styles.servicesHeader}>
              <Typography variant="h4" color="white" weight="semibold">
                Hizmetler
              </Typography>
              
              <Button
                title={showAllServices ? "Daha Az Göster" : "Tümünü Göster"}
                onPress={() => setShowAllServices(!showAllServices)}
                variant="ghost"
                size="sm"
                icon={showAllServices ? "chevron-up" : "chevron-down"}
                iconPosition="right"
                style={styles.toggleButton}
              />
            </Layout>
            
            <ServicesGrid 
              services={showAllServices ? services : services.slice(0, 6)} 
              onServicePress={handleServicePress} 
            />
          </Section>

          {/* Bottom Spacing */}
          <Spacing size="xxl" />
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
    backgroundColor: theme.colors.background.default.dark,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xxl,
  },
  maintenanceButton: {
    marginTop: theme.spacing.md,
  },
  sectionTitle: {
    marginBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.dark,
    paddingBottom: theme.spacing.sm,
  },
  noDataCard: {
    backgroundColor: theme.colors.background.surface.dark,
    borderColor: theme.colors.border.dark,
  },
  rewardsGrid: {
    width: '100%',
  },
  rewardCard: {
    backgroundColor: theme.colors.background.surface.dark,
    borderColor: theme.colors.border.dark,
    flex: 1,
  },
  rewardTitle: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  servicesHeader: {
    marginBottom: theme.spacing.lg,
  },
  toggleButton: {
    backgroundColor: theme.colors.background.surface.dark,
  },
});

export default HomeScreen; 