import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Modal,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons, AntDesign, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@env';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { updateProfilePhoto, updateCoverPhoto, getUserProfile } from '../services/api';
import { postService } from '../services/posts';

const ProfileScreen = ({ navigation }: any) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [favoriteVehicle, setFavoriteVehicle] = useState<any>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [scaleAnim] = useState(() => new Animated.Value(1));
  const [uploading, setUploading] = useState(false);
  const defaultAvatar = require('../assets/default_avatar.png');
  const defaultCover = require('../assets/default_cover.jpg');
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    console.log('ProfileScreen render edildi');
    loadUserData();
  }, []);

  useEffect(() => {
    console.log('userId ve token değişti:', userId, token);
    if (userId && token) {
      fetchProfile(userId);
      fetchVehicles(userId);
      fetchUserPosts(userId);
      fetchFollowers(userId);
      fetchFollowing(userId);
    }
  }, [userId, token]);

  const fetchUserPosts = async (id: string) => {
    try {
      const userPosts = await postService.getUserPosts(id);
      setPosts(userPosts.filter((p: any) => p && p.user && p._id));
    } catch (error) {
      console.error('Gönderiler yüklenirken hata:', error);
      setError('Gönderiler yüklenirken bir hata oluştu.');
    }
  };

  const loadUserData = async () => {
    console.log('loadUserData çağrıldı');
    try {
      const storedId = await AsyncStorage.getItem('userId');
      const storedToken = await AsyncStorage.getItem('token');
      if (!storedId) console.warn('AsyncStorage: userId NULL veya bulunamadı!');
      if (!storedToken) console.warn('AsyncStorage: token NULL veya bulunamadı!');
      console.log('userId:', storedId, 'token:', storedToken);
      if (!storedId || !storedToken) {
        setError('Oturum bilgisi bulunamadı (userId/token null).');
        setLoading(false);
        return;
      }
      setUserId(storedId);
      setToken(storedToken);
    } catch (err) {
      console.error('Veri yükleme hatası:', err);
      setError('Veriler yüklenirken bir hata oluştu');
      setLoading(false);
    }
  };

  const fetchProfile = async (id: string) => {
    try {
      console.log('fetchProfile başladı:', id);
      const response = await getUserProfile(id);
      console.log('fetchProfile yanıtı:', response);
      setUser(response);
      setEditData(response);
    } catch (error) {
      console.error('Profil getirme hatası:', error);
      setError('Profil bilgileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async (id: string) => {
    try {
      const res = await axios.get(`${API_URL}/vehicles/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setVehicles(res.data);
      const fav = res.data.find((v: any) => v.isFavorite);
      setFavoriteVehicle(fav || null);
    } catch (e) {
      console.error('Araçlar yükleme hatası:', e);
      setVehicles([]);
      setFavoriteVehicle(null);
    }
  };

  const fetchFollowers = async (id: string) => {
    try {
      const res = await axios.get(`${API_URL}/users/followers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFollowers(res.data);
    } catch (e) {
      setFollowers([]);
    }
  };

  const fetchFollowing = async (id: string) => {
    try {
      const res = await axios.get(`${API_URL}/users/following/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFollowing(res.data);
    } catch (e) {
      setFollowing([]);
    }
  };

  const handleSaveProfile = async () => {
    if (!userId || !token) return;
    try {
      await axios.patch(`${API_URL}/user/${userId}`, editData, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setUser({ ...user, ...editData });
      setEditModal(false);
    } catch (e) {
      console.error('Profil güncelleme hatası:', e);
      Alert.alert('Hata', 'Profil güncellenemedi!');
    }
  };

  const pickImage = async (type: 'profile' | 'cover') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'profile' ? [1, 1] : [16, 9],
        quality: 0.8,
      });

      if (!result.canceled) {
        setUploading(true);
        if (type === 'profile') {
          await updateProfilePhoto(result.assets[0].uri);
        } else {
          await updateCoverPhoto(result.assets[0].uri);
        }
        await fetchProfile(userId || '');
        Alert.alert('Başarılı', 'Fotoğraf başarıyla güncellendi.');
      }
    } catch (error) {
      console.error('Fotoğraf yükleme hatası:', error);
      Alert.alert('Hata', 'Fotoğraf yüklenirken bir hata oluştu.');
    } finally {
      setUploading(false);
    }
  };

  // Çıkış fonksiyonu
  const handleLogout = () => {
    // Tüm state'leri sıfırla
    setUser(null);
    setEditData({});
    setFavoriteVehicle(null);
    setVehicles([]);
    setUserId(null);
    setToken(null);
    setError(null);
    setLoading(true);
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'Hayır', style: 'cancel' },
        { text: 'Evet', style: 'destructive', onPress: async () => {
            await AsyncStorage.removeItem('userId');
            await AsyncStorage.removeItem('token');
            if (typeof navigation !== 'undefined') {
              navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
            }
          }
        },
      ]
    );
  };

  const isOwnProfile = true; // ProfileScreen her zaman kendi profili
  const followersHidden = !!user?.followersHidden;
  const followingHidden = !!user?.followingHidden;

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <MaterialCommunityIcons name="alert-circle" size={48} color="#FF3B30" />
          <Text style={{ color: '#FF3B30', marginTop: 12, textAlign: 'center' }}>{error}</Text>
          <TouchableOpacity 
            style={[styles.editButton, { marginTop: 20 }]} 
            onPress={loadUserData}
          >
            <Text style={styles.editButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!userId || !token) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <MaterialCommunityIcons name="account-question" size={48} color="#8E8E93" />
          <Text style={{ color: '#8E8E93', marginTop: 12, textAlign: 'center' }}>
            Kullanıcı oturumu bulunamadı (userId/token null)
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Profil üst bilgileri için bir component
  const renderProfileHeader = () => {
    console.log('renderProfileHeader user:', user);
    console.log('renderProfileHeader user.cover:', user?.cover);
    console.log('renderProfileHeader editData:', editData);
    return (
      <>
        {/* Kapak Fotoğrafı */}
        <View style={{ position: 'relative', width: '100%', height: 140, marginBottom: 16 }}>
          <Image
            source={user?.cover ? { uri: user.cover } : defaultCover}
            style={{ width: '100%', height: 140, borderRadius: 16 }}
            onLoad={() => console.log('ProfileScreen cover loaded:', user?.cover)}
          />
          <TouchableOpacity
            onPress={() => pickImage('cover')}
            style={{ position: 'absolute', right: 16, top: 16, backgroundColor: '#fff', borderRadius: 20, padding: 8, zIndex: 10, elevation: 4 }}
          >
            <MaterialCommunityIcons name="camera" size={22} color="#007AFF" />
          </TouchableOpacity>
        </View>
        {/* Profil Bilgileri */}
        <LinearGradient
          colors={['#f5f7fa', '#dfe9f3']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <Image source={user?.avatar ? { uri: user.avatar } : defaultAvatar} style={styles.avatar} />
          <Text style={styles.name}>{user.name} {user.surname}</Text>
          <Text style={styles.username}>@{user.username}</Text>
          <Text style={styles.bio}>{user.bio}</Text>
          {favoriteVehicle && (
            <>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <MaterialCommunityIcons name="car" size={20} color="#007AFF" />
              </Animated.View>
              <Text style={styles.favVehicleText}>{favoriteVehicle.brand} {favoriteVehicle.model} ({favoriteVehicle.plate})</Text>
            </>
          )}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{posts.length}</Text>
              <Text style={styles.statLabel}>Gönderi</Text>
            </View>
            <View style={styles.statBox}>
              <TouchableOpacity disabled={followersHidden && !isOwnProfile} onPress={() => setShowFollowersModal(true)}>
                <Text style={styles.statValue}>{Array.isArray(followers) ? followers.length : 0}</Text>
                <Text style={styles.statLabel}>Takipçi</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.statBox}>
              <TouchableOpacity disabled={followingHidden && !isOwnProfile} onPress={() => setShowFollowingModal(true)}>
                <Text style={styles.statValue}>{Array.isArray(following) ? following.length : 0}</Text>
                <Text style={styles.statLabel}>Takip</Text>
              </TouchableOpacity>
            </View>
            {!user.tefeHidden && (
              <View style={[styles.statBox, styles.tefeStatBox]}>
                <MaterialCommunityIcons name="star-circle" size={24} color="#FFD700" />
                <Text style={styles.statLabel}>TEFE</Text>
                <Text style={styles.statValueSmall}>{user.tefePoints || 0}</Text>
              </View>
            )}
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.editButton} onPress={() => setEditModal(true)}>
              <Text style={styles.editButtonText}>Profili Düzenle</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.editButton, { backgroundColor: '#34C759' }]} 
              onPress={() => navigation.navigate('ChangePassword')}
            >
              <Text style={styles.editButtonText}>Şifre Değiştir</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
        <View style={{ height: 24 }} />
        <View style={styles.sectionTitleRow}>
          <MaterialCommunityIcons name="image-multiple" size={22} color="#007AFF" />
          <Text style={styles.sectionTitle}>Gönderiler</Text>
        </View>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Sol üstte geri butonu */}
      <View style={{ position: 'absolute', left: 16, top: insets.top + 12, zIndex: 20 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ backgroundColor: '#fff', borderRadius: 24, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 4 }}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>
      {/* Sağ üstte çıkış butonu */}
      <View style={[styles.logoutTopRightContainer, { top: insets.top + 12 }]}> 
        <TouchableOpacity style={styles.logoutTopRightButton} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
      {/* FlatList ana container olarak kullanılıyor */}
      <FlatList
        data={posts}
        numColumns={2}
        keyExtractor={item => item?._id ?? Math.random().toString()}
        contentContainerStyle={{ paddingBottom: 100, alignItems: 'center' }}
        ListHeaderComponent={renderProfileHeader}
        renderItem={({ item }) => {
          if (!item || !item.user) return null;
          return (
            <Animated.View style={[styles.postCard, { transform: [{ scale: scaleAnim }] }]}
              onTouchStart={() => Animated.timing(scaleAnim, { toValue: 0.97, duration: 80, useNativeDriver: true }).start()}
              onTouchEnd={() => Animated.timing(scaleAnim, { toValue: 1, duration: 80, useNativeDriver: true }).start()}
            >
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.postImage} resizeMode="cover" />
              ) : (
                <Text style={styles.postContent}>{item.content}</Text>
              )}
              <View style={styles.postMetaRow}>
                <Text style={styles.postMeta}>{new Date(item.createdAt).toLocaleString('tr-TR')}</Text>
                <Text style={styles.postMeta}>❤️ {item.likes.length}   💬 {item.commentsCount || 0}</Text>
              </View>
            </Animated.View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyPostsWrap}>
            <LottieView source={require('../assets/empty.json')} autoPlay loop style={{ width: 120, height: 120, marginBottom: 12 }} />
            <Text style={styles.noPosts}>Henüz gönderi yok.</Text>
          </View>
        }
      />
      {/* Profili Düzenle Modalı */}
      <Modal visible={editModal} animationType="slide" onRequestClose={() => setEditModal(false)}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView style={styles.container}>
            <Text style={styles.editTitle}>Profili Düzenle</Text>
            {/* Profil fotoğrafı seçimi */}
            <TouchableOpacity style={styles.photoPicker} onPress={() => pickImage('profile')}>
              {editData.avatar ? (
                <Image source={{ uri: editData.avatar }} style={styles.avatarEdit} />
              ) : (
                <Image source={defaultAvatar} style={styles.avatarEdit} />
              )}
              <Text style={styles.photoPickerText}>Profil Fotoğrafı Seç</Text>
            </TouchableOpacity>
            {/* Kapak fotoğrafı seçimi */}
            <TouchableOpacity style={styles.photoPicker} onPress={() => pickImage('cover')}>
              {editData.cover ? (
                <Image source={{ uri: editData.cover }} style={styles.coverEdit} onLoad={() => console.log('EditModal cover loaded:', editData.cover)} />
              ) : (
                <Image source={defaultCover} style={styles.coverEdit} />
              )}
              <Text style={styles.photoPickerText}>Kapak Fotoğrafı Seç</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Ad"
              value={editData.name}
              onChangeText={text => setEditData({ ...editData, name: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Soyad"
              value={editData.surname}
              onChangeText={text => setEditData({ ...editData, surname: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Kullanıcı Adı"
              value={editData.username}
              onChangeText={text => setEditData({ ...editData, username: text })}
            />
            <TextInput
              style={styles.input}
              placeholder="Biyografi"
              value={editData.bio}
              onChangeText={text => setEditData({ ...editData, bio: text })}
              multiline
            />
            {/* Araç seçimi */}
            <Text style={styles.inputLabel}>Favori Araç</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {vehicles.map(v => (
                <TouchableOpacity
                  key={v._id}
                  style={[styles.vehicleSelect, editData.favoriteVehicleId === v._id && styles.vehicleSelectActive]}
                  onPress={() => setEditData({ ...editData, favoriteVehicleId: v._id })}
                >
                  <MaterialCommunityIcons name="car" size={20} color="#007AFF" />
                  <Text style={{ marginLeft: 6 }}>{v.brand} {v.model}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {/* TEFE puan gizleme */}
            <View style={styles.switchRow}>
              <Text style={styles.inputLabel}>TEFE Puanını Gizle</Text>
              <Switch
                value={!!editData.tefeHidden}
                onValueChange={val => setEditData({ ...editData, tefeHidden: val })}
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.inputLabel}>Takipçi listesini gizle</Text>
              <Switch
                value={!!editData.followersHidden}
                onValueChange={val => setEditData({ ...editData, followersHidden: val })}
              />
            </View>
            <View style={styles.switchRow}>
              <Text style={styles.inputLabel}>Takip edilen listesini gizle</Text>
              <Switch
                value={!!editData.followingHidden}
                onValueChange={val => setEditData({ ...editData, followingHidden: val })}
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 }}>
              <TouchableOpacity style={[styles.editButton, { backgroundColor: '#ccc' }]} onPress={() => setEditModal(false)}>
                <Text style={styles.editButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editButton} onPress={handleSaveProfile}>
                <Text style={styles.editButtonText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      {uploading && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.uploadingText}>Fotoğraf yükleniyor...</Text>
        </View>
      )}
      {/* Takipçi Modalı */}
      <Modal visible={showFollowersModal} animationType="slide" onRequestClose={() => setShowFollowersModal(false)}>
        <SafeAreaView style={styles.safeArea}>
          <View style={{ flex: 1, padding: 24 }}>
            <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 16 }}>Takipçiler</Text>
            <ScrollView>
              {followers.length === 0 ? (
                <Text>Takipçi yok.</Text>
              ) : (
                followers.map((f, i) => (
                  <TouchableOpacity
                    key={f._id || i}
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, padding: 8, backgroundColor: '#f5f5f5', borderRadius: 8 }}
                    onPress={() => {
                      navigation.navigate('UserProfile', { userId: f._id });
                      setShowFollowersModal(false);
                    }}
                  >
                    <Image source={f.avatar ? { uri: f.avatar } : defaultAvatar} style={{ width: 50, height: 50, borderRadius: 25, marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{f.name} {f.surname}</Text>
                      <Text style={{ fontSize: 14, color: '#666' }}>@{f.username}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={[styles.editButton, { marginTop: 24 }]} onPress={() => setShowFollowersModal(false)}>
              <Text style={styles.editButtonText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
      {/* Takip edilen Modalı */}
      <Modal visible={showFollowingModal} animationType="slide" onRequestClose={() => setShowFollowingModal(false)}>
        <SafeAreaView style={styles.safeArea}>
          <View style={{ flex: 1, padding: 24 }}>
            <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 16 }}>Takip Edilenler</Text>
            <ScrollView>
              {following.length === 0 ? (
                <Text>Takip edilen yok.</Text>
              ) : (
                following.map((f, i) => (
                  <TouchableOpacity
                    key={f._id || i}
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, padding: 8, backgroundColor: '#f5f5f5', borderRadius: 8 }}
                    onPress={() => {
                      navigation.navigate('UserProfile', { userId: f._id });
                      setShowFollowingModal(false);
                    }}
                  >
                    <Image source={f.avatar ? { uri: f.avatar } : defaultAvatar} style={{ width: 50, height: 50, borderRadius: 25, marginRight: 12 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: 'bold' }}>{f.name} {f.surname}</Text>
                      <Text style={{ fontSize: 14, color: '#666' }}>@{f.username}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={[styles.editButton, { marginTop: 24 }]} onPress={() => setShowFollowingModal(false)}>
              <Text style={styles.editButtonText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 2,
  },
  username: {
    fontSize: 15,
    color: '#888',
    marginBottom: 8,
  },
  bio: {
    fontSize: 15,
    color: '#444',
    textAlign: 'center',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    marginTop: 8,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  tefeStatBox: {
    backgroundColor: '#fff7e6',
    borderRadius: 12,
    padding: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statValueSmall: {
    fontSize: 14,
    color: '#FFD700',
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginLeft: 8,
  },
  postCard: {
    width: (Dimensions.get('window').width - 48) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    margin: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  postImage: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    marginBottom: 8,
  },
  postContent: {
    fontSize: 14,
    color: '#444',
    marginBottom: 8,
  },
  postMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postMeta: {
    fontSize: 12,
    color: '#888',
  },
  emptyPostsWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  noPosts: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  logoutTopRightContainer: {
    position: 'absolute',
    right: 16,
    zIndex: 20,
  },
  logoutTopRightButton: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 24,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 24,
    textAlign: 'center',
  },
  photoPicker: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarEdit: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 12,
  },
  coverEdit: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    marginBottom: 12,
  },
  photoPickerText: {
    fontSize: 16,
    color: '#007AFF',
    marginTop: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
  },
  vehicleSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  vehicleSelectActive: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  favVehicleText: {
    fontSize: 15,
    color: '#007AFF',
    marginLeft: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 16,
  },
});

export default ProfileScreen;