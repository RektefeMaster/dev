import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  Alert, 
  SafeAreaView, 
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Text
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useTheme } from '../../context/ThemeContext';
import theme from '../../theme/theme';

// Import components
import { useHomeData } from './HomeScreen/hooks/useHomeData';
import { GreetingHeader } from './HomeScreen/components/GreetingHeader';
import { QuickAccess } from './HomeScreen/components/QuickAccess';
import { StatCards } from './HomeScreen/components/StatCards';
import { CampaignCarousel } from './HomeScreen/components/CampaignCarousel';
import { ServicesGrid } from './HomeScreen/components/ServicesGrid';
import { UpdateCardModal } from './HomeScreen/components/UpdateCardModal';
import { AdDetailModal } from './HomeScreen/components/AdDetailModal';
import LoadingSkeleton from '../../components/LoadingSkeleton';
import ErrorState from '../../components/ErrorState';
import NoDataCard from '../../components/NoDataCard';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Professional Color Palette
const colors = {
  // Primary Colors
  primary: {
    main: '#2563EB',      // Blue 600
    light: '#3B82F6',     // Blue 500
    dark: '#1D4ED8',      // Blue 700
    contrast: '#FFFFFF',
  },
  secondary: {
    main: '#7C3AED',      // Violet 600
    light: '#8B5CF6',     // Violet 500
    dark: '#6D28D9',      // Violet 700
    contrast: '#FFFFFF',
  },
  success: {
    main: '#059669',      // Emerald 600
    light: '#10B981',     // Emerald 500
    dark: '#047857',      // Emerald 700
    contrast: '#FFFFFF',
  },
  warning: {
    main: '#D97706',      // Amber 600
    light: '#F59E0B',     // Amber 500
    dark: '#B45309',      // Amber 700
    contrast: '#FFFFFF',
  },
  error: {
    main: '#DC2626',      // Red 600
    light: '#EF4444',     // Red 500
    dark: '#B91C1C',      // Red 700
    contrast: '#FFFFFF',
  },
  
  // Neutral Colors
  neutral: {
    50: '#F8FAFC',        // Slate 50
    100: '#F1F5F9',       // Slate 100
    200: '#E2E8F0',       // Slate 200
    300: '#CBD5E1',       // Slate 300
    400: '#94A3B8',       // Slate 400
    500: '#64748B',       // Slate 500
    600: '#475569',       // Slate 600
    700: '#334155',       // Slate 700
    800: '#1E293B',       // Slate 800
    900: '#0F172A',       // Slate 900
  },
  
  // Text Colors
  text: {
    primary: '#1E293B',   // Slate 800
    secondary: '#475569', // Slate 600
    tertiary: '#64748B',  // Slate 500
    disabled: '#94A3B8',  // Slate 400
    inverse: '#FFFFFF',   // White
  },
  
  // Background Colors
  background: {
    primary: '#FFFFFF',   // White
    secondary: '#F8FAFC', // Slate 50
    tertiary: '#F1F5F9', // Slate 100
    card: '#FFFFFF',      // White
    surface: '#F8FAFC',   // Slate 50
  },
  
  // Border Colors
  border: {
    light: '#E2E8F0',     // Slate 200
    medium: '#CBD5E1',    // Slate 300
    dark: '#94A3B8',      // Slate 400
  }
};

// Dark Mode Colors
const darkColors = {
  // Primary Colors (same for consistency)
  primary: colors.primary,
  secondary: colors.secondary,
  success: colors.success,
  warning: colors.warning,
  error: colors.error,
  
  // Neutral Colors
  neutral: {
    50: '#0F172A',        // Slate 900
    100: '#1E293B',       // Slate 800
    200: '#334155',       // Slate 700
    300: '#475569',       // Slate 600
    400: '#64748B',       // Slate 500
    500: '#94A3B8',       // Slate 400
    600: '#CBD5E1',       // Slate 300
    700: '#E2E8F0',       // Slate 200
    800: '#F1F5F9',       // Slate 100
    900: '#F8FAFC',       // Slate 50
  },
  
  // Text Colors
  text: {
    primary: '#F8FAFC',   // Slate 50
    secondary: '#E2E8F0', // Slate 200
    tertiary: '#CBD5E1',  // Slate 300
    disabled: '#64748B',  // Slate 500
    inverse: '#0F172A',   // Slate 900
  },
  
  // Background Colors
  background: {
    primary: '#0F172A',   // Slate 900
    secondary: '#1E293B', // Slate 800
    tertiary: '#334155',  // Slate 700
    card: '#1E293B',      // Slate 800
    surface: '#334155',   // Slate 700
  },
  
  // Border Colors
  border: {
    light: '#475569',     // Slate 600
    medium: '#64748B',    // Slate 500
    dark: '#94A3B8',      // Slate 400
  }
};

