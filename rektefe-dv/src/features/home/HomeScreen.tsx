import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, SafeAreaView, TouchableOpacity, Text, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Background from '@/shared/components/Background';
import { useHomeData } from './hooks/useHomeData';
import { GreetingHeader } from './components/GreetingHeader';
import { StatCards } from './components/StatCards';
import { UpdateCardModal } from './components/UpdateCardModal';
import { AdDetailModal } from './components/AdDetailModal';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import LoadingSkeleton from '@/shared/components/LoadingSkeleton';
import ErrorState from '@/shared/components/ErrorState';
import EmptyState from '@/shared/components/NoDataCard';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { formatWorkingHours } from '@/shared/utils/workingHoursFormatter';

// Import theme values
import { useTheme } from '@/context/ThemeContext';
import { spacing } from '@/theme/theme';

const HomeScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  // Pending rating kontrolü
  useEffect(() => {
    const checkPendingRating = async () => {
      try {
        const pendingRating = await AsyncStorage.getItem('pendingRating');
        if (pendingRating) {
          const ratingData = JSON.parse(pendingRating);
          // Rating ekranına yönlendir
          navigation.navigate('Rating', {
            appointmentId: ratingData.appointmentId,
            mechanicId: ratingData.mechanicId,
            mechanicName: ratingData.mechanicName
          });
          
          // Pending rating'i temizle
          await AsyncStorage.removeItem('pendingRating');
          }
      } catch (error) {
        }
    };

    checkPendingRating();
  }, [navigation]);

  const {
    userName,
    favoriteCar,
    vehicles,
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
    nearestMechanic,
    userLocation,
    userId,
  } = useHomeData();


  const [refreshing, setRefreshing] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedCard, setSelectedCard] = useState<{ title: string; value: string } | null>(null);
  const [showAdModal, setShowAdModal] = useState(false);
  const [selectedAd, setSelectedAd] = useState<any>(null);

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

  const handleFaultReport = () => {
    navigation.navigate('FaultReport');
  };

  const handleFaultReportList = () => {
    navigation.navigate('FaultReportList');
  };

  const handleCreateBodyworkJob = () => {
    navigation.navigate('CreateBodyworkJob');
  };

  const handleMechanicDetail = () => {
    console.log('🔍 handleMechanicDetail: Fonksiyon çağrıldı');
    console.log('🔍 nearestMechanic:', nearestMechanic);
    
    if (nearestMechanic) {
      const mechanicData = {
        id: nearestMechanic._id,
        name: nearestMechanic.name,
        surname: nearestMechanic.surname,
        rating: nearestMechanic.rating,
        experience: nearestMechanic.experience,
        totalJobs: nearestMechanic.totalJobs,
        specialties: nearestMechanic.specialization || [],
        city: nearestMechanic.city,
        isAvailable: nearestMechanic.isAvailable,
        avatar: nearestMechanic.avatar,
        bio: nearestMechanic.bio,
      };
      
      console.log('🔍 Navigation parametreleri:', mechanicData);
      
      navigation.navigate('MechanicDetail', { 
        mechanic: mechanicData
      });
      
      console.log('✅ Navigation çağrısı yapıldı');
    } else {
      console.log('❌ nearestMechanic bulunamadı');
    }
  };

  const handleViewAllMechanics = () => {
    navigation.navigate('MechanicSearch');
  };

  const handleCampaignPress = (campaign: any) => {
    navigation.navigate('CampaignDetail', { campaignId: campaign.id });
  };

  const getServiceTypeIcon = (serviceType: string) => {
    const iconMap: { [key: string]: string } = {
      'Lastik Değişimi': 'car-tire',
      'Motor Bakımı': 'engine',
      'Fren Bakımı': 'car-brake-abs',
      'Klima Bakımı': 'air-conditioner',
      'Genel Bakım': 'wrench',
      'Tamir': 'hammer-wrench',
      'Araç Yıkama': 'car-wash',
      'Akü Değişimi': 'battery'
    };
    return iconMap[serviceType] || 'wrench';
  };

  const handleAdPress = (ad: any) => {
    setSelectedAd(ad);
    setShowAdModal(true);
  };

  const handleMaintenancePlan = () => {
    navigation.navigate('MaintenancePlan');
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background.primary }]}>
        <Background>
          <LoadingSkeleton variant="fullscreen" />
        </Background>
      </SafeAreaView>
    );
  }

  if (error && !refreshing) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background.primary }]}>
        <Background>
          <ErrorState 
            message={error} 
            onRetry={handleRefresh}
            title="Veri Yüklenemedi"
          />
        </Background>
      </SafeAreaView>
    );
  }

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
          bounces={true}
          decelerationRate="fast"
        >
          {/* Header Section */}
          <View style={[styles.section, styles.headerSection]}>
            <GreetingHeader userName={userName} favoriteCar={favoriteCar} userId={userId} />
          </View>

          {/* Hızlı İşlemler - Kampanyaların üstüne taşındı */}
          <View style={styles.quickActionsSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>Hızlı İşlemler</Text>
            
            <View style={styles.faultReportSection}>
              <TouchableOpacity 
                style={[styles.faultReportButton, { backgroundColor: theme.colors.error.main }]}
                onPress={handleFaultReport}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="alert-circle" size={20} color="white" />
                <Text style={styles.faultReportButtonText}>Arıza Bildir</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.faultReportListButton, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.primary }]}
                onPress={handleFaultReportList}
              >
                <MaterialCommunityIcons name="format-list-bulleted" size={24} color={theme.colors.primary.main} />
                <Text style={[styles.faultReportListButtonText, { color: theme.colors.text.primary }]}>Arıza Bildirimlerim</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={[styles.bodyworkJobButton, { backgroundColor: '#FF6B35' }]}
              onPress={handleCreateBodyworkJob}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="car-wrench" size={20} color="white" />
              <Text style={styles.bodyworkJobButtonText}>Kaporta İşi Oluştur</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.maintenanceButton, { backgroundColor: theme.colors.primary.main }]}
              onPress={handleMaintenancePlan}
            >
              <Text style={[styles.maintenanceButtonText, { color: theme.colors.text.inverse }]}>Bakım Planı Oluştur</Text>
            </TouchableOpacity>
          </View>

          {/* Campaigns Section - Hızlı işlemlerden sonra */}
          <View style={styles.campaignSection}>
            <View style={styles.campaignHeader}>
              <Text style={[styles.campaignTitle, { color: theme.colors.text.primary }]}>Özel Kampanyalar</Text>
              <View style={[styles.campaignDivider, { backgroundColor: theme.colors.primary.main }]} />
            </View>
            
            {(!campaigns || campaigns.length === 0) ? (
              <EmptyState
                icon="gift-outline"
                title="Henüz kampanya yok"
                subtitle="Yeni kampanyalar eklendikçe burada görünecek"
                actionText="Yenile"
                onActionPress={handleRefresh}
                style={styles.emptyState}
              />
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.campaignScrollContainer}
              >
                {campaigns.map((campaign, index) => (
                  <TouchableOpacity
                    key={campaign.id}
                    style={[styles.campaignCard, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.primary }]}
                    onPress={() => handleCampaignPress(campaign)}
                    activeOpacity={0.8}
                  >
                    {/* Image Container with Gradient Overlay */}
                    <View style={styles.imageContainer}>
                      <Image source={{ uri: campaign.image }} style={styles.campaignImage} resizeMode="cover" />
                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.3)']}
                        style={styles.imageGradient}
                      />
                      
                      {/* Discount Badge - Floating */}
                      <View style={[styles.discountBadge, { backgroundColor: theme.colors.primary.main }]}>
                        <Text style={styles.discountText}>{campaign.discount}</Text>
                      </View>
                      
                      {/* Company Info - Top Right */}
                      <View style={styles.companyInfoOverlay}>
                        <Text style={[styles.companyName, { color: 'white' }]}>{campaign.company}</Text>
                        {campaign.isVerified && (
                          <MaterialCommunityIcons name="check-circle" size={16} color="#4CAF50" />
                        )}
                      </View>
                    </View>
                    
                    <View style={styles.campaignContent}>
                      {/* Service Type Badge */}
                      <View style={[styles.serviceTypeBadge, { backgroundColor: theme.colors.background.secondary }]}>
                        <MaterialCommunityIcons 
                          name={getServiceTypeIcon(campaign.serviceType) as any} 
                          size={14} 
                          color={theme.colors.primary.main} 
                        />
                        <Text style={[styles.serviceTypeText, { color: theme.colors.primary.main }]}>
                          {campaign.serviceType}
                        </Text>
                      </View>

                      <Text style={[styles.campaignTitle, { color: theme.colors.text.primary }]} numberOfLines={2}>
                        {campaign.title}
                      </Text>
                      <Text style={[styles.campaignDescription, { color: theme.colors.text.secondary }]} numberOfLines={2}>
                        {campaign.description}
                      </Text>

                      <View style={styles.campaignFooter}>
                        {/* Rating and Location Row */}
                        <View style={styles.infoRow}>
                          <View style={styles.ratingContainer}>
                            <MaterialCommunityIcons name="star" size={14} color="#FFD700" />
                            <Text style={[styles.ratingText, { color: theme.colors.text.primary }]}>{campaign.rating}</Text>
                            <Text style={[styles.reviewCount, { color: theme.colors.text.secondary }]}>({campaign.reviewCount})</Text>
                          </View>

                          <View style={styles.locationContainer}>
                            <MaterialCommunityIcons name="map-marker" size={12} color={theme.colors.text.secondary} />
                            <Text style={[styles.locationText, { color: theme.colors.text.secondary }]} numberOfLines={1}>
                              {campaign.location.city}
                            </Text>
                          </View>
                        </View>

                        {/* Valid Until with Icon */}
                        <View style={styles.validUntilContainer}>
                          <MaterialCommunityIcons name="clock-outline" size={12} color={theme.colors.text.secondary} />
                          <Text style={[styles.validUntilText, { color: theme.colors.text.secondary }]}>
                            Geçerli: {new Date(campaign.validUntil).toLocaleDateString('tr-TR')}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
                
                {/* Tümünü Gör Butonu */}
                <TouchableOpacity 
                  style={[styles.viewAllCampaignsButton, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.primary }]}
                  onPress={() => {
                    Alert.alert('Bilgi', 'Tüm kampanyalar sayfası yakında eklenecek!');
                  }}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="gift" size={32} color={theme.colors.primary.main} />
                  <Text style={[styles.viewAllCampaignsButtonText, { color: theme.colors.text.primary }]}>
                    Tüm Kampanyaları Gör
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>

          {/* En Yakın Usta Kartı */}
          {nearestMechanic && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>En Yakın Usta</Text>
              {}
              
              <TouchableOpacity 
                style={[styles.mechanicCard, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.primary }]}
                onPress={handleMechanicDetail}
              >
                <View style={styles.mechanicHeader}>
                  <View style={styles.mechanicAvatarContainer}>
                    {nearestMechanic.avatar ? (
                      <Image 
                        source={{ uri: nearestMechanic.avatar }} 
                        style={styles.mechanicAvatar}
                      />
                    ) : (
                      <View style={[styles.mechanicAvatarPlaceholder, { backgroundColor: theme.colors.primary.light }]}>
                        <MaterialCommunityIcons name="account" size={24} color={theme.colors.primary.main} />
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.mechanicInfo}>
                    <Text style={[
                      styles.mechanicName, 
                      { 
                        color: theme.colors.text.primary,
                        fontSize: (() => {
                          const text = `${nearestMechanic.name} ${nearestMechanic.surname}`;
                          if (text.length > 25) return 16;
                          if (text.length > 20) return 18;
                          return 20;
                        })()
                      }
                    ]}>
                      {nearestMechanic.name} {nearestMechanic.surname}
                    </Text>
                    {nearestMechanic.shopName && (
                      <Text style={[
                        styles.mechanicShop, 
                        { 
                          color: theme.colors.text.secondary,
                          fontSize: (() => {
                            const text = nearestMechanic.shopName || '';
                            if (text.length > 20) return 12;
                            if (text.length > 15) return 14;
                            return 16;
                          })()
                        }
                      ]}>
                        {nearestMechanic.shopName}
                      </Text>
                    )}
                    <Text style={[
                      styles.mechanicLocation, 
                      { 
                        color: theme.colors.text.secondary,
                        fontSize: (() => {
                          const text = `${nearestMechanic.city} ${nearestMechanic.district ? `• ${nearestMechanic.district}` : ''}`;
                          if (text.length > 25) return 12;
                          if (text.length > 20) return 14;
                          return 16;
                        })()
                      }
                    ]}>
                      {nearestMechanic.city} {nearestMechanic.district && `• ${nearestMechanic.district}`}
                    </Text>
                  </View>
                  
                  <View style={styles.mechanicRating}>
                    <MaterialCommunityIcons name="star" size={16} color={theme.colors.warning.main} />
                    <Text style={[styles.mechanicRatingText, { color: theme.colors.text.primary }]}>
                      {nearestMechanic.rating.toFixed(1)}
                    </Text>
                    <Text style={[styles.mechanicRatingCount, { color: theme.colors.text.secondary }]}>
                      (0)
                    </Text>
                  </View>
                </View>
                
                <View style={styles.mechanicDetails}>
                  {/* Mesafe ve Konum Bilgisi */}
                  <View style={styles.mechanicLocationInfo}>
                    <View style={styles.mechanicLocationItem}>
                      <MaterialCommunityIcons name="map-marker" size={16} color={theme.colors.primary.main} />
                      <Text style={[styles.mechanicLocationText, { color: theme.colors.text.secondary }]}>
                        {nearestMechanic.formattedDistance}
                      </Text>
                    </View>
                    {nearestMechanic.fullAddress && (
                      <View style={styles.mechanicAddressItem}>
                        <MaterialCommunityIcons name="home" size={16} color={theme.colors.text.secondary} />
                        <Text style={[styles.mechanicAddressText, { color: theme.colors.text.secondary }]} numberOfLines={2}>
                          {nearestMechanic.fullAddress}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* İstatistikler */}
                  <View style={styles.mechanicStats}>
                    <View style={styles.mechanicStatItem}>
                      <MaterialCommunityIcons name="briefcase" size={16} color={theme.colors.text.secondary} />
                      <Text style={[styles.mechanicStatText, { color: theme.colors.text.secondary }]}>
                        {nearestMechanic.experience} yıl deneyim
                      </Text>
                    </View>
                    <View style={styles.mechanicStatItem}>
                      <MaterialCommunityIcons name="wrench" size={16} color={theme.colors.text.secondary} />
                      <Text style={[styles.mechanicStatText, { color: theme.colors.text.secondary }]}>
                        {nearestMechanic.totalJobs} iş tamamlandı
                      </Text>
                    </View>
                  </View>
                  
                  {/* Uzmanlık Alanları */}
                  {nearestMechanic.specialization && nearestMechanic.specialization.length > 0 && (
                    <View style={styles.mechanicSpecialization}>
                      <Text style={[styles.mechanicSpecializationTitle, { color: theme.colors.text.primary }]}>
                        Uzmanlık Alanları:
                      </Text>
                      <Text style={[styles.mechanicSpecializationText, { color: theme.colors.text.secondary }]}>
                        {nearestMechanic.specialization.slice(0, 3).join(', ')}
                        {nearestMechanic.specialization.length > 3 && '...'}
                      </Text>
                    </View>
                  )}

                  {/* İletişim Bilgileri */}
                  {(nearestMechanic.phone || nearestMechanic.workingHours) && (
                    <View style={styles.mechanicContactInfo}>
                      {nearestMechanic.phone && (
                        <View style={styles.mechanicContactItem}>
                          <MaterialCommunityIcons name="phone" size={16} color={theme.colors.text.secondary} />
                          <Text style={[styles.mechanicContactText, { color: theme.colors.text.secondary }]}>
                            {nearestMechanic.phone}
                          </Text>
                        </View>
                      )}
                      {nearestMechanic.workingHours && (
                        <View style={styles.mechanicContactItem}>
                          <MaterialCommunityIcons name="clock" size={16} color={theme.colors.text.secondary} />
                          <Text style={[styles.mechanicContactText, { color: theme.colors.text.secondary }]}>
                            {formatWorkingHours(nearestMechanic.workingHours)}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
                
                <View style={styles.mechanicFooter}>
                  <View style={[styles.mechanicStatus, { backgroundColor: nearestMechanic.isAvailable ? theme.colors.success.light : theme.colors.error.light }]}>
                    <View style={[styles.mechanicStatusDot, { backgroundColor: nearestMechanic.isAvailable ? theme.colors.success.main : theme.colors.error.main }]} />
                    <Text style={[styles.mechanicStatusText, { color: nearestMechanic.isAvailable ? theme.colors.success.main : theme.colors.error.main }]}>
                      {nearestMechanic.isAvailable ? 'Müsait' : 'Meşgul'}
                    </Text>
                  </View>
                  
                  <View style={styles.mechanicAction}>
                    <Text style={[styles.mechanicActionText, { color: theme.colors.primary.main }]}>
                      Detay Gör
                    </Text>
                    <MaterialCommunityIcons name="chevron-right" size={16} color={theme.colors.primary.main} />
                  </View>
                </View>
              </TouchableOpacity>
              
              {/* Tümünü Gör Butonu */}
              <TouchableOpacity 
                style={[styles.viewAllButton, { backgroundColor: theme.colors.background.card, borderColor: theme.colors.border.primary }]}
                onPress={handleViewAllMechanics}
              >
                <MaterialCommunityIcons name="format-list-bulleted" size={20} color={theme.colors.primary.main} />
                <Text style={[styles.viewAllButtonText, { color: theme.colors.primary.main }]}>
                  Tümünü Gör
                </Text>
                <MaterialCommunityIcons name="chevron-right" size={16} color={theme.colors.primary.main} />
              </TouchableOpacity>
            </View>
          )}

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
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
    paddingTop: 16,
  },
  headerSection: {
    marginBottom: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
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
  emptyState: {
    marginVertical: spacing.lg,
  },
  favoriteCarCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  favoriteCarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  favoriteCarTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  favoriteCarInfo: {
    marginLeft: 32,
  },
  favoriteCarName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  favoriteCarDetails: {
    fontSize: 14,
  },
  faultReportSection: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  faultReportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  faultReportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  faultReportListButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  faultReportListButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  bodyworkJobButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  bodyworkJobButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  mechanicCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  mechanicHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  mechanicAvatarContainer: {
    marginRight: 12,
  },
  mechanicAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  mechanicAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mechanicInfo: {
    flex: 1,
    marginRight: 8,
  },
  mechanicName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  mechanicShop: {
    fontSize: 14,
    marginBottom: 2,
  },
  mechanicLocation: {
    fontSize: 14,
  },
  mechanicRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mechanicRatingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  mechanicRatingCount: {
    fontSize: 14,
  },
  mechanicDetails: {
    marginBottom: 16,
  },
  mechanicStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  mechanicStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mechanicStatText: {
    fontSize: 14,
  },
  mechanicSpecialization: {
    marginTop: 8,
  },
  mechanicSpecializationTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  mechanicSpecializationText: {
    fontSize: 14,
    lineHeight: 20,
  },
  mechanicFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mechanicStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  mechanicStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mechanicStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  mechanicAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mechanicActionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  mechanicLocationInfo: {
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  mechanicLocationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  mechanicLocationText: {
    fontSize: 16,
    fontWeight: '600',
  },
  mechanicAddressItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  mechanicAddressText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  mechanicContactInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  mechanicContactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  mechanicContactText: {
    fontSize: 14,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  viewAllButtonText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginLeft: 12,
  },
  vehiclesScrollView: {
    marginTop: 8,
  },
  addVehicleCard: {
    width: 120,
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  addVehicleText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
  },
  vehicleCard: {
    width: 160,
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginRight: 12,
    justifyContent: 'space-between',
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  vehicleInfo: {
    marginLeft: 8,
    flex: 1,
  },
  vehicleModel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  vehicleYear: {
    fontSize: 12,
  },
  vehicleStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  campaignSection: {
    paddingTop: 24,
    paddingBottom: 32,
  },
  campaignHeader: {
    marginBottom: 20,
    alignItems: 'center',
  },
  campaignTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  campaignDivider: {
    height: 3,
    borderRadius: 2,
    width: 60,
  },
  campaignScrollContainer: {
    paddingHorizontal: 8,
  },
  campaignCard: {
    width: 280,
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imageContainer: {
    position: 'relative',
    height: 120,
  },
  campaignImage: {
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  discountBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  discountText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  companyInfoOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  companyName: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  campaignContent: {
    flex: 1,
    padding: 16,
  },
  serviceTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  serviceTypeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  campaignDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
    opacity: 0.8,
  },
  campaignFooter: {
    marginTop: 'auto',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 11,
    marginLeft: 4,
    opacity: 0.7,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 12,
  },
  locationText: {
    fontSize: 11,
    marginLeft: 4,
    opacity: 0.8,
  },
  validUntilContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  validUntilText: {
    fontSize: 11,
    marginLeft: 4,
    opacity: 0.7,
  },
  viewAllCampaignsButton: {
    width: 280,
    height: 200,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  viewAllCampaignsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default HomeScreen;
