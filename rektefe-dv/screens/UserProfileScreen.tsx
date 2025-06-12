import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, FlatList, Dimensions, Animated, Alert, TouchableOpacity, ScrollView, Modal } from 'react-native';
import axios from 'axios';
import { API_URL } from '@env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LottieView from 'lottie-react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { getUserProfile } from '../services/api';
import { StackScreenProps } from '@react-navigation/stack';
import { postService } from '../services/posts';
import { api } from '../services/api';

const { width } = Dimensions.get('window');

// Lottie animasyonları
const verifiedAnim = require('../assets/verified.json');
const emptyProfileAnim = require('../assets/empty_profile.json');

type RootStackParamList = {
  UserProfile: { userId: string };
  // Diğer ekranlar burada tanımlanabilir
};

const UserProfileScreen = ({ route, navigation }: StackScreenProps<RootStackParamList, 'UserProfile'>) => {
  const { userId } = route.params;
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<any[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const defaultAvatar = require('../assets/default_avatar.png');
  const defaultCover = require('../assets/default_cover.jpg');

  useEffect(() => {
    getCurrentUserId();
  }, []);

  useEffect(() => {
    if (currentUserId && userId) {
      fetchUserProfile();
      fetchUserPosts(userId);
      checkFollowStatus();
      fetchFollowers();
      fetchFollowing();
    }
  }, [currentUserId, userId]);

  const getCurrentUserId = async () => {
    const id = await AsyncStorage.getItem('userId');
    setCurrentUserId(id);
  };

  const fetchUserProfile = async () => {
    try {
      const response = await getUserProfile(userId);
      console.log('UserProfileScreen user:', response);
      setUser(response);
    } catch (error) {
      console.error('Kullanıcı bilgileri getirme hatası:', error);
      Alert.alert('Hata', 'Kullanıcı bilgileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async (id: string) => {
    try {
      const userPosts = await postService.getUserPosts(id);
      setPosts(userPosts.filter((p: any) => p && p.user && p._id));
    } catch (error) {
      console.error('Gönderiler yüklenirken hata:', error);
      setPosts([]);
    }
  };

  const checkFollowStatus = async () => {
    try {
      const response = await api.get(`/users/check-follow/${userId}`);
      setIsFollowing(response.data.isFollowing);
    } catch (error) {
      console.error('Takip durumu kontrolünde hata:', error);
      setIsFollowing(false);
    }
  };

  const fetchFollowers = async () => {
    try {
      const response = await api.get(`/users/followers/${userId}`);
      setFollowers(response.data);
    } catch (error) {
      console.error('Takipçiler alınamadı:', error);
    }
  };

  const fetchFollowing = async () => {
    try {
      const response = await api.get(`/users/following/${userId}`);
      setFollowing(response.data);
    } catch (error) {
      console.error('Takip edilenler alınamadı:', error);
    }
  };

  const handleFollow = async () => {
    try {
      const response = await api.post(`/users/follow/${userId}`);
      if (response.data.message) {
        setIsFollowing(true);
        Alert.alert('Başarılı', 'Kullanıcı takip edildi.');
        fetchUserProfile();
      }
    } catch (error) {
      console.error('Takip işleminde hata:', error);
      Alert.alert('Hata', 'Kullanıcı takip edilirken bir hata oluştu.');
    }
  };

  const handleUnfollow = async () => {
    try {
      const response = await api.post(`/users/unfollow/${userId}`);
      if (response.data.message) {
        setIsFollowing(false);
        Alert.alert('Başarılı', 'Kullanıcı takibi bırakıldı.');
        fetchUserProfile();
      }
    } catch (error) {
      console.error('Takipten çıkma işleminde hata:', error);
      Alert.alert('Hata', 'Kullanıcı takipten çıkılırken bir hata oluştu.');
    }
  };

  // Gizlilik kontrolü
  const followersHidden = !!user?.followersHidden;
  const followingHidden = !!user?.followingHidden;
  const isMyProfile = userId === currentUserId;

  // Modal açma fonksiyonları
  const handleShowFollowers = () => {
    if (followersHidden && !isMyProfile) {
      Alert.alert('Gizli', 'Kullanıcı takipçi listesini gizlemiş.');
      return;
    }
    setShowFollowers(true);
  };
  const handleShowFollowing = () => {
    if (followingHidden && !isMyProfile) {
      Alert.alert('Gizli', 'Kullanıcı takip edilen listesini gizlemiş.');
      return;
    }
    setShowFollowing(true);
  };

  // Profil fotoğrafı seçme ve yükleme
  const pickAndUploadAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const localUri = result.assets[0].uri;
      const filename = localUri.split('/').pop();
      const match = /\.([^.]+)$/.exec(filename!);
      const type = match ? `image/${match[1]}` : `image`;
      const formData = new FormData();
      formData.append('image', { uri: localUri, name: filename, type } as any);
      const t = await AsyncStorage.getItem('token');
      try {
        const uploadRes = await axios.post(`${API_URL}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${t}` } });
        console.log('Upload response:', uploadRes.data);
        let url = uploadRes.data.url;
        if (!url.startsWith('http')) url = `${API_URL.replace('/api','')}${url}`;
        const patchRes = await axios.patch(`${API_URL}/user/${userId}`, { avatar: url }, { headers: { Authorization: `Bearer ${t}` } });
        console.log('Patch response:', patchRes.data);
        setUser((u: any) => ({ ...u, avatar: url }));
        Alert.alert('Başarılı', 'Profil fotoğrafı güncellendi.');
        fetchUserProfile();
      } catch (e) { console.log('Avatar yükleme hatası:', e); Alert.alert('Hata', 'Profil fotoğrafı yüklenemedi.'); }
    }
  };

  // Kapak resmi seçme ve yükleme
  const pickAndUploadCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [3, 1], quality: 0.7 });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const localUri = result.assets[0].uri;
      const filename = localUri.split('/').pop();
      const match = /\.([^.]+)$/.exec(filename!);
      const type = match ? `image/${match[1]}` : `image`;
      const formData = new FormData();
      formData.append('image', { uri: localUri, name: filename, type } as any);
      const t = await AsyncStorage.getItem('token');
      try {
        const uploadRes = await axios.post(`${API_URL}/upload`, formData, { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${t}` } });
        console.log('Upload response:', uploadRes.data);
        let url = uploadRes.data.url;
        if (!url.startsWith('http')) url = `${API_URL.replace('/api','')}${url}`;
        const patchRes = await axios.patch(`${API_URL}/user/${userId}`, { cover: url }, { headers: { Authorization: `Bearer ${t}` } });
        console.log('Patch response:', patchRes.data);
        setUser((u: any) => ({ ...u, cover: url }));
        Alert.alert('Başarılı', 'Kapak resmi güncellendi.');
        fetchUserProfile();
      } catch (e) { console.log('Kapak yükleme hatası:', e); Alert.alert('Hata', 'Kapak resmi yüklenemedi.'); }
    }
  };

  const renderPost = ({ item }: { item: any }) => (
    <View style={styles.postCard}>
      <Text style={styles.postContent}>{item.content}</Text>
      <View style={styles.postMetaRow}>
        <Text style={styles.postMeta}>{new Date(item.createdAt).toLocaleString('tr-TR')}</Text>
        <Text style={styles.postMeta}>❤️ {item.likes.length}   💬 {item.commentsCount || 0}</Text>
      </View>
    </View>
  );

  const renderContent = () => {
    console.log('userId:', userId, 'currentUserId:', currentUserId);
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      );
    }

    return (
      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item._id}
        ListHeaderComponent={
          <>
            <View style={styles.coverContainer}>
              <Image
                source={user?.cover ? { uri: user.cover } : defaultCover}
                style={styles.coverPhoto}
                onLoad={() => console.log('UserProfileScreen cover loaded:', user?.cover)}
              />
            </View>
            <View style={styles.profileInfo}>
              <Image
                source={user?.avatar ? { uri: user.avatar } : defaultAvatar}
                style={styles.avatar}
                onLoad={() => console.log('UserProfileScreen avatar loaded:', user?.avatar)}
              />
              <Text style={styles.name}>{user?.name || 'İsimsiz Kullanıcı'}</Text>
              <Text style={styles.email}>{user?.email || ''}</Text>
              {user?.city && <Text style={styles.city}>{user.city}</Text>}
              {!isMyProfile && (
                <TouchableOpacity
                  style={{
                    backgroundColor: isFollowing ? '#FF3B30' : '#34C759',
                    paddingHorizontal: 24,
                    paddingVertical: 8,
                    borderRadius: 20,
                    marginTop: 12,
                    alignSelf: 'center',
                  }}
                  onPress={async () => {
                    if (isFollowing) {
                      await handleUnfollow();
                      setFollowers((prev: any) => prev.filter((f: any) => f._id !== currentUserId));
                    } else {
                      await handleFollow();
                      setFollowers((prev: any) => [...prev, { _id: currentUserId }]);
                    }
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                    {isFollowing ? 'Takipten Çık' : 'Takip Et'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{user?.tefePoints ?? 0}</Text>
                <Text style={styles.statLabel}>Tefe Puanı</Text>
              </View>
              <TouchableOpacity style={styles.statBox} onPress={handleShowFollowers}>
                <Text style={styles.statNum}>{followers.length}</Text>
                <Text style={styles.statLabel}>Takipçi</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.statBox} onPress={handleShowFollowing}>
                <Text style={styles.statNum}>{following.length}</Text>
                <Text style={styles.statLabel}>Takip</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.sectionTitle}>Gönderiler</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <LottieView source={emptyProfileAnim} autoPlay loop style={styles.emptyAnimation} />
            <Text style={styles.emptyText}>Henüz gönderi yok</Text>
          </View>
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <AntDesign name="arrowleft" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil</Text>
        <View style={styles.headerRight} />
      </View>
      {renderContent()}
      {/* Takipçi Modalı */}
      <Modal visible={showFollowers} animationType="slide" onRequestClose={() => setShowFollowers(false)}>
        <SafeAreaView style={styles.container}>
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
                      setShowFollowers(false);
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
            <TouchableOpacity style={[styles.editButton, { marginTop: 24 }]} onPress={() => setShowFollowers(false)}>
              <Text style={styles.editButtonText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
      {/* Takip edilen Modalı */}
      <Modal visible={showFollowing} animationType="slide" onRequestClose={() => setShowFollowing(false)}>
        <SafeAreaView style={styles.container}>
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
                      setShowFollowing(false);
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
            <TouchableOpacity style={[styles.editButton, { marginTop: 24 }]} onPress={() => setShowFollowing(false)}>
              <Text style={styles.editButtonText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#1a1a1a',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 40,
  },
  backButton: {
    padding: 8,
  },
  coverContainer: {
    height: 200,
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
  },
  profileInfo: {
    alignItems: 'center',
    marginTop: -50,
    paddingBottom: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#000',
  },
  name: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  email: {
    color: '#666',
    fontSize: 16,
    marginTop: 5,
  },
  city: {
    color: '#5AC8FA',
    fontSize: 16,
    marginTop: 5,
  },
  statsRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8, marginBottom: 8 },
  statBox: { alignItems: 'center', marginHorizontal: 18 },
  statNum: { color: '#5AC8FA', fontWeight: 'bold', fontSize: 18 },
  statLabel: { color: '#888', fontSize: 13 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#5AC8FA', marginTop: 18, marginBottom: 8, alignSelf: 'center' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyAnimation: { width: 120, height: 120 },
  emptyText: { color: '#aaa', fontSize: 15, marginBottom: 16 },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    margin: 8,
    width: width / 2 - 32,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2
  },
  postContent: {
    fontSize: 15,
    color: '#222',
    marginBottom: 6
  },
  postMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  postMeta: {
    color: '#888',
    fontSize: 12
  },
  editButton: {
    backgroundColor: '#5AC8FA',
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default UserProfileScreen; 