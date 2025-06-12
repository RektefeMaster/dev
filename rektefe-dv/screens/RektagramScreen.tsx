import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, Alert, Animated, Easing, ToastAndroid, FlatList as RNFlatList, Image, ScrollView, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@env';
import { useNavigation } from '@react-navigation/native';
import { AntDesign, Feather, MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Feather as ExpoFeather } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale/tr';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { MotiView } from 'moti';

interface Post {
  _id: string;
  user: { _id: string; name: string; email: string; avatar?: string; city?: string; tags?: string[] };
  content: string;
  likes: string[];
  createdAt: string;
  commentsCount?: number;
  imageUrl?: string;
  city?: string;
  tags?: string[];
}

interface Comment {
  _id: string;
  user: { _id: string; name: string; email: string };
  content: string;
  createdAt: string;
}

const defaultAvatar = require('../assets/default_avatar.png');
const defaultCover = require('../assets/default_cover.jpg');

const RektagramScreen = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [token, setToken] = useState('');
  const [userId, setUserId] = useState('');
  const [sending, setSending] = useState(false);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [likeAnim] = useState(() => new Animated.Value(1));
  const [scrollY, setScrollY] = useState(new Animated.Value(0));
  const [showScrollTop, setShowScrollTop] = useState(false);
  const flatListRef = useRef<RNFlatList>(null);
  const [categories] = useState([
    'Popüler',
    'Markam',
    'Şehrim',
    'Forum',
    'Pazar',
  ]);
  const [selectedCategory, setSelectedCategory] = useState('Popüler');
  const [search, setSearch] = useState('');
  const [expandedPosts, setExpandedPosts] = useState<string[]>([]);
  const [sharePlaceholders] = useState([
    'Ne düşünüyorsun?',
    'Bugün neler oldu?',
    'Bir ipucu paylaş!',
    'Aracınla ilgili bir şey anlat!',
    'Bir fotoğraf ekle, paylaş!',
    'Soru sor, yardım iste!',
    'Deneyimlerini paylaş!',
    'Önerilerin neler?',
    'Yeni bir şey mi öğrendin?',
    'İlham veren bir şey mi var?'
  ]);
  const [currentPlaceholder, setCurrentPlaceholder] = useState('');
  const [indicatorX, setIndicatorX] = useState(0);
  const [indicatorWidth, setIndicatorWidth] = useState(0);
  const indicatorAnim = useRef(new Animated.Value(0)).current;
  const indicatorWidthAnim = useRef(new Animated.Value(0)).current;
  const [fabOpen, setFabOpen] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const fabAnim = useRef(new Animated.Value(0)).current;
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFloatingHeader, setShowFloatingHeader] = useState(false);
  const windowWidth = Dimensions.get('window').width;
  const [fullImage, setFullImage] = useState<string | null>(null);
  const [showFullPostId, setShowFullPostId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const postsPerPage = 20;

  const navigation: any = useNavigation();

  const fetchPosts = useCallback(async (page = 1, shouldRefresh = false) => {
    if (shouldRefresh) {
      setLoading(true);
      setCurrentPage(1);
    }
    
    try {
      const res = await api.get(`/posts?page=${page}&limit=${postsPerPage}`);
      if (res.data && Array.isArray(res.data)) {
        if (shouldRefresh) {
          setPosts(res.data);
        } else {
          setPosts(prev => [...prev, ...res.data]);
        }
        setHasMorePosts(res.data.length === postsPerPage);
      } else {
        if (shouldRefresh) {
          setPosts([]);
        }
        setHasMorePosts(false);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
      if (shouldRefresh) {
        setPosts([]);
      }
      setHasMorePosts(false);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [navigation]);

  const getUserData = async () => {
    try {
      const [t, u] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('userId')
      ]);
      
      if (!t || !u) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
        return;
      }

      setToken(t);
      setUserId(u);
    } catch (error) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      await getUserData();
      await fetchPosts(1, true);
    };

    initializeApp();
    setCurrentPlaceholder(sharePlaceholders[Math.floor(Math.random() * sharePlaceholders.length)]);
    
    const interval = setInterval(() => {
      setCurrentPlaceholder(sharePlaceholders[Math.floor(Math.random() * sharePlaceholders.length)]);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('', msg);
    }
  };

  const handleShare = useCallback(async () => {
    if (!newPost.trim()) {
      showToast('Gönderi içeriği boş olamaz!');
      return;
    }
    
    setSending(true);
    const tempPost = {
      _id: 'temp-' + Date.now(),
      user: { _id: userId, name: 'Sen', email: '', avatar: '', city: '', tags: [] },
      content: newPost,
      likes: [],
      createdAt: new Date().toISOString(),
      commentsCount: 0,
      imageUrl: '',
      city: '',
      tags: [],
    };

    // Optimistic update
    setPosts(prev => [tempPost, ...prev]);
    setNewPost('');
    setShareModalVisible(false);
    
    try {
      const response = await api.post('/posts', { content: newPost });
      setPosts(prev => prev.map(post => 
        post._id === tempPost._id ? response.data : post
      ));
      showToast('Gönderin paylaşıldı!');
    } catch (error: any) {
      let errorMessage = 'Gönderi paylaşılırken bir hata oluştu!';
      if (error.response?.status === 401) {
        errorMessage = 'Oturum süresi dolmuş. Lütfen tekrar giriş yapın.';
        await AsyncStorage.multiRemove(['token', 'userId']);
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
      showToast(errorMessage);
      setPosts(prev => prev.filter(post => post._id !== tempPost._id));
    } finally {
      setSending(false);
    }
  }, [newPost, userId, navigation]);

  const handleLike = useCallback(async (postId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Optimistic update
    setPosts(prevPosts => prevPosts.map(post => {
      if (post._id === postId) {
        const liked = post.likes.includes(userId);
        const newLikes = liked 
          ? post.likes.filter(id => id !== userId)
          : [...post.likes, userId];
        
        if (!liked) {
          Animated.sequence([
            Animated.timing(likeAnim, { toValue: 1.4, duration: 120, useNativeDriver: true, easing: Easing.out(Easing.ease) }),
            Animated.timing(likeAnim, { toValue: 1, duration: 120, useNativeDriver: true, easing: Easing.in(Easing.ease) })
          ]).start();
        }
        
        return { ...post, likes: newLikes };
      }
      return post;
    }));

    try {
      await api.post(`/posts/${postId}/like`);
    } catch (e) {
      // Hata durumunda state'i geri al
      setPosts(prevPosts => prevPosts.map(post => {
        if (post._id === postId) {
          const liked = post.likes.includes(userId);
          const newLikes = liked 
            ? [...post.likes, userId]
            : post.likes.filter(id => id !== userId);
          return { ...post, likes: newLikes };
        }
        return post;
      }));
    }
  }, [userId, likeAnim]);

  const openComments = useCallback(async (postId: string) => {
    setSelectedPostId(postId);
    setCommentModalVisible(true);
    setCommentLoading(true);
    
    try {
      const res = await api.get(`/comments/${postId}`);
      setComments(res.data);
    } catch (e) {
      setComments([]);
    } finally {
      setCommentLoading(false);
    }
  }, []);

  const sendComment = useCallback(async () => {
    if (!newComment.trim() || !selectedPostId) return;
    
    setSendingComment(true);
    const tempComment = {
      _id: 'temp-' + Date.now(),
      user: { _id: userId, name: 'Sen', email: '' },
      content: newComment,
      createdAt: new Date().toISOString()
    };

    // Optimistic update
    setComments(prev => [tempComment, ...prev]);
    setNewComment('');
    setPosts(prevPosts => prevPosts.map(post => {
      if (post._id === selectedPostId) {
        return { ...post, commentsCount: (post.commentsCount || 0) + 1 };
      }
      return post;
    }));

    try {
      const response = await api.post(`/comments/${selectedPostId}`, { content: newComment });
      setComments(prev => prev.map(comment => 
        comment._id === tempComment._id ? response.data : comment
      ));
    } catch (e) {
      // Hata durumunda state'i geri al
      setComments(prev => prev.filter(comment => comment._id !== tempComment._id));
      setPosts(prevPosts => prevPosts.map(post => {
        if (post._id === selectedPostId) {
          return { ...post, commentsCount: (post.commentsCount || 0) - 1 };
        }
        return post;
      }));
    } finally {
      setSendingComment(false);
    }
  }, [newComment, selectedPostId, userId]);

  const closeComments = () => {
    setCommentModalVisible(false);
    setSelectedPostId(null);
    setComments([]);
    setNewComment('');
  };

  const isPostLiked = (item: Post) => item.likes.includes(userId);
  const isMyPost = (item: Post) => item.user?._id === userId;

  const handleProfilePress = useCallback(async (clickedUserId: string) => {
    try {
      if (clickedUserId === userId) {
        // Kendi profilimize girerken önce token kontrolü yapalım
        const currentToken = await AsyncStorage.getItem('token');
        if (!currentToken) {
          showToast('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
          return;
        }

        // Kendi profilimize giderken direkt Profile sayfasına yönlendir
        navigation.navigate('Profile');
      } else {
        // Başka kullanıcının profilini görüntülerken UserProfile sayfasına yönlendir
        navigation.navigate('UserProfile', { userId: clickedUserId });
      }
    } catch (error) {
      showToast('Profil yüklenirken bir hata oluştu');
    }
  }, [userId, navigation]);

  const handleDeletePost = async (postId: string) => {
    Alert.alert('Gönderi Sil', 'Bu gönderiyi silmek istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/posts/${postId}`);
          setPosts(prevPosts => prevPosts.filter(post => post._id !== postId));
          showToast('Gönderi silindi!');
        } catch (e) {
          console.error('Gönderi silme hatası:', e);
          showToast('Gönderi silinemedi!');
        }
      }}
    ]);
  };

  const handleExpand = (postId: string) => {
    setExpandedPosts(prev => prev.includes(postId) ? prev.filter(id => id !== postId) : [...prev, postId]);
  };

  const handleCategoryLayout = (e: any, cat: string) => {
    if (cat === selectedCategory) {
      setIndicatorX(e.nativeEvent.layout.x);
      setIndicatorWidth(e.nativeEvent.layout.width);
      Animated.timing(indicatorAnim, { toValue: e.nativeEvent.layout.x, duration: 200, useNativeDriver: false }).start();
      Animated.timing(indicatorWidthAnim, { toValue: e.nativeEvent.layout.width, duration: 200, useNativeDriver: false }).start();
    }
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchPosts(1, true);
  }, [fetchPosts]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        setShowFloatingHeader(offsetY > 100);
      },
    }
  );

  const renderHeader = () => (
    <MotiView
      from={{ opacity: 0, translateY: -20 }}
      animate={{ opacity: 1, translateY: 0 }}
      style={styles.header}
    >
      <TouchableOpacity 
        onPress={() => navigation.goBack()} 
        style={styles.backButton}
      >
        <AntDesign name="arrowleft" size={24} color="#fff" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Rektagram</Text>
      <TouchableOpacity style={styles.headerRightButton}>
        <Ionicons name="notifications-outline" size={24} color="#fff" />
      </TouchableOpacity>
    </MotiView>
  );

  const renderFloatingHeader = () => (
    showFloatingHeader && (
      <MotiView
        from={{ opacity: 0, translateY: -20 }}
        animate={{ opacity: 1, translateY: 0 }}
        style={styles.floatingHeader}
      >
        <BlurView intensity={80} style={styles.floatingHeaderBlur}>
          <Text style={styles.floatingHeaderTitle}>Rektagram</Text>
        </BlurView>
      </MotiView>
    )
  );

  const renderCategoryItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      onLayout={(e) => handleCategoryLayout(e, item)}
      onPress={() => setSelectedCategory(item)}
      style={[
        styles.categoryItem,
        selectedCategory === item && styles.selectedCategoryItem
      ]}
    >
      <Text style={[
        styles.categoryText,
        selectedCategory === item && styles.selectedCategoryText
      ]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  // Memoize edilmiş render fonksiyonları
  const renderPost = useCallback(({ item }: { item: Post }) => {
    const isExpanded = expandedPosts.includes(item._id);
    const contentPreview = item.content.length > 180 && !isExpanded ? item.content.slice(0, 180) + '...' : item.content;
    
    return (
      <View style={styles.postContainer}>
        <View style={styles.postHeader}>
          <TouchableOpacity 
            style={styles.userInfo} 
            onPress={() => handleProfilePress(item.user?._id)}
          >
            <View>
              <Image 
                source={item.user?.avatar ? { uri: item.user.avatar } : defaultAvatar} 
                style={styles.avatar}
                defaultSource={defaultAvatar}
              />
              <View style={styles.onlineDot} />
            </View>
            <View>
              <Text style={styles.userName}>{item.user?.name || 'Bilinmeyen Kullanıcı'}</Text>
              <Text style={styles.postTime}>
                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: tr })}
              </Text>
            </View>
          </TouchableOpacity>
          {isMyPost(item) && (
            <TouchableOpacity onPress={() => handleDeletePost(item._id)}>
              <Feather name="more-vertical" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.postContent}>{contentPreview}</Text>
        {item.content.length > 180 && (
          <TouchableOpacity onPress={() => handleExpand(item._id)}>
            <Text style={styles.seeMore}>
              {isExpanded ? ' Daha az göster' : ' Devamını gör'}
            </Text>
          </TouchableOpacity>
        )}
        {item.imageUrl && (
          <TouchableOpacity onPress={() => setFullImage(item.imageUrl || null)}>
            <Image 
              source={{ uri: item.imageUrl }} 
              style={styles.postImage} 
              resizeMode="cover"
              defaultSource={defaultCover}
            />
          </TouchableOpacity>
        )}
        <View style={styles.postActions}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => handleLike(item._id)}
          >
            <Animated.View style={{ transform: [{ scale: isPostLiked(item) ? likeAnim : 1 }] }}>
              <AntDesign 
                name={isPostLiked(item) ? "heart" : "hearto"} 
                size={22} 
                color={isPostLiked(item) ? "#ff3b30" : "#f1f1f1"} 
              />
            </Animated.View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.likes.length}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => openComments(item._id)}
          >
            <Feather name="message-circle" size={22} color="#f1f1f1" />
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.commentsCount || 0}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Feather name="share-2" size={22} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [expandedPosts, userId, navigation, handleLike, openComments, handleProfilePress, handleDeletePost, handleExpand]);

  // Memoize edilmiş liste
  const memoizedPosts = useMemo(() => posts, [posts]);

  // Lazy loading için IntersectionObserver
  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    // Görünür öğelerin resimlerini yükle
    viewableItems.forEach((item: any) => {
      if (item.item.imageUrl) {
        Image.prefetch(item.item.imageUrl);
      }
    });
  }, []);

  const viewabilityConfig = useMemo(() => ({
    itemVisiblePercentThreshold: 50
  }), []);

  const toggleFab = () => {
    if (fabOpen) {
      Animated.timing(fabAnim, { toValue: 0, duration: 250, useNativeDriver: true, easing: Easing.out(Easing.ease) }).start(() => setFabOpen(false));
    } else {
      setFabOpen(true);
      Animated.timing(fabAnim, { toValue: 1, duration: 250, useNativeDriver: true, easing: Easing.out(Easing.ease) }).start();
    }
  };

  const handleMiniFab = (type: 'text' | 'photo' | 'video') => {
    if (type === 'text') {
      setShareModalVisible(true);
      toggleFab();
    } else {
      if (Platform.OS === 'android') ToastAndroid.show('Henüz eklenmedi, yakında eklenecek', ToastAndroid.SHORT);
      else Alert.alert('Yakında', 'Henüz eklenmedi, yakında eklenecek');
      toggleFab();
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    Alert.alert('Yorumu Sil', 'Bu yorumu silmek istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/comments/${commentId}`);
          setComments(prev => prev.filter(c => c._id !== commentId));
          showToast('Yorum silindi!');
        } catch (e) {
          showToast('Yorum silinemedi!');
        }
      }}
    ]);
  };

  const onEndReached = useCallback(() => {
    if (!loading && hasMorePosts) {
      const nextPage = currentPage + 1;
      setCurrentPage(nextPage);
      fetchPosts(nextPage, false);
    }
  }, [loading, hasMorePosts, currentPage, fetchPosts]);

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {renderFloatingHeader()}
      
      <View style={styles.searchContainer}>
        <Feather name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rektagram'da ara..."
          placeholderTextColor="#666"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.categoriesContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {categories.map((category, index) => (
            <View key={index}>
              {renderCategoryItem({ item: category })}
            </View>
          ))}
        </ScrollView>
        <Animated.View 
          style={[
            styles.categoryIndicator,
            {
              transform: [{ translateX: indicatorAnim }],
              width: indicatorWidthAnim
            }
          ]} 
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <LottieView source={require('../assets/loading.json')} autoPlay loop style={{ width: 180, height: 180 }} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={memoizedPosts}
          renderItem={renderPost}
          keyExtractor={item => item._id}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.postsList}
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          maxToRenderPerBatch={10}
          windowSize={10}
          removeClippedSubviews={false}
          initialNumToRender={20}
          updateCellsBatchingPeriod={50}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <LottieView source={require('../assets/empty.json')} autoPlay loop style={{ width: 200, height: 200 }} />
              <Text style={styles.emptyText}>Henüz hiç gönderi yok. İlk paylaşımı sen yap!</Text>
            </View>
          }
        />
      )}

      {showScrollTop && (
        <TouchableOpacity
          style={styles.scrollTopBtn}
          onPress={() => flatListRef.current?.scrollToOffset({ offset: 0, animated: true })}
        >
          <AntDesign name="upcircle" size={36} color="#5AC8FA" />
        </TouchableOpacity>
      )}

      <Modal
        visible={commentModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeComments}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Yorumlar</Text>
            {commentLoading ? (
              <ActivityIndicator size="small" color="#5AC8FA" style={{ marginTop: 16 }} />
            ) : (
              <FlatList
                data={comments}
                keyExtractor={item => item._id}
                renderItem={({ item }) => (
                  <View style={styles.commentItem}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.commentUser}>{item.user?.name || 'Kullanıcı'}</Text>
                      {item.user?._id === userId && (
                        <TouchableOpacity onPress={() => handleDeleteComment(item._id)}>
                          <Feather name="trash-2" size={18} color="#ff3b30" />
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={styles.commentContent}>{item.content}</Text>
                    <Text style={styles.commentDate}>{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: tr })}</Text>
                  </View>
                )}
                ListEmptyComponent={<Text style={{ color: '#888', textAlign: 'center', marginTop: 16 }}>Henüz yorum yok.</Text>}
                style={{ maxHeight: 220 }}
              />
            )}
            <View style={styles.commentInputRow}>
              <TextInput
                style={styles.commentInput}
                placeholder="Yorum yaz..."
                value={newComment}
                onChangeText={setNewComment}
                multiline
              />
              <TouchableOpacity style={styles.commentSendBtn} onPress={sendComment} disabled={sendingComment}>
                <Text style={styles.commentSendBtnText}>{sendingComment ? '...' : 'Gönder'}</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={closeComments} style={styles.closeModalBtn}>
              <Text style={styles.closeModalBtnText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <View style={styles.fabTabBar}>
        <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.fabTabBtn}>
          <Feather name="user" size={26} color={selectedCategory === 'Profilim' ? '#007AFF' : '#5AC8FA'} />
          <Text style={[styles.fabTabLabel, selectedCategory === 'Profilim' && { color: '#007AFF', fontWeight: 'bold' }]}>Profilim</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSelectedCategory('Popüler')} style={styles.fabTabBtn}>
          <Feather name="layers" size={26} color={selectedCategory === 'Popüler' ? '#007AFF' : '#5AC8FA'} />
          <Text style={[styles.fabTabLabel, selectedCategory === 'Popüler' && { color: '#007AFF', fontWeight: 'bold' }]}>Paylaşımlar</Text>
        </TouchableOpacity>
        <View style={{ width: 80, alignItems: 'center', justifyContent: 'center' }}>
          <TouchableWithoutFeedback onPress={toggleFab}>
            <Animated.View style={[styles.fabTabCenterBtn, { transform: [{ rotate: fabAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] }) }] }] }>
              <Feather name="plus" size={28} color="#fff" />
            </Animated.View>
          </TouchableWithoutFeedback>
          {fabOpen && (
            <>
              <TouchableWithoutFeedback onPress={toggleFab}>
                <View style={styles.fabOverlay} />
              </TouchableWithoutFeedback>
              <Animated.View style={[styles.fabMini, { left: 0, bottom: 80, opacity: fabAnim, transform: [{ scale: fabAnim }] }] }>
                <TouchableOpacity style={styles.fabMiniBtn} onPress={() => handleMiniFab('text')}>
                  <Feather name="edit-2" size={20} color="#fff" />
                  <Text style={styles.fabMiniLabel}>Gönderi</Text>
                </TouchableOpacity>
              </Animated.View>
              <Animated.View style={[styles.fabMini, { left: -60, bottom: 40, opacity: fabAnim, transform: [{ scale: fabAnim }] }] }>
                <TouchableOpacity style={styles.fabMiniBtn} onPress={() => handleMiniFab('photo')}>
                  <Feather name="image" size={20} color="#fff" />
                  <Text style={styles.fabMiniLabel}>Fotoğraf</Text>
                </TouchableOpacity>
              </Animated.View>
              <Animated.View style={[styles.fabMini, { left: 60, bottom: 40, opacity: fabAnim, transform: [{ scale: fabAnim }] }] }>
                <TouchableOpacity style={styles.fabMiniBtn} onPress={() => handleMiniFab('video')}>
                  <Feather name="video" size={20} color="#fff" />
                  <Text style={styles.fabMiniLabel}>Video</Text>
                </TouchableOpacity>
              </Animated.View>
            </>
          )}
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Market')} style={styles.fabTabBtn}>
          <Feather name="shopping-cart" size={26} color={selectedCategory === 'Pazaryeri' ? '#007AFF' : '#5AC8FA'} />
          <Text style={[styles.fabTabLabel, selectedCategory === 'Pazaryeri' && { color: '#007AFF', fontWeight: 'bold' }]}>Pazaryeri</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Forum')} style={styles.fabTabBtn}>
          <Feather name="message-square" size={26} color={selectedCategory === 'Forum' ? '#007AFF' : '#5AC8FA'} />
          <Text style={[styles.fabTabLabel, selectedCategory === 'Forum' && { color: '#007AFF', fontWeight: 'bold' }]}>Forum</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={shareModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setShareModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => setShareModalVisible(false)}>
            <View style={styles.modalBackground} />
          </TouchableWithoutFeedback>
          <View style={styles.shareModalContainer}>
            <View style={styles.shareModalHeader}>
              <Text style={styles.shareModalTitle}>Gönderi Paylaş</Text>
              <TouchableOpacity 
                onPress={() => setShareModalVisible(false)}
                style={styles.closeButton}
              >
                <AntDesign name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.shareModalContent}>
              <View style={styles.userInfoContainer}>
                <Image 
                  source={defaultAvatar} 
                  style={styles.shareModalAvatar} 
                />
                <View>
                  <Text style={styles.shareModalUsername}>Sen</Text>
                  <Text style={styles.shareModalPrivacy}>Herkes</Text>
                </View>
              </View>

              <TextInput
                style={styles.shareModalInput}
                placeholder={currentPlaceholder}
                placeholderTextColor="#666"
                value={newPost}
                onChangeText={setNewPost}
                multiline
                maxLength={500}
              />

              <View style={styles.characterCount}>
                <Text style={[
                  styles.characterCountText,
                  newPost.length > 450 && styles.characterCountWarning
                ]}>
                  {newPost.length}/500
                </Text>
              </View>

              <View style={styles.shareModalActions}>
                <TouchableOpacity style={styles.shareModalActionButton}>
                  <Feather name="image" size={24} color="#5AC8FA" />
                  <Text style={styles.shareModalActionText}>Fotoğraf</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareModalActionButton}>
                  <Feather name="smile" size={24} color="#5AC8FA" />
                  <Text style={styles.shareModalActionText}>Emoji</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.shareModalActionButton}>
                  <Feather name="map-pin" size={24} color="#5AC8FA" />
                  <Text style={styles.shareModalActionText}>Konum</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.shareModalSubmitButton,
                (!newPost.trim() || sending) && styles.shareModalSubmitButtonDisabled
              ]}
              onPress={handleShare}
              disabled={!newPost.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.shareModalSubmitText}>Paylaş</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={!!fullImage} transparent animationType="fade" onRequestClose={() => setFullImage(null)}>
        <TouchableOpacity style={styles.fullImageOverlay} onPress={() => setFullImage(null)}>
          <Image source={{ uri: fullImage || '' }} style={styles.fullImage} resizeMode="contain" />
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  floatingHeaderBlur: {
    padding: 15,
    alignItems: 'center',
  },
  floatingHeaderTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerRightButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    margin: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    paddingVertical: 10,
  },
  categoriesContainer: {
    marginBottom: 10,
  },
  categoriesScroll: {
    paddingHorizontal: 10,
  },
  categoryItem: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: '#1a1a1a',
  },
  selectedCategoryItem: {
    backgroundColor: '#007AFF',
  },
  categoryText: {
    color: '#fff',
    fontSize: 14,
  },
  selectedCategoryText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  categoryIndicator: {
    height: 3,
    backgroundColor: '#007AFF',
    position: 'absolute',
    bottom: 0,
    borderRadius: 3,
  },
  postsList: {
    padding: 10,
  },
  postContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    marginBottom: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  userName: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  postTime: {
    color: '#666',
    fontSize: 12,
  },
  postContent: {
    color: '#fff',
    padding: 15,
    fontSize: 16,
    lineHeight: 22,
  },
  postImage: {
    width: '100%',
    height: 300,
  },
  postActions: {
    flexDirection: 'row',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    backgroundColor: 'transparent',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  actionText: {
    color: '#666',
    marginLeft: 5,
  },
  scrollTopBtn: {
    position: 'absolute',
    right: 24,
    bottom: 100,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 4,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 99,
  },
  myCommentItem: {
    backgroundColor: '#eaf6ff',
    borderRadius: 8,
    padding: 4,
  },
  tag: {
    backgroundColor: '#5AC8FA',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 4,
  },
  tagText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#181A20',
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 99,
  },
  fabTabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 14,
    backgroundColor: '#23252C',
    borderTopWidth: 1,
    borderTopColor: '#333',
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -2 },
    zIndex: 100,
  },
  fabTabBtn: {
    alignItems: 'center',
    flex: 1,
  },
  fabTabLabel: {
    fontSize: 13,
    color: '#5AC8FA',
    marginTop: 4,
  },
  fabTabCenterBtn: {
    backgroundColor: '#5AC8FA',
    borderRadius: 32,
    padding: 16,
    marginHorizontal: 8,
    marginTop: -32,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 8,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#181A20',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#5AC8FA',
  },
  fabOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.18)',
    zIndex: 10,
  },
  fabMini: {
    position: 'absolute',
    zIndex: 20,
    alignItems: 'center',
  },
  fabMiniBtn: {
    backgroundColor: '#5AC8FA',
    borderRadius: 22,
    paddingVertical: 10,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOpacity: 0.13,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  fabMiniLabel: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  modalContent: {
    backgroundColor: '#181A20',
    borderRadius: 18,
    padding: 18,
    width: '90%',
    maxWidth: 400,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f1f1f1',
    marginBottom: 10,
    textAlign: 'center',
  },
  commentItem: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 0,
    backgroundColor: '#23252C',
    borderRadius: 10,
    padding: 10,
  },
  commentUser: {
    fontWeight: 'bold',
    color: '#5AC8FA',
    fontSize: 14,
  },
  commentContent: {
    fontSize: 15,
    color: '#f1f1f1',
    marginVertical: 2,
  },
  commentDate: {
    color: '#888',
    fontSize: 11,
    textAlign: 'right',
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  commentInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 80,
    backgroundColor: '#23252C',
    borderRadius: 10,
    padding: 8,
    fontSize: 15,
    marginRight: 8,
    color: '#fff',
  },
  commentSendBtn: {
    backgroundColor: '#23252C',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentSendBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 15,
  },
  closeModalBtn: {
    marginTop: 12,
    alignSelf: 'center',
    padding: 8,
  },
  closeModalBtnText: {
    color: '#e74c3c',
    fontWeight: 'bold',
    fontSize: 15,
  },
  seeMore: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4cd137',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badge: {
    backgroundColor: '#23252C',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOpacity: 0.10,
    shadowRadius: 2,
    elevation: 1,
  },
  badgeText: {
    color: '#f1f1f1',
    fontWeight: 'bold',
    fontSize: 13,
  },
  fullImageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: '95%',
    height: '80%',
    borderRadius: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: '#B0B3C6',
    fontSize: 18,
    marginTop: 12,
    textAlign: 'center',
  },
  shareModalBtnDisabled: {
    opacity: 0.7,
  },
  backButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBackground: {
    flex: 1,
  },
  shareModalContainer: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: 300,
  },
  shareModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  shareModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  shareModalContent: {
    flex: 1,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  shareModalAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  shareModalUsername: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  shareModalPrivacy: {
    color: '#5AC8FA',
    fontSize: 14,
  },
  shareModalInput: {
    backgroundColor: '#23252C',
    borderRadius: 12,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  characterCount: {
    alignItems: 'flex-end',
    marginBottom: 15,
  },
  characterCountText: {
    color: '#666',
    fontSize: 12,
  },
  characterCountWarning: {
    color: '#ff3b30',
  },
  shareModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  shareModalActionButton: {
    alignItems: 'center',
    padding: 10,
  },
  shareModalActionText: {
    color: '#5AC8FA',
    marginTop: 5,
    fontSize: 12,
  },
  shareModalSubmitButton: {
    backgroundColor: '#5AC8FA',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  shareModalSubmitButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.7,
  },
  shareModalSubmitText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default RektagramScreen; 