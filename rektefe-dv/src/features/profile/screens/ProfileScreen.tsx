import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal, TextInput, Switch, Alert, Platform, Animated, ScrollView, KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService, api } from '@/shared/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '@/context/AuthContext';
import { colors as themeColors, typography, spacing, borderRadius, shadows, dimensions } from '@/theme/theme';

const defaultAvatar = require('../../../../assets/default_avatar.png');

const ProfileScreen = () => {
  const navigation = useNavigation();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [showEmail, setShowEmail] = useState(true);
  const [showPhone, setShowPhone] = useState(true);
  const [avatarScale] = useState(new Animated.Value(1));
  const { logout } = useAuth();

  // Dinamik profil tamamlama oranı
  const profileFields = [user?.name, user?.surname, user?.email, user?.phone, user?.city, user?.bio];
  const filledFields = profileFields.filter(Boolean).length;
  const profileCompletion = filledFields / profileFields.length;

  const { token, userId } = useAuth();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (!token || !userId) {
          return;
        }
        
        console.log('🔍 ProfileScreen: getUserProfile çağrılıyor...');
        const data = await apiService.getUserProfile();
        console.log('🔍 ProfileScreen: Raw API response:', data);
        
        // API response formatı kontrol et
        const userData = data && data.success && data.data ? data.data : data;
        console.log('🔍 ProfileScreen: Processed userData:', userData);
        
        setUser(userData);
        setEditData({
          name: userData.name || '',
          surname: userData.surname || '',
          email: userData.email || '',
          phone: userData.phone || '',
          city: userData.city || '',
          bio: userData.bio || '',
          emailHidden: userData.emailHidden || false,
          phoneHidden: userData.phoneHidden || false,
          tefeHidden: userData.tefeHidden || false
        });
        setShowEmail(!(userData.emailHidden));
        setShowPhone(!(userData.phoneHidden));
      } catch (e) {
        console.error('❌ ProfileScreen: Error fetching user:', e);
        Alert.alert('Hata', 'Kullanıcı bilgileri alınamadı.');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [token, userId]);

  const handleEditChange = (field: string, value: string | boolean) => {
    setEditData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    try {
      if (!token || !userId) {
        Alert.alert('Hata', 'Kullanıcı bilgisi bulunamadı.');
        return;
      }
      
      await api.put(`/users/profile`, editData);
      // Profil güncelleme sonrası kullanıcı verisini tekrar çek
      const data = await apiService.getUserProfile();
      const userData = data && data.success && data.data ? data.data : data;
      setUser(userData);
      setEditModal(false);
      setShowEmail(!(editData.emailHidden));
      setShowPhone(!(editData.phoneHidden));
      Alert.alert('Başarılı', 'Profil güncellendi.');
    } catch (error) {
      Alert.alert('Hata', 'Profil güncellenirken bir hata oluştu.');
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Güvenli Çıkış',
      'Hesabınızdan çıkış yapmak istediğinize emin misiniz? Bu işlem sonrasında tekrar giriş yapmanız gerekecek.',
      [
        { 
          text: 'İptal', 
          style: 'cancel',
          onPress: () => {
            // İptal edildi, hiçbir şey yapma
          }
        },
        { 
          text: 'Çıkış Yap', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Loading göstergesi için kısa bir gecikme
              await new Promise(resolve => setTimeout(resolve, 500));
              
              await logout();
              
              // Logout sonrası Auth ekranına yönlendir
              navigation.reset({
                index: 0,
                routes: [{ name: 'Auth' }],
              });
            } catch (error) {
              // Hata durumunda kullanıcıyı bilgilendir
              Alert.alert(
                'Çıkış Hatası',
                'Çıkış işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.',
                [{ text: 'Tamam' }]
              );
            }
          }
        },
      ]
    );
  };

  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>Yükleniyor...</Text></View>;
  }

  return (
    <View style={styles.container}>
      {/* Modern Header */}
      <View style={styles.headerContainer}>
        <LinearGradient colors={[themeColors.primary.main, themeColors.primary.dark]} style={styles.headerGradient}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color={themeColors.background.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profilim</Text>
            <TouchableOpacity style={styles.editIconBtn} onPress={() => setEditModal(true)}>
              <Feather name="edit-3" size={20} color={themeColors.background.primary} />
            </TouchableOpacity>
          </View>
          
          {/* Profile Avatar Section */}
          <View style={styles.profileSection}>
            <Animated.View style={{ transform: [{ scale: avatarScale }] }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPressIn={() => Animated.spring(avatarScale, { toValue: 0.95, useNativeDriver: true }).start()}
                onPressOut={() => Animated.spring(avatarScale, { toValue: 1, useNativeDriver: true }).start()}
                style={styles.avatarContainer}
              >
                <Image source={user?.avatar ? { uri: user.avatar } : defaultAvatar} style={styles.avatar} />
                <View style={styles.avatarEditBadge}>
                  <Feather name="camera" size={12} color={themeColors.background.primary} />
                </View>
              </TouchableOpacity>
            </Animated.View>
            
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>{user?.name} {user?.surname}</Text>
              <Text style={styles.userRole}>{user?.userType === 'driver' ? 'Şöför' : 'Usta'}</Text>
              <View style={styles.verificationBadge}>
                <MaterialCommunityIcons name="check-decagram" size={16} color={themeColors.success.main} />
                <Text style={styles.verificationText}>Doğrulanmış Hesap</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Profile Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="star" size={24} color={themeColors.accent.main} />
            <Text style={styles.statNumber}>4.8</Text>
            <Text style={styles.statLabel}>Değerlendirme</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="calendar-check" size={24} color={themeColors.success.main} />
            <Text style={styles.statNumber}>127</Text>
            <Text style={styles.statLabel}>Tamamlanan</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialCommunityIcons name="clock-outline" size={24} color={themeColors.info.main} />
            <Text style={styles.statNumber}>2</Text>
            <Text style={styles.statLabel}>Aktif</Text>
          </View>
        </View>
        
        {/* Profile Completion Card */}
        <View style={styles.completionCard}>
          <View style={styles.completionHeader}>
            <MaterialCommunityIcons name="account-check" size={20} color={themeColors.primary.main} />
            <Text style={styles.completionTitle}>Profil Tamamlama</Text>
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${profileCompletion * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(profileCompletion * 100)}% Tamamlandı</Text>
          </View>
          {profileCompletion < 1 && (
            <Text style={styles.completionHint}>Profilinizi tamamlamak için eksik bilgileri doldurun</Text>
          )}
        </View>
        {/* Contact Information Card */}
        <View style={styles.contactCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="card-account-details" size={20} color={themeColors.primary.main} />
            <Text style={styles.cardTitle}>İletişim Bilgileri</Text>
          </View>
          
          <View style={styles.contactRow}>
            <View style={styles.contactIcon}>
              <MaterialCommunityIcons name="email-outline" size={18} color={themeColors.text.secondary} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>E-posta</Text>
              {showEmail ? (
                <Text style={styles.contactValue} numberOfLines={1} ellipsizeMode="tail">
                  {user?.email}
                </Text>
              ) : (
                <Text style={styles.contactValueHidden}>Gizli</Text>
              )}
            </View>
            <MaterialCommunityIcons name="eye-off" size={16} color={themeColors.text.tertiary} />
          </View>
          
          <View style={styles.contactRow}>
            <View style={styles.contactIcon}>
              <Feather name="phone" size={18} color={themeColors.text.secondary} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Telefon</Text>
              {showPhone ? (
                <Text style={styles.contactValue} numberOfLines={1} ellipsizeMode="tail">
                  {user?.phone || 'Tanımlanmamış'}
                </Text>
              ) : (
                <Text style={styles.contactValueHidden}>Gizli</Text>
              )}
            </View>
            <MaterialCommunityIcons name="eye-off" size={16} color={themeColors.text.tertiary} />
          </View>
          
          {user?.city && (
            <View style={styles.contactRow}>
              <View style={styles.contactIcon}>
                <MaterialCommunityIcons name="map-marker-outline" size={18} color={themeColors.text.secondary} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Şehir</Text>
                <Text style={styles.contactValue}>{user.city}</Text>
              </View>
              <MaterialCommunityIcons name="map" size={16} color={themeColors.text.tertiary} />
            </View>
          )}
        </View>
        
        {/* Membership Info Card */}
        <View style={styles.membershipCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="account-clock" size={20} color={themeColors.accent.main} />
            <Text style={styles.cardTitle}>Üyelik Bilgileri</Text>
          </View>
          <View style={styles.membershipContent}>
            <View style={styles.membershipRow}>
              <Text style={styles.membershipLabel}>Üyelik Tarihi</Text>
              <Text style={styles.membershipValue}>{new Date(user?.createdAt).toLocaleDateString('tr-TR')}</Text>
            </View>
            <View style={styles.membershipRow}>
              <Text style={styles.membershipLabel}>Kullanıcı Tipi</Text>
              <View style={styles.userTypeBadge}>
                <Text style={styles.userTypeText}>{user?.userType === 'driver' ? 'Şöför' : 'Usta'}</Text>
              </View>
            </View>
            {user?.isPremium && (
              <View style={styles.premiumBadge}>
                <MaterialCommunityIcons name="crown" size={18} color={themeColors.accent.main} />
                <Text style={styles.premiumText}>Premium Üye</Text>
              </View>
            )}
          </View>
        </View>
        {/* Quick Actions */}
        <View style={styles.actionsCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="cog-outline" size={20} color={themeColors.primary.main} />
            <Text style={styles.cardTitle}>Hızlı İşlemler</Text>
          </View>
          
          <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('ChangePassword' as never)}>
            <View style={styles.actionIcon}>
              <Feather name="lock" size={18} color={themeColors.warning.main} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Şifre Değiştir</Text>
              <Text style={styles.actionSubtitle}>Hesap güvenliğinizi artırın</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={themeColors.text.tertiary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('ChangeEmail' as never)}>
            <View style={styles.actionIcon}>
              <Feather name="mail" size={18} color={themeColors.success.main} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>E-posta Değiştir</Text>
              <Text style={styles.actionSubtitle}>E-posta adresinizi güncelleyin</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={themeColors.text.tertiary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionRow}>
            <View style={styles.actionIcon}>
              <MaterialCommunityIcons name="bell-outline" size={18} color={themeColors.info.main} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Bildirim Ayarları</Text>
              <Text style={styles.actionSubtitle}>Bildirim tercihlerinizi yönetin</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={themeColors.text.tertiary} />
          </TouchableOpacity>
        </View>
        
        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <View style={styles.logoutIcon}>
              <Feather name="log-out" size={20} color={themeColors.background.primary} />
            </View>
            <View style={styles.logoutContent}>
              <Text style={styles.logoutTitle}>Güvenli Çıkış</Text>
              <Text style={styles.logoutSubtitle}>Hesabınızdan güvenli bir şekilde çıkış yapın</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {/* Profili Düzenle Modalı */}
      <Modal visible={editModal} animationType="slide" transparent onRequestClose={() => setEditModal(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalContainer}>
            <TouchableWithoutFeedback>
              <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidingView}
              >
                <View style={styles.modalContent}>
                  {/* Modal Header */}
                  <View style={styles.modalHeader}>
                    <View style={styles.modalHeaderLeft}>
                      <TouchableOpacity 
                        style={styles.modalCloseButton} 
                        onPress={() => setEditModal(false)}
                      >
                        <Ionicons name="close" size={24} color={themeColors.text.secondary} />
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.modalTitle}>Profili Düzenle</Text>
                    <View style={styles.modalHeaderRight} />
                  </View>
                  
                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                  >
                    {/* Ad Input */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Ad</Text>
                      <TextInput
                        style={styles.input}
                        value={editData.name || ''}
                        onChangeText={v => handleEditChange('name', v)}
                        placeholder="Adınızı girin"
                        placeholderTextColor={themeColors.text.tertiary}
                        returnKeyType="next"
                        blurOnSubmit={false}
                      />
                    </View>
                    {/* Soyad Input */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Soyad</Text>
                      <TextInput
                        style={styles.input}
                        value={editData.surname || ''}
                        onChangeText={v => handleEditChange('surname', v)}
                        placeholder="Soyadınızı girin"
                        placeholderTextColor={themeColors.text.tertiary}
                        returnKeyType="next"
                        blurOnSubmit={false}
                      />
                    </View>
                    
                    {/* E-posta Input */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>E-posta</Text>
                      <TextInput
                        style={styles.input}
                        value={editData.email || ''}
                        onChangeText={v => handleEditChange('email', v)}
                        placeholder="ornek@email.com"
                        placeholderTextColor={themeColors.text.tertiary}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        returnKeyType="next"
                        blurOnSubmit={false}
                      />
                    </View>
                    {/* Telefon Input */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Telefon</Text>
                      <TextInput
                        style={styles.input}
                        value={editData.phone || ''}
                        onChangeText={v => handleEditChange('phone', v)}
                        placeholder="0555 123 45 67"
                        placeholderTextColor={themeColors.text.tertiary}
                        keyboardType="phone-pad"
                        returnKeyType="next"
                        blurOnSubmit={false}
                      />
                    </View>
                    {/* Şehir Input */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Şehir</Text>
                      <TextInput
                        style={styles.input}
                        value={editData.city || ''}
                        onChangeText={v => handleEditChange('city', v)}
                        placeholder="Yaşadığınız şehir"
                        placeholderTextColor={themeColors.text.tertiary}
                        returnKeyType="next"
                        blurOnSubmit={false}
                      />
                    </View>
                    {/* Biyografi Input */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Biyografi</Text>
                      <TextInput
                        style={[styles.input, styles.textAreaInput]}
                        value={editData.bio || ''}
                        onChangeText={v => handleEditChange('bio', v)}
                        placeholder="Kendiniz hakkında kısa bilgi"
                        placeholderTextColor={themeColors.text.tertiary}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                        blurOnSubmit={true}
                        returnKeyType="done"
                        onSubmitEditing={() => Keyboard.dismiss()}
                      />
                    </View>
                    
                    {/* Gizlilik Ayarları */}
                    <View style={styles.privacySection}>
                      <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="shield-check-outline" size={20} color={themeColors.primary.main} />
                        <Text style={styles.sectionTitle}>Gizlilik Ayarları</Text>
                      </View>
                      
                      <View style={styles.privacyCard}>
                        <View style={styles.privacyRow}>
                          <View style={styles.privacyRowLeft}>
                            <MaterialCommunityIcons name="email-outline" size={18} color={themeColors.text.secondary} />
                            <View style={styles.privacyTextContainer}>
                              <Text style={styles.privacyLabel}>E-posta Adresimi Gizle</Text>
                              <Text style={styles.privacyDescription}>Diğer kullanıcılar e-posta adresinizi göremez</Text>
                            </View>
                          </View>
                          <Switch
                            value={editData.emailHidden || false}
                            onValueChange={(value) => handleEditChange('emailHidden', value)}
                            trackColor={{ false: themeColors.border.primary, true: themeColors.primary.light }}
                            thumbColor={editData.emailHidden ? themeColors.background.primary : themeColors.text.tertiary}
                          />
                        </View>
                        
                        <View style={styles.privacyRow}>
                          <View style={styles.privacyRowLeft}>
                            <MaterialCommunityIcons name="phone-outline" size={18} color={themeColors.text.secondary} />
                            <View style={styles.privacyTextContainer}>
                              <Text style={styles.privacyLabel}>Telefon Numaramı Gizle</Text>
                              <Text style={styles.privacyDescription}>Diğer kullanıcılar telefon numaranızı göremez</Text>
                            </View>
                          </View>
                          <Switch
                            value={editData.phoneHidden || false}
                            onValueChange={(value) => handleEditChange('phoneHidden', value)}
                            trackColor={{ false: themeColors.border.primary, true: themeColors.primary.light }}
                            thumbColor={editData.phoneHidden ? themeColors.background.primary : themeColors.text.tertiary}
                          />
                        </View>
                        
                        <View style={styles.privacyRow}>
                          <View style={styles.privacyRowLeft}>
                            <MaterialCommunityIcons name="star-outline" size={18} color={themeColors.text.secondary} />
                            <View style={styles.privacyTextContainer}>
                              <Text style={styles.privacyLabel}>Tefe Puanlarımı Gizle</Text>
                              <Text style={styles.privacyDescription}>Diğer kullanıcılar tefe puanlarınızı göremez</Text>
                            </View>
                          </View>
                          <Switch
                            value={editData.tefeHidden || false}
                            onValueChange={(value) => handleEditChange('tefeHidden', value)}
                            trackColor={{ false: themeColors.border.primary, true: themeColors.primary.light }}
                            thumbColor={editData.tefeHidden ? themeColors.background.primary : themeColors.text.tertiary}
                          />
                        </View>
                      </View>
                    </View>
                    
                    {/* Action Buttons */}
                    <View style={styles.actionButtonsContainer}>
                      <TouchableOpacity 
                        style={styles.cancelButton} 
                        onPress={() => setEditModal(false)}
                      >
                        <Text style={styles.cancelButtonText}>İptal</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.saveButton} 
                        onPress={handleSaveProfile}
                      >
                        <MaterialCommunityIcons name="check" size={20} color={themeColors.background.primary} />
                        <Text style={styles.saveButtonText}>Düzenlemeyi Kaydet</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: themeColors.background.primary,
  },
  
  // Header Styles
  headerContainer: {
    position: 'relative',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: spacing.xxl,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },
  headerTitle: {
    ...typography.h3,
    color: themeColors.background.primary,
    fontWeight: typography.fontWeights.bold,
  },
  editIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },
  
  // Profile Section
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: themeColors.background.primary,
    ...shadows.medium,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: themeColors.primary.main,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: themeColors.background.primary,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    ...typography.h4,
    color: themeColors.background.primary,
    fontWeight: typography.fontWeights.bold,
    marginBottom: 4,
  },
  userRole: {
    ...typography.body2,
    color: themeColors.background.primary,
    opacity: 0.9,
    marginBottom: spacing.sm,
  },
  verificationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  verificationText: {
    ...typography.caption.large,
    color: themeColors.background.primary,
    marginLeft: 4,
    fontWeight: typography.fontWeights.medium,
  },
  
  // Scroll Container
  scrollContainer: {
    paddingBottom: spacing.xxl,
    paddingTop: spacing.lg,
  },
  
  // Stats Container
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: themeColors.background.card,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    alignItems: 'center',
    ...shadows.card,
  },
  statNumber: {
    ...typography.h3,
    color: themeColors.text.primary,
    fontWeight: typography.fontWeights.bold,
    marginTop: spacing.sm,
  },
  statLabel: {
    ...typography.caption.large,
    color: themeColors.text.secondary,
    textAlign: 'center',
    marginTop: 4,
  },
  
  // Completion Card
  completionCard: {
    backgroundColor: themeColors.background.card,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  completionTitle: {
    ...typography.h4,
    color: themeColors.text.primary,
    marginLeft: spacing.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  progressContainer: {
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: 8,
    backgroundColor: themeColors.background.secondary,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: themeColors.primary.main,
    borderRadius: 4,
  },
  progressText: {
    ...typography.caption.large,
    color: themeColors.text.secondary,
    textAlign: 'center',
  },
  completionHint: {
    ...typography.caption.small,
    color: themeColors.text.tertiary,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  // Contact Card
  contactCard: {
    backgroundColor: themeColors.background.card,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  cardTitle: {
    ...typography.h4,
    color: themeColors.text.primary,
    marginLeft: spacing.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border.primary,
  },
  contactIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: themeColors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    ...typography.caption.large,
    color: themeColors.text.secondary,
    marginBottom: 2,
  },
  contactValue: {
    ...typography.body2,
    color: themeColors.text.primary,
    fontWeight: typography.fontWeights.medium,
  },
  contactValueHidden: {
    ...typography.body2,
    color: themeColors.text.tertiary,
    fontStyle: 'italic',
  },
  
  // Membership Card
  membershipCard: {
    backgroundColor: themeColors.background.card,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  membershipContent: {
    gap: spacing.md,
  },
  membershipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  membershipLabel: {
    ...typography.body2,
    color: themeColors.text.secondary,
  },
  membershipValue: {
    ...typography.body2,
    color: themeColors.text.primary,
    fontWeight: typography.fontWeights.medium,
  },
  userTypeBadge: {
    backgroundColor: themeColors.primary.ultraLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  userTypeText: {
    ...typography.caption.large,
    color: themeColors.primary.main,
    fontWeight: typography.fontWeights.semibold,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.accent.ultraLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  premiumText: {
    ...typography.caption.large,
    color: themeColors.accent.main,
    fontWeight: typography.fontWeights.semibold,
    marginLeft: spacing.sm,
  },
  
  // Actions Card
  actionsCard: {
    backgroundColor: themeColors.background.card,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border.primary,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: themeColors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    ...typography.body2,
    color: themeColors.text.primary,
    fontWeight: typography.fontWeights.medium,
    marginBottom: 2,
  },
  actionSubtitle: {
    ...typography.caption.large,
    color: themeColors.text.secondary,
  },
  
  // Logout Section
  logoutSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xxl,
  },
  logoutButton: {
    backgroundColor: themeColors.error.main,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.medium,
  },
  logoutIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  logoutContent: {
    flex: 1,
  },
  logoutTitle: {
    ...typography.h4,
    color: themeColors.background.primary,
    fontWeight: typography.fontWeights.semibold,
    marginBottom: 2,
  },
  logoutSubtitle: {
    ...typography.caption.large,
    color: themeColors.background.primary,
    opacity: 0.9,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: themeColors.background.overlay,
  },
  keyboardAvoidingView: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.lg,
  },
  modalContent: {
    backgroundColor: themeColors.background.primary,
    borderRadius: borderRadius.modal,
    width: '90%',
    maxHeight: '85%',
    ...shadows.modal,
  },
  
  // Modal Header
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border.primary,
  },
  modalHeaderLeft: {
    width: 40,
  },
  modalHeaderRight: {
    width: 40,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.background.secondary,
  },
  modalTitle: {
    ...typography.h4,
    color: themeColors.text.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  
  // Input Styles
  inputGroup: {
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  inputLabel: {
    ...typography.label,
    color: themeColors.text.primary,
    marginBottom: spacing.sm,
    fontWeight: typography.fontWeights.medium,
  },
  input: {
    backgroundColor: themeColors.background.secondary,
    borderWidth: 1,
    borderColor: themeColors.border.primary,
    borderRadius: borderRadius.input,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body2,
    color: themeColors.text.primary,
  },
  textAreaInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  
  // Privacy Section
  privacySection: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    color: themeColors.text.primary,
    marginLeft: spacing.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  privacyCard: {
    backgroundColor: themeColors.background.secondary,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: themeColors.border.primary,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border.primary,
  },
  privacyRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  privacyTextContainer: {
    marginLeft: spacing.md,
    flex: 1,
  },
  privacyLabel: {
    ...typography.body2,
    color: themeColors.text.primary,
    fontWeight: typography.fontWeights.medium,
    marginBottom: 2,
  },
  privacyDescription: {
    ...typography.caption.large,
    color: themeColors.text.secondary,
  },
  
  // Action Buttons
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: themeColors.background.secondary,
    borderRadius: borderRadius.button,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: themeColors.border.primary,
  },
  cancelButtonText: {
    ...typography.button.medium,
    color: themeColors.text.secondary,
  },
  saveButton: {
    flex: 2,
    backgroundColor: themeColors.primary.main,
    borderRadius: borderRadius.button,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...shadows.primary,
  },
  saveButtonText: {
    ...typography.button.medium,
    color: themeColors.background.primary,
    marginLeft: spacing.sm,
    fontWeight: typography.fontWeights.semibold,
  },
});

export default ProfileScreen; 