import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import axios from 'axios';
import { MotiView, AnimatePresence, MotiTransitionProp, MotiTransition } from 'moti';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import rekaiLottie from '../assets/rekai_wave.json';
import rekaichatLottie from '../assets/rekaichat.json';
import { API_URL } from '../constants/config';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  id: string;
}

interface Vehicle {
  _id: string;
  userId: string;
  brand: string;
  model: string;
  package: string;
  year: string;
  fuelType: string;
  mileage: string;
  plateNumber: string;
  isFavorite: boolean;
  createdAt: string;
}

interface User {
  _id: string;
  avatar?: string;
  // Diğer user özellikleri buraya eklenebilir
}

export default function RekAiChat() {
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [userId, setUserId] = useState<string>('');
  const flatListRef = useRef<FlatList<any>>(null);
  const navigation = useNavigation();
  const [sendAnim, setSendAnim] = useState(false);
  const [favoriteCar, setFavoriteCar] = useState<Vehicle | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [newComment, setNewComment] = useState('');
  const [sendingComment, setSendingComment] = useState(false);
  const defaultAvatar = require('../assets/default_avatar.png');

  useEffect(() => {
    // AsyncStorage veya context'ten userId'yi al
    const fetchUserId = async () => {
      // Örnek: AsyncStorage'dan al
      const storedId = await AsyncStorage.getItem('userId');
      if (storedId) setUserId(storedId);
      else setUserId('12345'); // fallback
    };
    fetchUserId();
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
    };
  }, [typingTimeout]);

  useEffect(() => {
    const fetchFavoriteCar = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('userId');
        if (!storedUserId) return;
        const response = await axios.get(`${API_URL}/vehicles/${storedUserId}`);
        const fav = response.data.find((v: Vehicle) => v.isFavorite);
        setFavoriteCar(fav || null);
      } catch (e) {
        setFavoriteCar(null);
      }
    };
    fetchFavoriteCar();
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`${API_URL}/users/${userId}`);
        setUser(response.data);
      } catch (e) {
        setUser(null);
      }
    };
    fetchUser();
  }, [userId]);

  const handleTyping = () => {
    setIsTyping(true);
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    const timeout = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
    setTypingTimeout(timeout as unknown as NodeJS.Timeout);
  };

  const clearChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Sohbeti Temizle',
      'Tüm mesaj geçmişini silmek istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Temizle',
          style: 'destructive',
          onPress: () => {
            setChat([]);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      ]
    );
  };

  const sendMessage = async () => {
    if (!message.trim() || loading) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const userMessage = message.trim();
    setMessage('');
    setLoading(true);
    setIsTyping(true);
    
    setChat((prev) => [
      ...prev,
      { role: 'user' as const, content: userMessage, id: Date.now().toString() }
    ]);

    try {
      console.log('REKAI API gönderilen:', { userId, message: userMessage, vehicle: favoriteCar });
      const res = await axios.post(`${API_URL}/rekai/chat`, {
        userId,
        message: userMessage,
        vehicle: favoriteCar,
      });
      
      console.log('REKAI API cevabı:', res.data);
      if (!res.data || !res.data.reply) {
        throw new Error('API yanıtı geçersiz format');
      }
      
      const botReply = res.data.reply;
      setChat((prev) => {
        const updated = [...prev, { 
          role: 'assistant' as const, 
          content: botReply, 
          id: (Date.now() + 1).toString() 
        }];
        console.log('Güncel chat:', updated);
        return updated;
      });
      
      // Başarılı yanıt için haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
    } catch (error: any) {
      console.error('REKAİ API error:', error?.response?.data || error.message);
      
      // Hata mesajını daha kullanıcı dostu hale getir
      let errorMessage = 'REKAİ şu an yanıt veremiyor. ';
      if (error?.response?.status === 401) {
        errorMessage += 'Lütfen tekrar giriş yapın.';
      } else if (error?.response?.status === 429) {
        errorMessage += 'Çok fazla istek gönderildi. Lütfen biraz bekleyin.';
      } else if (error?.response?.status === 500) {
        errorMessage += 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.';
      } else {
        errorMessage += 'Lütfen tekrar deneyin.';
      }
      
      setChat((prev) => [
        ...prev,
        {
          role: 'assistant' as const,
          content: errorMessage,
          id: (Date.now() + 2).toString()
        }
      ]);
      
      // Hata durumunda haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  const deleteMessage = (messageId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      'Mesajı Sil',
      'Bu mesajı silmek istediğinizden emin misiniz?',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            setChat(chat.filter(msg => msg.id !== messageId));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      ]
    );
  };

  const renderItem = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isUser = item.role === 'user';
    const isAssistant = item.role === 'assistant';
    // Determine icon for assistant messages (simple example: use tool icon for all)
    const assistantIcon = (
      <Ionicons name="construct-outline" size={20} color="#4a90e2" style={{ marginRight: 6, marginTop: 4 }} />
    );
    return (
      <View style={{ flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-end', marginVertical: 8 }}>
        {/* Avatar */}
        {!isUser && (
          <View style={{ marginRight: 6 }}>
            <LottieView source={rekaiLottie} autoPlay loop style={{ width: 28, height: 28 }} />
          </View>
        )}
        <View style={{ alignItems: isUser ? 'flex-end' : 'flex-start', flexDirection: isAssistant ? 'row' : 'column' }}>
          {isAssistant && assistantIcon}
          <LinearGradient
            colors={isUser ? ['#e3f0ff', '#b6d0e2'] : ['#e6f0fa', '#cde4f7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              borderRadius: 20,
              paddingVertical: 12,
              paddingHorizontal: 18,
              maxWidth: 280,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.06,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Text style={{ color: '#222', fontSize: 16, lineHeight: 22 }}>{String(item.content || '')}</Text>
            <Text style={{ fontSize: 11, color: '#888', marginTop: 6, textAlign: isUser ? 'right' : 'left' }}>{new Date(Number(item.id)).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</Text>
          </LinearGradient>
          {/* Balonun ucu (tail) */}
          <View
            style={{
              width: 12,
              height: 12,
              marginTop: -2,
              marginLeft: isUser ? 0 : 10,
              marginRight: isUser ? 10 : 0,
              alignSelf: isUser ? 'flex-end' : 'flex-start',
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                width: 12,
                height: 12,
                backgroundColor: isUser ? '#b6d0e2' : '#cde4f7',
                borderRadius: 6,
                transform: [
                  { scaleX: 1 },
                  { scaleY: 0.7 },
                  { rotate: isUser ? '45deg' : '-45deg' },
                ],
                marginLeft: isUser ? 4 : -4,
                marginTop: 2,
              }}
            />
          </View>
        </View>
      </View>
    );
  };

  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [chat]);

  useEffect(() => {
    console.log('FlatList data:', chat);
  }, [chat]);

  // Tabbarı gizle (parent navigation'da)
  useLayoutEffect(() => {
    const parent = navigation.getParent && navigation.getParent();
    if (parent) {
      parent.setOptions({ tabBarVisible: false, tabBarStyle: { display: 'none' } });
    }
    return () => {
      if (parent) {
        parent.setOptions({ tabBarVisible: true, tabBarStyle: { display: 'flex' } });
      }
    };
  }, [navigation]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={clearChat}
          style={{ marginRight: 15 }}
        >
          <Ionicons name="trash-outline" size={24} color="#FF3B30" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // Yazıyor animasyonu için moti dots
  const TypingIndicator = () => (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8, marginBottom: 6 }}>
      <View style={{ backgroundColor: 'rgba(74, 144, 226, 0.1)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', shadowColor: '#4a90e2', shadowOpacity: 0.12, shadowRadius: 6, elevation: 3 }}>
        <MotiView
          from={{ opacity: 0.3, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            type: 'timing',
            duration: 400,
            loop: true,
            repeat: Infinity,
          } as MotiTransition}
          style={{ flexDirection: 'row' }}
        >
          {[0, 1, 2].map((i) => (
            <MotiView
              key={i}
              from={{ scale: 0.7, opacity: 0.3 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: 'timing',
                duration: 600,
                delay: i * 120,
                loop: true,
                repeat: Infinity,
                repeatReverse: true,
              } as MotiTransition}
              style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#4a90e2', marginHorizontal: 3 }}
            />
          ))}
        </MotiView>
        <Text style={{ color: '#4a90e2', fontSize: 13, marginLeft: 10, fontWeight: '600' }}>REKAİ yazıyor...</Text>
      </View>
    </View>
  );

  const sendComment = async () => {
    if (!newComment.trim() || sendingComment) return;
    
    setSendingComment(true);
    try {
      const res = await axios.post(`${API_URL}/comments`, {
        userId,
        comment: newComment,
      });
      
      console.log('Yorum gönderildi:', res.data);
      setNewComment('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      console.error('Yorum gönderilirken hata oluştu:', error?.response?.data || error.message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSendingComment(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#eaf4fc' }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, padding: 10, backgroundColor: '#eaf4fc' }}>
          {/* Updated Header */}
          <View style={{ alignItems: 'center', marginBottom: 12, backgroundColor: '#d9e9fb', paddingVertical: 12, borderRadius: 16, shadowColor: '#4a90e2', shadowOpacity: 0.15, shadowRadius: 10, elevation: 3, position: 'relative' }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{
                position: 'absolute',
                top: 10,
                left: 10,
                backgroundColor: '#fff',
                padding: 8,
                borderRadius: 20,
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
                flexDirection: 'row',
                alignItems: 'center'
              }}
            >
              <Ionicons name="arrow-back" size={20} color="#4a90e2" style={{ marginRight: 4 }} />
              <Text style={{ color: '#4a90e2', fontWeight: 'bold' }}>Geri</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                Alert.alert(
                  'Sohbeti Temizle',
                  'Tüm mesaj geçmişini silmek istediğinizden emin misiniz?',
                  [
                    {
                      text: 'İptal',
                      style: 'cancel'
                    },
                    {
                      text: 'Temizle',
                      style: 'destructive',
                      onPress: () => {
                        setChat([]);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      }
                    }
                  ]
                );
              }}
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                backgroundColor: '#fff',
                padding: 8,
                borderRadius: 20,
                shadowColor: '#000',
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
                flexDirection: 'row',
                alignItems: 'center'
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#FF3B30" style={{ marginRight: 4 }} />
              <Text style={{ color: '#FF3B30', fontWeight: 'bold' }}>Temizle</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <View>
                <Text style={{ fontWeight: 'bold', fontSize: 20, color: '#357ABD' }}>REKAİ</Text>
                <Text style={{ fontSize: 14, color: '#357ABD', marginTop: 2 }}>Araç Asistanı</Text>
              </View>
              <LottieView
                source={rekaichatLottie}
                autoPlay
                loop
                style={{
                  width: 160,
                  height: 160,
                  marginTop: -16,
                  marginBottom: -16,
                }}
              />
            </View>
          </View>
          {/* Background Lottie removed */}
          <FlatList
            ref={flatListRef}
            data={chat}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            extraData={chat}
            contentContainerStyle={{
              paddingBottom: 80,
              paddingTop: 10,
            }}
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
          />
          {/* Yazıyor animasyonu */}
          <AnimatePresence>
            {isTyping && <TypingIndicator key="typing" />}
          </AnimatePresence>
          {/* Mesaj giriş alanı */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 8,
              paddingBottom: 8,
              backgroundColor: 'transparent',
            }}
          >
            {/* Input alanı (avatar + text input) */}
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
              <Image
                source={user?.avatar ? { uri: user.avatar } : defaultAvatar}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  marginRight: 8,
                  borderWidth: 2,
                  borderColor: '#5AC8FA',
                  backgroundColor: '#fff',
                }}
              />
              <View style={{ flex: 1 }}>
                <TextInput
                  placeholder="Aracında bir sorun mu var? *"
                  value={message}
                  onChangeText={setMessage}
                  style={{
                    flex: 1,
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    backgroundColor: '#ffffff',
                    fontSize: 16,
                    color: '#222',
                    shadowColor: '#4a90e2',
                    shadowOpacity: 0.08,
                    shadowRadius: 6,
                    elevation: 2,
                  }}
                  placeholderTextColor="#7ea9d6"
                  onFocus={() => setSendAnim(false)}
                />
              </View>
            </View>
            {/* Gönder butonu */}
            <TouchableOpacity
              onPressIn={() => setSendAnim(true)}
              onPressOut={() => setSendAnim(false)}
              onPress={sendMessage}
              disabled={!message.trim() || loading}
              style={{
                marginLeft: 8,
                backgroundColor: '#4a90e2',
                width: 44,
                height: 44,
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#4a90e2',
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 4,
                transform: [{ scale: sendAnim ? 0.92 : 1 }],
                opacity: !message.trim() || loading ? 0.5 : 1,
              }}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Ionicons name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}