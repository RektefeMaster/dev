import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Modal, TextInput, Switch, Alert, Platform, Animated, ScrollView } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService, api } from '@/shared/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { useAuth } from '@/context/AuthContext';

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
    <View style={{ flex: 1, backgroundColor: '#f7f7f7' }}>
      {/* Dalgalı SVG Gradient Header */}
      <View style={{ position: 'relative', backgroundColor: 'transparent' }}>
        <LinearGradient colors={["#5AC8FA", "#007AFF"]} style={styles.headerGradient}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={26} color="#222" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profilim</Text>
          <TouchableOpacity style={styles.editIconBtn} onPress={() => setEditModal(true)}>
            <Feather name="settings" size={22} color="#222" />
          </TouchableOpacity>
        </LinearGradient>
        {/* Dalgalı SVG */}
        <Svg height="60" width="100%" viewBox="0 0 400 60" style={styles.headerWave}>
          <Path
            d="M0,30 Q100,60 200,30 T400,30 V60 H0 Z"
            fill="#f7f7f7"
            opacity={0.98}
          />
        </Svg>
        {/* Parlayan, drop-shadow'lu profil fotoğrafı */}
        <View style={styles.avatarWrap}>
          <Animated.View style={{ transform: [{ scale: avatarScale }] }}>
            <LinearGradient colors={["#fffbe6", "#FFD700", "#5AC8FA"]} style={styles.avatarGlow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPressIn={() => Animated.spring(avatarScale, { toValue: 0.95, useNativeDriver: true }).start()}
                onPressOut={() => Animated.spring(avatarScale, { toValue: 1, useNativeDriver: true }).start()}
                style={styles.avatarTouch}
              >
                <Image source={user?.avatar ? { uri: user.avatar } : defaultAvatar} style={styles.avatarBig} />
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {/* Kullanıcı kartı ve hoş geldin mesajı */}
        <View style={styles.userCard}>
          <Text style={[
            styles.welcomeText,
            {
              fontSize: (() => {
                const text = `Hoş geldin, ${user?.name} ${user?.surname}!`;
                if (text.length > 30) return 16;
                if (text.length > 25) return 18;
                return 20;
              })()
            }
          ]}>
            Hoş geldin, <Text style={{ color: '#007AFF', fontWeight: 'bold' }}>{user?.name} {user?.surname}</Text>!
          </Text>
          {/* Profil tamamlama progress barı */}
          <View style={styles.progressBarWrap}>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${profileCompletion * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>{Math.round(profileCompletion * 100)}% Profil Tamamlandı</Text>
          </View>
          {user?.city && <Text style={styles.cityText}>{user.city}</Text>}
          <Text style={styles.memberText}>Üyelik: {new Date(user?.createdAt).toLocaleDateString('tr-TR')}</Text>
          {/* Premium/rozet örneği */}
          {user?.isPremium && (
            <View style={styles.premiumBadge}>
              <MaterialCommunityIcons name="crown" size={18} color="#FFD700" />
              <Text style={styles.premiumText}>Premium</Text>
            </View>
          )}
        </View>
        {/* Bilgi kartları */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="email-outline" size={20} color="#007AFF" />
            <Text style={styles.infoLabel}>E-posta:</Text>
            {showEmail ? (
              <Text 
                style={[
                  styles.infoValue, 
                  { 
                    color: '#23242a', 
                    fontWeight: 'bold', 
                    marginLeft: 6,
                    fontSize: (() => {
                      const text = user?.email || '';
                      if (text.length > 25) return 12;
                      if (text.length > 20) return 14;
                      return 16;
                    })()
                  }
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {user?.email}
              </Text>
            ) : (
              <Text style={styles.infoValueMuted}>Gizli</Text>
            )}
          </View>
          <View style={styles.infoRow}>
            <Feather name="phone" size={20} color="#007AFF" />
            <Text style={styles.infoLabel}>Telefon:</Text>
            {showPhone ? (
              <Text 
                style={[
                  styles.infoValue,
                  {
                    fontSize: (() => {
                      const text = user?.phone || 'Tanımlanmamış';
                      if (text.length > 15) return 12;
                      if (text.length > 12) return 14;
                      return 16;
                    })()
                  }
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {user?.phone || 'Tanımlanmamış'}
              </Text>
            ) : (
              <Text style={styles.infoValueMuted}>Gizli</Text>
            )}
          </View>
          {user?.city && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={20} color="#007AFF" />
              <Text style={styles.infoLabel}>Şehir:</Text>
              <Text 
                style={[
                  styles.infoValue,
                  {
                    fontSize: (() => {
                      const text = user.city || '';
                      if (text.length > 15) return 12;
                      if (text.length > 12) return 14;
                      return 16;
                    })()
                  }
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {user.city}
              </Text>
            </View>
          )}
        </View>
        {/* Ayarlar ve aksiyonlar */}
        <View style={styles.settingsCard}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('ChangePassword' as never)}>
            <Feather name="lock" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>Şifre Değiştir</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#34C759' }]} onPress={() => navigation.navigate('ChangeEmail' as never)}>
            <Feather name="mail" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>E-posta Değiştir</Text>
          </TouchableOpacity>
        </View>
        
        {/* Çıkış Butonu */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <View style={styles.logoutButtonContent}>
              <Feather name="log-out" size={20} color="#fff" />
              <Text style={styles.logoutButtonText}>Güvenli Çıkış</Text>
            </View>
            <View style={styles.logoutSubtext}>
              <Text style={styles.logoutSubtextText}>Hesabınızdan güvenli bir şekilde çıkış yapın</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {/* Profili Düzenle Modalı */}
      <Modal visible={editModal} animationType="slide" transparent onRequestClose={() => setEditModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Profili Düzenle</Text>
            <TextInput
              style={[
                styles.input,
                {
                  fontSize: (() => {
                    const text = editData.name || '';
                    if (text.length > 15) return 14;
                    if (text.length > 12) return 16;
                    return 18;
                  })()
                }
              ]}
              value={editData.name || ''}
              onChangeText={v => handleEditChange('name', v)}
              placeholder="Ad"
              placeholderTextColor="#666"
            />
            <TextInput
              style={[
                styles.input,
                {
                  fontSize: (() => {
                    const text = editData.email || '';
                    if (text.length > 25) return 12;
                    if (text.length > 20) return 14;
                    return 16;
                  })()
                }
              ]}
              value={editData.email || ''}
              onChangeText={v => handleEditChange('email', v)}
              placeholder="E-posta"
              placeholderTextColor="#666"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={[
                styles.input,
                {
                  fontSize: (() => {
                    const text = editData.phone || '';
                    if (text.length > 15) return 12;
                    if (text.length > 12) return 14;
                    return 16;
                  })()
                }
              ]}
              value={editData.phone || ''}
              onChangeText={v => handleEditChange('phone', v)}
              placeholder="Telefon"
              placeholderTextColor="#666"
              keyboardType="phone-pad"
            />
            <TextInput
              style={[
                styles.input,
                {
                  fontSize: (() => {
                    const text = editData.city || '';
                    if (text.length > 15) return 12;
                    if (text.length > 12) return 14;
                    return 16;
                  })()
                }
              ]}
              value={editData.city || ''}
              onChangeText={v => handleEditChange('city', v)}
              placeholder="Şehir"
              placeholderTextColor="#666"
            />
            <TextInput
              style={[
                styles.input,
                {
                  fontSize: (() => {
                    const text = editData.bio || '';
                    if (text.length > 50) return 12;
                    if (text.length > 30) return 14;
                    return 16;
                  })()
                }
              ]}
              value={editData.bio || ''}
              onChangeText={v => handleEditChange('bio', v)}
              placeholder="Biyografi"
              placeholderTextColor="#666"
              multiline
            />
            
            {/* Gizlilik Ayarları */}
            <View style={styles.privacySection}>
              <Text style={styles.privacyTitle}>Gizlilik Ayarları</Text>
              
              <View style={styles.privacyRow}>
                <Text style={styles.privacyLabel}>E-posta Gizli</Text>
                <Switch
                  value={editData.emailHidden || false}
                  onValueChange={(value) => handleEditChange('emailHidden', value)}
                  trackColor={{ false: '#767577', true: '#007AFF' }}
                  thumbColor={editData.emailHidden ? '#fff' : '#f4f3f4'}
                />
              </View>
              
              <View style={styles.privacyRow}>
                <Text style={styles.privacyLabel}>Telefon Gizli</Text>
                <Switch
                  value={editData.phoneHidden || false}
                  onValueChange={(value) => handleEditChange('phoneHidden', value)}
                  trackColor={{ false: '#767577', true: '#007AFF' }}
                  thumbColor={editData.phoneHidden ? '#fff' : '#f4f3f4'}
                />
              </View>
              
              <View style={styles.privacyRow}>
                <Text style={styles.privacyLabel}>Tefe Puanları Gizli</Text>
                <Switch
                  value={editData.tefeHidden || false}
                  onValueChange={(value) => handleEditChange('tefeHidden', value)}
                  trackColor={{ false: '#767577', true: '#007AFF' }}
                  thumbColor={editData.tefeHidden ? '#fff' : '#f4f3f4'}
                />
              </View>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <TouchableOpacity style={[styles.button, { backgroundColor: '#ccc', flex: 1, marginRight: 8 }]} onPress={() => setEditModal(false)}>
                <Text style={[styles.buttonText, { color: '#333' }]}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, { backgroundColor: '#007AFF', flex: 1, marginLeft: 8 }]} onPress={handleSaveProfile}>
                <Text style={styles.buttonText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  headerGradient: {
    height: 220,
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    position: 'relative',
    marginBottom: 60,
  },
  headerWave: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -1,
    zIndex: 2,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
    zIndex: 3,
    position: 'absolute',
    top: Platform.OS === 'ios' ? 70 : 48,
    left: 0,
    right: 0,
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 18,
    top: Platform.OS === 'ios' ? 60 : 40,
    backgroundColor: '#fff',
    borderRadius: 24,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  editIconBtn: {
    position: 'absolute',
    right: 18,
    top: Platform.OS === 'ios' ? 60 : 40,
    backgroundColor: '#fff',
    borderRadius: 24,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  avatarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -55,
    alignItems: 'center',
    zIndex: 20,
    height: 120,
    overflow: 'visible',
  },
  avatarGlow: {
    borderRadius: 70,
    padding: 6,
    shadowColor: '#FFD700',
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 12,
  },
  avatarTouch: {
    shadowColor: '#007AFF',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
    borderRadius: 60,
  },
  avatarBig: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
    backgroundColor: '#fff',
  },
  userCard: {
    alignItems: 'center',
    marginTop: 120,
    marginBottom: 18,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#23242a',
    marginBottom: 4,
  },
  bioText: {
    fontSize: 15,
    color: '#888',
    marginBottom: 6,
    textAlign: 'center',
  },
  progressBarWrap: {
    width: '80%',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressBarBg: {
    width: '100%',
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: 10,
    backgroundColor: '#5AC8FA',
    borderRadius: 8,
  },
  progressText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  cityText: {
    fontSize: 15,
    color: '#007AFF',
    marginBottom: 2,
  },
  memberText: {
    fontSize: 13,
    color: '#888',
    marginBottom: 6,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbe6',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 6,
    shadowColor: '#FFD700',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  premiumText: {
    color: '#FFD700',
    fontWeight: 'bold',
    marginLeft: 6,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginHorizontal: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontWeight: 'bold',
    color: '#23242a',
    marginLeft: 8,
    marginRight: 4,
    fontSize: 15,
    flex: 1,
  },
  infoValue: {
    color: '#23242a',
    fontSize: 15,
    flex: 1,
  },
  infoValueMuted: {
    color: '#888',
    fontSize: 15,
    fontStyle: 'italic',
    flex: 1,
  },
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    marginHorizontal: 18,
    padding: 18,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginTop: 12,
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 2,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  logoutSection: {
    marginHorizontal: 18,
    marginBottom: 24,
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    shadowColor: '#FF3B30',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#FF453A',
  },
  logoutButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  logoutButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
    marginLeft: 8,
  },
  logoutSubtext: {
    alignItems: 'center',
  },
  logoutSubtextText: {
    color: '#fff',
    fontSize: 13,
    opacity: 0.9,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 20,
    width: '85%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#007AFF',
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#f5f7fa',
    padding: 10,
    borderWidth: 1,
    borderColor: '#b0b3c6',
    borderRadius: 8,
    marginBottom: 10,
    color: '#23242a',
    fontSize: 15,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 0,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  privacySection: {
    marginTop: 20,
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#23242a',
    marginBottom: 15,
    textAlign: 'center',
  },
  privacyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  privacyLabel: {
    fontSize: 14,
    color: '#23242a',
    fontWeight: '500',
  },
});

export default ProfileScreen; 