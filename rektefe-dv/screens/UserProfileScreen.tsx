import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Image, FlatList, Dimensions, Animated, Alert, TouchableOpacity, ScrollView, Modal, KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import axios from 'axios';
import { API_URL } from '../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LottieView from 'lottie-react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { getUserProfile } from '../services/api';
import { StackScreenProps } from '@react-navigation/stack';
import { postService } from '../services/posts';
import { api } from '../services/api';
import { RootStackParamList } from '../navigation/AppNavigator';

const { width } = Dimensions.get('window');

// Lottie animasyonları
const verifiedAnim = require('../assets/verified.json');
const emptyProfileAnim = require('../assets/empty_profile.json');

type Props = StackScreenProps<RootStackParamList, 'UserProfile'>;

const UserProfileScreen: React.FC<Props> = ({ route, navigation }) => {
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
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);

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
      const response = await api.get(`/users/${userId}`);
      console.log('UserProfileScreen user:', response);
      setUser(response.data);
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
        const patchRes = await axios.patch(`${API_URL}/users/${userId}`, { avatar: url }, { headers: { Authorization: `Bearer ${t}` } });
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
        const patchRes = await axios.patch(`${API_URL}/users/${userId}`, { cover: url }, { headers: { Authorization: `Bearer ${t}` } });
        console.log('Patch response:', patchRes.data);
        setUser((u: any) => ({ ...u, cover: url }));
        Alert.alert('Başarılı', 'Kapak resmi güncellendi.');
        fetchUserProfile();
      } catch (e) { console.log('Kapak yükleme hatası:', e); Alert.alert('Hata', 'Kapak resmi yüklenemedi.'); }
    }
  };

  // Gönderi kartı için yeni tasarım
  const handleLike = async (postId: string) => {
    setPosts(prevPosts => prevPosts.map(post => {
      if (post._id === postId) {
        const liked = post.likes.includes(currentUserId);
        const newLikes = liked
          ? post.likes.filter((id: string) => id !== currentUserId)
          : [...post.likes, currentUserId];
        return { ...post, likes: newLikes };
      }
      return post;
    }));
    try {
      await api.post(`/posts/${postId}/like`);
    } catch (e) {
      // Hata olursa eski haline döndür
      setPosts(prevPosts => prevPosts.map(post => {
        if (post._id === postId) {
          const liked = post.likes.includes(currentUserId);
          const newLikes = liked
            ? [...post.likes, currentUserId]
            : post.likes.filter((id: string) => id !== currentUserId);
          return { ...post, likes: newLikes };
        }
        return post;
      }));
    }
  };

  const openComments = async (post: any) => {
    setSelectedPost(post);
    setCommentModalVisible(true);
    try {
      const res = await api.get(`/comments/${post._id}`);
      setComments(res.data);
    } catch (e) {
      setComments([]);
    }
  };

  const sendComment = async () => {
    if (!newComment.trim() || !selectedPost) return;
    setSendingComment(true);
    const tempComment = {
      _id: 'temp-' + Date.now(),
      user: { _id: currentUserId, name: 'Sen' },
      content: newComment,
      createdAt: new Date().toISOString(),
    };
    setComments(prev => [tempComment, ...prev]);
    setNewComment('');
    setPosts(prevPosts => prevPosts.map(post => {
      if (post._id === selectedPost._id) {
        return { ...post, commentsCount: (post.commentsCount || 0) + 1 };
      }
      return post;
    }));
    try {
      const response = await api.post(`/comments/${selectedPost._id}`, { content: tempComment.content });
      setComments(prev => prev.map(c => c._id === tempComment._id ? response.data : c));
    } catch (e) {
      setComments(prev => prev.filter(c => c._id !== tempComment._id));
      setPosts(prevPosts => prevPosts.map(post => {
        if (post._id === selectedPost._id) {
          return { ...post, commentsCount: (post.commentsCount || 0) - 1 };
        }
        return post;
      }));
    } finally {
      setSendingComment(false);
    }
  };

  const closeComments = () => {
    setCommentModalVisible(false);
    setSelectedPost(null);
    setComments([]);
    setNewComment('');
  };

  const renderPost = ({ item }: { item: any }) => {
    const liked = item.likes.includes(currentUserId);
    return (
      <Animated.View style={[styles.postCard, { backgroundColor: '#23242a', shadowColor: '#5AC8FA', shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 }]}>  
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Image source={user?.avatar ? { uri: user.avatar } : defaultAvatar} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10, borderWidth: 2, borderColor: '#5AC8FA' }} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#5AC8FA', fontWeight: 'bold', fontSize: 15 }}>{user?.name || 'Kullanıcı'}</Text>
            <Text style={{ color: '#B0B3C6', fontSize: 12 }}>{new Date(item.createdAt).toLocaleString('tr-TR')}</Text>
          </View>
          {item.imageUrl && (
            <Image source={{ uri: item.imageUrl }} style={{ width: 48, height: 48, borderRadius: 8, marginLeft: 8 }} />
          )}
        </View>
        <Text style={styles.postContent}>{item.content}</Text>
        <View style={styles.postMetaRow}>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => handleLike(item._id)}>
            <AntDesign name="heart" size={16} color={liked ? "#FF3B30" : "#B0B3C6"} style={{ marginRight: 4 }} />
            <Text style={{ color: liked ? '#FF3B30' : '#B0B3C6', fontWeight: 'bold', marginRight: 12 }}>{item.likes.length}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={() => openComments(item)}>
            <AntDesign name="message1" size={16} color="#5AC8FA" style={{ marginRight: 4 }} />
            <Text style={{ color: '#5AC8FA', fontWeight: 'bold' }}>{item.commentsCount || 0}</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

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
              <Text style={styles.email}>{user?.username ? `@${user.username}` : ''}</Text>
              {user?.bio && <Text style={styles.bio}>{user.bio}</Text>}
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
      {/* Yorumlar Modalı */}
      <Modal visible={commentModalVisible} animationType="slide" transparent onRequestClose={closeComments}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
          <Animated.View style={{ backgroundColor: '#23242a', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 0, maxHeight: '75%', shadowColor: '#5AC8FA', shadowOpacity: 0.18, shadowRadius: 16, elevation: 12, transform: [{ translateY: 0 }] }}>
            <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
              <View style={{ width: 48, height: 5, borderRadius: 3, backgroundColor: '#5AC8FA55', marginBottom: 8 }} />
              <Text style={{ color: '#5AC8FA', fontWeight: 'bold', fontSize: 20, letterSpacing: 1 }}>💬 Yorumlar</Text>
            </View>
            <ScrollView style={{ maxHeight: 260, paddingHorizontal: 8 }} showsVerticalScrollIndicator={false}>
              {comments.length === 0 ? (
                <View style={{ alignItems: 'center', marginTop: 32 }}>
                  <LottieView source={require('../assets/empty_profile.json')} autoPlay loop style={{ width: 90, height: 90 }} />
                  <Text style={{ color: '#888', textAlign: 'center', marginTop: 8, fontSize: 15 }}>Henüz yorum yok. İlk yorumu sen yap!</Text>
                </View>
              ) : (
                comments.map((c, i) => (
                  <View key={c._id || i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 }}>
                    <Image source={c.user?.avatar ? { uri: c.user.avatar } : defaultAvatar} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10, borderWidth: 2, borderColor: '#5AC8FA' }} />
                    <View style={{ backgroundColor: i % 2 === 0 ? '#2a2b32' : '#181920', borderRadius: 16, padding: 10, flex: 1, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 }}>
                      <Text style={{ fontWeight: 'bold', color: '#5AC8FA', fontSize: 15 }}>{c.user?.name || 'Kullanıcı'}</Text>
                      <Text style={{ fontSize: 15, color: '#f1f1f1', marginVertical: 2 }}>{c.content}</Text>
                      <Text style={{ color: '#888', fontSize: 11, textAlign: 'right' }}>{new Date(c.createdAt).toLocaleString('tr-TR')}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 10, paddingHorizontal: 8, paddingBottom: 8 }}>
              <Image source={user?.avatar ? { uri: user.avatar } : defaultAvatar} style={{ width: 32, height: 32, borderRadius: 16, marginRight: 8, borderWidth: 2, borderColor: '#5AC8FA' }} />
              <View style={{ flex: 1, backgroundColor: '#181920', borderRadius: 18, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#5AC8FA33' }}>
                <TextInput
                  style={{ flex: 1, color: '#fff', fontSize: 15, minHeight: 36, maxHeight: 80 }}
                  placeholder="Yorum yaz..."
                  placeholderTextColor="#5AC8FA99"
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                />
                <TouchableOpacity style={{ marginLeft: 6, backgroundColor: '#5AC8FA', borderRadius: 16, paddingVertical: 8, paddingHorizontal: 14, shadowColor: '#5AC8FA', shadowOpacity: 0.18, shadowRadius: 6, elevation: 4 }} onPress={sendComment} disabled={sendingComment || !newComment.trim()}>
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>{sendingComment ? '...' : 'Gönder'}</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity onPress={closeComments} style={{ alignSelf: 'center', marginTop: 8, marginBottom: 8, backgroundColor: '#FF3B30', borderRadius: 16, paddingHorizontal: 24, paddingVertical: 8, shadowColor: '#FF3B30', shadowOpacity: 0.18, shadowRadius: 6, elevation: 4 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 }}>Kapat</Text>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
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
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    color: '#F5F7FA',
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
    backgroundColor: 'transparent',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#000',
  },
  name: {
    color: '#F5F7FA',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  email: {
    color: '#B0B3C6',
    fontSize: 16,
    marginTop: 5,
  },
  bio: {
    color: '#B0B3C6',
    fontSize: 15,
    marginTop: 6,
    marginBottom: 2,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 16,
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
  emptyText: {
    color: '#888',
    fontSize: 15,
    marginBottom: 16
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
  postContent: {
    fontSize: 15,
    color: '#F5F7FA',
    marginBottom: 6
  },
  postMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
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
  favoriteButton: {
    position: 'absolute',
    right: 10,
    top: 10,
    padding: 5,
  },
});

export default UserProfileScreen; 