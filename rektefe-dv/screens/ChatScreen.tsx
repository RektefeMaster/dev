import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
  Image,
  ActivityIndicator,
  ActionSheetIOS,
} from 'react-native';

import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '../theme/theme';
import { API_URL } from '../constants/config';

type Message = {
  _id: string;
  content: string;
  messageType: string;
  createdAt: string;
  senderId: {
    _id: string;
    name: string;
    surname: string;
    avatar?: string;
  };
  receiverId: {
    _id: string;
    name: string;
    surname: string;
    avatar?: string;
  };
};

type ChatScreenProps = {
  route: {
    params: {
      conversationId: string;
      otherParticipant: {
        _id: string;
        name: string;
        surname: string;
        avatar?: string;
        userType: string;
      };
    };
  };
  navigation: any;
};

const ChatScreen = ({ route, navigation }: ChatScreenProps) => {
  const { theme } = useTheme();
  const { token, userId } = useAuth();
  const { conversationId, otherParticipant } = route.params;
  const [resolvedConversationId, setResolvedConversationId] = useState<string | null>(conversationId || null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!resolvedConversationId || resolvedConversationId.length === 0) {
      console.log('❌ fetchMessages: resolvedConversationId yok:', resolvedConversationId);
      return;
    }
    if (resolvedConversationId.startsWith('temp_')) {
      console.log('❌ fetchMessages: Geçici conversation ID:', resolvedConversationId);
      setMessages([]);
      setLoading(false);
      return;
    }

    try {
      console.log('🔄 fetchMessages: Mesajlar yükleniyor, conversationId:', resolvedConversationId);
      setLoading(true);
      const response = await fetch(
        `${API_URL}/message/conversations/${resolvedConversationId}/messages?page=1&limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('📡 fetchMessages: Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📡 fetchMessages: Response data:', data);
        
        if (data.success && data.data) {
          const newMessages = Array.isArray(data.data) ? data.data : (data.data.messages || []);
          console.log('✅ fetchMessages: Mesajlar yüklendi, sayı:', newMessages.length);
          setMessages(newMessages);
          
          // Son mesaj zamanını güncelle
          if (newMessages.length > 0) {
            const lastMessage = newMessages[newMessages.length - 1];
            lastMessageIdRef.current = lastMessage._id;
          } else {
            lastMessageIdRef.current = null;
          }
        } else {
          console.log('❌ fetchMessages: API success false veya data yok:', data);
          setMessages([]);
        }
      } else {
        console.error('❌ fetchMessages: API hatası:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ fetchMessages: Error data:', errorData);
        setMessages([]);
      }
    } catch (error) {
      console.error('❌ fetchMessages: Network hatası:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [resolvedConversationId, token]);

  // Yeni mesajları kontrol et (polling)
  const checkForNewMessages = useCallback(async () => {
    if (!resolvedConversationId || resolvedConversationId.startsWith('temp_')) {
      console.log('❌ checkForNewMessages: resolvedConversationId yok veya geçici');
      return;
    }

    try {
      let response;
      
      if (lastMessageIdRef.current) {
        console.log('🔄 checkForNewMessages: Son mesajdan sonraki mesajlar aranıyor:', lastMessageIdRef.current);
        // Son mesajdan sonraki mesajları getir
        response = await fetch(
          `${API_URL}/message/conversations/${resolvedConversationId}/messages/after/${encodeURIComponent(lastMessageIdRef.current)}?limit=50`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
      } else {
        console.log('🔄 checkForNewMessages: Tüm mesajlar getiriliyor');
        // Tüm mesajları getir
        response = await fetch(
          `${API_URL}/message/conversations/${resolvedConversationId}/messages?page=1&limit=50`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
      }

      console.log('📡 checkForNewMessages: Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📡 checkForNewMessages: Response data:', data);
        
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          const newMessages = data.data;
          console.log('✅ checkForNewMessages: Yeni mesajlar bulundu:', newMessages.length);

          setMessages(prev => {
            // Yeni mesajları ekle (duplicate kontrolü ile)
            const existingIds = new Set(prev.map(msg => msg._id));
            const uniqueNewMessages = newMessages.filter((msg: any) => !existingIds.has(msg._id));

            if (uniqueNewMessages.length > 0) {
              console.log('✅ checkForNewMessages: Benzersiz yeni mesajlar:', uniqueNewMessages.length);
              // Son mesaj ID'sini güncelle
              const lastNewMessage = uniqueNewMessages[uniqueNewMessages.length - 1];
              lastMessageIdRef.current = lastNewMessage._id;

              // En alta scroll
              setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
              }, 100);
            } else {
              console.log('ℹ️ checkForNewMessages: Tüm mesajlar zaten mevcut');
            }

            return [...prev, ...uniqueNewMessages];
          });
        } else {
          console.log('ℹ️ checkForNewMessages: Yeni mesaj yok');
        }
      } else {
        console.error('❌ checkForNewMessages: API hatası:', response.status, response.statusText);
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ checkForNewMessages: Error data:', errorData);
      }
    } catch (error) {
      console.error('❌ checkForNewMessages: Network hatası:', error);
    }
  }, [resolvedConversationId, token]);

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage(''); // Hemen input'u temizle

    try {
      setSending(true);
      
      // Optimistic update - mesajı hemen göster
      const tempMessage: Message = {
        _id: `temp_${Date.now()}`,
        content: messageContent,
        messageType: 'text',
        createdAt: new Date().toISOString(),
        senderId: {
          _id: userId || '',
          name: 'Sen',
          surname: '',
        },
        receiverId: {
          _id: otherParticipant._id,
          name: otherParticipant.name,
          surname: otherParticipant.surname,
        }
      };
      
      setMessages(prev => [...prev, tempMessage]);
      
      // En alta scroll
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      const response = await fetch(`${API_URL}/message/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          receiverId: otherParticipant._id,
          content: messageContent,
          messageType: 'text'
        })
      });

      if (response.ok) {
        // Temp mesajı kaldır, gerçek mesaj polling ile gelecek
        setMessages(prev => prev.filter(msg => msg._id !== tempMessage._id));
        
        // Hemen yeni mesajları kontrol et
        setTimeout(() => {
          checkForNewMessages();
        }, 500);
      } else {
        // Hata durumunda temp mesajı kaldır
        setMessages(prev => prev.filter(msg => msg._id !== tempMessage._id));
        Alert.alert('Hata', 'Mesaj gönderilemedi');
      }
    } catch (error) {
      // Hata durumunda temp mesajı kaldır
      setMessages(prev => prev.filter(msg => msg._id !== `temp_${Date.now()}`));
      Alert.alert('Hata', 'Mesaj gönderilemedi');
    } finally {
      setSending(false);
    }
  };

  const handleTextChange = (text: string) => {
    setNewMessage(text);
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const response = await fetch(`${API_URL}/message/message/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Mesajı listeden kaldır
        setMessages(prev => prev.filter(msg => msg._id !== messageId));
      } else {
        Alert.alert('Hata', 'Mesaj silinemedi');
      }
    } catch (error) {
      Alert.alert('Hata', 'Mesaj silinemedi');
    }
  };

  const deleteConversation = async () => {
    Alert.alert(
      'Sohbeti Sil',
      'Bu sohbeti silmek istediğinizden emin misiniz? Tüm mesajlar kalıcı olarak silinecektir.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/message/conversations/${resolvedConversationId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json'
                }
              });

              if (response.ok) {
                Alert.alert('Başarılı', 'Sohbet silindi', [
                  { text: 'Tamam', onPress: () => navigation.goBack() }
                ]);
              } else {
                Alert.alert('Hata', 'Sohbet silinemedi');
              }
            } catch (error) {
              Alert.alert('Hata', 'Sohbet silinemedi');
            }
          }
        }
      ]
    );
  };

  const showMessageOptions = (message: Message) => {
    const isOwnMessage = message.senderId?._id?.toString() === userId?.toString();
    
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: isOwnMessage ? ['Mesajı Sil', 'İptal'] : ['İptal'],
          destructiveButtonIndex: isOwnMessage ? 0 : undefined,
          cancelButtonIndex: isOwnMessage ? 1 : 0,
          title: 'Mesaj Seçenekleri'
        },
        (buttonIndex) => {
          if (buttonIndex === 0 && isOwnMessage) {
            Alert.alert(
              'Mesajı Sil',
              'Bu mesajı silmek istediğinizden emin misiniz?',
              [
                { text: 'İptal', style: 'cancel' },
                {
                  text: 'Sil',
                  style: 'destructive',
                  onPress: () => deleteMessage(message._id)
                }
              ]
            );
          }
        }
      );
    } else {
      if (isOwnMessage) {
        Alert.alert(
          'Mesaj Seçenekleri',
          'Ne yapmak istiyorsunuz?',
          [
            { text: 'İptal', style: 'cancel' },
            {
              text: 'Mesajı Sil',
              style: 'destructive',
              onPress: () => {
                Alert.alert(
                  'Mesajı Sil',
                  'Bu mesajı silmek istediğinizden emin misiniz?',
                  [
                    { text: 'İptal', style: 'cancel' },
                    {
                      text: 'Sil',
                      style: 'destructive',
                      onPress: () => deleteMessage(message._id)
                    }
                  ]
                );
              }
            }
          ]
        );
      }
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.senderId?._id?.toString() === userId?.toString();
    
    return (
      <TouchableOpacity
        style={[
          styles.messageWrapper,
          isOwnMessage ? styles.ownMessageWrapper : styles.otherMessageWrapper
        ]}
        onLongPress={() => showMessageOptions(item)}
        activeOpacity={0.7}
      >
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownBubble : styles.otherBubble
        ]}>
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {item.content}
          </Text>
          <Text style={[
            styles.messageTime,
            isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
          ]}>
            {new Date(item.createdAt).toLocaleTimeString('tr-TR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };



  // Polling sistemi - yeni mesajları kontrol et
  useEffect(() => {
    if (!resolvedConversationId || resolvedConversationId.startsWith('temp_')) return;

    // Polling başlat (2 saniyede bir kontrol et)
    pollingIntervalRef.current = setInterval(() => {
      checkForNewMessages();
    }, 2000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [resolvedConversationId, checkForNewMessages]);

  // Sadece bir kez mesajları yükle
  useEffect(() => {
    if (resolvedConversationId && !resolvedConversationId.startsWith('temp_')) {
      fetchMessages();
    }
  }, [resolvedConversationId]);

  // Resolve conversation id if missing or temporary
  useEffect(() => {
    const ensureConversationId = async () => {
      try {
        console.log('🔍 ensureConversationId: Başlatılıyor...');
        console.log('🔍 conversationId:', conversationId);
        console.log('🔍 otherParticipant._id:', otherParticipant?._id);
        console.log('🔍 token var mı:', !!token);
        
        if ((!
          conversationId || conversationId.length === 0 || conversationId.startsWith('temp_')
        ) && otherParticipant?._id && token) {
          console.log('🔄 ensureConversationId: Conversation aranıyor...');
          const resp = await fetch(`${API_URL}/message/conversation/find/${otherParticipant._id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('📡 ensureConversationId: Response status:', resp.status);
          
          if (resp.ok) {
            const data = await resp.json();
            console.log('📡 ensureConversationId: Response data:', data);
            
            if (data?.success && data?.data?._id) {
              console.log('✅ ensureConversationId: Conversation bulundu:', data.data._id);
              setResolvedConversationId(data.data._id);
              return;
            } else {
              console.log('❌ ensureConversationId: Conversation bulunamadı veya data yok');
            }
          } else {
            console.error('❌ ensureConversationId: API hatası:', resp.status, resp.statusText);
            const errorData = await resp.json().catch(() => ({}));
            console.error('❌ ensureConversationId: Error data:', errorData);
          }
        }
        
        if (conversationId && conversationId.length > 0) {
          console.log('✅ ensureConversationId: Mevcut conversationId kullanılıyor:', conversationId);
          setResolvedConversationId(conversationId);
        } else {
          console.log('❌ ensureConversationId: Conversation ID bulunamadı');
        }
      } catch (error) {
        console.error('❌ ensureConversationId: Hata:', error);
      }
    };
    ensureConversationId();
  }, [conversationId, otherParticipant?._id, token]);

  // Focus olduğunda mesajları yenile (sadece bir kez)
  useFocusEffect(
    useCallback(() => {
      if (resolvedConversationId && !resolvedConversationId.startsWith('temp_')) {
        fetchMessages();
        
        // Polling başlat
        pollingIntervalRef.current = setInterval(checkForNewMessages, 2000);
      }
      
      // Cleanup
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }, [resolvedConversationId, checkForNewMessages])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Mesajlar yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background.primary} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text.primary as any} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          {otherParticipant?.avatar ? (
            <Image source={{ uri: otherParticipant.avatar }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerDefaultAvatar}>
              <Ionicons name="person" size={20} color={colors.text.tertiary} />
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.headerName}>
              {otherParticipant?.name} {otherParticipant?.surname}
            </Text>
            <Text style={styles.headerSubtitle}>
              Usta
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.moreButton}
          onPress={deleteConversation}
          activeOpacity={0.7}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={colors.text.primary as any} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item._id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        showsVerticalScrollIndicator={false}

        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={handleTextChange}
            placeholder="Mesajınızı yazın..."
            placeholderTextColor={colors.text.tertiary}
            multiline
            maxLength={1000}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          
          <TouchableOpacity
            style={[
              styles.sendButton, 
              !newMessage.trim() && styles.sendButtonDisabled
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator size="small" color={colors.text.inverse} />
            ) : (
              <Ionicons 
                name="send" 
                size={20} 
                color={newMessage.trim() ? colors.text.inverse as any : colors.text.tertiary as any} 
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.secondary,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
    backgroundColor: colors.background.primary,
    shadowColor: colors.shadow.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerDefaultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.primary as any,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: typography.caption.small.fontSize,
    color: colors.text.secondary,
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageWrapper: {
    marginBottom: 12,
  },
  ownMessageWrapper: {
    alignItems: 'flex-end',
  },
  otherMessageWrapper: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: colors.shadow.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ownBubble: {
    backgroundColor: colors.primary.main,
    borderBottomRightRadius: 6,
  },
  otherBubble: {
    backgroundColor: colors.background.secondary,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  messageText: {
    fontSize: typography.body3.fontSize,
    lineHeight: 20,
    marginBottom: 4,
  },
  ownMessageText: {
    color: colors.text.inverse,
  },
  otherMessageText: {
    color: colors.text.primary as any,
  },
  messageTime: {
    fontSize: typography.caption.small.fontSize,
  },
  ownMessageTime: {
    color: colors.text.inverse,
    opacity: 0.8,
  },
  otherMessageTime: {
    color: colors.text.tertiary,
  },

  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
    backgroundColor: colors.background.primary,
    shadowColor: colors.shadow.primary,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    fontSize: typography.body2.fontSize,
    color: colors.text.primary as any,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: colors.background.tertiary,
    borderColor: colors.border.secondary,
    shadowOpacity: 0,
    elevation: 0,
  },
});

export default ChatScreen;

