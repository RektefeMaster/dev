import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal, TextInput, Switch, Alert, Platform, Animated, ScrollView, KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback, SafeAreaView } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService, api } from '@/shared/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '@/context/AuthContext';
import { colors as themeColors, typography, spacing, borderRadius, shadows, dimensions } from '@/theme/theme';
import * as ImagePicker from 'expo-image-picker';

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
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [coverImageModalVisible, setCoverImageModalVisible] = useState(false);

  // Dinamik profil tamamlama oranı
  const profileFields = [user?.name, user?.surname, user?.email, user?.phone, user?.city, user?.bio];
  const filledFields = profileFields.filter(Boolean).length;
  const profileCompletion = filledFields / profileFields.length;

  const { token, userId } = useAuth();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        if (!token || !userId) {
          console.log('⚠️ ProfileScreen: Token veya userId yok');
          setLoading(false);
          return;
        }
        
        console.log('🔍 ProfileScreen: getUserProfile çağrılıyor...');
        const data = await apiService.getUserProfile();
        console.log('🔍 ProfileScreen: Raw API response:', data);
        
        // API response formatı kontrol et
        if (!data || !data.success) {
          console.log('❌ ProfileScreen: API başarısız response:', data);
          if (data?.error?.code === 'UNAUTHORIZED' || data?.error?.message?.includes('401')) {
            Alert.alert('Oturum Süresi Doldu', 'Lütfen tekrar giriş yapın.');
            logout();
            return;
          }
          throw new Error(data?.error?.message || 'API hatası');
        }
        
        const userData = data.data;
        console.log('🔍 ProfileScreen: Processed userData:', userData);
        console.log('🔍 ProfileScreen: Avatar URL:', userData?.avatar);
        console.log('🔍 ProfileScreen: Cover URL:', userData?.cover);
        
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
      } catch (e: any) {
        console.error('❌ ProfileScreen: Error fetching user:', e);
        if (e.response?.status === 401) {
          Alert.alert('Oturum Süresi Doldu', 'Lütfen tekrar giriş yapın.');
          logout();
        } else {
          Alert.alert('Hata', 'Kullanıcı bilgileri alınamadı.');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [token, userId, logout]);

  const handleEditChange = (field: string, value: string | boolean) => {
    setEditData((prev: any) => ({ ...prev, [field]: value }));
  };

  // Profil resmi değiştirme fonksiyonları
  const pickImageFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Galeriye erişim için izin vermelisiniz.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      handleImageUpload(result.assets[0].uri, 'avatar');
    }
  };

  const takePhotoWithCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Kameraya erişim için izin vermelisiniz.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      handleImageUpload(result.assets[0].uri, 'avatar');
    }
  };

  const handleImageUpload = async (imageUri: string, type: 'avatar' | 'cover') => {
    try {
      setLoading(true);
      console.log('📸 Image upload başlatılıyor:', type, imageUri);
      
      // API'ye resim yükle
      const response = type === 'avatar' 
        ? await apiService.uploadProfilePhoto(imageUri)
        : await apiService.uploadCoverPhoto(imageUri);
      
      console.log('📸 API response:', response);
      
      if (response.success && response.data) {
        // Başarılı yükleme - state'i güncelle
        const newImageUrl = type === 'avatar' ? response.data.avatar : response.data.cover;
        console.log('📸 Yeni resim URL:', newImageUrl);
        console.log('📸 Güncellenen user:', response.data.user);
        
        // Tam user objesini güncelle
        if (response.data.user) {
          setUser(response.data.user);
        } else {
          setUser(prev => ({ 
            ...prev, 
            [type === 'avatar' ? 'avatar' : 'cover']: newImageUrl 
          }));
        }
        
        if (type === 'avatar') {
          setImageModalVisible(false);
          Alert.alert('Başarılı', 'Profil resminiz güncellendi.');
        } else {
          setCoverImageModalVisible(false);
          Alert.alert('Başarılı', 'Kapak fotoğrafınız güncellendi.');
        }
      } else {
        console.error('📸 Upload başarısız:', response);
        Alert.alert('Hata', response.message || 'Resim yüklenirken bir hata oluştu.');
      }
    } catch (error: any) {
      console.error('📸 Image upload error:', error);
      Alert.alert('Hata', 'Resim yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Kapak fotoğrafı fonksiyonları
  const pickCoverImageFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Galeriye erişim için izin vermelisiniz.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9], // Kapak fotoğrafı için 16:9 oran
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      handleImageUpload(result.assets[0].uri, 'cover');
    }
  };

  const takeCoverPhotoWithCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Kameraya erişim için izin vermelisiniz.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 9], // Kapak fotoğrafı için 16:9 oran
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      handleImageUpload(result.assets[0].uri, 'cover');
    }
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
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themeColors.background.primary }}>
        <Text style={{ color: themeColors.text.primary }}>Yükleniyor...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} bounces={false}>
        {/* Header Section with Cover Photo */}
        <View style={styles.headerSection}>
          {/* Cover Photo */}
          <View style={styles.coverPhotoContainer}>
            {user?.cover ? (
              <Image 
                source={{ uri: user.cover }} 
                style={styles.coverPhoto}
                onError={(e) => console.error('📸 Cover image load error:', e.nativeEvent.error)}
                onLoad={() => console.log('📸 Cover image loaded successfully')}
              />
            ) : (
              <LinearGradient
                colors={[themeColors.primary.main, themeColors.primary.dark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.coverPhotoPlaceholder}
              >
                <MaterialCommunityIcons name="image-plus" size={40} color="rgba(255,255,255,0.4)" />
              </LinearGradient>
            )}
            
            {/* Header Navigation - Absolute Positioned */}
            <View style={styles.headerNav}>
              <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color={themeColors.background.primary} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Profilim</Text>
              <TouchableOpacity style={styles.editIconBtn} onPress={() => setEditModal(true)}>
                <Feather name="edit-3" size={20} color={themeColors.background.primary} />
              </TouchableOpacity>
            </View>
            
            {/* Cover Photo Edit Button */}
            <TouchableOpacity 
              style={styles.coverPhotoEditButton}
              onPress={() => setCoverImageModalVisible(true)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons 
                name="camera" 
                size={16} 
                color={themeColors.background.primary} 
              />
            </TouchableOpacity>
          </View>
          
          {/* Profile Info Section */}
          <View style={styles.profileInfoContainer}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setImageModalVisible(true)}
              onPressIn={() => Animated.spring(avatarScale, { toValue: 0.95, useNativeDriver: true }).start()}
              onPressOut={() => Animated.spring(avatarScale, { toValue: 1, useNativeDriver: true }).start()}
              style={styles.avatarContainer}
            >
              <Animated.View style={{ transform: [{ scale: avatarScale }] }}>
                <Image 
                  source={user?.avatar ? { uri: user.avatar } : defaultAvatar} 
                  style={styles.avatar}
                  onError={(e) => console.error('📸 Avatar load error:', e.nativeEvent.error)}
                  onLoad={() => console.log('📸 Avatar loaded:', user?.avatar)}
                />
                <View style={styles.avatarEditBadge}>
                  <Feather name="camera" size={12} color={themeColors.background.primary} />
                </View>
              </Animated.View>
            </TouchableOpacity>
            
            <View style={styles.profileTextInfo}>
              <Text style={styles.userName}>{user?.name} {user?.surname}</Text>
              <Text style={styles.userRole}>{user?.userType === 'driver' ? 'Şöför' : 'Usta'}</Text>
            </View>
          </View>
        </View>
        {/* Profile Completion Card */}
        {profileCompletion < 1 && (
          <View style={styles.completionCard}>
            <View style={styles.completionHeader}>
              <MaterialCommunityIcons name="account-check" size={18} color={themeColors.primary.main} />
              <Text style={styles.completionTitle}>Profil Tamamlama</Text>
            </View>
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${profileCompletion * 100}%` }]} />
              </View>
              <Text style={styles.progressText}>{Math.round(profileCompletion * 100)}%</Text>
            </View>
          </View>
        )}
        {/* Contact Information Card */}
        <View style={styles.contactCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="card-account-details" size={18} color={themeColors.primary.main} />
            <Text style={styles.cardTitle}>İletişim Bilgileri</Text>
          </View>
          
          <View style={styles.contactRow}>
            <View style={styles.contactIcon}>
              <MaterialCommunityIcons name="email-outline" size={16} color={themeColors.text.secondary} />
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
            {!showEmail && <MaterialCommunityIcons name="eye-off" size={14} color={themeColors.text.tertiary} />}
          </View>
          
          <View style={styles.contactRow}>
            <View style={styles.contactIcon}>
              <Feather name="phone" size={16} color={themeColors.text.secondary} />
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
            {!showPhone && <MaterialCommunityIcons name="eye-off" size={14} color={themeColors.text.tertiary} />}
          </View>
          
          {user?.city && (
            <View style={[styles.contactRow, styles.contactRowLast]}>
              <View style={styles.contactIcon}>
                <MaterialCommunityIcons name="map-marker-outline" size={16} color={themeColors.text.secondary} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>Şehir</Text>
                <Text style={styles.contactValue}>{user.city}</Text>
              </View>
            </View>
          )}
        </View>
        
        {/* Membership Info Card */}
        <View style={styles.membershipCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="account-clock" size={18} color={themeColors.primary.main} />
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
                <MaterialCommunityIcons name="crown" size={16} color={themeColors.accent.main} />
                <Text style={styles.premiumText}>Premium Üye</Text>
              </View>
            )}
          </View>
        </View>
        {/* Quick Actions */}
        <View style={styles.actionsCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="cog-outline" size={18} color={themeColors.primary.main} />
            <Text style={styles.cardTitle}>Hızlı İşlemler</Text>
          </View>
          
          <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('ChangePassword' as never)}>
            <View style={[styles.actionIcon, { backgroundColor: themeColors.warning.ultraLight }]}>
              <Feather name="lock" size={16} color={themeColors.warning.main} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Şifre Değiştir</Text>
              <Text style={styles.actionSubtitle}>Hesap güvenliğinizi artırın</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color={themeColors.text.tertiary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('ChangeEmail' as never)}>
            <View style={[styles.actionIcon, { backgroundColor: themeColors.success.ultraLight }]}>
              <Feather name="mail" size={16} color={themeColors.success.main} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>E-posta Değiştir</Text>
              <Text style={styles.actionSubtitle}>E-posta adresinizi güncelleyin</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color={themeColors.text.tertiary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionRow, styles.actionRowLast]}>
            <View style={[styles.actionIcon, { backgroundColor: themeColors.info.ultraLight }]}>
              <MaterialCommunityIcons name="bell-outline" size={16} color={themeColors.info.main} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Bildirim Ayarları</Text>
              <Text style={styles.actionSubtitle}>Bildirim tercihlerinizi yönetin</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={18} color={themeColors.text.tertiary} />
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

      {/* Resim Seçme Modal */}
      <Modal visible={imageModalVisible} animationType="slide" transparent onRequestClose={() => setImageModalVisible(false)}>
        <View style={styles.imageModalContainer}>
          <View style={styles.imageModalContent}>
            <View style={styles.imageModalHeader}>
              <Text style={styles.imageModalTitle}>Profil Resmi</Text>
              <TouchableOpacity onPress={() => setImageModalVisible(false)}>
                <Ionicons name="close" size={24} color={themeColors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.imageOptions}>
              <TouchableOpacity style={styles.imageOption} onPress={pickImageFromGallery}>
                <View style={styles.imageOptionIcon}>
                  <MaterialCommunityIcons name="image-outline" size={32} color={themeColors.primary.main} />
                </View>
                <Text style={styles.imageOptionText}>Galeriden Seç</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.imageOption} onPress={takePhotoWithCamera}>
                <View style={styles.imageOptionIcon}>
                  <MaterialCommunityIcons name="camera-outline" size={32} color={themeColors.primary.main} />
                </View>
                <Text style={styles.imageOptionText}>Fotoğraf Çek</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Kapak Fotoğrafı Modal */}
      <Modal visible={coverImageModalVisible} animationType="slide" transparent onRequestClose={() => setCoverImageModalVisible(false)}>
        <View style={styles.imageModalContainer}>
          <View style={styles.imageModalContent}>
            <View style={styles.imageModalHeader}>
              <Text style={styles.imageModalTitle}>Kapak Fotoğrafı</Text>
              <TouchableOpacity onPress={() => setCoverImageModalVisible(false)}>
                <Ionicons name="close" size={24} color={themeColors.text.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.imageOptions}>
              <TouchableOpacity style={styles.imageOption} onPress={pickCoverImageFromGallery}>
                <View style={styles.imageOptionIcon}>
                  <MaterialCommunityIcons name="image-outline" size={32} color={themeColors.primary.main} />
                </View>
                <Text style={styles.imageOptionText}>Galeriden Seç</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.imageOption} onPress={takeCoverPhotoWithCamera}>
                <View style={styles.imageOptionIcon}>
                  <MaterialCommunityIcons name="camera-outline" size={32} color={themeColors.primary.main} />
                </View>
                <Text style={styles.imageOptionText}>Fotoğraf Çek</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: themeColors.background.primary,
  },
  
  // Scroll Container
  scrollContainer: {
    flexGrow: 1,
  },
  
  // Header Section
  headerSection: {
    backgroundColor: themeColors.background.primary,
    marginBottom: spacing.md,
  },
  
  // Cover Photo Styles
  coverPhotoContainer: {
    height: 200,
    width: '100%',
    position: 'relative',
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverPhotoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverPhotoEditButton: {
    position: 'absolute',
    bottom: spacing.sm,
    right: spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.small,
  },
  
  // Header Navigation
  headerNav: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: Platform.OS === 'ios' ? spacing.sm : spacing.md,
    paddingBottom: spacing.sm,
    zIndex: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h4,
    color: themeColors.background.primary,
    fontWeight: typography.fontWeights.semibold,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  editIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Profile Info Section
  profileInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: themeColors.background.primary,
  },
  profileTextInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  avatarContainer: {
    position: 'relative',
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
  userName: {
    ...typography.h3,
    color: themeColors.text.primary,
    fontWeight: typography.fontWeights.bold,
    marginBottom: 2,
  },
  userRole: {
    ...typography.body2,
    color: themeColors.text.secondary,
    fontWeight: typography.fontWeights.medium,
  },
  
  // Completion Card
  completionCard: {
    backgroundColor: themeColors.primary.ultraLight,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: themeColors.primary.light,
  },
  completionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  completionTitle: {
    ...typography.body1,
    color: themeColors.text.primary,
    marginLeft: spacing.sm,
    fontWeight: typography.fontWeights.semibold,
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: themeColors.background.secondary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: themeColors.primary.main,
    borderRadius: 3,
  },
  progressText: {
    ...typography.caption.large,
    color: themeColors.primary.main,
    fontWeight: typography.fontWeights.semibold,
    minWidth: 40,
    textAlign: 'right',
  },
  
  // Contact Card
  contactCard: {
    backgroundColor: themeColors.background.card,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border.primary,
  },
  cardTitle: {
    ...typography.body1,
    color: themeColors.text.primary,
    marginLeft: spacing.sm,
    fontWeight: typography.fontWeights.semibold,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border.primary,
  },
  contactRowLast: {
    borderBottomWidth: 0,
  },
  contactIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  membershipContent: {
    gap: spacing.sm,
  },
  membershipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
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
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  premiumText: {
    ...typography.caption.large,
    color: themeColors.accent.main,
    fontWeight: typography.fontWeights.semibold,
    marginLeft: spacing.xs,
  },
  
  // Actions Card
  actionsCard: {
    backgroundColor: themeColors.background.card,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.card,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border.primary,
  },
  actionRowLast: {
    borderBottomWidth: 0,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
  logoutButton: {
    backgroundColor: themeColors.error.main,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadows.medium,
  },
  logoutIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  logoutContent: {
    flex: 1,
  },
  logoutTitle: {
    ...typography.body1,
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

  // Image Modal Styles
  imageModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: themeColors.background.overlay,
  },
  imageModalContent: {
    backgroundColor: themeColors.background.primary,
    borderTopLeftRadius: borderRadius.modal,
    borderTopRightRadius: borderRadius.modal,
    paddingBottom: spacing.xxl,
  },
  imageModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.border.primary,
  },
  imageModalTitle: {
    ...typography.h4,
    color: themeColors.text.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  imageOptions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  imageOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    backgroundColor: themeColors.background.secondary,
    borderRadius: borderRadius.card,
    borderWidth: 1,
    borderColor: themeColors.border.primary,
  },
  imageOptionIcon: {
    marginBottom: spacing.sm,
  },
  imageOptionText: {
    ...typography.body2,
    color: themeColors.text.primary,
    fontWeight: typography.fontWeights.medium,
  },
});

export default ProfileScreen; 