import { translateServiceName } from '../../../utils/serviceTranslator';

const services = [
  { title: 'Ağır Bakım', icon: 'wrench', color: colors.primary.main, gradient: [colors.primary.main, colors.primary.dark] },
  { title: 'Genel Bakım', icon: 'tools', color: colors.success.main, gradient: [colors.success.main, colors.success.dark] },
  { title: 'Alt Takım', icon: 'cog', color: colors.warning.main, gradient: [colors.warning.main, colors.warning.dark] },
  { title: 'Üst Takım', icon: 'nut', color: colors.secondary.main, gradient: [colors.secondary.main, colors.secondary.dark] },
  { title: 'Kaporta/Boya', icon: 'spray', color: colors.error.main, gradient: [colors.error.main, colors.error.dark] },
  { title: 'Elektrik', icon: 'lightning-bolt', color: colors.warning.main, gradient: [colors.warning.main, colors.warning.dark] },
  { title: 'Yedek Parça', icon: 'car-wash', color: colors.secondary.main, gradient: [colors.secondary.main, colors.secondary.dark] },
  { title: 'Lastik', icon: 'tire', color: colors.primary.main, gradient: [colors.primary.main, colors.primary.dark] },
  { title: 'Egzoz', icon: 'smoke', color: colors.secondary.main, gradient: [colors.secondary.main, colors.secondary.dark] },
  { title: 'Ekspertiz', icon: 'magnify', color: colors.warning.main, gradient: [colors.warning.main, colors.warning.dark] },
  { title: 'Sigorta', icon: 'shield-check', color: colors.success.main, gradient: [colors.success.main, colors.success.dark] },
  { title: 'Araç Yıkama', icon: 'car-wash', color: colors.primary.main, gradient: [colors.primary.main, colors.primary.dark] },
];

