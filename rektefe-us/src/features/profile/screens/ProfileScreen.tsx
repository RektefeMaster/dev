import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Alert,
  StatusBar,
  Dimensions,
  Modal,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, borderRadius, shadows, typography } from '@/shared/theme';
import { BackButton } from '@/shared/components';
import apiService, { ProfileService } from '@/shared/services';
import { useAuth } from '@/shared/context';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { user, isAuthenticated, logout, updateUser } = useAuth();
  const isAdmin = user?.email === 'testus@gmail.com';

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profileStats, setProfileStats] = useState({
    averageRating: 0.0,
    totalReviews: 0,
    completedJobs: 0,
    totalServices: 0,
    experienceYears: 0,
    totalEarnings: 0,
    ratingDistribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });
  const [recentReviews, setRecentReviews] = useState<any[]>([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [showCapabilitiesModal, setShowCapabilitiesModal] = useState(false);
  const [selectedCapabilities, setSelectedCapabilities] = useState<string[]>([]);
  const [portfolioImages, setPortfolioImages] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [showPortfolioModal, setShowPortfolioModal] = useState(false);
  const [showCertificatesModal, setShowCertificatesModal] = useState(false);
  const [showExperienceModal, setShowExperienceModal] = useState(false);
  const [experienceYears, setExperienceYears] = useState(0);

  const fetchProfileData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [statsRes, reviewsRes, appointmentsRes, walletRes] = await Promise.all([
        apiService.getRatingStats(),
        apiService.getRecentRatings(),
        apiService.getMechanicAppointments('completed'),
        apiService.getMechanicWallet(),
      ]);

      if (statsRes.success && statsRes.data) {
        setProfileStats(prev => ({
          ...prev,
          averageRating: statsRes.data.averageRating || 0.0,
          totalReviews: statsRes.data.totalRatings || 0,
          ratingDistribution: statsRes.data.ratingDistribution || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
        }));
      }

      if (reviewsRes.success && reviewsRes.data) {
        setRecentReviews(Array.isArray(reviewsRes.data) ? reviewsRes.data : []);
      }

      if (appointmentsRes.success && appointmentsRes.data) {
        const appointmentsData = appointmentsRes.data as any;
        const completedJobs = appointmentsData?.appointments?.length || appointmentsData?.length || 0;
        setProfileStats(prev => ({
          ...prev,
          completedJobs: completedJobs,
          totalServices: completedJobs
        }));
      }

      if (walletRes.success && walletRes.data) {
        setProfileStats(prev => ({
          ...prev,
          totalEarnings: walletRes.data.totalEarnings || 0
        }));
      }

      if (user?.experience) {
        setProfileStats(prev => ({
          ...prev,
          experienceYears: user.experience
        }));
        setExperienceYears(user.experience);
      }

    } catch (error: any) {
      Alert.alert('Hata', 'Profil bilgileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProfileData();
    }
  }, [isAuthenticated, fetchProfileData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfileData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Çıkış Yap', style: 'destructive', onPress: logout }
      ]
    );
  };

  const capabilities = [
    {
      id: 'tamir-bakim',
      title: 'Tamir Bakım',
      icon: 'construct',
      color: '#3B82F6',
      description: 'Genel bakım, ağır bakım, alt takım, üst takım, elektronik elektrik'
    },
    {
      id: 'arac-yikama',
      title: 'Araç Yıkama',
      icon: 'water',
      color: '#10B981',
      description: 'Otomatik yıkama, el ile yıkama, iç temizlik, cila ve wax'
    },
    {
      id: 'lastik',
      title: 'Lastik',
      icon: 'disc',
      color: '#F59E0B',
      description: 'Lastik değişimi, balans ayarı, rot ayarı, lastik oteli'
    },
    {
      id: 'cekici',
      title: 'Çekici',
      icon: 'car',
      color: '#EF4444',
      description: 'Arızalı araç çekme, yol yardımı, kaza çekici hizmetleri'
    }
  ];

  const handleCapabilityToggle = (capabilityId: string) => {
    setSelectedCapabilities(prev => 
      prev.includes(capabilityId) 
        ? prev.filter(id => id !== capabilityId)
        : [...prev, capabilityId]
    );
  };

  const handleSaveCapabilities = async () => {
    try {
      console.log('💾 PROFILE SCREEN: handleSaveCapabilities called - ProfileScreen');
      console.log('💾 PROFILE SCREEN: This is the ProfileScreen component');
      console.log('🔍 PROFILE SCREEN: ProfileService:', ProfileService);
      console.log('🔍 PROFILE SCREEN: ProfileService.updateServiceCategories:', ProfileService?.updateServiceCategories);
      setLoading(true);

      const response = await ProfileService.updateServiceCategories(selectedCapabilities);

      if (response.success) {
        updateUser({ serviceCategories: selectedCapabilities });

        Alert.alert(
          'Başarılı',
          'Hizmet alanlarınız başarıyla güncellendi.',
          [
            {
              text: 'Tamam',
              onPress: () => {
                setShowCapabilitiesModal(false);
              }
            }
          ]
        );
      } else {
        throw new Error(response.message || 'Yetenekler güncellenemedi');
      }
    } catch (error) {
      Alert.alert('Hata', 'Yetenekler güncellenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const addPortfolioImage = () => {
    const newImage = {
      uri: 'https://via.placeholder.com/200x150/3B82F6/FFFFFF?text=Referans+İş',
      title: `Referans İş ${portfolioImages.length + 1}`,
      id: Date.now().toString()
    };
    setPortfolioImages(prev => [...prev, newImage]);
  };

  const removePortfolioImage = (index: number) => {
    setPortfolioImages(prev => prev.filter((_, i) => i !== index));
  };

  const addCertificate = () => {
    const newCert = {
      uri: 'https://via.placeholder.com/200x150/10B981/FFFFFF?text=Sertifika',
      title: `Sertifika ${certificates.length + 1}`,
      id: Date.now().toString()
    };
    setCertificates(prev => [...prev, newCert]);
  };

  const removeCertificate = (index: number) => {
    setCertificates(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveExperience = async () => {
    try {
      setLoading(true);
      
      const response = await apiService.updateMechanicProfile({ experience: experienceYears });
      
      if (response.success) {
        updateUser({ experience: experienceYears });
        setProfileStats(prev => ({
          ...prev,
          experienceYears: experienceYears
        }));
        
        Alert.alert(
          'Başarılı',
          'Deneyim yılı başarıyla güncellendi.',
          [{ text: 'Tamam', onPress: () => setShowExperienceModal(false) }]
        );
      } else {
        throw new Error(response.message || 'Deneyim yılı güncellenemedi');
      }
    } catch (error) {
      Alert.alert('Hata', 'Deneyim yılı güncellenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <Ionicons name="person" size={40} color={colors.primary.main} />
          <Text style={styles.loadingText}>Profil yükleniyor...</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <BackButton />
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Profil</Text>
            </View>
            <View style={styles.headerPlaceholder} />
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary.main]}
            tintColor={colors.primary.main}
          />
        }
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {/* Profile Info Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0) || 'M'}
                </Text>
              </View>
            </View>
            
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {user?.name} {user?.surname}
              </Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
              <Text style={styles.profileLocation}>
                {user?.city || 'Konum belirtilmemiş'}
              </Text>
              <View style={styles.roleContainer}>
                <Ionicons name="construct" size={16} color={colors.primary.main} />
                <Text style={styles.roleText}>Usta</Text>
              </View>
              {isAdmin && (
                <View style={styles.adminBadge}>
                  <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
                  <Text style={styles.adminBadgeText}>Admin</Text>
                </View>
              )}
            </View>
          </View>
          
          {/* Deneyim Yılı Düzenleme */}
          <View style={styles.experienceSection}>
            <View style={styles.experienceHeader}>
              <Ionicons name="time" size={20} color={colors.primary.main} />
              <Text style={styles.experienceTitle}>Deneyim Yılı</Text>
            </View>
            <View style={styles.experienceContent}>
              <Text style={styles.experienceValue}>
                {profileStats.experienceYears} Yıl
              </Text>
              <TouchableOpacity
                style={styles.editExperienceButton}
                onPress={() => setShowExperienceModal(true)}
              >
                <Ionicons name="create-outline" size={16} color={colors.primary.main} />
                <Text style={styles.editExperienceText}>Düzenle</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="star" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.statValue}>{profileStats.averageRating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Ortalama Puan</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            </View>
            <Text style={styles.statValue}>{profileStats.completedJobs}</Text>
            <Text style={styles.statLabel}>Tamamlanan İş</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="construct" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.statValue}>{profileStats.totalServices}</Text>
            <Text style={styles.statLabel}>Toplam Hizmet</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="time" size={24} color="#8B5CF6" />
            </View>
            <Text style={styles.statValue}>{profileStats.experienceYears}</Text>
            <Text style={styles.statLabel}>Yıl Deneyim</Text>
          </View>
        </View>

        {/* Referans İşler Bölümü */}
        <View style={styles.portfolioSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="images" size={20} color={colors.primary.main} />
              <Text style={styles.sectionTitle}>Referans İşlerim</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowPortfolioModal(true)}
            >
              <Ionicons name="add" size={20} color={colors.primary.main} />
              <Text style={styles.addButtonText}>Ekle</Text>
            </TouchableOpacity>
          </View>
          
          {portfolioImages.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.portfolioScroll}
            >
              {portfolioImages.map((image, index) => (
                <View key={index} style={styles.portfolioItem}>
                  <Image source={{ uri: image.uri }} style={styles.portfolioImage} />
                  <TouchableOpacity
                    style={styles.removePortfolioButton}
                    onPress={() => removePortfolioImage(index)}
                  >
                    <Ionicons name="close" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text style={styles.portfolioTitle} numberOfLines={1}>
                    {image.title || 'Referans İş'}
                  </Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyPortfolio}>
              <Ionicons name="images-outline" size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyPortfolioText}>
                Henüz referans iş eklenmemiş
              </Text>
              <Text style={styles.emptyPortfolioSubtext}>
                En iyi işlerinizin fotoğraflarını ekleyerek müşterilere güven verin
              </Text>
            </View>
          )}
        </View>

        {/* Sertifikalar Bölümü */}
        <View style={styles.certificatesSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="ribbon" size={20} color={colors.primary.main} />
              <Text style={styles.sectionTitle}>Sertifikalarım</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowCertificatesModal(true)}
            >
              <Ionicons name="add" size={20} color={colors.primary.main} />
              <Text style={styles.addButtonText}>Ekle</Text>
            </TouchableOpacity>
          </View>
          
          {certificates.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.certificatesScroll}
            >
              {certificates.map((cert, index) => (
                <View key={index} style={styles.certificateItem}>
                  <Image source={{ uri: cert.uri }} style={styles.certificateImage} />
                  <TouchableOpacity
                    style={styles.removeCertificateButton}
                    onPress={() => removeCertificate(index)}
                  >
                    <Ionicons name="close" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text style={styles.certificateTitle} numberOfLines={1}>
                    {cert.title || 'Sertifika'}
                  </Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyCertificates}>
              <Ionicons name="ribbon-outline" size={48} color={colors.text.tertiary} />
              <Text style={styles.emptyCertificatesText}>
                Henüz sertifika eklenmemiş
              </Text>
              <Text style={styles.emptyCertificatesSubtext}>
                Mesleki sertifikalarınızı ekleyerek uzmanlığınızı kanıtlayın
              </Text>
            </View>
          )}
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => setShowCapabilitiesModal(true)}
          >
            <Ionicons name="construct" size={20} color={colors.primary.main} />
            <Text style={styles.actionButtonText}>Hizmet Alanları</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('Customers' as never)}
          >
            <Ionicons name="people" size={20} color={colors.primary.main} />
            <Text style={styles.actionButtonText}>Müşteri Defterim</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
        </View>

        {/* Çıkış Yap Butonu */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={styles.logoutButtonContent}>
              <Ionicons name="log-out-outline" size={24} color="#EF4444" />
              <Text style={styles.logoutButtonText}>Çıkış Yap</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Deneyim Yılı Modal */}
      <Modal
        visible={showExperienceModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowExperienceModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Deneyim Yılı</Text>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={handleSaveExperience}
              disabled={loading}
            >
              <Text style={styles.modalSaveText}>Kaydet</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Kaç yıllık deneyiminiz var? Bu bilgi müşterilere güven verecektir.
            </Text>
            
            <View style={styles.experienceInputContainer}>
              <Text style={styles.experienceInputLabel}>Deneyim Yılı</Text>
              <View style={styles.experienceInputRow}>
                <TouchableOpacity
                  style={styles.experienceButton}
                  onPress={() => setExperienceYears(Math.max(0, experienceYears - 1))}
                >
                  <Ionicons name="remove" size={20} color={colors.primary.main} />
                </TouchableOpacity>
                <Text style={styles.experienceValue}>{experienceYears}</Text>
                <TouchableOpacity
                  style={styles.experienceButton}
                  onPress={() => setExperienceYears(Math.min(50, experienceYears + 1))}
                >
                  <Ionicons name="add" size={20} color={colors.primary.main} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Portfolio Modal */}
      <Modal
        visible={showPortfolioModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowPortfolioModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Referans İşlerim</Text>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={addPortfolioImage}
            >
              <Text style={styles.modalSaveText}>Ekle</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              En iyi işlerinizin fotoğraflarını ekleyerek müşterilere güven verin.
            </Text>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.modalPortfolioScroll}
            >
              {portfolioImages.map((image, index) => (
                <View key={index} style={styles.modalPortfolioItem}>
                  <Image source={{ uri: image.uri }} style={styles.modalPortfolioImage} />
                  <TouchableOpacity
                    style={styles.modalRemoveButton}
                    onPress={() => removePortfolioImage(index)}
                  >
                    <Ionicons name="close" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Certificates Modal */}
      <Modal
        visible={showCertificatesModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCertificatesModal(false)}
            >
              <Ionicons name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Sertifikalarım</Text>
            <TouchableOpacity
              style={styles.modalSaveButton}
              onPress={addCertificate}
            >
              <Text style={styles.modalSaveText}>Ekle</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Mesleki sertifikalarınızı ekleyerek uzmanlığınızı kanıtlayın.
            </Text>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.modalCertificatesScroll}
            >
              {certificates.map((cert, index) => (
                <View key={index} style={styles.modalCertificateItem}>
                  <Image source={{ uri: cert.uri }} style={styles.modalCertificateImage} />
                  <TouchableOpacity
                    style={styles.modalRemoveButton}
                    onPress={() => removeCertificate(index)}
                  >
                    <Ionicons name="close" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Capabilities Modal - Admin düzenler, diğerleri görüntüler */}
      <Modal
        visible={showCapabilitiesModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCapabilitiesModal(false)}>
              <Text style={styles.modalCancelText}>{isAdmin ? 'İptal' : 'Kapat'}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Hizmet Alanlarım</Text>
            {isAdmin ? (
              <TouchableOpacity onPress={handleSaveCapabilities}>
                <Text style={styles.modalSaveText}>Kaydet</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.headerPlaceholder} />
            )}
          </View>
          
          <ScrollView style={styles.modalContent}>
            {isAdmin && (
              <View style={[styles.infoNoteContainer, { backgroundColor: '#FEF3C7', borderLeftColor: '#F59E0B' }]}>
                <Ionicons name="shield-checkmark" size={20} color="#F59E0B" />
                <Text style={styles.infoNoteText}>
                  Admin olarak hizmet kategorilerini düzenleyebilirsiniz.
                </Text>
              </View>
            )}
            
            <Text style={styles.modalDescription}>
              {isAdmin 
                ? 'Hizmet kategorilerini seçerek menünüzü özelleştirin.'
                : 'Kayıt sırasında belirlediğiniz hizmet alanlarınız aşağıda görüntülenmektedir.'}
            </Text>
            
            {!isAdmin && (
              <View style={styles.infoNoteContainer}>
                <Ionicons name="information-circle" size={20} color={colors.primary.main} />
                <Text style={styles.infoNoteText}>
                  Hizmet kategorinizi değiştirmek veya yeni hizmet eklemek için bizimle iletişime geçin.
                </Text>
              </View>
            )}
            
            <View style={styles.capabilitiesList}>
              {capabilities.map((capability) => {
                const isActive = isAdmin 
                  ? selectedCapabilities.includes(capability.id)
                  : (user?.serviceCategories?.includes(capability.id) || user?.serviceCategories?.includes(capability.title));
                
                if (isAdmin) {
                  return (
                    <TouchableOpacity
                      key={capability.id}
                      style={[
                        styles.capabilityCard,
                        {
                          backgroundColor: isActive ? capability.color + '20' : colors.background.secondary,
                          borderColor: isActive ? capability.color : colors.border.secondary,
                        }
                      ]}
                      onPress={() => handleCapabilityToggle(capability.id)}
                    >
                      <View style={styles.capabilityContent}>
                        <View style={[styles.capabilityIcon, { backgroundColor: capability.color }]}>
                          <Ionicons name={capability.icon as any} size={24} color="#FFFFFF" />
                        </View>
                        <View style={styles.capabilityText}>
                          <Text style={[styles.capabilityTitle, { color: colors.text.primary }]}>
                            {capability.title}
                          </Text>
                          <Text style={[styles.capabilityDescription, { color: colors.text.secondary }]}>
                            {capability.description}
                          </Text>
                        </View>
                        {isActive && <Ionicons name="checkmark-circle" size={24} color={capability.color} />}
                      </View>
                    </TouchableOpacity>
                  );
                } else {
                  return (
                    <View
                      key={capability.id}
                      style={[
                        styles.capabilityCard,
                        {
                          backgroundColor: isActive ? capability.color + '20' : colors.background.secondary,
                          borderColor: isActive ? capability.color : colors.border.secondary,
                          opacity: isActive ? 1 : 0.5,
                        }
                      ]}
                    >
                      <View style={styles.capabilityContent}>
                        <View style={[styles.capabilityIcon, { backgroundColor: capability.color }]}>
                          <Ionicons name={capability.icon as any} size={24} color="#FFFFFF" />
                        </View>
                        <View style={styles.capabilityText}>
                          <Text style={[styles.capabilityTitle, { color: colors.text.primary }]}>
                            {capability.title}
                          </Text>
                          <Text style={[styles.capabilityDescription, { color: colors.text.secondary }]}>
                            {capability.description}
                          </Text>
                        </View>
                        {isActive && <Ionicons name="checkmark-circle" size={24} color={capability.color} />}
                      </View>
                    </View>
                  );
                }
              })}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    backgroundColor: colors.background.primary,
    paddingTop: 0,
  },
  headerContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
    color: colors.text.inverse,
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },
  logoutSection: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadows.small,
  },
  logoutButton: {
    backgroundColor: '#FEF2F2',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    ...shadows.small,
  },
  logoutButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: spacing.sm,
    fontFamily: 'System',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: typography.body1.fontSize,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  profileCard: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    margin: spacing.lg,
    ...shadows.medium,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: typography.h1.fontSize,
    fontWeight: typography.h1.fontWeight,
    color: colors.text.inverse,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  profileEmail: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  profileLocation: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleText: {
    fontSize: typography.caption.small.fontSize,
    color: colors.primary.main,
    marginLeft: spacing.xs,
    fontWeight: '500',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
    ...shadows.small,
  },
  adminBadgeText: {
    fontSize: typography.caption.small.fontSize,
    color: '#FFFFFF',
    marginLeft: spacing.xs,
    fontWeight: '700',
  },
  infoNoteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primary.ultraLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary.main,
  },
  infoNoteText: {
    fontSize: typography.body3.fontSize,
    color: colors.text.primary,
    marginLeft: spacing.sm,
    flex: 1,
    lineHeight: 20,
  },
  experienceSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border.secondary,
  },
  experienceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  experienceTitle: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
  },
  experienceContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  experienceValue: {
    fontSize: typography.h2.fontSize,
    fontWeight: '700',
    color: colors.primary.main,
  },
  editExperienceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary.ultraLight,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  editExperienceText: {
    fontSize: typography.caption.small.fontSize,
    color: colors.primary.main,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  statCard: {
    width: '50%',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    alignItems: 'center',
    ...shadows.small,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: typography.h2.fontSize,
    fontWeight: typography.h2.fontWeight,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: typography.caption.small.fontSize,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  actionButtons: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.small,
  },
  actionButtonText: {
    flex: 1,
    fontSize: typography.body1.fontSize,
    color: colors.text.primary,
    marginLeft: spacing.sm,
    fontWeight: '500',
  },
  // Portfolio ve Sertifika Stilleri
  portfolioSection: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.medium,
  },
  certificatesSection: {
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.medium,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: colors.text.primary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary.ultraLight,
    borderRadius: borderRadius.sm,
    gap: spacing.xs,
  },
  addButtonText: {
    fontSize: typography.caption.small.fontSize,
    color: colors.primary.main,
    fontWeight: '500',
  },
  portfolioScroll: {
    marginTop: spacing.sm,
  },
  portfolioItem: {
    marginRight: spacing.md,
    alignItems: 'center',
  },
  portfolioImage: {
    width: 120,
    height: 90,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.primary,
  },
  removePortfolioButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.error.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  portfolioTitle: {
    fontSize: typography.caption.small.fontSize,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    maxWidth: 120,
  },
  emptyPortfolio: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyPortfolioText: {
    fontSize: typography.body1.fontSize,
    color: colors.text.secondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyPortfolioSubtext: {
    fontSize: typography.caption.small.fontSize,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  certificatesScroll: {
    marginTop: spacing.sm,
  },
  certificateItem: {
    marginRight: spacing.md,
    alignItems: 'center',
  },
  certificateImage: {
    width: 120,
    height: 90,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.primary,
  },
  removeCertificateButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.error.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  certificateTitle: {
    fontSize: typography.caption.small.fontSize,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    maxWidth: 120,
  },
  emptyCertificates: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyCertificatesText: {
    fontSize: typography.body1.fontSize,
    color: colors.text.secondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptyCertificatesSubtext: {
    fontSize: typography.caption.small.fontSize,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  // Modal Stilleri
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.secondary,
  },
  modalCloseButton: {
    padding: spacing.sm,
  },
  modalTitle: {
    fontSize: typography.h3.fontSize,
    fontWeight: typography.h3.fontWeight,
    color: colors.text.primary,
  },
  modalSaveButton: {
    padding: spacing.sm,
  },
  modalSaveText: {
    fontSize: typography.body1.fontSize,
    color: colors.primary.main,
    fontWeight: '600',
  },
  modalCancelText: {
    fontSize: typography.body1.fontSize,
    color: colors.text.secondary,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  modalDescription: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  experienceInputContainer: {
    marginTop: spacing.lg,
  },
  experienceInputLabel: {
    fontSize: typography.body1.fontSize,
    color: colors.text.primary,
    marginBottom: spacing.md,
    fontWeight: '500',
  },
  experienceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  experienceButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary.ultraLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalPortfolioScroll: {
    marginTop: spacing.md,
  },
  modalPortfolioItem: {
    marginRight: spacing.md,
    position: 'relative',
  },
  modalPortfolioImage: {
    width: 150,
    height: 120,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.secondary,
  },
  modalRemoveButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.error.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCertificatesScroll: {
    marginTop: spacing.md,
  },
  modalCertificateItem: {
    marginRight: spacing.md,
    position: 'relative',
  },
  modalCertificateImage: {
    width: 150,
    height: 120,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.secondary,
  },
  capabilitiesList: {
    marginTop: spacing.md,
  },
  capabilityCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    ...shadows.small,
  },
  capabilityContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  capabilityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  capabilityText: {
    flex: 1,
  },
  capabilityTitle: {
    fontSize: typography.body1.fontSize,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  capabilityDescription: {
    fontSize: typography.caption.small.fontSize,
    lineHeight: 16,
  },
});
