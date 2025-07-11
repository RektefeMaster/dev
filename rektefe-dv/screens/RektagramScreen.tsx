import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, Alert, Animated, Easing, ToastAndroid, FlatList as RNFlatList, Image, ScrollView, TouchableWithoutFeedback, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../constants/config';
import { useNavigation } from '@react-navigation/native';
import { AntDesign, Feather, MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Feather as ExpoFeather } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale/tr';
import LottieView from 'lottie-react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { MotiView } from 'moti';
import { theme } from '../styles/theme';
import Background from '../components 2/Background';
import axios from 'axios';

interface Post {
  _id: string;
  userId: string;
  user?: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    city?: string;
    tags?: string[];
  };
  content?: string;
  image?: string;
  caption?: string;
  likes: string[];
  comments: any[];
  createdAt: string;
  commentsCount?: number;
  imageUrl?: string;
  city?: string;
  tags?: string[];
}

interface Comment {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  content: string;
  createdAt: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  avatar?: string;
  city?: string;
  tags?: string[];
}

const defaultAvatar = require('../assets/default_avatar.png');
const defaultCover = require('../assets/default_cover.jpg');

const RektagramScreen = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<{[key: string]: Comment[]}>({});
  const [showComments, setShowComments] = useState<{[key: string]: boolean}>({});
  const [newComment, setNewComment] = useState<{[key: string]: string}>({});
  const [sendingComment, setSendingComment] = useState<{[key: string]: boolean}>({});
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
  const [user, setUser] = useState<User | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [showCommentSuccess, setShowCommentSuccess] = useState(false);

  const navigation: any = useNavigation();

  const fetchPosts = useCallback(async (page = 1, shouldRefresh = false) => {
    if (shouldRefresh) {
      setLoading(true);
      setCurrentPage(1);
    }
    
    try {
      let token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Oturum Hatası', 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
        return;
      }

      const response = await axios.get(`${API_URL}/posts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data && Array.isArray(response.data)) {
        if (shouldRefresh) {
          setPosts(response.data);
        } else {
          setPosts(prev => [...prev, ...response.data]);
        }
        setHasMorePosts(response.data.length === postsPerPage);
      } else {
        if (shouldRefresh) {
          setPosts([]);
        }
        setHasMorePosts(false);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        try {
          const refreshToken = await AsyncStorage.getItem('refreshToken');
          if (refreshToken) {
            const refreshResponse = await axios.post(`${API_URL}/auth/refresh-token`, {
              refreshToken
            });
            
            if (refreshResponse.data.token) {
              await AsyncStorage.setItem('token', refreshResponse.data.token);
              fetchPosts(1, true);
              return;
            }
          }
        } catch (refreshError) {
          console.error('Token yenileme hatası:', refreshError);
        }
        
        console.log('[LIKE] Refresh başarısız, login ekranına yönlendiriliyor.');
        Alert.alert('Oturum Hatası', 'Token süreniz doldu, lütfen tekrar giriş yapın. Bu güvenliğiniz içindir.');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } else {
        console.error('Gönderiler yüklenirken hata:', error);
        showToast('Gönderiler yüklenemedi');
      }
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

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedId = await AsyncStorage.getItem('userId');
        const storedToken = await AsyncStorage.getItem('token');
        if (storedId && storedToken) {
          setUserId(storedId);
          setCurrentUserId(storedId);
          setToken(storedToken);
          const response = await api.get(`/users/${storedId}`);
          setUser(response.data);
        }
      } catch (error) {
        console.error('Kullanıcı bilgileri yüklenirken hata:', error);
      }
    };
    loadUserData();
  }, []);

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('', msg);
    }
  };

  const handleShare = async () => {
    if (!newPost.trim()) {
      Alert.alert('Uyarı', 'Lütfen bir gönderi yazın');
      return;
    }

    setSending(true);
    try {
      let token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Oturum Hatası', 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
        return;
      }

      const response = await axios.post(
        `${API_URL}/posts`,
        { content: newPost },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const tempPost: Post = {
        _id: 'temp-' + Date.now(),
        userId: userId || '',
        content: newPost,
        likes: [],
        comments: [],
        createdAt: new Date().toISOString(),
        user: user ? {
          _id: user._id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          city: user.city,
          tags: user.tags
        } : undefined
      };

      setPosts(prev => [tempPost, ...prev]);
      setNewPost('');
      setShareModalVisible(false);
      
      // Başarı animasyonunu göster
      setShowSuccessAnimation(true);
      setTimeout(() => {
        setShowSuccessAnimation(false);
      }, 2000);
    } catch (error: any) {
      let errorMessage = 'Gönderi paylaşılırken bir hata oluştu!';
      
      if (error.response?.status === 401) {
        try {
          const refreshToken = await AsyncStorage.getItem('refreshToken');
          if (refreshToken) {
            const refreshResponse = await axios.post(`${API_URL}/auth/refresh-token`, {
              refreshToken
            });
            
            if (refreshResponse.data.token) {
              await AsyncStorage.setItem('token', refreshResponse.data.token);
              handleShare();
              return;
            }
          }
        } catch (refreshError) {
          console.error('Token yenileme hatası:', refreshError);
        }
        
        errorMessage = 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.';
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
      
      Alert.alert('Hata', errorMessage);
    } finally {
      setSending(false);
    }
  };

  const handleLike = useCallback(async (postId: string) => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.log('[LIKE] Token bulunamadı');
        Alert.alert('Oturum Hatası', 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
        return;
      }

      const response = await axios.post(
        `${API_URL}/posts/${postId}/like`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setPosts(prev =>
        prev.map(post =>
          post._id === postId
            ? {
                ...post,
                likes: response.data.likes,
              }
            : post
        )
      );
    } catch (error: any) {
      console.error('[LIKE] Beğeni hatası:', error);
      if (error.response?.status === 401) {
        try {
          const refreshToken = await AsyncStorage.getItem('refreshToken');
          if (!refreshToken) {
            throw new Error('Refresh token bulunamadı');
          }

          const refreshResponse = await axios.post(`${API_URL}/auth/refresh-token`, {
            refreshToken
          });

          if (refreshResponse.data.token) {
            await AsyncStorage.setItem('token', refreshResponse.data.token);
            // Token yenilendikten sonra beğeni işlemini tekrar dene
            const newResponse = await axios.post(
              `${API_URL}/posts/${postId}/like`,
              {},
              {
                headers: {
                  Authorization: `Bearer ${refreshResponse.data.token}`,
                },
              }
            );

            setPosts(prev =>
              prev.map(post =>
                post._id === postId
                  ? {
                      ...post,
                      likes: newResponse.data.likes,
                    }
                  : post
              )
            );
            return;
          }
        } catch (refreshError) {
          console.error('[LIKE] Token yenileme hatası:', refreshError);
          Alert.alert('Oturum Hatası', 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        }
      } else {
        showToast('Beğeni işlemi başarısız oldu');
      }
    }
  }, [navigation]);

  const handleComment = useCallback(async (postId: string) => {
    if (!newComment[postId]?.trim()) return;

    setSendingComment(prev => ({ ...prev, [postId]: true }));
    try {
      let token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Oturum Hatası', 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
        return;
      }

      const response = await axios.post(
        `${API_URL}/posts/${postId}/comments`,
        { content: newComment[postId] },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setComments(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), response.data],
      }));

      setNewComment(prev => ({ ...prev, [postId]: '' }));
      setShowCommentSuccess(true);
      setTimeout(() => setShowCommentSuccess(false), 1200);
    } catch (error: any) {
      if (error.response?.status === 401) {
        try {
          const refreshToken = await AsyncStorage.getItem('refreshToken');
          if (refreshToken) {
            const refreshResponse = await axios.post(`${API_URL}/auth/refresh-token`, {
              refreshToken
            });
            
            if (refreshResponse.data.token) {
              await AsyncStorage.setItem('token', refreshResponse.data.token);
              handleComment(postId);
              return;
            }
          }
        } catch (refreshError) {
          console.error('Token yenileme hatası:', refreshError);
        }
        
        Alert.alert('Oturum Hatası', 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } else {
        console.error('Yorum eklenirken hata:', error);
        showToast('Yorum eklenemedi');
      }
    } finally {
      setSendingComment(prev => ({ ...prev, [postId]: false }));
    }
  }, [newComment]);

  const fetchComments = useCallback(async (postId: string) => {
    try {
      let token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Oturum Hatası', 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
        return;
      }

      const response = await axios.get(`${API_URL}/posts/${postId}/comments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setComments(prev => ({ ...prev, [postId]: response.data }));
    } catch (error: any) {
      if (error.response?.status === 401) {
        try {
          const refreshToken = await AsyncStorage.getItem('refreshToken');
          if (refreshToken) {
            const refreshResponse = await axios.post(`${API_URL}/auth/refresh-token`, {
              refreshToken
            });
            
            if (refreshResponse.data.token) {
              await AsyncStorage.setItem('token', refreshResponse.data.token);
              fetchComments(postId);
              return;
            }
          }
        } catch (refreshError) {
          console.error('Token yenileme hatası:', refreshError);
        }
        
        Alert.alert('Oturum Hatası', 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } else {
        console.error('Yorumlar yüklenirken hata:', error);
        showToast('Yorumlar yüklenemedi');
      }
    }
  }, []);

  const openComments = useCallback(async (postId: string) => {
    setSelectedPostId(postId);
    setCommentModalVisible(true);
    await fetchComments(postId);
  }, [fetchComments]);

  const handleDeletePost = async (postId: string) => {
    try {
      let token = await AsyncStorage.getItem('token');
      if (!token) {
        Alert.alert('Oturum Hatası', 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
        return;
      }

      const response = await axios.delete(`${API_URL}/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.status === 200) {
        setPosts(prev => prev.filter(post => post._id !== postId));
        showToast('Gönderi silindi');
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        try {
          const refreshToken = await AsyncStorage.getItem('refreshToken');
          if (refreshToken) {
            const refreshResponse = await axios.post(`${API_URL}/auth/refresh-token`, {
              refreshToken
            });
            
            if (refreshResponse.data.token) {
              await AsyncStorage.setItem('token', refreshResponse.data.token);
              // Token yenilendikten sonra silme işlemini tekrar dene
              const newResponse = await axios.delete(`${API_URL}/posts/${postId}`, {
                headers: { Authorization: `Bearer ${refreshResponse.data.token}` }
              });

              if (newResponse.status === 200) {
                setPosts(prev => prev.filter(post => post._id !== postId));
                showToast('Gönderi silindi');
              }
              return;
            }
          }
        } catch (refreshError) {
          console.error('Token yenileme hatası:', refreshError);
        }
        
        Alert.alert('Oturum Hatası', 'Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      } else {
        console.error('Gönderi silinirken hata:', error);
        showToast('Gönderi silinemedi');
      }
    }
  };

  const isPostLiked = (item: Post) => item.likes.includes(userId || '');
  const isMyPost = (item: Post) => item.user?._id === userId;

  const handleProfilePress = (userId: string) => {
    if (userId === currentUserId) {
      navigation.navigate('RektagramProfile');
    } else {
      navigation.navigate('UserProfile', { userId });
    }
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

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPosts(1, true);
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
        style={styles.backButtonCustom}
        activeOpacity={0.7}
      >
        <View style={styles.backButtonCircle}>
          <AntDesign name="arrowleft" size={22} color="#222" />
        </View>
      </TouchableOpacity>
      <Text style={styles.title}>Rektagram</Text>
      <Text style={styles.subtitle}>{currentPlaceholder}</Text>
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
    const contentLength = item.content ? item.content.length : 0;
    const contentPreview = contentLength > 180 && !isExpanded 
      ? item.content?.slice(0, 180) + '...' 
      : item.content || '';
    
    return (
      <View style={styles.postContainer}>
        <View style={styles.postHeader}>
          <TouchableOpacity 
            style={styles.userInfo} 
            onPress={() => handleProfilePress(item.user?._id || '')}
          >
            <Image
              source={item.user?.avatar ? { uri: item.user.avatar } : defaultAvatar}
              style={styles.avatar}
            />
            <View>
              <Text style={styles.userName}>{item.user?.name}</Text>
              {item.user?.city && (
                <Text style={styles.userLocation}>{item.user.city}</Text>
              )}
            </View>
          </TouchableOpacity>
          {isMyPost(item) && (
            <TouchableOpacity 
              onPress={() => handleDeletePost(item._id)} 
              style={{ padding: 4, marginLeft: 'auto' }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <AntDesign name="delete" size={20} color="#ff3b30" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.postContent}>{contentPreview}</Text>
        {contentLength > 180 && (
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
    if (!selectedPostId) return;
    
    Alert.alert('Yorumu Sil', 'Bu yorumu silmek istediğine emin misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/comments/delete/${commentId}`);
          setComments(prev => {
            const currentComments = prev[selectedPostId] || [];
            return {
              ...prev,
              [selectedPostId]: currentComments.filter((c: Comment) => c._id !== commentId)
            };
          });
          showToast('Yorum silindi!');
        } catch (err: any) {
          if (err && err.response && err.response.data && err.response.data.error) {
            showToast('Yorum silinemedi: ' + err.response.data.error);
          } else {
            showToast('Yorum silinemedi!');
          }
          console.error('Yorum silme hatası:', err);
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
    <Background gradientColors={["rgba(10,10,20,1)", "rgba(20,20,30,1)"]} withImage={false}>
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }] }>
        {showSuccessAnimation && (
          <View style={styles.successAnimationContainer}>
            <LottieView
              source={require('../assets/success.json')}
              autoPlay
              loop={false}
              style={styles.successAnimation}
            />
          </View>
        )}
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
            refreshing={refreshing}
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
          onRequestClose={() => setCommentModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1, justifyContent: 'flex-end' }}
          >
            <Animated.View style={{ backgroundColor: '#181920', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 0, maxHeight: '70%', shadowColor: '#5AC8FA', shadowOpacity: 0.18, shadowRadius: 16, elevation: 12, transform: [{ translateY: 0 }] }}>
              <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#5AC8FA33', marginBottom: 8 }} />
                <Text style={{ color: '#5AC8FA', fontWeight: 'bold', fontSize: 18, letterSpacing: 1 }}>Yorumlar</Text>
              </View>
              <ScrollView style={{ maxHeight: 200, paddingHorizontal: 10 }} showsVerticalScrollIndicator={false}>
                {selectedPostId && (!comments[selectedPostId] || comments[selectedPostId].length === 0) ? (
                  <View style={{ alignItems: 'center', marginTop: 24 }}>
                    <LottieView source={require('../assets/empty_profile.json')} autoPlay loop style={{ width: 60, height: 60 }} />
                    <Text style={{ color: '#888', textAlign: 'center', marginTop: 8, fontSize: 14 }}>Henüz yorum yok. İlk yorumu sen yap!</Text>
                  </View>
                ) : (
                  selectedPostId && comments[selectedPostId]?.map((c: Comment, i: number) => (
                    <View key={c._id || i} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
                      <Image source={c.user && typeof c.user === 'object' && c.user.avatar ? { uri: c.user.avatar } : defaultAvatar} style={{ width: 28, height: 28, borderRadius: 14, marginRight: 8, borderWidth: 1, borderColor: '#5AC8FA' }} />
                      <View style={{ backgroundColor: i % 2 === 0 ? '#23242a' : '#181920', borderRadius: 12, padding: 8, flex: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ fontWeight: 'bold', color: '#5AC8FA', fontSize: 13 }}>{c.user?.name || 'Kullanıcı'}</Text>
                          {c.user?._id === userId && (
                            <TouchableOpacity onPress={() => handleDeleteComment(c._id)}>
                              <Feather name="trash-2" size={14} color="#ff3b30" />
                            </TouchableOpacity>
                          )}
                        </View>
                        <Text style={{ fontSize: 13, color: '#f1f1f1', marginVertical: 2 }}>{c.content}</Text>
                        <Text style={{ color: '#888', fontSize: 10, textAlign: 'right' }}>{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: tr })}</Text>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', marginTop: 8, paddingHorizontal: 10, paddingBottom: 8 }}>
                <Image source={user?.avatar ? { uri: user.avatar } : defaultAvatar} style={{ width: 24, height: 24, borderRadius: 12, marginRight: 8, borderWidth: 1, borderColor: '#5AC8FA' }} />
                <View style={{ flex: 1, backgroundColor: '#23242a', borderRadius: 12, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: '#5AC8FA22' }}>
                  <TextInput
                    style={{ flex: 1, color: '#fff', fontSize: 13, minHeight: 28, maxHeight: 60 }}
                    placeholder="Yorum yaz..."
                    placeholderTextColor="#5AC8FA99"
                    value={selectedPostId ? (newComment[selectedPostId] || '') : ''}
                    onChangeText={(text) => {
                      if (selectedPostId) {
                        setNewComment(prev => ({ ...prev, [selectedPostId]: text }));
                      }
                    }}
                    multiline
                  />
                  <TouchableOpacity 
                    style={{ marginLeft: 4, backgroundColor: '#5AC8FA', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 10, shadowColor: '#5AC8FA', shadowOpacity: 0.12, shadowRadius: 2, elevation: 2 }} 
                    onPress={() => {
                      if (selectedPostId) {
                        handleComment(selectedPostId);
                      }
                    }} 
                    disabled={!selectedPostId || (sendingComment[selectedPostId] || !newComment[selectedPostId]?.trim())}
                  >
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13 }}>
                      {selectedPostId && sendingComment[selectedPostId] ? '...' : 'Gönder'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              {showCommentSuccess && (
                <View style={{ position: 'absolute', right: 18, bottom: 60, zIndex: 99 }}>
                  <LottieView source={require('../assets/success.json')} autoPlay loop={false} style={{ width: 60, height: 60 }} />
                </View>
              )}
              <TouchableOpacity onPress={() => setCommentModalVisible(false)} style={{ alignSelf: 'center', marginTop: 8, marginBottom: 8, backgroundColor: '#FF3B30', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 6, shadowColor: '#FF3B30', shadowOpacity: 0.12, shadowRadius: 2, elevation: 2 }}>
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 13, letterSpacing: 1 }}>Kapat</Text>
              </TouchableOpacity>
            </Animated.View>
          </KeyboardAvoidingView>
        </Modal>
        <View style={styles.fabTabBar}>
          <TouchableOpacity onPress={() => navigation.navigate('RektagramProfile')} style={styles.fabTabBtn}>
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
            <View style={styles.shareModalContainer}>
              <Text style={styles.shareModalTitle}>Durumunu Paylaş</Text>
              <TextInput
                style={styles.shareModalInput}
                placeholder={currentPlaceholder}
                placeholderTextColor="#888"
                value={newPost}
                onChangeText={setNewPost}
                multiline
                maxLength={500}
                numberOfLines={5}
                textAlignVertical="top"
              />
              <View style={styles.characterCount}>
                <Text style={[styles.characterCountText, newPost.length > 480 && styles.characterCountWarning]}>
                  {newPost.length}/500
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
                <TouchableOpacity
                  onPress={() => setShareModalVisible(false)}
                  style={[styles.shareModalButton, styles.cancelButton]}
                >
                  <Text style={styles.cancelButtonText}>Kapat</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.shareModalButton, (!newPost.trim() || sending) && styles.shareModalButtonDisabled]}
                  onPress={handleShare}
                  disabled={!newPost.trim() || sending}
                >
                  <Text style={styles.shareModalButtonText}>{sending ? '...' : 'Paylaş'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Background>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    padding: theme.spacing.xl,
    backgroundColor: '#23242a',
    borderBottomLeftRadius: theme.borderRadius.xl,
    borderBottomRightRadius: theme.borderRadius.xl,
    ...theme.shadows.medium,
  },
  title: {
    fontSize: theme.typography.fontSizes.xxl,
    fontWeight: theme.typography.fontWeights.bold,
    color: '#F5F7FA',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.fontSizes.md,
    color: '#B0B3C6',
    marginBottom: theme.spacing.md,
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
    padding: theme.spacing.xl,
    backgroundColor: '#23242a',
    borderRadius: theme.borderRadius.lg,
    marginBottom: theme.spacing.xl,
    ...theme.shadows.small,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.round,
    marginRight: theme.spacing.sm,
  },
  userName: {
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.semibold,
    color: '#F5F7FA',
  },
  userLocation: {
    fontSize: theme.typography.fontSizes.xs,
    color: '#B0B3C6',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  postTime: {
    fontSize: theme.typography.fontSizes.xs,
    color: '#B0B3C6',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  postContent: {
    fontSize: theme.typography.fontSizes.md,
    color: '#F5F7FA',
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  postImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  postActions: {
    flexDirection: 'row',
    padding: theme.spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.md,
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.background.default.light,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.xl,
    width: '90%',
    maxHeight: '80%',
    ...theme.shadows.large,
  },
  modalTitle: {
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.text.primary.light,
    marginBottom: theme.spacing.md,
  },
  modalImage: {
    width: '100%',
    height: 300,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  modalCaption: {
    fontSize: theme.typography.fontSizes.md,
    color: theme.colors.text.primary.light,
    marginBottom: theme.spacing.md,
  },
  modalCloseButton: {
    backgroundColor: theme.colors.primary.main,
    borderRadius: theme.borderRadius.round,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  modalCloseButtonText: {
    color: theme.colors.primary.contrast,
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.semibold,
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
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
  },
  commentTextInput: {
    flex: 1,
    backgroundColor: theme.colors.background.paper.light,
    borderRadius: theme.borderRadius.round,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginRight: theme.spacing.sm,
    fontSize: theme.typography.fontSizes.md,
    color: theme.colors.text.primary.light,
  },
  commentButton: {
    backgroundColor: theme.colors.primary.main,
    borderRadius: theme.borderRadius.round,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
  },
  commentButtonText: {
    color: theme.colors.primary.contrast,
    fontSize: theme.typography.fontSizes.md,
    fontWeight: theme.typography.fontWeights.semibold,
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
    color: '#F5F7FA',
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
    color: '#888',
    fontSize: 18,
    marginTop: 12,
    textAlign: 'center',
  },
  shareModalBtnDisabled: {
    opacity: 0.7,
  },
  backButtonCustom: {
    marginRight: 12,
    marginLeft: 2,
    zIndex: 10,
  },
  backButtonCircle: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  headerRightButton: {
    padding: theme.spacing.sm,
  },
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  floatingHeaderBlur: {
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  floatingHeaderTitle: {
    color: theme.colors.text.primary.light,
    fontSize: theme.typography.fontSizes.lg,
    fontWeight: theme.typography.fontWeights.bold,
  },
  commentSendBtn: {
    backgroundColor: theme.colors.primary.main,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentSendBtnText: {
    color: theme.colors.primary.contrast,
    fontWeight: theme.typography.fontWeights.semibold,
    fontSize: theme.typography.fontSizes.md,
  },
  shareModalContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
  },
  shareModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 12,
  },
  shareModalInput: {
    minHeight: 100,
    maxHeight: 180,
    backgroundColor: '#f5f7fa',
    borderRadius: 12,
    color: '#222',
    padding: 16,
    fontSize: 16,
    marginBottom: 12,
  },
  characterCount: {
    alignItems: 'flex-end',
  },
  characterCountText: {
    color: '#888',
  },
  characterCountWarning: {
    color: 'red',
  },
  shareModalButton: {
    minWidth: 100,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
  },
  shareModalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  shareModalButtonDisabled: {
    backgroundColor: '#b0b3c6',
  },
  cancelButton: {
    backgroundColor: '#f5f7fa',
    borderWidth: 1,
    borderColor: '#b0b3c6',
  },
  cancelButtonText: {
    color: '#222',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successAnimationContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 9999,
  },
  successAnimation: {
    width: 200,
    height: 200,
  },
});

export default RektagramScreen; 