const HomeScreen = () => {
  const { isDark } = useTheme();
  const currentColors = isDark ? darkColors : colors;
  
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
  const [todaysAppointments, setTodaysAppointments] = useState<any[]>([]);

  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  // Bugünkü randevuları getir
  useEffect(() => {
    const fetchTodaysAppointments = async () => {
      try {
        // Bu kısım API çağrısı için gerekli
        // Şimdilik boş bırakıyoruz
      } catch (error) {
        console.error('Bugünkü randevular yüklenirken hata:', error);
      }
    };

    fetchTodaysAppointments();
  }, []);

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
    <SafeAreaView style={[styles.safeArea, { 
      backgroundColor: currentColors.background.primary
    }]}>
      <StatusBar 
        barStyle={isDark ? "light-content" : "dark-content"} 
        backgroundColor={currentColors.background.primary} 
        translucent 
      />
      
      {/* Modern Background */}
      <LinearGradient
        colors={isDark 
          ? [currentColors.background.primary, currentColors.background.secondary, currentColors.primary.dark + '20']
          : [currentColors.background.primary, currentColors.background.secondary, currentColors.primary.light + '10']
        }
        style={styles.background}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              colors={[currentColors.primary.main]}
              tintColor={currentColors.primary.main}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.headerSection}>
            <GreetingHeader userName={userName} favoriteCar={favoriteCar} />
            
            {/* Modern Maintenance Button */}
            <TouchableOpacity
              style={styles.maintenanceButton}
              onPress={handleMaintenancePlan}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[currentColors.primary.main, currentColors.primary.dark]}
                style={styles.maintenanceGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <MaterialCommunityIcons name="wrench" size={24} color={currentColors.primary.contrast} />
                <View style={styles.maintenanceTextContainer}>
                  <Text style={[styles.maintenanceTitle, { color: currentColors.primary.contrast }]}>
                    Bakım Planla
                  </Text>
                  <Text style={[styles.maintenanceSubtitle, { color: currentColors.primary.contrast + 'CC' }]}>
                    Aracınızı uzman ellere emanet edin
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color={currentColors.primary.contrast} />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Quick Access Cards - Modern Grid */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { 
                color: currentColors.text.primary
              }]}>
                Hızlı Erişim
              </Text>
              <Text style={[styles.sectionSubtitle, { 
                color: currentColors.text.secondary
              }]}>
                Araç durumunuzu tek bakışta görün
              </Text>
            </View>
            
            <QuickAccess 
              cards={[
                {
                  title: 'Son Bakım',
                  value: maintenanceRecord && maintenanceRecord.date ? new Date(maintenanceRecord.date).toLocaleDateString('tr-TR') : 'Bilgi yok',
                  icon: 'wrench',
                  color: currentColors.warning.main,
                  lastUpdate: maintenanceRecord?.date,
                  isClickable: !!maintenanceRecord,
                },
                {
                  title: 'Araç Durumu',
                  value: vehicleStatus && vehicleStatus.overallStatus ? vehicleStatus.overallStatus : 'Bilgi yok',
                  icon: 'car-cog',
                  color: currentColors.success.main,
                  lastUpdate: vehicleStatus?.lastCheck,
                  isClickable: !!vehicleStatus,
                },
                {
                  title: 'Sigorta',
                  value: insuranceInfo && insuranceInfo.company ? `${insuranceInfo.company} - ${insuranceInfo.type}` : 'Bilgi yok',
                  icon: 'shield-check',
                  color: currentColors.primary.main,
                  lastUpdate: insuranceInfo?.endDate,
                  isClickable: !!insuranceInfo,
                },
                {
                  title: 'Lastik Durumu',
                  value: tireStatus ? tireStatus : 'Bilgi yok',
                  icon: 'tire',
                  color: currentColors.error.main,
                  lastUpdate: tireStatus,
                  isClickable: !!tireStatus,
                },
                {
                  title: 'Usta Ara',
                  value: 'Randevu al',
                  icon: 'account-wrench',
                  color: currentColors.secondary.main,
                  isClickable: true,
                },
              ]} 
              onCardPress={handleCardPress}
            />
          </View>

          {/* Campaigns Section - Modern Cards */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { 
                color: currentColors.text.primary
              }]}>
                🎯 Kampanyalar
              </Text>
              <Text style={[styles.sectionSubtitle, { 
                color: currentColors.text.secondary
              }]}>
                Kaçırmayın, sınırlı süre!
              </Text>
            </View>
            
            {(!campaigns || campaigns.length === 0) ? (
              <View style={[styles.noDataCard, { 
                backgroundColor: currentColors.background.surface,
                borderColor: currentColors.border.light
              }]}>
                <NoDataCard text="Kampanya bulunamadı" />
              </View>
            ) : (
              <CampaignCarousel 
                campaigns={campaigns} 
                onCampaignPress={handleCampaignPress} 
              />
            )}
          </View>

          {/* Rewards Section - Modern Grid */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { 
                color: currentColors.text.primary
              }]}>
                ⭐ Tefe Puanla İndirimler
              </Text>
              <Text style={[styles.sectionSubtitle, { 
                color: currentColors.text.secondary
              }]}>
                Puanlarınızı değerlendirin
              </Text>
            </View>
            
            <View style={styles.rewardsGrid}>
              {[
                { points: '500', discount: '10%', color: currentColors.warning.main },
                { points: '1000', discount: '20%', color: currentColors.success.main },
                { points: '2000', discount: '30%', color: currentColors.primary.main },
              ].map((reward, index) => (
                <TouchableOpacity key={index} style={styles.rewardCard} activeOpacity={0.8}>
                  <View style={[styles.rewardContainer, { 
                    backgroundColor: currentColors.background.card,
                    borderColor: currentColors.border.light
                  }]}>
                    <View style={[styles.rewardIcon, { backgroundColor: reward.color + '20' }]}>
                      <MaterialCommunityIcons 
                        name="star-circle" 
                        size={28} 
                        color={reward.color} 
                      />
                    </View>
                    <Text style={[styles.rewardPoints, { 
                      color: currentColors.text.primary
                    }]}>
                      {reward.points} Puan
                    </Text>
                    <Text style={[styles.rewardDiscount, { 
                      color: currentColors.text.secondary
                    }]}>
                      %{reward.discount} İndirim
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Statistics Section - Modern Cards */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { 
                color: currentColors.text.primary
              }]}>
                📊 İstatistikler
              </Text>
              <Text style={[styles.sectionSubtitle, { 
                color: currentColors.text.secondary
              }]}>
                Bakım geçmişinizi takip edin
              </Text>
            </View>
            
            <StatCards 
              stats={[
                {
                  title: 'Toplam Harcama',
                  value: maintenanceRecord && maintenanceRecord.cost !== undefined ? `₺${maintenanceRecord.cost}` : 'Bilgi yok',
                  change: '+₺150',
                  trend: 'up' as const,
                  icon: 'wrench',
                  color: currentColors.warning.main,
                  lastUpdate: maintenanceRecord?.date,
                },
                {
                  title: 'Bakım Sayısı',
                  value: maintenanceRecord ? '1' : '0',
                  change: '+2',
                  trend: 'up' as const,
                  icon: 'wrench',
                  color: currentColors.success.main,
                  lastUpdate: maintenanceRecord?.date,
                },
                {
                  title: 'Ortalama Maliyet',
                  value: maintenanceRecord && maintenanceRecord.cost ? 
                    `₺${maintenanceRecord.cost}` : 'Bilgi yok',
                  change: '-₺50',
                  trend: 'down' as const,
                  icon: 'calculator',
                  color: currentColors.primary.main,
                  lastUpdate: maintenanceRecord?.date,
                },
              ]}
            />
          </View>

          {/* Today's Appointments - Modern List */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { 
                color: currentColors.text.primary
              }]}>
                📅 Bugünkü Program
              </Text>
              <Text style={[styles.sectionSubtitle, { 
                color: currentColors.text.secondary
              }]}>
                Randevularınızı takip edin
              </Text>
            </View>
            
            {todaysAppointments.length === 0 ? (
              <View style={[styles.noDataCard, { 
                backgroundColor: currentColors.background.surface,
                borderColor: currentColors.border.light
              }]}>
                <NoDataCard text="Bugün için onaylanan randevunuz bulunmuyor" />
              </View>
            ) : (
              <View style={styles.appointmentsContainer}>
                {todaysAppointments.map((appointment, index) => (
                  <View key={index} style={[styles.appointmentCard, { 
                    backgroundColor: currentColors.background.card,
                    borderColor: currentColors.border.light
                  }]}>
                    <View style={styles.appointmentHeader}>
                      <View style={[styles.appointmentIcon, { backgroundColor: currentColors.success.main + '20' }]}>
                        <MaterialCommunityIcons 
                          name="calendar-check" 
                          size={20} 
                          color={currentColors.success.main} 
                        />
                      </View>
                      <View style={styles.appointmentInfo}>
                        <Text style={[styles.appointmentTitle, { 
                          color: currentColors.text.primary
                        }]}>
                          {translateServiceName(appointment.serviceType)}
                        </Text>
                        <Text style={[styles.appointmentTime, { 
                          color: currentColors.text.secondary
                        }]}>
                          {new Date(appointment.appointmentDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} • {appointment.mechanicId?.userId?.name} {appointment.mechanicId?.userId?.surname}
                        </Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: currentColors.success.main }]}>
                        <Text style={styles.statusBadgeText}>
                          {appointment.status === 'confirmed' ? 'Onaylandı' : 'Devam Ediyor'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.appointmentDetails}>
                      <Text style={[styles.appointmentCar, { 
                        color: currentColors.text.secondary
                      }]}>
                        {appointment.vehicleId?.brand} {appointment.vehicleId?.modelName} ({appointment.vehicleId?.plateNumber})
                      </Text>
                      {appointment.notes && (
                        <Text style={[styles.appointmentNotes, { 
                          color: currentColors.text.secondary
                        }]}>
                          Not: {appointment.notes}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Services Section - Modern Grid */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.servicesHeaderLeft}>
                <Text style={[styles.sectionTitle, { 
                  color: currentColors.text.primary
                }]}>
                  🛠️ Hizmetler
                </Text>
                <Text style={[styles.sectionSubtitle, { 
                  color: currentColors.text.secondary
                }]}>
                  İhtiyacınız olan her şey
                </Text>
              </View>
              
              <TouchableOpacity
                style={[styles.toggleButton, { 
                  backgroundColor: currentColors.background.card,
                  borderColor: currentColors.border.light
                }]}
                onPress={() => setShowAllServices(!showAllServices)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons 
                  name={showAllServices ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={currentColors.text.secondary} 
                />
                <Text style={[styles.toggleButtonText, { 
                  color: currentColors.text.secondary
                }]}>
                  {showAllServices ? "Daha Az" : "Tümü"}
                </Text>
              </TouchableOpacity>
            </View>
            
                    <ServicesGrid
          services={showAllServices ? services : services.slice(0, 6)}
          onServicePress={handleServicePress}
        />
          </View>

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>
      </LinearGradient>

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
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 30,
  },
  maintenanceButton: {
    marginTop: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  maintenanceGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingHorizontal: 24,
  },
  maintenanceTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  maintenanceTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  maintenanceSubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  servicesHeaderLeft: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8,
  },
  noDataCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  rewardsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  rewardCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  rewardContainer: {
    padding: 16,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  rewardIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  rewardPoints: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  rewardDiscount: {
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  appointmentsContainer: {
    gap: 16,
  },
  appointmentCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  appointmentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  appointmentTime: {
    fontSize: 14,
    opacity: 0.8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  appointmentDetails: {
    marginTop: 8,
  },
  appointmentCar: {
    fontSize: 14,
    marginBottom: 4,
  },
  appointmentNotes: {
    fontSize: 14,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  bottomSpacing: {
    height: 40,
  },
});

export default HomeScreen;
