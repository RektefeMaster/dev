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
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Switch,
  FlatList,
} from 'react-native';
import { MaterialCommunityIcons, AntDesign, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { updateProfilePhoto, updateCoverPhoto, getUserProfile } from '../services/api';
import { postService } from '../services/posts';

interface EditData {
  username?: string;
  bio?: string;
  name?: string;
  surname?: string;
  tefeHidden?: boolean;
  followersHidden?: boolean;
  followingHidden?: boolean;
  favoriteVehicleId?: string;
  avatar?: string;
  cover?: string;
  emailHidden?: boolean;
  phoneHidden?: boolean;
}

const { width } = Dimensions.get('window');
const defaultAvatar = require('../assets/default_avatar.png');
const defaultCover = require('../assets/default_cover.jpg');

const RektagramProfileScreen = ({ navigation }: any) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [editData, setEditData] = useState<EditData>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
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
    loadUserData();
  }, []);

  useEffect(() => {
    if (userId && token) {
      fetchProfile(userId);
      fetchUserPosts(userId);
      fetchFollowers(userId);
      fetchFollowing(userId);
    }
  }, [userId, token]);

  const loadUserData = async () => {
    try {
      const storedId = await AsyncStorage.getItem('userId');
      const storedToken = await AsyncStorage.getItem('token');
      if (!storedId || !storedToken) {
        setError('Oturum bilgisi bulunamadı.');
        setLoading(false);
        return;
      }
      setUserId(storedId);
      setToken(storedToken);
    } catch (err) {
      setError('Veriler yüklenirken bir hata oluştu');
      setLoading(false);
    }
  };

  const fetchProfile = async (id: string) => {
    try {
      const response = await getUserProfile(id);
      setUser(response);
      setEditData(response);
    } catch (error) {
      setError('Profil bilgileri yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async (id: string) => {
    try {
      const userPosts = await postService.getUserPosts(id);
      setPosts(userPosts.filter((p: any) => p && p.user && p._id));
    } catch (error) {
      setError('Gönderiler yüklenirken bir hata oluştu.');
    }
  };

  const fetchFollowers = async (id: string) => {
    try {
      const res = await fetch(`${process.env.API_URL}/users/followers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setFollowers(data);
    } catch (e) {
      setFollowers([]);
    }
  };

  const fetchFollowing = async (id: string) => {
    try {
      const res = await fetch(`${process.env.API_URL}/users/following/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setFollowing(data);
    } catch (e) {
      setFollowing([]);
    }
  };

  const handleSaveProfile = async () => {
    if (!userId || !token) return;
    try {
      const res = await fetch(`${process.env.API_URL}/user/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editData)
      });
      if (!res.ok) throw new Error('Profil güncellenemedi');
      await fetchProfile(userId);
      setEditModal(false);
      Alert.alert('Başarılı', 'Profil başarıyla güncellendi.');
    } catch (e) {
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
      Alert.alert('Hata', 'Fotoğraf yüklenirken bir hata oluştu.');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'Hayır', style: 'cancel' },
        { text: 'Evet', style: 'destructive', onPress: async () => {
            await AsyncStorage.removeItem('userId');
            await AsyncStorage.removeItem('token');
            navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
          }
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5AC8FA" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadUserData}>
          <Text style={styles.retryButtonText}>Tekrar Dene</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <AntDesign name="arrowleft" size={24} color="#F5F7FA" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profil</Text>
        <TouchableOpacity style={styles.fabEditButton} onPress={() => setEditModal(true)}>
          <Feather name="edit" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={posts}
        ListHeaderComponent={
          <>
            {/* COVER */}
            <View style={styles.coverContainer}>
              <Image source={user?.cover ? { uri: user.cover } : defaultCover} style={styles.coverPhoto} />
              <TouchableOpacity style={styles.coverEditBtn} onPress={() => pickImage('cover')}>
                <Feather name="camera" size={18} color="#5AC8FA" />
              </TouchableOpacity>
            </View>
            {/* PROFILE CARD */}
            <View style={styles.profileCard}>
              <View style={styles.avatarWrap}>
                <Image source={user?.avatar ? { uri: user.avatar } : defaultAvatar} style={styles.avatar} />
                <TouchableOpacity style={styles.avatarEditBtn} onPress={() => pickImage('profile')}>
                  <Feather name="camera" size={18} color="#5AC8FA" />
                </TouchableOpacity>
              </View>
              <Text style={styles.name}>{user?.name} {user?.surname}</Text>
              <Text style={styles.username}>@{user?.username}</Text>
              {user?.bio && <Text style={styles.bio}>{user.bio}</Text>}
              {user?.city && <Text style={styles.city}>{user.city}</Text>}
              <View style={styles.statsRow}>
                <TouchableOpacity style={styles.statBox} onPress={() => setShowFollowersModal(true)}>
                  <Text style={styles.statNum}>{followers.length}</Text>
                  <Text style={styles.statLabel}>Takipçi</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.statBox} onPress={() => setShowFollowingModal(true)}>
                  <Text style={styles.statNum}>{following.length}</Text>
                  <Text style={styles.statLabel}>Takip</Text>
                </TouchableOpacity>
                <View style={styles.statBox}>
                  <Text style={styles.statNum}>{posts.length}</Text>
                  <Text style={styles.statLabel}>Gönderi</Text>
                </View>
              </View>
            </View>
            <Text style={styles.sectionTitle}>Gönderiler</Text>
          </>
        }
        renderItem={({ item }) => (
          <Animated.View style={styles.postCard}>
            <View style={styles.postHeader}>
              <Image source={user?.avatar ? { uri: user.avatar } : defaultAvatar} style={styles.postAvatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.postName}>{user?.name}</Text>
                <Text style={styles.postDate}>{new Date(item.createdAt).toLocaleString('tr-TR')}</Text>
              </View>
            </View>
            <Text style={styles.postContent}>{item.content}</Text>
            {item.images && item.images.length > 0 && (
              <Image source={{ uri: item.images[0] }} style={styles.postImage} />
            )}
            <View style={styles.postMetaRow}>
              <TouchableOpacity style={styles.actionButton}>
                <AntDesign name="heart" size={16} color="#5AC8FA" style={{ marginRight: 4 }} />
                <Text style={styles.postMeta}>{item.likes?.length || 0}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <AntDesign name="message1" size={16} color="#5AC8FA" style={{ marginRight: 4 }} />
                <Text style={styles.postMeta}>{item.commentsCount || 0}</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
        keyExtractor={item => item._id}
        ListEmptyComponent={<Text style={styles.noPosts}>Henüz gönderi yok.</Text>}
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      />
      {/* PROFİL DÜZENLEME MODALI */}
      <Modal visible={editModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Profili Düzenle</Text>
              <TouchableOpacity onPress={() => setEditModal(false)}>
                <AntDesign name="close" size={24} color="#5AC8FA" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              <TouchableOpacity onPress={() => pickImage('profile')} style={styles.updatePhotoBtn}>
                <Image source={editData.avatar ? { uri: editData.avatar } : defaultAvatar} style={styles.updatePhoto} />
                <Text style={styles.updatePhotoText}>Profil Fotoğrafı Değiştir</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => pickImage('cover')} style={styles.updatePhotoBtn}>
                <Image source={editData.cover ? { uri: editData.cover } : defaultCover} style={styles.updateCover} />
                <Text style={styles.updatePhotoText}>Kapak Fotoğrafı Değiştir</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                placeholder="İsim"
                placeholderTextColor="#888"
                value={editData.name}
                onChangeText={text => setEditData({ ...editData, name: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Soyisim"
                placeholderTextColor="#888"
                value={editData.surname}
                onChangeText={text => setEditData({ ...editData, surname: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Kullanıcı Adı"
                placeholderTextColor="#888"
                value={editData.username}
                onChangeText={text => setEditData({ ...editData, username: text })}
              />
              <TextInput
                style={styles.input}
                placeholder="Biyografi"
                placeholderTextColor="#888"
                value={editData.bio}
                onChangeText={text => setEditData({ ...editData, bio: text })}
                multiline
              />
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>E-posta Gizli</Text>
                <Switch
                  value={!!editData.emailHidden}
                  onValueChange={v => setEditData((prev: any) => ({ ...prev, emailHidden: v }))}
                  thumbColor={editData.emailHidden ? '#5AC8FA' : '#888'}
                  trackColor={{ false: '#444', true: '#5AC8FA55' }}
                />
              </View>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Telefon Gizli</Text>
                <Switch
                  value={!!editData.phoneHidden}
                  onValueChange={v => setEditData((prev: any) => ({ ...prev, phoneHidden: v }))}
                  thumbColor={editData.phoneHidden ? '#5AC8FA' : '#888'}
                  trackColor={{ false: '#444', true: '#5AC8FA55' }}
                />
              </View>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
                <Text style={styles.saveButtonText}>Kaydet</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* Followers Modal */}
      <Modal visible={showFollowersModal} animationType="slide" transparent onRequestClose={() => setShowFollowersModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Takipçiler</Text>
              <TouchableOpacity onPress={() => setShowFollowersModal(false)}>
                <AntDesign name="close" size={24} color="#5AC8FA" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {followers.length === 0 ? (
                <Text style={styles.noPosts}>Takipçi yok.</Text>
              ) : (
                followers.map((f, i) => (
                  <View key={f._id || i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, padding: 8, borderRadius: 12, backgroundColor: '#23242a' }}>
                    <Image source={f.avatar ? { uri: f.avatar } : defaultAvatar} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12, borderWidth: 2, borderColor: '#5AC8FA' }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#F5F7FA', fontWeight: 'bold', fontSize: 15 }}>{f.name} {f.surname}</Text>
                      <Text style={{ color: '#5AC8FA', fontSize: 13 }}>@{f.username}</Text>
                    </View>
                    <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('UserProfile', { userId: f._id })}>
                      <Feather name="user" size={16} color="#5AC8FA" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      {/* Following Modal */}
      <Modal visible={showFollowingModal} animationType="slide" transparent onRequestClose={() => setShowFollowingModal(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Takip Edilenler</Text>
              <TouchableOpacity onPress={() => setShowFollowingModal(false)}>
                <AntDesign name="close" size={24} color="#5AC8FA" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {following.length === 0 ? (
                <Text style={styles.noPosts}>Takip edilen yok.</Text>
              ) : (
                following.map((f, i) => (
                  <View key={f._id || i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, padding: 8, borderRadius: 12, backgroundColor: '#23242a' }}>
                    <Image source={f.avatar ? { uri: f.avatar } : defaultAvatar} style={{ width: 40, height: 40, borderRadius: 20, marginRight: 12, borderWidth: 2, borderColor: '#5AC8FA' }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#F5F7FA', fontWeight: 'bold', fontSize: 15 }}>{f.name} {f.surname}</Text>
                      <Text style={{ color: '#5AC8FA', fontSize: 13 }}>@{f.username}</Text>
                    </View>
                    <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('UserProfile', { userId: f._id })}>
                      <Feather name="user" size={16} color="#5AC8FA" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181920',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#181920',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#181920',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    padding: 10,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 12,
    backgroundColor: '#181920',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  headerTitle: {
    color: '#F5F7FA',
    fontSize: 22,
    fontWeight: 'bold',
  },
  fabEditButton: {
    backgroundColor: '#5AC8FA',
    borderRadius: 24,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5AC8FA',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  backButton: {
    padding: 8,
  },
  coverContainer: {
    height: 240,
    width: '100%',
    marginBottom: -70,
    backgroundColor: '#23242a',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  coverPhoto: {
    width: '100%',
    height: '100%',
  },
  coverEditBtn: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#181920',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#5AC8FA',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  profileCard: {
    backgroundColor: '#23242a',
    borderRadius: 20,
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 0,
    marginBottom: 18,
    paddingTop: 80,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  avatarWrap: {
    position: 'absolute',
    top: -60,
    alignItems: 'center',
    width: 100,
    left: (width / 2) - 66,
    zIndex: 2,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#181920',
  },
  avatarEditBtn: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: '#181920',
    borderRadius: 16,
    padding: 6,
    shadowColor: '#5AC8FA',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  name: {
    color: '#F5F7FA',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
  },
  username: {
    color: '#5AC8FA',
    fontSize: 15,
    marginTop: 2,
    marginBottom: 2,
  },
  bio: {
    color: '#ccc',
    fontSize: 15,
    marginTop: 6,
    marginBottom: 2,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 16,
  },
  city: {
    color: '#5AC8FA',
    fontSize: 15,
    marginTop: 4,
    marginBottom: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 2,
  },
  statBox: {
    alignItems: 'center',
    marginHorizontal: 18,
  },
  statNum: {
    color: '#5AC8FA',
    fontWeight: 'bold',
    fontSize: 18,
  },
  statLabel: {
    color: '#888',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5AC8FA',
    marginTop: 18,
    marginBottom: 8,
    alignSelf: 'center',
  },
  postCard: {
    backgroundColor: '#23242a',
    borderRadius: 18,
    padding: 16,
    marginVertical: 10,
    marginHorizontal: 8,
    width: width - 32,
    alignSelf: 'center',
    shadowColor: '#5AC8FA',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    borderWidth: 1,
    borderColor: '#5AC8FA33',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  postAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#5AC8FA',
  },
  postName: {
    color: '#5AC8FA',
    fontWeight: 'bold',
    fontSize: 15,
  },
  postDate: {
    color: '#888',
    fontSize: 12,
  },
  postContent: {
    fontSize: 15,
    color: '#F5F7FA',
    marginBottom: 6,
  },
  postImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 8,
  },
  postMetaRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1F26',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginLeft: 8,
  },
  postMeta: {
    fontSize: 13,
    color: '#ccc',
    marginLeft: 4,
  },
  noPosts: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 32,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#23242a',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5AC8FA',
  },
  updatePhotoBtn: {
    alignItems: 'center',
    marginBottom: 12,
  },
  updatePhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 6,
  },
  updateCover: {
    width: '100%',
    height: 60,
    borderRadius: 8,
    marginBottom: 6,
  },
  updatePhotoText: {
    color: '#5AC8FA',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#181920',
    color: '#F5F7FA',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 15,
    color: '#F5F7FA',
  },
  saveButton: {
    backgroundColor: '#5AC8FA',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  userUsername: {
    fontSize: 14,
    color: '#666',
  },
});

export default RektagramProfileScreen;