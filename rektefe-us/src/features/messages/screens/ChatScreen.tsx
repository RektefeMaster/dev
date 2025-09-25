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
  Animated,
  Modal,
} from 'react-native';
import { useAuth } from '@/shared/context';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, borderRadius, shadows, dimensions as themeDimensions } from '@/shared/theme';
import { Message } from '@/shared/types';
import apiService from '@/shared/services';
import { Ionicons } from '@expo/vector-icons';
import { useMessagePolling } from '@/features/messages/hooks';

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
  const { token, userId, isAuthenticated } = useAuth();
  const { conversationId, otherParticipant } = route.params;
  
  // Debug: Route params'ı log'la
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [lastMessageId, setLastMessageId] = useState<string | null>(null);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  
  // Animasyon değerleri
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Long Polling hook'u
  const { 
    startPolling, 
    stopPolling, 
    isPolling, 
    newMessages: fetchedNewMessages, 
    onNewMessages 
  } = useMessagePolling(conversationId);

  // Polling hook'undan gelen yeni mesajları işle
  useEffect(() => {
    if (fetchedNewMessages && fetchedNewMessages.length > 0) {
      setMessages(prev => {
        // Duplicate mesajları filtrele
        const existingIds = new Set(prev.map(msg => msg._id));
        const newUniqueMessages = fetchedNewMessages.filter(msg => !existingIds.has(msg._id));
        
        if (newUniqueMessages.length > 0) {
          // Yeni mesajları listenin sonuna ekle (en yeni altta)
          const updatedMessages = [...prev, ...newUniqueMessages];
          
          // Tarihe göre sırala (en eski üstte, en yeni altta)
          const sortedMessages = updatedMessages.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateA.getTime() - dateB.getTime();
          });
          
          // Son mesaj ID'sini güncelle
          const lastMessage = sortedMessages[sortedMessages.length - 1];
          if (lastMessage && lastMessage._id) {
            setLastMessageId(lastMessage._id);
          }
          
          // Otomatik olarak en alta kaydır (yeni mesajlar görünsün)
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
          
          return sortedMessages;
        }
        
        return prev;
      });
    }
  }, [fetchedNewMessages]);

  const fetchMessages = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    if (conversationId.startsWith('temp_')) {
      setMessages([]);
      setHasMore(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.getConversationMessages(conversationId, pageNum, 50);

      console.log('ChatScreen API Response:', {
        success: response.success,
        dataLength: Array.isArray(response.data) ? response.data.length : 'N/A',
        message: response.message
      });
      
      if (response.success) {
        const newMessages = Array.isArray(response.data) 
          ? response.data 
          : Array.isArray((response.data as any)?.messages) 
            ? (response.data as any).messages 
            : [];
        
        if (append) {
          // Eski mesajları listenin başına ekle (en eski üstte)
          setMessages(prev => [...newMessages, ...prev]);
        } else {
          // İlk yükleme - mesajları tarihe göre sırala (en eski üstte, en yeni altta)
          const sortedMessages = [...newMessages].sort((a, b) => {
            const dateA = new Date(a.createdAt || 0);
            const dateB = new Date(b.createdAt || 0);
            return dateA.getTime() - dateB.getTime();
          });
          setMessages(sortedMessages);
        }
        
        setHasMore(newMessages.length === 50);
        if (newMessages.length > 0) {
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage._id) {
            setLastMessageId(lastMessage._id);
          }
        }
      } else {
        }
    } catch (error) {
      const errorMessage = apiService.handleError(error);
      Alert.alert('Hata', errorMessage.message);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // Yeni mesajları kontrol et
  const checkNewMessages = useCallback(async () => {
    if (conversationId.startsWith('temp_') || !lastMessageId || loading) return;
    
    try {
      const response = await apiService.getConversationMessages(conversationId, 1, 10);
      
      if (response.success) {
        const allMessages = Array.isArray(response.data) 
          ? response.data 
          : Array.isArray((response.data as any)?.messages) 
            ? (response.data as any).messages 
            : [];
        
        // Son mesaj ID'sinden sonraki yeni mesajları bul
        const newMessages = allMessages.filter((msg: any) => {
          const msgDate = new Date(msg.createdAt || 0);
          const lastDate = new Date(lastMessageId || '');
          return msgDate > lastDate;
        });
        
        if (newMessages.length > 0) {
          // Yeni mesajları listenin sonuna ekle (en yeni altta)
          setMessages(prev => [...prev, ...newMessages]);
          
          // Son mesaj ID'sini güncelle (en son mesaj)
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage && lastMessage._id) {
            setLastMessageId(lastMessage._id);
          }
          
          // Otomatik olarak en alta kaydır (yeni mesajlar görünsün)
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
      }
    } catch (error) {
      }
  }, [conversationId, lastMessageId, loading]);

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage(''); // Hemen input'u temizle

    // Optimistic update - mesajı hemen göster
    const tempMessage: Message = {
      _id: `temp_${Date.now()}`,
      content: messageContent,
      messageType: 'text',
      createdAt: new Date().toISOString(),
      senderId: {
        _id: userId || '',
        name: 'Usta',
        surname: '',
      },
      receiverId: {
        _id: otherParticipant._id,
        name: otherParticipant.name,
        surname: otherParticipant.surname,
        avatar: otherParticipant.avatar,
      },
      conversationId: conversationId || '',
      isRead: false,
    };

    try {
      setSending(true);
      
      // Temp mesajı hemen ekle
      setMessages(prev => [...prev, tempMessage]);
      
      // En alta scroll
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      const messageData = {
        content: messageContent,
        messageType: 'text' as const,
        receiverId: otherParticipant._id,
        conversationId: conversationId.startsWith('temp_') ? undefined : conversationId
      };

      // API service kullanarak mesaj gönder
      const response = await apiService.sendMessage(messageData);

      if (response.success) {
        // Eğer temp conversation ise, gerçek conversation ID'yi al
        if (conversationId.startsWith('temp_') && response.data) {
          const realConversationId = (response.data as any)?.conversationId;
          if (realConversationId) {
            // Route params'ı güncelle
            navigation.setParams({
              conversationId: realConversationId
            });
          }
        }
        
        // Temp mesajı kaldır, gerçek mesaj polling ile gelecek
        setMessages(prev => prev.filter(msg => msg._id !== tempMessage._id));
        
        // Hemen yeni mesajları kontrol et
        setTimeout(() => {
          checkNewMessages();
        }, 500);
      } else {
        // Hata durumunda temp mesajı kaldır
        setMessages(prev => prev.filter(msg => msg._id !== tempMessage._id));
        Alert.alert('Hata', response.message || 'Mesaj gönderilemedi');
      }
    } catch (error) {
      // Hata durumunda temp mesajı kaldır
      setMessages(prev => prev.filter(msg => msg._id !== tempMessage._id));
      const errorMessage = apiService.handleError(error);
      Alert.alert('Hata', errorMessage.message);
    } finally {
      setSending(false);
    }
  };

  const deleteConversation = async () => {
    try {
      setDeleting(true);
      setShowOptionsModal(false);
      
      // Backend'den sohbeti sil
      const response = await apiService.deleteConversation(conversationId);
      
      if (response.success) {
        Alert.alert(
          'Sohbet Silindi',
          'Sohbet başarıyla silindi',
          [
            {
              text: 'Tamam',
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        Alert.alert('Hata', response.message || 'Sohbet silinirken hata oluştu');
      }
    } catch (error) {
      const errorMessage = apiService.handleError(error);
      Alert.alert('Hata', errorMessage.message);
    } finally {
      setDeleting(false);
    }
  };

  const showDeleteConfirmation = () => {
    Alert.alert(
      'Sohbeti Sil',
      'Bu sohbeti silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: deleteConversation
        }
      ]
    );
  };

  useEffect(() => {
    if (isAuthenticated && conversationId && !conversationId.startsWith('temp_')) {
      fetchMessages();
    }
    
    // Giriş animasyonu
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isAuthenticated, conversationId]); // conversationId değiştiğinde de çalışsın

  // Mesajları düzenli olarak yenile (3 saniyede bir)
  useEffect(() => {
    if (!isAuthenticated || conversationId.startsWith('temp_')) return;

    const interval = setInterval(() => {
      fetchMessages();
    }, 3000);

    return () => clearInterval(interval);
  }, [isAuthenticated, conversationId, fetchMessages]);

  // Yeni mesajları dinle (Long Polling) - Sadece bir kez çalışsın
  useEffect(() => {
    if (!isAuthenticated || conversationId.startsWith('temp_')) return;

    // Yeni mesajlar geldiğinde
    const handleNewMessages = (newMessages: Message[]) => {
      // Yeni mesajları mevcut mesajlara ekle
      setMessages(prev => [...prev, ...newMessages]);
      
      // Son mesaj ID'sini güncelle
      if (newMessages.length > 0) {
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage._id) {
          setLastMessageId(lastMessage._id);
        }
      }
      
      // Otomatik olarak en alta kaydır
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    };

    // onNewMessages callback'ini set et
    onNewMessages(handleNewMessages);
    
  }, [isAuthenticated, conversationId]); // onNewMessages dependency'sini kaldırdım

  // useFocusEffect'i kaldır - infinite loop'a neden oluyor
  // useFocusEffect(
  //   useCallback(() => {
  //     fetchMessages();
  //   }, [fetchMessages])
  // );

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isOwnMessage = item.senderId._id === userId;
    
    
    return (
      <Animated.View 
        style={[
          styles.messageContainer,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }
        ]}
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
          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              isOwnMessage ? styles.ownMessageTime : styles.otherMessageTime
            ]}>
              {formatMessageTime(item.createdAt)}
            </Text>
            {isOwnMessage && (
              <View style={styles.readIndicator}>
                <Ionicons 
                  name="checkmark-done" 
                  size={14} 
                  color={item.isRead ? colors.primary : colors.text.tertiary} 
                />
              </View>
            )}
          </View>
        </View>
      </Animated.View>
    );
  };

  const loadMoreMessages = () => {
    if (hasMore && !loading && page > 0) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchMessages(nextPage, true);
    }
  };

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
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          {otherParticipant.avatar ? (
            <Image source={{ uri: otherParticipant.avatar }} style={styles.headerAvatar} />
          ) : (
            <View style={styles.headerDefaultAvatar}>
              <Ionicons name="person" size={20} color={colors.text.tertiary} />
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.headerName}>
              {otherParticipant.name} {otherParticipant.surname}
            </Text>
            <Text style={styles.headerSubtitle}>
              {otherParticipant.userType === 'driver' ? 'Şöför' : 'Şöför'}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.moreButton} 
          activeOpacity={0.7}
          onPress={() => setShowOptionsModal(true)}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={colors.text.secondary} />
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
        onEndReached={loadMoreMessages}
        onEndReachedThreshold={0.1}
        ListFooterComponent={
          loading && hasMore ? (
            <View style={styles.loadingFooter}>
              <View style={styles.loadingDot} />
              <View style={styles.loadingDot} />
              <View style={styles.loadingDot} />
            </View>
          ) : null
        }
      />

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <View style={styles.inputWrapper}>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Mesajınızı yazın..."
            placeholderTextColor={colors.text.tertiary}
            multiline
            maxLength={1000}
            onSubmitEditing={sendMessage}
          />
          
          <TouchableOpacity
            style={[
              styles.sendButton, 
              !newMessage.trim() && styles.sendButtonDisabled,
              sending && styles.sendButtonSending
            ]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
            activeOpacity={0.8}
          >
            {sending ? (
              <View style={styles.sendingIndicator} />
            ) : (
              <Ionicons 
                name="send" 
                size={20} 
                color={newMessage.trim() ? colors.primary : colors.text.tertiary} 
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Options Modal */}
      <Modal
        visible={showOptionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptionsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptionsModal(false)}
        >
          <View style={styles.optionsModal}>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={showDeleteConfirmation}
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={20} color={colors.error} />
              <Text style={[styles.optionText, styles.deleteOptionText]}>
                Sohbeti Sil
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => setShowOptionsModal(false)}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={20} color={colors.text.secondary} />
              <Text style={styles.optionText}>
                İptal
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: themeDimensions.screenPadding,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.primary,
    backgroundColor: colors.background.primary,
    shadowColor: colors.shadow.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
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
    marginRight: spacing.sm,
  },
  headerDefaultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    fontSize: typography.body2.fontSize,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.caption.large.fontSize,
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
    paddingHorizontal: themeDimensions.screenPadding,
    paddingVertical: spacing.md,
  },
  messageContainer: {
    marginBottom: spacing.sm,
    flexDirection: 'row',
  },
  ownMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    shadowColor: colors.shadow.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  ownBubble: {
    backgroundColor: '#007AFF', // iOS mavi - daha açık ve görünür
    borderBottomRightRadius: borderRadius.sm,
  },
  otherBubble: {
    backgroundColor: colors.background.secondary,
    borderBottomLeftRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border.secondary,
  },
  messageText: {
    fontSize: typography.body3.fontSize,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  ownMessageText: {
    color: colors.text.inverse,
  },
  otherMessageText: {
    color: colors.text.primary,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  messageTime: {
    fontSize: typography.caption.small.fontSize,
    marginRight: spacing.xs,
  },
  ownMessageTime: {
    color: colors.text.inverse,
    opacity: 0.8,
  },
  otherMessageTime: {
    color: colors.text.tertiary,
  },
  readIndicator: {
    marginLeft: spacing.xs,
  },
  loadingFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text.tertiary,
    marginHorizontal: spacing.xs,
    opacity: 0.6,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.border.primary,
    backgroundColor: colors.background.primary,
    shadowColor: colors.shadow.primary,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: themeDimensions.screenPadding,
    paddingVertical: spacing.md,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    fontSize: typography.body3.fontSize,
    color: colors.text.primary,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: colors.border.secondary,
    shadowColor: colors.shadow.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary.ultraLight,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    shadowColor: colors.shadow.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sendButtonDisabled: {
    backgroundColor: colors.background.tertiary,
    borderColor: colors.border.secondary,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonSending: {
    backgroundColor: colors.background.tertiary,
    borderColor: colors.border.secondary,
  },
  sendingIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.primary,
    borderTopColor: 'transparent',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsModal: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    minWidth: 200,
    shadowColor: colors.shadow.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xs,
  },
  optionText: {
    fontSize: typography.body2.fontSize,
    color: colors.text.primary,
    marginLeft: spacing.sm,
    fontWeight: '500',
  },
  deleteOptionText: {
    color: colors.error,
  },
});

export default ChatScreen;
